let WebSocket = require("ws");
let config = require('../config/config')
let util = require('../util/util')
let blockChain = require('../core/blockChain')
let clientMsgHandler = require('./clientMsgHandler')
let peer = require('../core/peer')

async function initTcpClient(host, port, sync) {
    if (!host || !port) {
        return false
    }
    if (util.checkExistedNode(global.NODE_ID)) {
        return false
    }

    let client = new WebSocket(`ws://${host}:${port}?publicKey=${global.NODE_INFO.publicKey}&serverPort=${config.tcpServerPort}`);
    client.on('open', function () {
        initOpenHandler(client, sync)
    });
    client.on('message', function (message) {
        initMessageHandler(client, message)
    })
    client.on('close', function () {
        initCloseHandler(client, host, port)
    })
    client.on('error', function () {
        initErrorHandler(client, host, port)
    })
    return client
}

//init connections
async function initOpenHandler(ws, sync) {
    try {
        if (sync) {
            await blockChain.syncBlock(ws)
        }
        util.log('msg', 'Connect new peer ' + ws._socket.remoteAddress + ':' + ws._socket.remotePort)
    } catch (e) {
        console.error(e)
    }
}

async function initMessageHandler(ws, data) {
    let message = JSON.parse(data);
    util.log('msg', `Received client message ${JSON.stringify(message)}`)
    switch (message.type) {
        case "PeerInfo":
            await clientMsgHandler.msgPeerInfo(ws, message)
            break;
        case "ReplyCycleInfo":
            await clientMsgHandler.msgReplyCycleInfo(ws, message)
            break;
        case "NewPeer":
            await clientMsgHandler.msgNewPeer(ws, message)
            break;
        case "ReplyBlockHeight":
            await clientMsgHandler.msgReplyBlockHeight(ws, message)
            break;
        case "ReplyBlock":
            await clientMsgHandler.msgReplyBlock(ws, message)
            break;
    }
}

async function initCloseHandler(ws, host, port) {
    util.log('err', 'Close connection: ' + ws._url)
    if (global.SOCKET_LIST.hasOwnProperty(ws.nodeId) && global.SOCKET_LIST[ws.nodeId].server) {
        global.SOCKET_LIST[ws.nodeId].server.close()
    }
    if (global.SOCKET_LIST.hasOwnProperty(ws.nodeId) && global.SOCKET_LIST[ws.nodeId].client) {
        await closeClient(global.SOCKET_LIST[ws.nodeId].client)
    }
    delete global.SOCKET_LIST[ws.nodeId]
    await peer.delOnlinePeer(ws.nodeId)

    if (ws.reconnect) {
        this.host = host;
        this.port = port;
        let obj = this;
        setTimeout(function () {
            util.log('msg', `Reconnecting......  ${obj.port} ${obj.host}`)
            initTcpClient(obj.host, obj.port)
        }, config.peers.options.timeout)
    }
}

async function initErrorHandler(ws, host, port) {
    util.log('err', 'Error connection: ' + ws._url)
    if (!global.SOCKET_LIST.hasOwnProperty(ws.nodeId)) return false
    if (global.SOCKET_LIST[ws.nodeId].server) {
        global.SOCKET_LIST[ws.nodeId].server.close()
    }
    if (global.SOCKET_LIST[ws.nodeId].client) {
        await closeClient(global.SOCKET_LIST[ws.nodeId].client)
    }
    delete global.SOCKET_LIST[ws.nodeId]
}

async function closeClient(ws, notReconnect) {
    ws.reconnect = !notReconnect;
    ws.close()
}

async function send(ws, message) {
    util.log('msg', 'Client send msg' + JSON.stringify(message))
    ws.send(JSON.stringify(message));
}

async function broadcast(message) {
    util.log('msg', 'Client broadcast msg' + JSON.stringify(message))
    for (let v of Object.keys(global.SOCKET_LIST)) {
        if (global.SOCKET_LIST[v].client) {
            await send(global.SOCKET_LIST[v].client, message)
        }
    }
}

exports.initTcpClient = initTcpClient;
exports.send = send;
exports.broadcast = broadcast;