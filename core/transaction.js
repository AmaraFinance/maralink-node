const config = require('../config/config')
let util = require('../util/util')

async function findNewTransaction(hash, notBroadcast) {
    try {
        let transaction = await getOriginTxByHash(hash)
        if (!transaction) throw `Not found transaction. hash:  ${hash}`

        let input = util.decodeInput(transaction.input)
        if (!input) throw `Decode input error. hash: ${hash}`
        if (input.name !== "setData") return false;

        let newTransaction = {
            blockNumber: transaction.blockNumber,
            transactionIndex: transaction.transactionIndex,
            transactionHash: transaction.hash,
            coinType: input.params[2].value,
            targetAddress: input.params[3].value,
            amount: input.params[4].value,
            fromAddress: transaction.from,
            toAddress: input.params[5].value,
        }

        let res = await global.TXPOOL.Push(newTransaction)
        if (!notBroadcast && res) {
            util.log('msg', `Find new transaction ${JSON.stringify(newTransaction)}`)
            await broadcastTx(hash)
        }
        return true;
    } catch (e) {
        util.log('err', e)
        return false
    }
}

async function getNewTransaction(hash) {
    try {
        await findNewTransaction(hash)
    } catch (e) {
        util.log('err', e)
    }
}

async function getOriginTxByHash(hash) {
    try {
        let transaction = await global.WEB3_HTTP.eth.getTransaction(hash)
        return transaction ? transaction : null;
    } catch (e) {
        util.log('err', e)
        return null
    }
}

async function broadcastTx(hash) {
    try {
        await clientSocket.broadcast({
            type: "NewTransaction",
            data: {
                hash: hash
            }
        })
    } catch (e) {
        util.log('err', e)
    }
}


exports.findNewTransaction = findNewTransaction;
exports.getNewTransaction = getNewTransaction;
exports.getOriginTxByHash = getOriginTxByHash;