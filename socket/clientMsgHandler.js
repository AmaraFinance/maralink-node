let serverModel = require('./server')
let clientModel = require('./client')
let util = require('../util/util')
let blockChain = require('../core/blockChain')
let peer = require('../core/peer')

async function msgPeerInfo(ws, message) {
    ws.nodeId = message.data.nodeId
    ws.publicKey = message.data.publicKey
    await insertSocket(ws, message.data.nodeId, message.data.publicKey)
}

async function msgReplyCycleInfo(ws, message) {
    global.CYCLE_VOTE_PEER = message.data.cycleVote
    global.NOW_VERIFY_PEER = message.data.nowVerifyPeer
    await blockChain.endSyncBlock()
}

async function msgNewPeer(ws, message) {
    if (util.checkExistedNode(message.data.nodeId)) {
        return false;
    }
    if (message.data.nodeId === global.NODE_ID) {
        return false;
    }

    await clientModel.initTcpClient(message.data.host, message.data.port)
    await serverModel.broadcast({
        type: "NewPeer",
        data: {
            host: message.data.host,
            port: message.data.port,
            nodeId: message.data.nodeId
        }
    })
    util.log('msg', `broadcast send msg NewPeer`)
}

async function msgReplyBlockHeight(ws, message) {
    util.log('msg', `Get block height ${JSON.stringify(message)}`)
    let lastBlock = await global.DATABASE.getLastBlock()
    let height = message.data.height
    if (util.bnGte(lastBlock.BlockNumber, height)) {
        return await clientModel.send(ws, {
            type: 'SyncCycleInfo'
        })
    }

    await blockChain.downloadBlock(ws, lastBlock)
}

async function msgReplyBlock(ws, message) {
    let block = message.data.block

    let isValidBlock = await blockChain.isValidBlock(block)
    if (!isValidBlock) {
        util.log('err', `Sync block height ${block.BlockNumber} error. end client`)
        process.exitCode = 1
    }

    await blockChain.writeBlock(block)
    if (util.bnGt(message.data.lastHeight, block.BlockNumber)) {
        await blockChain.downloadBlock(ws, block)
    } else {
        await clientModel.send(ws, {
            type: 'SyncCycleInfo'
        })
    }
}

async function insertSocket(ws, nodeId, publicKey) {
    let status = 0;
    if (nodeId.toLowerCase() === global.NODE_ID.toLowerCase()) {
        return status
    }

    if (!global.SOCKET_LIST.hasOwnProperty(nodeId)) {
        status = 1
        let socketData = {
            server: null,
            client: ws,
            publicKey: publicKey
        }
        global.SOCKET_LIST[nodeId] = socketData
        await peer.insertOnlinePeer(nodeId)
    } else {
        status = 2
        global.SOCKET_LIST[nodeId].client = ws
    }
    return status
}

exports.msgPeerInfo = msgPeerInfo;
exports.msgReplyCycleInfo = msgReplyCycleInfo;
exports.msgNewPeer = msgNewPeer;
exports.msgReplyBlockHeight = msgReplyBlockHeight;
exports.msgReplyBlock = msgReplyBlock;