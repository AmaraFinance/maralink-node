let config = require('../../config/config')
let util = require('../../util/util')
let account = require('../../library/account')
let client = require('socket.io-client')
let clientMsgHandle = require('./socket-clientMsgHandle')
let serverMsgHandle = require('./socket-serverMsgHandle')

let Socket = class {
    _parent = null
    _account = {}
    _tcpServerPort = config.tcpServerPort
    _server = null
    _clientList = []
    _clientTemp = {}
    _roomName = "MaraLink"

    constructor(parent, account) {
        util.log('info', `Socket server listening on port ${this._tcpServerPort}`)
        this._account = account
        this._parent = parent
        this._server = require('socket.io')(this._tcpServerPort, {
            serveClient: false,
            pingInterval: 2000,
            pingTimeout: 5000,
            cookie: false
        })
        this._server.use((socket, next) => {
            this.#initAuth(socket, next)
        })
        this._server.on('connection', (socket) => {
            this.initConnection(socket)
        })
        this.instance = null
    }

    static getInstance(parent, account) {
        if (!this.instance) {
            this.instance = new Socket(parent, account);
        }
        return this.instance;
    }

    async #initAuth(socket, next) {
        try {
            if (!socket.handshake.query.hasOwnProperty('publicKey') || !socket.handshake.query.publicKey) return false
            if (!socket.handshake.query.hasOwnProperty('serverPort') || !socket.handshake.query.serverPort) return false

            let publicKey = socket.handshake.query.publicKey;
            let address = await account.pubToAddress(publicKey)
            if (!address) return false
            if (address.toLowerCase() === this._account.address.toLowerCase()) return false

            let sockets = await this.findClient(address)
            if (sockets.server) {
                return false
            }

            next()
        } catch (e) {
            util.log('error', e)
            return false
        }
    }

    async initConnection(socket) {
        try {
            let publicKey = socket.handshake.query.publicKey;
            let serverPort = socket.handshake.query.serverPort;
            let address = await account.pubToAddress(publicKey)

            this.#initMessageHandler(socket);
            this.#initCloseHandler(socket);
            await this.#initConnected(socket, publicKey, serverPort, address)
        } catch (e) {
            util.log('error', e)
        }
    }

    async #initConnected(socket, publicKey, serverPort, address) {
        try {
            let url = util.delUrlPrefix(socket.handshake.address)

            socket.publicKey = publicKey
            socket.nodeId = address
            socket.clientInfo = {
                url: url,
                serverPort: serverPort
            }

            let sockets = await this.findClient(address)
            if (sockets.client) {
                await this.#twoWayConnected(socket)
            }
            if (!sockets.client && address.toLowerCase() !== this._account.address.toLowerCase()) {
                await this.connectClient(url, serverPort, address)
            }

            util.log('debug', `Server connected new peer: ${url} nodeId: ${address}. server amount: ${Object.keys(this._server.sockets.sockets).length}`)
        } catch (e) {
            util.log('error', e)
        }
    }

    async #initCloseHandler(socket) {
        try {
            socket.on('disconnect', async () => {
                util.log('debug', `Disconnected to peer: ${socket.handshake.address}:${socket.handshake.url} server amount: ${Object.keys(this._server.sockets.sockets).length}`)
                await this.#twoWayDisconnect(socket.nodeId)
            });
        } catch (e) {
            util.log('error', e)
        }
    }

    async #initMessageHandler(socket) {
        try {
            socket.on('message', async (message, callback) => {
                util.log('trace', `Server received message from ${socket.clientInfo.url}. ${JSON.stringify(message)}`)
                await serverMsgHandle.handleServerMessage(this, socket, message, callback)
            });
        } catch (e) {
            util.log('error', e)
        }
    }

    /***********************************************************************************/
    /*********************************start client*************************************/

    async connectClient(host, port, nodeId) {
        try {
            if (this._clientTemp.hasOwnProperty(`${host}:${port}`)) {
                return false
            }
            let newClient = client(`http://${host}:${port}`, {
                query: {
                    publicKey: this._account.publicKey,
                    serverPort: this._tcpServerPort
                },
                reconnectionAttempts: 10,
                reconnectionDelayMax: 10000,
                forceNew: true
            })
            this._clientTemp[`${host}:${port}`] = newClient
            newClient.on('connect', () => {
                this.#clientConnectedHandler(newClient)
            })
            newClient.on('disconnect', (reason) => {
                this.#clientDisconnectHandler(newClient, reason)
            })
            newClient.on('message', (data) => {
                this.#clientMessageHandler(newClient, data)
            })
            newClient.on('error', (error) => {
                this.#clientErrorHandler("error", nodeId, newClient)
            })
            newClient.on('connect_error', (error) => {
                this.#clientErrorHandler("connect_error", nodeId, newClient)
            })
            newClient.on('connect_timeout', (timeout) => {
                this.#clientErrorHandler("connect_timeout", nodeId, newClient)
            })
        } catch (e) {
            util.log('error', e)
        }
    }

    async #clientConnectedHandler(socket) {
        try {
            if (this._clientList.findIndex((item) => item.nodeId.toLowerCase() === this._account.address.toLowerCase()) !== -1) return socket.close()

            //await server send peer info .about address and publicKey
            let peerInfo = await this.send(socket, {
                type: "PeerInfo",
                data: {}
            })
            if (peerInfo.code === 0) return socket.close()
            if (peerInfo.data.clients) {
                for (let v of peerInfo.data.clients) {
                    this.connectClient(v.hostname, v.port)
                    util.log('debug', `peerInfo find ${v.hostname}:${v.port}`)
                }
            }
            let sockets = await this.findClient(peerInfo.data.nodeId)
            if (sockets.client) {
                return socket.close()
            }

            socket.nodeId = peerInfo.data.nodeId
            socket.publicKey = peerInfo.data.publicKey
            this._clientList.push(socket)

            util.log('debug', `Connected ${socket.nodeId} ${socket.connected}. clients pool amount ${this._clientList.length}`)
            if (sockets.server) {
                await this.#twoWayConnected(sockets.server)
            }
        } catch (e) {
            util.log('error', e)
        }
    }

    async #clientDisconnectHandler(socket, reason) {
        try {
            await this.#removeClient(socket.nodeId)
            await this.#twoWayDisconnect(socket.nodeId)
            let host = socket.io.engine.hostname
            let port = socket.io.engine.port
            if (this._clientTemp.hasOwnProperty(`${host}:${port}`)) {
                delete this._clientTemp[`${host}:${port}`]
            }
            util.log('debug', `Disconnected ${socket.nodeId}. clients pool amount ${this._clientList.length}`); // false
        } catch (e) {
            util.log('error', e)
        }
    }

    async #clientErrorHandler(err, nodeId) {
        try {
            if (!nodeId) return false
            let sockets = await this.findClient(nodeId)
            if (sockets.server) {
                sockets.server.disconnect(true)
            }
        } catch (e) {
            util.log('error', e)
        }
    }

    async #clientMessageHandler(socket, message) {
        try {
            // console.log(socket)
            util.log('trace', `Received client message from ${socket.io.engine.hostname}. ${JSON.stringify(message)}`)
            await clientMsgHandle.handleClientMessage(this, socket, message)
        } catch (e) {
            util.log('error', e)
        }
    }

    async #removeClient(nodeId) {
        try {
            if (nodeId) {
                this._clientList = this._clientList.filter((item) => item.nodeId.toLowerCase() !== nodeId.toLowerCase());
            }
        } catch (e) {
            util.log('error', e)
        }
    }

    /***********************************************************************************/
    /*****************************socket public function********************************/
    async #twoWayConnected(socketServer) {
        try {
            this._parent.setNeighbour(socketServer.nodeId.substr(2).toLowerCase())
            util.log("debug", `twoWayConnected: `)
            util.log("debug", this._parent.neighbours)

            await socketServer.join(this._roomName)
            util.log("debug", `rooms: ${this._server.sockets.adapter.rooms[this._roomName].length}`)

            await this.broadcast({
                type: "NewPeer",
                data: {
                    host: socketServer.clientInfo.url,
                    port: socketServer.clientInfo.serverPort,
                    nodeId: socketServer.nodeId
                }
            })
        } catch (e) {
            util.log('error', e)
        }
    }

    async #twoWayDisconnect(nodeId) {
        try {
            if (!nodeId) return false

            this._parent.delNeighbour(nodeId.substr(2).toLowerCase())
            util.log("debug", `twoWayDisconnect: `)
            util.log("debug", this._parent.neighbours)

            let sockets = await this.findClient(nodeId)
            if (sockets.server) {
                sockets.server.disconnect(true)
            }
            if (sockets.client) {
                sockets.client.close()
            }
        } catch (e) {
            util.log('error', e)
        }
    }

    async findClient(id) {
        let clientArr = {
            server: null,
            client: null
        }
        try {
            if (!id) throw "Not found node id"
            let serverSockets = this._server.sockets.sockets
            for (let v of Object.keys(serverSockets)) {
                if (serverSockets[v].nodeId.toLowerCase() === id.toLowerCase()) {
                    clientArr.server = serverSockets[v]
                }
            }
            clientArr.client = this._clientList.find((item) => item.nodeId.toLowerCase() === id.toLowerCase())
            return clientArr
        } catch (e) {
            util.log('error', e)
            return clientArr
        }
    }

    async send(socket, message) {
        try {
            util.log('trace', 'Server send msg ' + JSON.stringify(message))
            return Promise.race([
                new Promise(function (resolve, reject) {
                    setTimeout(() => {
                        resolve({code: 0, msg: 'Time out'})
                    }, 30 * 1000)
                }),
                new Promise(function (resolve, reject) {
                    socket.emit('message', message, function (err, result) {
                        if (err) {
                            resolve({code: 0, msg: err})
                        } else {
                            resolve({code: 1, data: result})
                        }
                    });
                })
            ])
        } catch (e) {
            util.log('error', e)
            return {code: 0, msg: "error"}
        }
    }

    async broadcast(message) {
        util.log('trace', 'Server broadcast msg' + JSON.stringify(message))
        this._server.sockets.to(this._roomName).emit('message', message)
    }
}

module.exports = Socket;
