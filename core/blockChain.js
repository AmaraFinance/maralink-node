const config = require('../config/config')
const common = require("./util/common")
let transaction = require('./transaction')
let clientSocket = require('../socket/client')
let util = require('../util/util')
let listen = require('./listen')

async function syncBlock(ws) {
    try {
        util.log('msg', 'Start sync block')
        await clientSocket.send(ws, {
            type: "SendBlockHeight",
            data: {}
        })
    } catch (e) {
        util.log('err', e)
        return false
    }
}

async function downloadBlock(ws, block) {
    await clientSocket.send(ws, {
        type: "GetBlock",
        data: {
            height: util.nextHex(block.BlockNumber)
        }
    })
}

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
        let hashKey = common.hashKey(block.BlockNumber)

        let isExisted = await global.DATABASE.get(hashKey)
        if (isExisted) return true

        let blockHash = util.getBlockHash(block)
        if (!blockHash) return false
        block.Hash = blockHash

        let blockKey = common.blockKey(block.BlockNumber, block.Hash)
        let numberKey = common.numberKey(block.Hash)
        let originHashKey = common.originHashKey(block.OriginTransactionHash)

        await global.DATABASE.batch([
            {type: "put", key: "LastBlock", value: JSON.stringify(block)},
            {type: "put", key: blockKey, value: JSON.stringify(block)},
            {type: "put", key: numberKey, value: block.BlockNumber},
            {type: "put", key: hashKey, value: block.Hash},
            {
                type: "put",
                key: originHashKey,
                value: JSON.stringify({Hash: block.Hash, BlockNumber: block.BlockNumber})
            }
        ])

        util.log('msg', `Write new block of height ${block.BlockNumber}`)
        return blockHash
    } catch (e) {
        util.log('err', e)
        return false
    }
}

async function getBlockByNumber(number) {
    try {
        let hashKey = common.hashKey(number)
        let hash = await global.DATABASE.get(hashKey)
        let blockKey = common.blockKey(number, hash)
        let block = await global.DATABASE.get(blockKey)

        return block ? JSON.parse(block) : null;
    } catch (e) {
        util.log('err', e)
        return null
    }
}

exports.syncBlock = syncBlock;
exports.isValidBlock = isValidBlock;
exports.downloadBlock = downloadBlock;
exports.endSyncBlock = endSyncBlock;
exports.initBlock = initBlock;
exports.writeBlock = writeBlock;
exports.getBlockByNumber = getBlockByNumber