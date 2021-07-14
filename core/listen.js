const config = require('../config/config')
let transaction = require('.//transaction')
let util = require('../util/util')
let Web3 = require('web3');

async function initWeb3Http() {
    if (global.WEB3_HTTP && typeof global.WEB3_HTTP !== 'undefined') {
        global.WEB3_HTTP = new Web3(global.WEB3_HTTP.currentProvider);
    } else {
        global.WEB3_HTTP = new Web3(new Web3.providers.HttpProvider(config.originChainHttp))
    }
}

async function initWeb3Wss() {
    if (global.WEB3_WSS) {
        global.WEB3_WSS.setProvider(new Web3.providers.WebsocketProvider(config.originChainWss));
    } else {
        global.WEB3_WSS = new Web3(new Web3.providers.WebsocketProvider(config.originChainWss))
    }
}

async function initStartListen() {
    try {
        await initWeb3Wss()

        if (!global.WEB3_LISTEN) {
            global.WEB3_LISTEN = global.WEB3_WSS.eth.subscribe("logs", {})
                .on("connected", function (subscriptionId) {
                    util.log('msg', `Start mint transaction. subscriptionId ${subscriptionId}. ${new Date().toLocaleString()}`)
                })
                .on('data', async function (event) {
                    if (event.address.toLowerCase() === config.initBlock.OriginContract.toLowerCase()) {
                        await transaction.findNewTransaction(event.transactionHash)
                    }
                })
                .on('error', async function (error, receipt) {
                    util.log('err', `Listen contract logs error. ${error}`)
                    await global.WEB3_LISTEN.unsubscribe()
                    global.WEB3_LISTEN = null
                    await initStartListen()
                });
        } else {
            util.log('err', `The listening event has been initialized`)
        }
    } catch (e) {
        util.log('err', e)
    }
}

async function stopListen() {
    try {
        // global.WEB3_WSS.eth.clearSubscriptions();
        await global.WEB3_LISTEN.unsubscribe()
        global.WEB3_LISTEN = null
        util.log('msg', `Listening to the contract logs has stopped`)
    } catch (e) {
        util.log('err', e)
    }
}


exports.initStartListen = initStartListen;
exports.stopListen = stopListen;
exports.initWeb3Http = initWeb3Http