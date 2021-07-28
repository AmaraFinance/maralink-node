let config = require('../../config/config')
let util = require('../../util/util')
let account = require('../../library/account')
let client = require('socket.io-client')
let schnorrSign = require('../../library/schnorr')
let blockChain = require('../../core/blockChain')
const BigInteger = require('bigi');
const soltypes = require('soltypes')

let Socket = class {
    _parent = null
    _account = {}
    _tcpServerPort = config.tcpServerPort
    _server = null
    _clientList = []
    _clientTemp = {}
    _roomName = "MaraLink"
    _tempTx = {}

    constructor(parent, account) {
        util.log('msg', `Socket server listening on port ${this._tcpServerPort}`)
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
            util.log('err', e)
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
            util.log('err', e)
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
                await this.twoWayConnected(socket)
            }
            if (!sockets.client && address.toLowerCase() !== this._account.address.toLowerCase()) {
                await this.connectClient(url, serverPort, address)
            }

            util.log('msg', `Server connected new peer: ${url} nodeId: ${address}. server amount: ${Object.keys(this._server.sockets.sockets).length}`)
        } catch (e) {
            util.log('err', e)
        }
    }

    async #initCloseHandler(socket) {
        try {
            socket.on('disconnect', async () => {
                util.log('err', `Disconnected to peer: ${socket.handshake.address}:${socket.handshake.url} server amount: ${Object.keys(this._server.sockets.sockets).length}`)
                await this.twoWayDisconnect(socket.nodeId)
            });
        } catch (e) {
            console.error(e)
        }
    }

    async #initMessageHandler(socket) {
        try {
            socket.on('message', async (message, callback) => {
                util.log('msg', `Server received  message ${JSON.stringify(message)}`)
                switch (message.type) {
                    case "PeerInfo":
                        await this.#msgPeerInfo(socket, message, callback)
                        break;
                    case "GetTxSignNonce":
                        await this.#msgGetTxSignNonce(socket, message, callback)
                        break;
                    case "GetTxSign":
                        await this.#msgGetTxSign(socket, message, callback)
                        break;
                }
            });
        } catch (e) {
            console.error(e)
        }
    }

    async #msgPeerInfo(socket, parameter, callback) {
        try {
            let clients = []
            for (let v of this._clientList) {
                clients.push({
                    hostname: v.io.opts.hostname,
                    port: v.io.opts.port
                })
            }
            callback && callback(null, {
                publicKey: this._account.publicKey,
                nodeId: this._account.address,
                clients: clients
            })
        } catch (e) {
            util.log('err', e)
            socket.disconnect(true)
        }
    }


    async #msgGetTxSignNonce(socket, parameter, callback) {
        try {
            let that = this
            let {addressArr, hash, idx} = parameter.data
            if (!addressArr) {
                callback && callback('Node verification failed ${hash}', null)
            }
            let newPeerList = await this.verifyPeer(addressArr)
            if (!newPeerList) {
                callback && callback('Node verification failed ${hash}', null)
            }

            //step 1 combine public keys
            let pubKeys = []
            for (let i = 0; i < newPeerList.length; i++) {
                pubKeys.push(Buffer.from(newPeerList[i].publicKey.substr(newPeerList[i].publicKey.length - 64), 'hex'))
            }
            let publicData = schnorrSign.publicKeyCombine(pubKeys)
            if (!publicData) {
                callback && callback('Combined public key failed ${hash}', null)
            }

            //step2 Create the private signing session
            let sign = schnorrSign.signByPrivate({
                message: soltypes.Bytes32.from(hash).toBuffer(),
                pubKeyCombined: publicData.pubKeyCombined,
                pubKeyParity: publicData.pubKeyParity,
                pubKeyHash: publicData.pubKeyHash
            }, idx, this._account.privateKey)
            if (!sign) {
                callback && callback(`Sign tx error ${hash}`, null)
            }
            let newSign = {
                nonce: sign.nonce,
                commitment: sign.commitment
            }
            this._tempTx[`${socket.nodeId}_${hash}`] = {
                publicData: publicData,
                session: sign,
                timeout: setTimeout(() => {
                    delete that._tempTx[`${socket.nodeId}_${hash}`]
                }, 30 * 1000)
            }

            callback && callback(null, newSign)
        } catch (e) {
            util.log('err', e)
            callback && callback("Get tx sign nonce error", null)
        }
    }

    async #msgGetTxSign(socket, parameter, callback) {
        try {
            let {hash, nonceCombined} = parameter.data
            if (!this._tempTx.hasOwnProperty(`${socket.nodeId}_${hash}`)) {
                callback && callback('Not match temp tx', null)
            }

            let tempData = this._tempTx[`${socket.nodeId}_${hash}`]
            let publicData = tempData.publicData
            let session = tempData.session

            let partialSignature = schnorrSign.getPartialSignature(session, soltypes.Bytes32.from(hash).toBuffer(), nonceCombined, publicData.pubKeyCombined);
            if (partialSignature) {
                clearTimeout(tempData.timeout)
                delete this._tempTx[`${socket.nodeId}_${hash}`]
                callback && callback(null, partialSignature.toBuffer())
            } else {
                callback && callback("Get tx sign error", null)
            }
        } catch (e) {
            util.log('err', e)
            callback && callback("Get tx sign error", null)
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
            util.log('err', e)
            return clientArr
        }
    }

    async verifyPeer(peerList) {
        try {
            let newPeerList = []
            for (let v of peerList) {
                if (v.toLowerCase() === this._account.address.toLowerCase()) {
                    newPeerList.push({
                        address: v,
                        publicKey: this._account.publicKey
                    })
                } else {
                    let sockets = await this.findClient(v)
                    if (!sockets.server || !sockets.client) throw  new Error(`Verify that the node is not connected`)
                    newPeerList.push({
                        address: v,
                        publicKey: sockets.server.publicKey
                    })
                }
            }
            return newPeerList
        } catch (e) {
            util.log('err', e)
            return false
        }
    }

    async send(socket, message) {
        // util.log('msg', 'Server send msg ' + JSON.stringify(message))
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
    }

    async broadcast(message) {
        // util.log('msg', 'Server broadcast msg' + JSON.stringify(message))
        this._server.sockets.to(this._roomName).emit('message', message)
    }

    async twoWayConnected(socketServer) {
        try {
            this._parent.setNeighbour(socketServer.nodeId.substr(2).toLowerCase())
            console.log("twoWayConnected", this._parent.neighbours)

            await socketServer.join(this._roomName)
            console.log("rooms", this._server.sockets.adapter.rooms[this._roomName].length)

            await this.broadcast({
                type: "NewPeer",
                data: {
                    host: socketServer.clientInfo.url,
                    port: socketServer.clientInfo.serverPort,
                    nodeId: socketServer.nodeId
                }
            })
        } catch (e) {
            util.log('err', e)
        }
    }

    async twoWayDisconnect(nodeId) {
        try {
            if (!nodeId) return false

            this._parent.delNeighbour(nodeId.substr(2).toLowerCase())
            console.log("twoWayDisconnect", this._parent.neighbours)

            let sockets = await this.findClient(nodeId)
            if (sockets.server) {
                sockets.server.disconnect(true)
            }
            if (sockets.client) {
                sockets.client.close()
            }
        } catch (e) {
            util.log('err', e)
        }
    }

    async signTransaction(peerList, hash) {
        try {
            let addressArr = peerList.map(item => {
                return item.address
            })
            let signerSession;
            let publicData = {
                pubKeys: [],
                message: soltypes.Bytes32.from(hash).toBuffer(),
                pubKeyHash: null,
                pubKeyCombined: null,
                pubKeyParity: null,
                commitments: [],
                nonces: [],
                nonceCombined: null,
                partialSignatures: [],
                signature: null,
            };

            for (let i = 0; i < peerList.length; i++) {
                publicData.pubKeys.push(Buffer.from(peerList[i].publicKey.substr(peerList[i].publicKey.length - 64), 'hex'))
            }

            //Step 1: Combine the public keys
            let publicKeyCombineData = schnorrSign.publicKeyCombine(publicData.pubKeys)
            if (!publicKeyCombineData) throw new Error(`Combined public key failed`)
            publicData.pubKeyHash = publicKeyCombineData.pubKeyHash
            publicData.pubKeyCombined = publicKeyCombineData.pubKeyCombined
            publicData.pubKeyParity = publicKeyCombineData.pubKeyParity

            //Step 2: Get the private signing session (communication round 1)
            let signerPrivateData = []
            for (let i = 0; i < peerList.length; i++) {
                let sign = null
                if (peerList[i].address.toLowerCase() === this._account.address.toLowerCase()) {
                    sign = schnorrSign.signByPrivate({
                        message: publicData.message,
                        pubKeyCombined: publicData.pubKeyCombined,
                        pubKeyParity: publicData.pubKeyParity,
                        pubKeyHash: publicData.pubKeyHash
                    }, i, this._account.privateKey)
                    if (!sign) throw new Error(`Sign failed`)
                    signerSession = sign
                } else {
                    let signRes = await this.send(peerList[i].socket, {
                        type: 'GetTxSignNonce',
                        data: {
                            addressArr: addressArr,
                            hash: hash,
                            idx: i
                        }
                    })
                    if (signRes.code === 0 || !signRes.data) throw new Error(`Other peer failed to sign`)
                    sign = {
                        nonce: Buffer.from(signRes.data.nonce),
                        commitment: Buffer.from(signRes.data.commitment)
                    }
                }
                signerPrivateData[i] = sign
            }

            // Step 3: Exchange commitments
            // Step 4: Get nonces
            for (let i = 0; i < publicData.pubKeys.length; i++) {
                publicData.commitments[i] = signerPrivateData[i].commitment;
                publicData.nonces[i] = signerPrivateData[i].nonce;
            }

            // Step 5: Combine nonces
            publicData.nonceCombined = schnorrSign.sessionNonceCombine(signerSession, publicData.nonces);
            signerPrivateData.forEach(data => (data.combinedNonceParity = signerSession.combinedNonceParity));

            // Step 6: Generate partial signatures (communication round 2)
            for (let i = 0; i < peerList.length; i++) {
                let partialSignature;
                if (peerList[i].address.toLowerCase() === this._account.address.toLowerCase()) {
                    partialSignature = schnorrSign.getPartialSignature(signerPrivateData[i], publicData.message, publicData.nonceCombined, publicData.pubKeyCombined);
                } else {
                    let partialSignatureRes = await this.send(peerList[i].socket, {
                        type: 'GetTxSign',
                        data: {
                            nonceCombined: publicData.nonceCombined,
                            hash: hash
                        }
                    })
                    if (partialSignatureRes.code === 0 || !partialSignatureRes.data) throw new Error(`Other peer failed to partial sign`)
                    partialSignature = BigInteger.fromBuffer(partialSignatureRes.data)
                }
                if (!partialSignature) throw new Error(`Get partial signature failed`)
                signerPrivateData[i].partialSignature = partialSignature

                //Step 7: Exchange partial signatures
                publicData.partialSignatures[i] = partialSignature
            }

            // Step 8: Verify individual partial signatures
            for (let i = 0; i < peerList.length; i++) {
                schnorrSign.partialSigVerify(
                    signerSession,
                    publicData.partialSignatures[i],
                    publicData.nonceCombined,
                    i,
                    publicData.pubKeys[i],
                    publicData.nonces[i]
                );
            }

            // Step 9: Combine partial signatures
            let signature = schnorrSign.partialSigCombine(publicData.nonceCombined, publicData.partialSignatures);

            return {
                message: publicData.message,
                signature: signature,
                addressArr: addressArr
            }
        } catch (e) {
            util.log('err', `Sign transaction error ${e}`)
            return null;
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
            util.log('err', e)
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
                    util.log('msg', `peerInfo find ${v.hostname}:${v.port}`)
                }
            }
            let sockets = await this.findClient(peerInfo.data.nodeId)
            if (sockets.client) {
                return socket.close()
            }

            socket.nodeId = peerInfo.data.nodeId
            socket.publicKey = peerInfo.data.publicKey
            this._clientList.push(socket)

            if (sockets.server) {
                await this.twoWayConnected(sockets.server)
            }
            util.log('msg', `Connected ${socket.connected}. clients pool amount ${this._clientList.length}`)
        } catch (e) {
            util.log('err', e)
        }
    }

    async #clientDisconnectHandler(socket, reason) {
        try {
            await this.#removeClient(socket.nodeId)
            await this.twoWayDisconnect(socket.nodeId)
            let host = socket.io.engine.hostname
            let port = socket.io.engine.port
            if (this._clientTemp.hasOwnProperty(`${host}:${port}`)) {
                delete this._clientTemp[`${host}:${port}`]
            }
            util.log('err', `Disconnected ${socket.nodeId}. clients pool amount ${this._clientList.length}`); // false
        } catch (e) {
            util.log('err', e)
        }
    }

    async #clientErrorHandler(err, nodeId) {
        try {
            if (!nodeId) return false
            let sockets = await this.findClient(nodeId)
            if (sockets.server) {
                sockets.server.disconnect(true)
            }
            // util.log('err', `Connect ${err} ${nodeId}`);
        } catch (e) {
            util.log('err', e)
        }
    }

    async #clientMessageHandler(socket, message) {
        try {
            util.log('msg', `Received client message ${JSON.stringify(message)}`)
            switch (message.type) {
                case "NewPeer":
                    await this.#clientMsgNewPeer(socket, message)
                    break;
                case "sentTx":
                    await this.#clientMsgSentTx(socket, message)
                    break;
                case "sureTx":
                    await this.#clientMsgSureTx(socket, message)
                    break;
            }
        } catch (e) {
            util.log('err', e)
        }
    }

    async #clientMsgNewPeer(socket, message) {
        try {
            if (message.data.nodeId.toLowerCase() === this._account.address.toLowerCase()) return false;
            let sockets = await this.findClient(message.data.nodeId)
            if (sockets.server && sockets.client) return false;

            await this.connectClient(message.data.host, message.data.port)
            // await this.broadcast({
            //     type: "NewPeer",
            //     data: {
            //         host: message.data.host,
            //         port: message.data.port,
            //         nodeId: message.data.nodeId
            //     }
            // })
            // util.log('msg', `broadcast send msg NewPeer ${JSON.stringify(message)}`)
        } catch (e) {
            util.log('err', e)
        }
    }

    async #clientMsgSentTx(socket, message) {
        try {
            let tx = message.data.originTx;
            if (!tx) return false

            let task = this._parent.taskController.find({
                transactionHash: tx.transactionHash,
                fromChainId: tx.fromChainId
            })
            if (!task) return false

            this._parent.taskController.dequeue(task.uuid)
            util.log('msg', `Sent tx get task ${JSON.stringify(task)}`)
        } catch (e) {
            util.log('err', e)
        }
    }

    async #clientMsgSureTx(socket, message) {
        try {
            let {targetHash, fromChainId, toChainId} = message.data;
            if (!targetHash) throw new Error(`Field targetHash does not found`)
            if (!toChainId || !this._parent.watcher.listeners.hasOwnProperty(toChainId)) throw new Error(`Field toChainId does not found`)
            let watcher = this._parent.watcher.listeners[toChainId];
            let tx = await watcher.getTransaction(targetHash)
            if (!tx) throw new Error(`Not found transaction hash ${targetHash}`)
            if (!tx.input.hasOwnProperty("fromChainId") || parseInt(tx.input.fromChainId) !== fromChainId) throw new Error(`Field fromChainId does not match`)
            if (!tx.input.hasOwnProperty("message")) throw new Error(`Field message does not match`)

            let task = this._parent.taskController.find({
                transactionHash: tx.input.message,
                fromChainId: parseInt(tx.input.fromChainId)
            })
            if (!task) throw new Error(`No matching task`)
            this._parent.taskController.remove(task.uuid)
            util.log('msg', `Remove task uuid ${task.uuid}`)

            //write to database
            let block = {
                OriginContract: task.fromContract,
                TargetContract: task.targetContract,
                TargetToken: task.targetToken,
                OriginTransactionHash: task.transactionHash,
                TargetTransactionHash: tx.input.message,
                FromChainId: task.fromChainId,
                ToChainId: task.toChainId,
                From: task.fromAddress,
                To: task.toAddress,
                Amount: task.amount,
                Timestamp: Date.now(),
                Node: tx.from
            }
            await blockChain.writeBlock(block)

            //broadcast to others peer
            await this.broadcast({
                type: "sureTx",
                data: {
                    targetHash: targetHash,
                    fromChainId: fromChainId,
                    toChainId: toChainId
                }
            })
        } catch (e) {
            util.log('err', e)
        }
    }

    async #removeClient(nodeId) {
        try {
            if (nodeId) {
                this._clientList = this._clientList.filter((item) => item.nodeId.toLowerCase() !== nodeId.toLowerCase());
            }
        } catch (e) {
            util.log('err', e)
        }
    }
}

module.exports = Socket;
