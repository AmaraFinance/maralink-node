const config = require('../config/config')
let util = require('../util/util')

async function initMint() {
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