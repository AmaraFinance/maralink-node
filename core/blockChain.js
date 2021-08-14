const config = require('../config/config')
const common = require("./util/common")
let transaction = require('./transaction')
let util = require('../util/util')
let listen = require('./listen')
let levelDb = require('../db/levelDb').getInstance()

async function endSyncBlock() {
    let lastBlock = await global.DATABASE.getLastBlock()
    if (lastBlock.BlockNumber !== config.initBlock.BlockNumber) {
        let tx = await transaction.getOriginTxByHash(lastBlock.OriginTransactionHash)
        if (tx) {
            global.WEB3_BLOCK_NUMBER = tx.blockNumber - 1
        }
    }
    global.CYCLE_NUMBER = util.nextHex(lastBlock.BlockNumber)
    global.BLOCK_SYNC = false
    if (!global.NOW_VERIFY_PEER) {
        global.NOW_VERIFY_PEER = global.NODE_ID.toLowerCase()
    }
    util.log('msg', 'End sync block.')
    await listen.initStartListen()
}

async function isValidBlock(block) {
    if (block.BlockNumber === config.initBlock.BlockNumber) {
        util.log('err', `Height ${block.BlockNumber} is existed.`)
        return false
    }

    let prevBlock = await getBlockByNumber(util.prevHex(block.BlockNumber))
    if (!prevBlock) {
        util.log('err', `Height ${util.prevHex(block.BlockNumber)} is not existed.`)
        return false
    }

    if (prevBlock.Hash.toLowerCase() !== block.ParentHash.toLowerCase()) {
        util.log('err', `Height ${block.BlockNumber} parent hash error.`)
        return false
    }

    const netBlockHash = util.getBlockHash(block)
    if (netBlockHash.toLowerCase() !== block.Hash.toLowerCase()) {
        util.log('err', `Height ${block.BlockNumber} block hash error.`)
        return false
    }

    return true
}

async function initBlock() {
    try {
        let lastBlock = await global.DATABASE.getLastBlock()
        if (!lastBlock) {
            let initBlock = config.initBlock
            return await writeBlock(initBlock)
        }
        return true
    } catch (e) {
        console.error(e)
        return false
    }
}

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
        util.log('msg', `Write new tx ${block.FromChainId}-${block.OriginTransactionHash} block ${JSON.stringify(block)}`)
        return true
    } catch (e) {
        util.log('err', e)
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
        util.log('err', e)
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
        util.log('err', e)
        return false
    }
}

async function getTempBlockList() {
    try {
        return await levelDb.getMatchKeyList(common.tempTxPrefix, -1)
    } catch (e) {
        util.log('err', e)
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
        util.log('err', e)
        return null
    }
}

async function getLastBlock() {
    try {
        let block = await levelDb.get("LastBlock")
        return JSON.parse(block)
    } catch (e) {
        return false
    }
}

exports.isValidBlock = isValidBlock;
exports.endSyncBlock = endSyncBlock;
exports.initBlock = initBlock;
exports.writeBlock = writeBlock;
exports.writeTempBlock = writeTempBlock;
exports.updateTempBlock = updateTempBlock;
exports.getTempBlockList = getTempBlockList;
exports.getTransactionByHash = getTransactionByHash
exports.getLastBlock = getLastBlock