let Socket = require("../socket/socket")
let util = require('../../util/util')
let txModel = require('./model/tx-model')

exports.getTransaction = async function (req, res) {
    try {
        let {chainId, hash} = req.query
        if (!chainId) return res.json({code: 300, msg: "Missing parameters"});
        if (!hash) return res.json({code: 300, msg: "Missing parameters"});

        let data = await txModel.getTransaction(chainId, hash)
        if (!data) {
            let sockets = require('../socket/socket').getInstance()
            const promiseArr = []
            promiseArr.push(new Promise(function (resolve, reject) {
                setTimeout(() => {
                    resolve(null)
                }, 30 * 1000)
            }),)
            for (let i = 0; i < Object.keys(sockets._server.sockets.sockets).length; i++) {
                promiseArr.push(new Promise(async function (resolve, reject) {
                    let sendRes = await sockets.send(sockets._clientList[i], {
                        type: "FindTx",
                        data: {
                            hash: hash,
                            chainId: chainId
                        }
                    })
                    if (sendRes.code === 1) {
                        resolve(sendRes.data)
                    }
                }))
            }

            data = await Promise.any(promiseArr);
        }

        return data ? res.json({code: 200, tx: data}) : res.json({code: 300, msg: "Not found transaction"});
    } catch (e) {
        util.log("error", e)
        return res.json({code: 300, msg: "DB_ERROR"});
    }
};

exports.getPeerCount = async function (req, res) {
    try {
        let socketServer = Socket.getInstance()
        return res.json({code: 200, data: socketServer._clientList.length + 1});
    } catch (e) {
        util.log("error", e)
        return res.json({code: 300, msg: "DB_ERROR"});
    }
};
