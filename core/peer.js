const config = require('../config/config')
let util = require('../util/util')

async function initVerifyPeer() {
    try {
        await getVerifyPeers()
        setInterval(function () {
            getVerifyPeers()
        }, 15 * 1000)
    } catch (e) {
        util.log('err', e)
        return false
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
