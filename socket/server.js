let WebSocket = require("ws");
let config = require('../config/config')
let util = require('../util/util')
let tcpServerPort = config.tcpServerPort;
let serverMsgHandler = require('./serverMsgHandler')
let clientSocket = require('./client')
let peer = require('../core/peer')
let account = require('../library/account')

async function initTcpServer() {
    let server = new WebSocket.Server({port: tcpServerPort});
    server.on('connection', initConnection);
    util.log('msg', 'listening server port on: ' + tcpServerPort)
    return server
}

async function initConnection(ws, req) {
    try {
        let params = util.getParams(req.url)
        if (!params.hasOwnProperty('publicKey') || !params.publicKey) {
            ws.close()
        }
        if (!params.hasOwnProperty('serverPort') || !params.serverPort) {
            ws.close()
        }

        let address = await account.pubToAddress(params.publicKey)
        if (!address) {
            ws.close()
        }
        if (address === global.NODE_ID) {
            ws.close()
        }
        let status = await serverMsgHandler.insertSocket(ws, address)
        if (status == 0) {
            ws.close()
        }

        initMessageHandler(ws, req);
        initErrorHandler(ws);
        initConnected(ws, req, params)

        await ping(ws)
        util.log('msg', `Find new peer: ${ws._socket.remoteAddress}:${ws._socket.remotePort} nodeId: ${address}. client amount: ${global.SOCKET_SERVER.clients.size}`)
    } catch (e) {
        console.error(e)
    }
}

async function initConnected(ws, req, params) {
    try {
        await send(ws, {
            type: "PeerInfo",
            data: {
                publicKey: global.NODE_INFO.publicKey,
                nodeId: global.NODE_ID
            }
        })

        let address = await account.pubToAddress(params.publicKey)
        global.SOCKET_LIST[address].publicKey = params.publicKey

        let url = util.delUrlPrefix(ws._socket.remoteAddress)
        if (!global.SOCKET_LIST.hasOwnProperty(address) || !global.SOCKET_LIST[address].client) {
            await clientSocket.initTcpClient(url, params.serverPort)
        }
        await broadcast({
            type: "NewPeer",
            data: {
                host: url,
                port: params.serverPort,
                nodeId: address
            }
        })
    } catch (e) {
        util.log('err', e)
    }
}

async function initMessageHandler(ws, req) {
    try {
        ws.on('message', async (data) => {
            let message = JSON.parse(data);
            util.log('msg', `Received server message ${JSON.stringify(message)}`)
            switch (message.type) {
                case "SyncCycleInfo":
                    await serverMsgHandler.msgSyncCycleInfo(ws, req, message)
                    break;
                case "SendBlockHeight":
                    await serverMsgHandler.msgSendBlockHeight(ws, req, message)
                    break;
                case "GetBlock":
                    await serverMsgHandler.msgGetBlock(ws, req, message)
                    break;
                case "NewTransaction":
                    await serverMsgHandler.msgNewTransaction(ws, message)
                    break;
            }
        });
    } catch (e) {
        console.error(e)
    }
}

async function initErrorHandler(ws) {
    try {
        ws.on('close', () => closeConnection(ws));
        ws.on('error', () => closeConnection(ws));
    } catch (e) {
        console.error(e)
    }
}

async function closeConnection(ws) {
    try {
        util.log('err', `Connection failed to peer: ${ws._socket.remoteAddress}:${ws._socket.remotePort}`)

        let nodeId = ws.nodeId
        if (!global.SOCKET_LIST.hasOwnProperty(nodeId)) {
            return false;
        }
        if (global.SOCKET_LIST[nodeId].server && global.SOCKET_LIST[nodeId].server.hasOwnProperty("pingInterval")) {
            clearInterval(global.SOCKET_LIST[nodeId].server.pingInterval)
        }
        if (global.SOCKET_LIST[nodeId].server) {
            global.SOCKET_LIST[nodeId].server.close()
        }
        if (global.SOCKET_LIST[nodeId].client) {
            global.SOCKET_LIST[nodeId].client.close()
        }
        delete global.SOCKET_LIST[nodeId]
        await peer.delOnlinePeer(ws.nodeId)
    } catch (e) {
        console.error(e)
    }
}

async function ping(ws) {
    const interval = setInterval(function ping() {
        ws.ping(1);
    }, 1000);
    ws.pingInterval = interval
}

async function send(ws, message) {
    util.log('msg', 'Server send msg ' + JSON.stringify(message))
    ws.send(JSON.stringify(message));
}

async function broadcast(message) {
    util.log('msg', 'Server broadcast msg' + JSON.stringify(message))
    for (let v of Object.keys(global.SOCKET_LIST)) {
        if (global.SOCKET_LIST[v].server && global.SOCKET_LIST[v].client) {
            await send(global.SOCKET_LIST[v].server, message)
        }
    }
}

exports.initTcpServer = initTcpServer;
exports.send = send;
exports.broadcast = broadcast;