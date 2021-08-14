const config = require('../config/config')
let util = require('../util/util')
let account = require("../library/account");
let TaskList = require("../library/tasklist");
let Socket = require("../network/socket/socket")
let Watcher = require('../watcher/index');
let HttpServer = require('../network/http/http')
let blockChain = require("./blockChain")
let taskController = new TaskList(1);
let watcher = null
let newServer = null
let MintStatus = false

class Node {
    neighbours = {};

    constructor() {

    }

    async initVerifyPeer() {
        this.taskController = taskController
        taskController.taskHandle = this.sendToContract

        this.accountInfo = await account.initNode();
        this.setNeighbour(this.accountInfo.address.substr(2).toLowerCase())

        //server
        newServer = Socket.getInstance(this, this.accountInfo)
        this.newServer = newServer
        if (config.peers.seed.host) {
            await this.newServer.connectClient(config.peers.seed.host, config.peers.seed.port)
        }

        // watcher
        watcher = Watcher.getInstance(this, this.accountInfo)
        this.watcher = watcher

        //http
        HttpServer.getInstance(this)

        // Init temp task
        await this.initTempTask()

        setInterval(() => {
            this.taskController.dequeue()
        }, 1000)
    }

    async initTempTask() {
        try {
            let tempList = await blockChain.getTempBlockList()
            tempList.forEach((item, key) => {
                let task = JSON.parse(item.value)
                if (task.done || task.targetHash) {
                    this.handleSubmittedTx(task)
                } else {
                    this.taskController.enqueue(task)
                }
            })
        } catch (e) {
            util.log('err', e)
        }
    }

    async handleSubmittedTx(task) {
        try {
            if (!watcher.listeners.hasOwnProperty(task.toChainId)) return false
            let bridge = watcher.listeners[task.toChainId]
            let tx = await bridge.getTransaction(task.targetHash)
            if (tx) {
                await bridge.recordAndBroadcastTask(task)
            } else {
                task.done = false
                task.targetHash = null
                this.taskController.enqueue(task)
            }
        } catch (e) {
            util.log('err', e)
        }
    }

    async getCurrentRoundMaster() {
        let round = this.currentRound(Date.now() / 1000, 1595431050, 30)
        let roundInfo = await util.httpGet(`https://drand.cloudflare.com/public/${round}`);
        if (roundInfo.success) {
            let randomness = JSON.parse(roundInfo.data).randomness;
            let peers = this.getClosestNeighbours(randomness)
            // console.log(peers);
            return peers
        }
        return false
    }

    getClosestNeighbours(randomness) {
        randomness = randomness.substr(0, 40);
        var distances = [];
        for (const peer in this.neighbours) {
            distances.push({peer: peer, distance: this.distance(Buffer.from(randomness), Buffer.from(peer))});
        }
        distances.sort((a, b) => {
            return this.compare(a.distance, b.distance)
        });
        return distances
    }

    distance(a, b) {
        if (a.length !== b.length) throw new Error('Inputs should have the same length')
        var result = Buffer.allocUnsafe(a.length)
        for (var i = 0; i < a.length; i++) result[i] = a[i] ^ b[i]
        return result
    }

    compare(a, b) {
        if (a.length !== b.length) throw new Error('Inputs should have the same length')
        for (var i = 0; i < a.length; i++) {
            if (a[i] === b[i]) continue
            return a[i] < b[i] ? -1 : 1
        }
        return 0
    }

    setNeighbour(peerId) {
        this.neighbours[peerId] = {"peerId": peerId, ip: ""};
    }

    delNeighbour(peerId) {
        if (this.neighbours.hasOwnProperty(peerId)) {
            delete this.neighbours[peerId]
        }
    }

    currentRound(now, genesis, period) {
        if (now < genesis) {
            // round 0 is the genesis block: signature is the genesis seed
            return 0
        }
        let fromGenesis = now - genesis;
        // we take the time from genesis divided by the periods in seconds, that
        // gives us the number of periods since genesis.  We add +1 because round 1
        // starts at genesis time.
        // let round = Math.floor(fromGenesis / period) + 1
        let round = Math.floor(fromGenesis / period) - 1
        // time = genesis + int64(nextRound*uint64(period.Seconds()))
        return round
    }

    /**
     * call contract function if watcher get transcation info
     * @param {*} params
     */
    async sendToContract(task) {
        try {
            if (!task) throw new Error(`Not found task`)
            if (task.done || task.targetHash) throw new Error(`Task submitted uuid: ${task.uuid} targetHash: ${task.targetHash}`)

            switch (task.type) {
                case 1:
                    //Execute p2p task
                    break;
                case 2:
                    util.log('msg', `Start processing task. uuid:${task.uuid}. transactionHash: ${task.transactionHash}. fromChainId:${task.fromChainId}. toChainId:${task.toChainId}`)
                    if (!watcher || !watcher.listeners.hasOwnProperty(task.toChainId)) return taskController.resume(task.uuid)
                    let hash = await watcher.listeners[task.toChainId].sendToContract(task)
                    if (!hash) return taskController.resume(task.uuid)

                    taskController.update(task.uuid, {targetHash: hash, done: true})
                    await blockChain.updateTempBlock(task.fromChainId, task.transactionHash, {
                        targetHash: hash,
                        done: true
                    })
                    await newServer.broadcast({
                        type: "sentTx",
                        data: {
                            originTx: {
                                transactionHash: task.transactionHash,
                                originContract: task.originContract,
                                targetToken: task.targetToken,
                                amount: task.amount,
                                toAddress: task.toAddress,
                                fromChainId: task.fromChainId,
                                toChainId: task.toChainId,
                                type: task.type,
                                timeout: task.timeout
                            },
                            targetHash: hash
                        }
                    })
                    util.log('msg', `Task uuid: ${task.uuid} hash: ${hash}`)
                    break;
            }
            MintStatus = false
        } catch (e) {
            util.log('err', e)
            MintStatus = false
        }
    }

    async getVerifyPeers() {
        try {
            let res = await util.httpGet(config.peers.originUrl)
            if (!res.success) {
                return false
            }

            let peers = JSON.parse(res.data)
            peers.map((v) => {
                let address = v.substr(2).toLowerCase()
                if (!this.neighbours.hasOwnProperty(address)) {
                    this.setNeighbour(address);
                }
            })
            // console.log(peers)
        } catch (e) {
            util.log('err', e)
            return false
        }
    }

    async getVerifyPeerList() {
        try {
            let peerList = []
            newServer._clientList.forEach((item) => {
                peerList.push({
                    address: item.nodeId,
                    publicKey: item.publicKey,
                    socket: item
                })
            })
            return peerList
        } catch (e) {
            util.log('err', e)
            return false
        }
    }
}

module.exports = Node
