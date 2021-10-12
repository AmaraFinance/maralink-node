const util = require("../../util/util");
const blockChain = require("../../library/blockChain");

async function handleServerMessage(that, socket, message, callback) {
    switch (message.type) {
        case "PeerInfo":
            await msgPeerInfo(that, socket, message, callback)
            break;
        case "FindTx":
            await msgFindTx(that, socket, message, callback)
    }
}

async function msgPeerInfo(that, socket, parameter, callback) {
    try {
        let clients = []
        for (let v of that._clientList) {
            clients.push({
                hostname: v.io.opts.hostname,
                port: v.io.opts.port
            })
        }
        callback && callback(null, {
            publicKey: that._account.publicKey,
            nodeId: that._account.address,
            clients: clients
        })
    } catch (e) {
        util.log('error', e)
        socket.disconnect(true)
    }
}

async function msgFindTx(that, socket, parameter, callback) {
    try {
        let result = await blockChain.getTransactionByHash(parameter.data.chainId, parameter.data.hash)
        if (result) {
            callback && callback(null, {
                Type: 2,
                OriginTransactionHash: result.OriginTransactionHash,
                TargetTransactionHash: result.TargetTransactionHash,
                From: result.From,
                To: result.To,
                Amount: result.Amount
            })
        }

        result = await blockChain.getTempTransaction(parameter.data.chainId, parameter.data.hash)
        if (result) {
            callback && callback(null, {
                Type: 1,
                OriginTransactionHash: result.transactionHash,
                TargetTransactionHash: "",
                From: result.fromAddress,
                To: result.toAddress,
                Amount: result.amount
            })
        }
        util.log("trace",`Find tx chainId: ${parameter.data.chainId} hash: ${parameter.data.hash}. result: ${result}`)
        callback && callback("Not found transaction")
    } catch (e) {
        util.log('error', e)
    }
}

exports.handleServerMessage = handleServerMessage
