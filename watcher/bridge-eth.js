let util = require('../util/util')
let ioUtil = require('../library/ioUtil')
const BN = require('bn.js');
const ethers = require('ethers')
const schnorr = require('bip-schnorr');
const convert = schnorr.convert;
const muSig = schnorr.muSig;
const BigInteger = require('bigi');

let Watcher = class {
    chainId = 2

    _parent = null
    _leader = null
    _account = {}

    constructor(leader, parent, account) {
        this._leader = leader
        this._parent = parent
        this._account = account

        if (process.env.NODE_ENV === 'production') {
            this.config = {
                contractAddress: "",
                chainAddress: "",
            }
        } else {
            this.config = {
                contractAddress: "0x079f6A39989D0C8BaBa1961D6cc49b5493C382Ff",
                chainAddress: "http://192.168.3.184:7545",
            }
        }

        this.contractAbi = ioUtil.readFileSync(`${__dirname}/lock.abi.json`, 'utf8')
        this.tokenContractAbi = ioUtil.readFileSync(`${__dirname}/erc20.abi.json`, 'utf8')
        this.provider = new ethers.providers.JsonRpcProvider(this.config.chainAddress)
        this.wallet = new ethers.Wallet(this._account.privateKey.substr(2), this.provider)
        this.contract = new ethers.Contract(this.config.contractAddress, this.contractAbi, this.wallet)

        this.contract.on("Cross", (fromToken, chainId, targetToken, amount, received, crossType, message, event) => {
            this.#findNewTransaction({
                fromToken: fromToken,
                chainId: chainId,
                targetToken: targetToken,
                amount: amount,
                received: received,
                message: message,
                crossType: crossType
            }, event)
        });
    }

    async #findNewTransaction(data, event) {
        try {
            switch (data.crossType) {
                case "lock":
                    util.log('msg', `Get new transaction. crossChain: ${this.chainId}-${data.chainId.toNumber()} hash: ${event.transactionHash}`)
                    let amount = await this.#getAmount(data.amount, data.fromToken, data.targetToken, data.chainId.toNumber())
                    if (!amount) return false;

                    let newTransaction = {
                        transactionHash: event.transactionHash,
                        originContract: this.config.contractAddress,


                        targetToken: data.targetToken,
                        amount: amount,
                        toAddress: data.received,
                        fromChainId: this.chainId,
                        toChainId: data.chainId.toNumber(),
                        timeout: 1000 * 60,
                        type: 2
                    }

                    util.log('msg', newTransaction)
                    this._leader.taskController.enqueue(newTransaction)
                    break;
                case "mint":
                    util.log('msg', `listen target chain sure ${JSON.stringify(data)} event: ${JSON.stringify(event)}`)
                    break;
            }
        } catch (e) {
            util.log('err', e)
        }
    }

    async #getAmount(amount, fromAddress, toAddress, toChainId) {
        try {
            let originDecimal = await this.getTokenDecimal(fromAddress)
            if (originDecimal === 0) return false
            originDecimal = new BN(Math.pow(10, originDecimal).toString(), 10)

            let targetDecimal = await this._parent.listeners[toChainId].getTokenDecimal(toAddress)
            if (targetDecimal === 0) return false
            targetDecimal = new BN(Math.pow(10, targetDecimal).toString(), 10)

            amount = new BN(amount.toString(), 10)
            amount = amount.mul(targetDecimal).div(originDecimal).toString()

            return amount
        } catch (e) {
            util.log('err', e)
            return false
        }
    }

    async getTokenDecimal(address) {
        try {
            let tokenContract = new ethers.Contract(address, this.tokenContractAbi, this.provider);
            return await tokenContract.decimals()
        } catch (e) {
            util.log('err', e)
            return 0
        }
    }

    async sendToContract(transaction) {
        try {
            let message = convert.hash(Buffer.from(transaction.transactionHash))
            let publicKey = `0x${ethers.utils.computePublicKey(this._account.privateKey, true).substr(4)}`
            let sign = `0x${schnorr.sign(BigInteger.fromHex(this._account.privateKey.substr(2)), message).toString('hex')}`;

            let result = await this.contract.mint(publicKey, message, sign, transaction.targetToken, transaction.amount, transaction.toAddress, transaction.fromChainId)
            return result.hash;
        } catch (e) {
            util.log('err', e)
            return false;
        }
    }
}

module.exports = Watcher