let util = require('../util/util')
let ioUtil = require('../library/ioUtil')
let blockChain = require('../core/blockChain')
const BN = require('bn.js');
const ethers = require('ethers')

if (process.env.NODE_ENV === 'production') {
    var chainConfig = {
        contractAddress: "",
        chainAddress: "",
        tokenList: []
    }
} else {
    var chainConfig = {
        contractAddress: "0x7B3615C6711D98e4F5BA4f532f8C636bEff194Fd",
        chainAddress: "https://rpc-mumbai.maticvigil.com/v1/eae994f0a9aa91c7289dd77819d2d00654b7b1db",
        tokenList: [
            {
                address: "0x0797Da427E8a14D70B5D623f5084b12B95e53739",
                decimals: 8,
                symbol: "LL"
            }
        ]
    }
}

let Watcher = class {
    chainName = "MATIC"
    chainId = 3
    timeout = 120 * 1000

    _parent = null
    _leader = null
    _account = {}

    constructor(leader, parent, account) {
        this._leader = leader
        this._parent = parent
        this._account = account

        this.config = chainConfig
        this.contractAbi = ioUtil.readFileSync(`${__dirname}/lock.abi.json`, 'utf8')
        this.provider = new ethers.providers.JsonRpcProvider(this.config.chainAddress)
        this.wallet = new ethers.Wallet(this._account.privateKey.substr(2), this.provider)
        this.contract = new ethers.Contract(this.config.contractAddress, this.contractAbi, this.wallet)

        this.contract.on("Cross2", (crossData, crossType, event) => {
            this.#findNewTransaction({
                fromChainId: crossData[1].toNumber(),
                toChainId: crossData[2].toNumber(),
                fromToken: crossData[3],
                targetToken: crossData[4],
                amount: crossData[5],
                from: crossData[6],
                received: crossData[7],
                message: crossData[8],
                crossType: crossType
            }, event)
        });
        setTimeout(()=>{
            this.getTransaction("0xd8a332f9f8e1ba3f35d53badec3e749cc75a9b55eb80614c0ec071a7a5c1bacd")
        })
    }

    async #findNewTransaction(data, event) {
        try {
            switch (data.crossType) {
                case "lock":
                    if (data.fromChainId !== this.chainId) throw new Error(`fromChaiId ${data.fromChainId} not match`);
                    if (!this._parent.listeners.hasOwnProperty(data.toChainId)) throw new Error(`Not found toChaiId ${data.fromChainId} watcher`);

                    await this.#handlerLockTx(data, event)
                    break;
                case "mint":
                    if (data.toChainId !== this.chainId) throw new Error(`fromChaiId ${data.fromChainId} not match`);
                    await this.#handlerMintTx(data, event)
                    break;
            }
        } catch (e) {
            util.log('err', `${this.chainName} findNewTransaction ${e}`)
        }
    }

    async #handlerLockTx(data, event) {
        util.log('msg', `${this.chainName} Get new transaction. crossChain: ${data.fromChainId}-${data.toChainId} hash: ${event.transactionHash}`)
        let toChainWatcher = this._parent.listeners[data.toChainId];
        let amount = await this.#getAmount(data.amount, data.fromToken, data.targetToken, data.toChainId)
        if (!amount) throw new Error(`Conversion quantity failed`)

        let newTransaction = {
            transactionHash: event.transactionHash,
            fromContract: this.config.contractAddress,
            targetContract: toChainWatcher.config.contractAddress,
            fromToken: data.fromToken,
            targetToken: data.targetToken,
            amount: amount,
            fromAddress: data.from,
            toAddress: data.received,
            fromChainId: data.fromChainId,
            toChainId: data.toChainId,
            timeout: toChainWatcher.timeout || 30 * 1000,
            type: 2
        }

        util.log('msg', newTransaction)
        this._leader.taskController.enqueue(newTransaction)
    }

    async #handlerMintTx(data, event) {
        util.log('msg', `${this.chainName} Listen target chain logs ${JSON.stringify(data)}`)

        let task = this._leader.taskController.find({
            fromChainId: data.fromChainId,
            toChainId: data.toChainId,
            transactionHash: data.message
        })
        if (!task) return false
        this._leader.taskController.update(task, {done: true})
        this._leader.taskController.remove(task.uuid)
        util.log('msg', `${this.chainName} remove task uuid ${task.uuid}`)

        //write to database
        let block = {
            OriginContract: task.fromContract,
            TargetContract: task.targetContract,
            TargetToken: task.targetToken,
            OriginTransactionHash: data.message,
            TargetTransactionHash: event.transactionHash,
            FromChainId: task.fromChainId,
            ToChainId: task.toChainId,
            From: task.fromAddress,
            To: task.toAddress,
            Amount: task.amount,
            Timestamp: Date.now(),
            Node: data.fromAddress
        }
        await blockChain.writeBlock(block)

        //broadcast to others peer
        await this._leader.newServer.broadcast({
            type: "sureTx",
            data: {
                targetHash: event.transactionHash,
                fromChainId: data.fromChainId,
                toChainId: data.toChainId
            }
        })
    }

    async #getAmount(amount, fromAddress, toAddress, toChainId) {
        try {
            let originToken = await this.getTokenInfo(fromAddress)
            if (!originToken) throw new Error(`The decimal of the origin token ${fromAddress} is not obtained`)
            let originDecimal = new BN(Math.pow(10, originToken.decimals).toString(), 10)

            if (!this._parent.listeners.hasOwnProperty(toChainId)) return false
            let targetToken = await this._parent.listeners[toChainId].getTokenInfo(originToken.symbol)
            if (!targetToken) throw new Error(`The decimal of the target token ${fromAddress} is not obtained`)
            if (targetToken.address.toLowerCase() !== toAddress.toLowerCase()) throw new Error(`ToAddress not match ${targetToken.address} - ${toAddress}`)
            let targetDecimal = new BN(Math.pow(10, targetToken.decimals).toString(), 10)

            amount = new BN(amount.toString(), 10)
            amount = amount.mul(targetDecimal).div(originDecimal).toString()

            return amount
        } catch (e) {
            util.log('err', `${this.chainName} getAmount ${e}`)
            return false
        }
    }

    async getTokenInfo(str) {
        try {
            let token = this.config.tokenList.find((i) => i.address.toLowerCase() === str.toLowerCase())
            if (!token) token = this.config.tokenList.find((i) => i.symbol === str)
            return token || null
        } catch (e) {
            util.log('err', `${this.chainName} getTokenInfo ${e}`)
            return null
        }
    }

    async getTransaction(hash) {
        try {
            let tx = await this.provider.getTransaction(hash)
            if (!tx) throw new Error('get tx error')
            let newTx = {
                hash: tx.hash,
                from: tx.from,
                to: tx.to,
                input: {}
            }

            let inputData = await util.decodeInput(tx.data, JSON.parse(this.contractAbi))
            inputData.params.forEach((i, k) => {
                newTx.input[i.name] = i.value
            })
            return newTx;
        } catch (e) {
            util.log('err', e)
            return null;
        }
    }

    async sendToContract(tx) {
        try {
            let peerList = await this._leader.getVerifyPeerList()
            if (!peerList) throw new Error(`Failed to get verification peer`)
            peerList.push({
                address: this._account.address,
                publicKey: this._account.publicKey
            })

            let sign = await this._leader.newServer.signTransaction(peerList, tx.transactionHash)
            if (!sign) throw new Error(`Sign error hash: ${tx.transactionHash}`)
            let result = await this.contract.mint(sign.addressArr, sign.message, sign.signature, tx.targetToken, tx.amount, tx.toAddress, tx.fromChainId)
            return result.hash
        } catch (e) {
            util.log('err', `${this.chainName} sendToContract ${e}`)
            return false;
        }
    }
}

module.exports = Watcher