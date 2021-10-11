const util = require("../../util/util");
const blockChain = require("../../library/blockChain");

async function handleClientMessage(that, socket, message) {
    switch (message.type) {
        case "NewPeer":
            await clientMsgNewPeer(that, socket, message)
            break;
        // case "receiveLockTx":
        //     await clientMsgReceiveLockTx(that, socket, message)
        //     break;
        case "findTx":
            await clientMsgFindTx(that, socket, message)
            break;
        case "sentTx":
            await clientMsgSentTx(that, socket, message)
            break;
        case "sureTx":
            await clientMsgSureTx(that, socket, message)
            break;
    }
}

async function clientMsgNewPeer(that, socket, message) {
    try {
        if (message.data.nodeId.toLowerCase() === that._account.address.toLowerCase()) return false;
        let sockets = await that.findClient(message.data.nodeId)
        if (sockets.server && sockets.client) return false;

        await that.connectClient(message.data.host, message.data.port)
    } catch (e) {
        util.log('error', e)
    }
}

// async function clientMsgReceiveLockTx(that, socket, message) {
//     try {
//         let task = that._parent.taskController.find({
//             transactionHash: message.data.task.transactionHash,
//             fromChainId: message.data.task.fromChainId
//         })
//         if (task) return false
//
//         if (!that._parent.watcher.listeners.hasOwnProperty(message.data.fromChainId)) return false
//         let watcher = that._parent.watcher.listeners[message.data.fromChainId]
//         await watcher.recordAndBroadcastTemp(message.data.task, message.data.blockTime)
//     } catch (e) {
//         util.log('error', e)
//         return false
//     }
// }

async function clientMsgFindTx(that, socket, message) {
    try {
        if (!that._parent.watcher.listeners.hasOwnProperty(message.data.fromChainId)) {
            return false
        }
        let watcher = that._parent.watcher.listeners[message.data.fromChainId]
        await watcher.addToTempTask(message.data.transactionHash)
    } catch (e) {
        util.log('error', e)
        return false
    }
}

async function clientMsgSentTx(that, socket, message) {
    try {
        let tx = message.data.originTx;
        if (!tx) return false

        let task = that._parent.taskController.find({
            transactionHash: tx.transactionHash,
            fromChainId: tx.fromChainId
        })
        if (!task) return false

        that._parent.taskController.dequeue(task.uuid)
        util.log('debug', `Sent tx get task ${JSON.stringify(task)}`)
    } catch (e) {
        util.log('error', e)
    }
}

async function clientMsgSureTx(that, socket, message) {
    try {
        let {targetHash, fromChainId, toChainId} = message.data;
        if (!targetHash) throw new Error(`Field targetHash does not found`)
        if (!toChainId || !that._parent.watcher.listeners.hasOwnProperty(toChainId)) throw new Error(`Field toChainId does not found`)
        let watcher = that._parent.watcher.listeners[toChainId];
        let tx = await watcher.getTransaction(targetHash)
        if (!tx) throw new Error(`Not found transaction hash ${targetHash}`)
        if (!tx.input.hasOwnProperty("fromChainId") || parseInt(tx.input.fromChainId) !== fromChainId) throw new Error(`Field fromChainId does not match`)
        if (!tx.input.hasOwnProperty("message")) throw new Error(`Field message does not match`)

        let task = that._parent.taskController.find({
            transactionHash: tx.input.message,
            fromChainId: parseInt(tx.input.fromChainId)
        })
        if (!task) throw new Error(`No matching task`)
        that._parent.taskController.remove(task.uuid)
        util.log('debug', `Remove task uuid ${task.uuid}`)

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
        await that.broadcast({
            type: "sureTx",
            data: {
                targetHash: targetHash,
                fromChainId: fromChainId,
                toChainId: toChainId
            }
        })
    } catch (e) {
        util.log('debug', e)
    }
}

exports.handleClientMessage = handleClientMessage