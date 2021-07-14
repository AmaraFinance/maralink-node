const config = require('../config/config')
let util = require('../util/util')
let account = require("../library/account");
let TaskList = require("../library/tasklist");
let Watcher = require('../watcher/index');
let neighbours = {};
let taskController = new TaskList(1);
let watcher = null
let MintStatus = false
taskController.taskHandle = sendToContract

async function getCurrentRoundMaster() {
    let round = currentRound(Date.now() / 1000, 1595431050, 30)
    let roundInfo = await util.httpGet(`https://drand.cloudflare.com/public/${round}`);
    if (roundInfo.success) {
        let randomness = JSON.parse(roundInfo.data).randomness;
        let peers = getClosestNeighbours(randomness)
        // console.log(peers);
        return peers
    }
    return false
}

function getClosestNeighbours(randomness) {
    randomness = randomness.substr(0, 40);
    var distances = [];
    for (const peer in neighbours) {
        distances.push({peer: peer, distance: distance(Buffer.from(randomness), Buffer.from(peer))});
    }
    distances.sort((a, b) => {
        return gt(a.distance, b.distance)
    });
    return distances
}

function distance(a, b) {
    if (a.length !== b.length) throw new Error('Inputs should have the same length')
    var result = Buffer.allocUnsafe(a.length)
    for (var i = 0; i < a.length; i++) result[i] = a[i] ^ b[i]
    return result
}

function compare(a, b) {
    if (a.length !== b.length) throw new Error('Inputs should have the same length')
    for (var i = 0; i < a.length; i++) {
        if (a[i] === b[i]) continue
        return a[i] < b[i] ? -1 : 1
    }
    return 0
}

function gt(a, b) {
    return compare(a, b) === 1
}

function setNeighbour(peerId) {
    neighbours[peerId] = {"peerId": peerId, ip: ""};
}

function currentRound(now, genesis, period) {
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

async function initVerifyPeer() {
    try {
        let accountInfo = await account.initNode();
        setNeighbour(accountInfo.address.substr(2));

        // wathcer
        watcher = new Watcher(this, accountInfo)
        watcher.loadAllListener()

        await getVerifyPeers()
        setInterval(function () {
            getVerifyPeers()
        }, 15 * 1000)

        setInterval(() => {
            startMint(accountInfo, watcher)
        }, 1 * 1000)
    } catch (e) {
        util.log('err', e)
        return false
    }
}

async function startMint(account) {
    try {
        util.log('msg', `MintStatus: ${MintStatus}`)
        if (MintStatus) {
            return false
        }
        MintStatus = true


        let currentRoundMaster = await getCurrentRoundMaster()
        if (!currentRoundMaster) {
            MintStatus = false
            return false
        }

        currentRoundMaster = currentRoundMaster[0]
        if (currentRoundMaster.peer.toLowerCase() !== account.address.substr(2).toLowerCase()) {
            MintStatus = false
            return false
        }

        let res = taskController.dequeue()
        if (!res) {
            MintStatus = false
        }

        return true
    } catch (e) {
        util.log('err', e)
        return false
    }
}

/**
 * call contract function if watcher get transcation info
 * @param {*} params
 */
async function sendToContract(task) {
    console.log("task", task)
    try {
        if (!task) {
            MintStatus = false
            return false
        }
        switch (task.type) {
            case 1:
                //Execute p2p task
                break;
            case 2:
                if (!watcher || !watcher.listeners.hasOwnProperty(task.toChainId)) {
                    return taskController.resume(task.uuid)
                }

                let listener = watcher.listeners[task.toChainId]
                let hash = await listener.sendToContract(task)
                if (!hash) {
                    return taskController.resume(task.uuid)
                }

                //add mint hash to pendingList
                // taskController.
                break;
        }
        MintStatus = false
    } catch (e) {
        util.log('err', e)
        MintStatus = false
    }
}

async function getVerifyPeers() {
    try {
        let res = await util.httpGet(config.peers.originUrl)
        if (!res.success) {
            return false
        }

        let peers = JSON.parse(res.data)
        global.VERIFY_PEERS = peers.map((v) => {
            return v.toLowerCase()
        }).sort()

        await initOnlinePeers(peers)
        return true
    } catch (e) {
        util.log('err', e)
        return false
    }
}

async function initOnlinePeers(peers) {
    try {
        peers = peers.sort()
        let onlinePeers = []
        for (let v of peers) {
            if (global.SOCKET_LIST.hasOwnProperty(v.toLowerCase())) {
                onlinePeers.push(v.toLowerCase())
            }
            if (global.NODE_ID.toLowerCase() === v.toLowerCase()) {
                onlinePeers.push(v.toLowerCase())
            }
        }
        global.VERIFY_ONLINE_PEERS = onlinePeers.sort()
        return true
    } catch (e) {
        util.log('err', e)
        return false
    }
}

async function insertOnlinePeer(peer) {
    try {
        if (!peer) {
            return false
        }
        peer = peer.toLowerCase()
        if (global.VERIFY_PEERS.indexOf(peer) === -1) {
            return false
        }
        if (global.VERIFY_ONLINE_PEERS.indexOf(peer) !== -1) {
            return false
        }
        if (!global.SOCKET_LIST.hasOwnProperty(peer)) {
            return false
        }

        let onlinePeers = global.VERIFY_ONLINE_PEERS
        onlinePeers.push(peer)
        global.VERIFY_ONLINE_PEERS = onlinePeers.sort()
        return true;
    } catch (e) {
        util.log('err', e)
        return false
    }
}

async function delOnlinePeer(peer) {
    try {
        if (!peer) {
            return false
        }
        peer = peer.toLowerCase()
        if (global.VERIFY_ONLINE_PEERS.indexOf(peer) === -1) {
            return false
        }
        if (global.SOCKET_LIST.hasOwnProperty(peer)) {
            return false
        }

        global.VERIFY_ONLINE_PEERS.splice(global.VERIFY_ONLINE_PEERS.indexOf(peer), 1)
        return true;
    } catch (e) {
        util.log('err', e)
        return false
    }
}

exports.initVerifyPeer = initVerifyPeer;
exports.getVerifyPeers = getVerifyPeers;
exports.initOnlinePeers = initOnlinePeers;
exports.insertOnlinePeer = insertOnlinePeer;
exports.delOnlinePeer = delOnlinePeer;
exports.getCurrentRoundMaster = getCurrentRoundMaster;
exports.setNeighbour = setNeighbour;
exports.taskController = taskController
