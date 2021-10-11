let util = require('../util/util')
let ioUtil = require('../library/ioUtil')
let socketUtil = require('../network/socket/socket-util')
let blockChain = require('../library/blockChain')
const BN = require('bn.js');
const ethers = require('ethers')
const chainConfig = require("../config/chain-config")

let Watcher = class {
    chainName = "MOONBEAM"
    chainId = 4
    timeout = 340 * 1000

    _parent = null
    _leader = null
    _account = {}
    _tempTask = {}

    constructor(leader, parent, account) {
        this._leader = leader
        this._parent = parent
        this._account = account

        this.config = chainConfig[this.chainId]
        this.contractAbi = ioUtil.readFileSync(`${__dirname}/lock.abi.json`, 'utf8')
        if (!this.config.chainAddress || !this.config.contractAddress){
            util.log("error", `${this.chainName}: Configuration missing parameters`)
            process.exit(1)
        }
        this.provider = new ethers.providers.JsonRpcProvider(this.config.chainAddress, this.config.chainId)
        this.wallet = new ethers.Wallet(this._account.privateKey.substr(2), this.provider)
        this.contract = new ethers.Contract(this.config.contractAddress, this.contractAbi, this.wallet)

        util.log("info", `${this.chainName} watcher has started, listening address: ${this.config.contractAddress}`)
        this.contract.on("Cross2", (crossData, crossType, event) => {
            util.log("trace", `${this.chainName}: `)
            util.log("trace", crossData)
            this.#findNewTransaction({
                fromChainId: crossData[1].toNumber(),
                toChainId: crossData[2].toNumber(),
                fromToken: crossData[3],
                targetToken: crossData[4],
                amount: crossData[5],
                from: crossData[6],
                received: crossData[7],
                message: crossData[8],
                timestamp: crossData[10].toNumber() * 1000,
                crossType: crossType
            }, event)
        });
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
            util.log('error', `${this.chainName} findNewTransaction: `)
            util.log('error', e)
        }
    }

    async #handlerLockTx(data, event) {
        util.log('debug', `${this.chainName} Listen origin chain logs ${JSON.stringify(data)}`)

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
        await this.recordAndBroadcastTemp(newTransaction, data.timestamp)
    }

    async #handlerMintTx(data, event) {
        util.log('debug', `${this.chainName} Listen target chain logs ${JSON.stringify(data)}`)

        let task = this._leader.taskController.find({
            fromChainId: data.fromChainId,
            toChainId: data.toChainId,
            transactionHash: data.message
        })
        if (!task) return false
        util.log('info', `${this.chainName} remove task uuid ${task.uuid}`)
        await this.recordAndBroadcastTask(task)
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
            amount = amount.mul(targetDecimal).div(originDecimal)
            let fee = new BN(parseInt((targetToken.fee * Math.pow(10, targetToken.decimals))).toString(), 10);
            if (fee.lt(amount)) {
                amount = amount.sub(fee)
            } else {
                throw new Error(`Does not meet the handling fee setting, do not apply for transfer. fromAddress: ${fromAddress}`)
            }

            return amount.toString()
        } catch (e) {
            util.log('error', `${this.chainName} getAmount: `)
            util.log('error', e)
            return false
        }
    }

    async getTokenInfo(str) {
        try {
            let token = this.config.tokenList.find((i) => i.address.toLowerCase() === str.toLowerCase())
            if (!token) token = this.config.tokenList.find((i) => i.symbol === str)
            return token || null
        } catch (e) {
            util.log('error', `${this.chainName} getTokenInfo: `)
            util.log('error', e)
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
            util.log('error', e)
            return null;
        }
    }

    async sendToContract(tx) {
        try {
            let sign = await socketUtil.signTransaction(tx.transactionHash)
            if (!sign) throw new Error(`Sign error hash: ${tx.transactionHash}`)

            //Latest method
            // let result = await this.contract.mint(sign.message, tx.targetToken, tx.amount, tx.toAddress, tx.fromChainId, {type: null})

            //Manually sign and send transactions
            let rawTx = await this.contract.populateTransaction.mint(sign.message, tx.targetToken, tx.amount, tx.toAddress, tx.fromChainId)
            rawTx.nonce = await this.wallet.getTransactionCount();
            rawTx.gasPrice = await this.wallet.getGasPrice()
            rawTx.gasLimit = (await this.wallet.estimateGas(rawTx)) * 2;
            let result = await this.wallet.sendTransaction(rawTx)

            return result.hash
        } catch (e) {
            util.log('error', `${this.chainName} sendToContract: `)
            util.log('error', e)
            return false;
        }
    }

    async checkConfirmed(hash) {
        try {
            let tx = await this.provider.getTransaction(hash)
            if (tx.confirmations < this.config.confirmBlocks) {
                throw `The minimum number of confirmed blocks has not been exceeded. Now confirm blocks ${tx.confirmations} target ${this.config.confirmBlocks}`;
            }
            return true;
        } catch (e) {
            util.log('error', `${this.chainName} checkConfirmed: `)
            util.log('error', e)
            return false;
        }
    }

    async addToTempTask(transactionHash) {
        try {
            if (this._tempTask.hasOwnProperty(transactionHash)) return false
            let that = this
            this._tempTask[transactionHash] = setTimeout(() => {
                delete that._tempTask[transactionHash]
            }, 600 * 1000)
        } catch (e) {
            util.log('error', e)
        }
    }

    async recordAndBroadcastTemp(task, timestamp) {
        if (this._tempTask.hasOwnProperty(task.transactionHash)) return false
        let currentRoundMaster = await this._leader.getCurrentRoundMaster(timestamp)
        if (!currentRoundMaster) return false

        if (currentRoundMaster[0].peer.toLowerCase() !== this._account.address.substr(2).toLowerCase()) {
            // let sockets = await this._leader.newServer.findClient(`0x${currentRoundMaster[0].peer}`)
            // if (sockets.server) {
            //     await this._leader.newServer.send(sockets.server, {
            //         type: 'receiveLockTx',
            //         data: {
            //             task: task,
            //             blockTime: timestamp
            //         }
            //     })
            // }
            return false
        }

        if (this._leader.taskController.find({
            transactionHash: task.transactionHash,
            fromChainId: task.fromChainId
        })) return false

        await blockChain.writeTempBlock(task)
        this._leader.taskController.enqueue(task)
        await this._leader.newServer.broadcast({
            type: "findTx",
            data: {
                transactionHash: task.transactionHash,
                fromChainId: task.fromChainId
            }
        })

        util.log('info', `${this.chainName} Get new transaction. crossChain: ${task.fromChainId}-${task.toChainId} hash: ${task.transactionHash}`)
        util.log('info', task)
        return true
    }

    async recordAndBroadcastTask(task) {
        //remove from taskList
        this._leader.taskController.remove(task.uuid)

        //write to database
        let block = {
            OriginContract: task.fromContract,
            TargetContract: task.targetContract,
            TargetToken: task.targetToken,
            OriginTransactionHash: task.transactionHash,
            TargetTransactionHash: task.targetHash,
            FromChainId: task.fromChainId,
            ToChainId: task.toChainId,
            From: task.fromAddress,
            To: task.toAddress,
            Amount: task.amount,
            Timestamp: Date.now(),
            Node: this._account.address
        }
        await blockChain.writeBlock(block)

        //broadcast to others peer
        // await this._leader.newServer.broadcast({
        //     type: "sureTx",
        //     data: {
        //         targetHash: task.targetHash,
        //         fromChainId: task.fromChainId,
        //         toChainId: task.toChainId
        //     }
        // })
    }
}

module.exports = Watcher
