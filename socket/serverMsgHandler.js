let transaction = require('../core/transaction')
let blockChain = require('../core/blockChain')
let util = require('../util/util')
let serverModel = require('./server')
let peer = require('../core/peer')

async function msgSyncCycleInfo(ws, req, message) {
    await serverModel.send(ws, {
        type: "ReplyCycleInfo",
        data: {
            cycleVote: global.CYCLE_VOTE_PEER,
            nowVerifyPeer: global.NOW_VERIFY_PEER
        }
    })
}

async function msgSendBlockHeight(ws, req, message) {
    try {
        let lastBlock = await global.DATABASE.getLastBlock()
        await serverModel.send(ws, {
            type: "ReplyBlockHeight",
            data: {
                height: lastBlock.BlockNumber
            }
        })
    } catch (e) {
        util.log('err', e)
    }
}

async function msgGetBlock(ws, req, message) {
    try {
        let blockData = await blockChain.getBlockByNumber(message.data.height)
        let lastBlock = await global.DATABASE.getLastBlock()
        if (!blockData) {
            util.log('err', `No block data for height ${message.data.height} is obtained`)
            return false
        }
        await serverModel.send(ws, {
            type: 'ReplyBlock',
            data: {
                block: blockData,
                lastHeight: lastBlock.BlockNumber
            }
        })
    } catch (e) {
        util.log('err', e)
    }
}

async function msgNewTransaction(ws, message) {
    await transaction.getNewTransaction(message.data.hash)
}

async function insertSocket(ws, nodeId) {
    let status = 0;
    if (nodeId.toLowerCase() === global.NODE_ID.toLowerCase()) {
        return status
    }

    ws.nodeId = nodeId
    if (!global.SOCKET_LIST.hasOwnProperty(nodeId)) {
        status = 1
        let socketData = {
            server: ws,
            client: null,
            publicKey: null
        }
        global.SOCKET_LIST[nodeId] = socketData
        await peer.insertOnlinePeer(nodeId)
    } else {
        status = 2
        global.SOCKET_LIST[nodeId].server = ws
    }
    return status
}

exports.msgSyncCycleInfo = msgSyncCycleInfo;
exports.msgSendBlockHeight = msgSendBlockHeight;
exports.msgGetBlock = msgGetBlock;
exports.msgNewTransaction = msgNewTransaction;
exports.insertSocket = insertSocket;