let common = require("../util/common")
let util = require('../util/util')
let levelDb = require('../db/levelDb').getInstance()

async function writeBlock(data) {
    try {
        let block = util.structBlock(data)

        let originHashKey = common.originHashKey(block.FromChainId, block.OriginTransactionHash)
        let targetHashKey = common.targetHashKey(block.ToChainId, block.TargetTransactionHash)
        let tempTxKey = common.tempHashKey(block.FromChainId, block.OriginTransactionHash)

        await levelDb.batch([
            {type: "del", key: tempTxKey},
            {type: "put", key: "LastBlock", value: JSON.stringify(block)},
            {type: "put", key: originHashKey, value: JSON.stringify(block)},
            {
                type: "put",
                key: targetHashKey,
                value: JSON.stringify({OriginTransactionHash: block.OriginTransactionHash, ChainId: block.FromChainId})
            }
        ])
        util.log('debug', `Write new tx ${block.FromChainId}-${block.OriginTransactionHash} block ${JSON.stringify(block)}`)
        return true
    } catch (e) {
        util.log('error', e)
        return false
    }
}

async function writeTempBlock(data) {
    try {
        let tempTxKey = common.tempHashKey(data.fromChainId, data.transactionHash)
        await levelDb.batch([
            {type: "put", key: tempTxKey, value: JSON.stringify(data)},
        ])
        return true
    } catch (e) {
        util.log('error', e)
        return false
    }
}

async function updateTempBlock(chainId, hash, params) {
    try {
        let tempTxKey = common.tempHashKey(chainId, hash)
        let task = await levelDb.get(tempTxKey)
        if (!task) return false

        task = JSON.parse(task)
        for (let i in params) {
            task[i] = params[i]
        }
        await levelDb.put(tempTxKey, JSON.stringify(task))
        return true
    } catch (e) {
        util.log('error', e)
        return false
    }
}

async function getTempBlockList() {
    try {
        return await levelDb.getMatchKeyList(common.tempTxPrefix, -1)
    } catch (e) {
        util.log('error', e)
        return false
    }
}

async function getTransactionByHash(chainId, hash) {
    try {
        let hashKey = common.originHashKey(chainId, hash)
        let tx = await levelDb.get(hashKey)
        if (tx) return JSON.parse(tx)

        let targetHashKey = common.targetHashKey(chainId, hash)
        let targetHash = await levelDb.get(targetHashKey)
        if (!targetHash) return null

        targetHash = JSON.parse(targetHash)
        let originHashKey = common.originHashKey(targetHash.ChainId, targetHash.OriginTransactionHash)
        tx = await levelDb.get(originHashKey)

        return tx ? JSON.parse(tx) : null;
    } catch (e) {
        util.log('error', e)
        return null
    }
}

async function getTempTransaction(chainId, hash) {
    try {
        let tempTxKey = common.tempHashKey(chainId, hash)
        let tx = await levelDb.get(tempTxKey)
        return tx ? JSON.parse(tx) : null
    } catch (e) {
        util.log('error', e)
        return null
    }
}

async function getLastBlock() {
    try {
        let block = await levelDb.get("LastBlock")
        return JSON.parse(block)
    } catch (e) {
        util.log('error', e)
        return false
    }
}

exports.writeBlock = writeBlock;
exports.writeTempBlock = writeTempBlock;
exports.updateTempBlock = updateTempBlock;
exports.getTempBlockList = getTempBlockList;
exports.getTransactionByHash = getTransactionByHash
exports.getLastBlock = getLastBlock
exports.getTempTransaction = getTempTransaction
