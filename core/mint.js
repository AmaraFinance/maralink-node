const config = require('../config/config')
let util = require('../util/util')
let serverModel = require('./server')

async function initMint() {
    try {
        if (global.BLOCK_SYNC) {
            util.log('err', `During block synchronization, mining cannot be started temporarily`)
            return false
        }
        if (global.VERIFY_PEERS.length < 3) {
            throw 'Validator nodes are greater than two'
        }
        if (global.NOW_VERIFY_PEER !== global.NODE_ID) {
            throw 'Waiting for the master node block to submit'
        }
        if (await global.TXPOOL.Length() <= 0) {
            if (!global.TXPOOL_BROADCAST) {
                global.TXPOOL_BROADCAST = setInterval(function () {
                    serverModel.broadcast({
                        type: "reqTxPool",
                        data: {
                            length: 10,
                            from: "earliest"
                        }
                    })
                }, 10000)
            }
            throw 'The transaction pool is empty'
        } else {
            clearInterval(global.TXPOOL_BROADCAST)
        }


    } catch (e) {
        util.log('err', e)
        setTimeout(function () {
            initMint()
        }, 1000)
    }
}

async function restartMint() {
    try {

    } catch (e) {
        util.log('err', e)
    }
}

async function checkPeers() {
    try {
        return (global.VERIFY_PEERS.length >= 3);
    } catch (e) {
        util.log('err', e)
        return false
    }
}

exports.initMint = initMint