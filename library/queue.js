const config = require('../config/config');
const util = require('../util/util')
const mutexify = require('mutexify/promise')
const common = require('../core/util/common')
let lock = mutexify()

class TxQueue {
    constructor() {
        this.filelist = [];
        this.top = 0;
    }

    async Push(data) {
        let release = await lock()
        try {
            if (await this.Index(data.transactionHash) !== -1) {
                release()
                throw 'Transaction is existed'
            }
            let originHashKey = common.originHashKey(data.transactionHash);
            if (await global.DATABASE.get(originHashKey)) {
                release()
                throw 'Transaction is existed'
            }
            this.filelist.push(data);
            await this.Shuff()

            release()
            return true
        } catch (e) {
            util.log('err', e)
            release()
            return false
        }
    }

    async Del(hash) {
        let release = await lock()
        try {
            if (!hash) {
                this.filelist.splice(this.top, 1)
            } else {
                let index = await this.Index(hash)
                if (index === -1) {
                    throw `Error not found ${hash}`
                }
                this.filelist.splice(index, 1)
            }
            release()
            return true
        } catch (e) {
            util.log('err', e)
            release()
            return false
        }
    }

    async Index(hash) {
        return (this.filelist.map(o => o.transactionHash.toLowerCase()).indexOf(hash.toLowerCase()))
    }

    async GetTransaction(hash) {
        let index = await this.Index(hash)
        if (index) {
            return this.filelist[index]
        }
        return null
    }

    async Length() {
        return (this.filelist.length);
    }

    async Shuff() {
        this.filelist.sort(function (a, b) {
            if (a.blockNumber < b.blockNumber) {
                return -1;
            } else if (a.blockNumber > b.blockNumber) {
                return 1;
            }
            if (a.transactionIndex < b.transactionIndex) {
                return -1;
            } else if (a.transactionIndex === b.transactionIndex) {
                return 0;
            } else {
                return 1
            }
        })
        if (await this.Length() > config.queue.txPool.maxLength) {
            this.filelist = this.filelist.splice(this.top, config.queue.txPool.maxLength);
        }
    }
}

exports.TxQueue = TxQueue