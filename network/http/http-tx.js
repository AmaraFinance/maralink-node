let blockChain = require("../../core/blockChain")
let Socket = require("../socket/socket")

exports.getTransaction = async function (req, res) {
    try {
        let {chainId, hash} = req.query
        if (!chainId) return res.json({code: 300, msg: "Missing parameters"});
        if (!hash) return res.json({code: 300, msg: "Missing parameters"});

        let result = await blockChain.getTransactionByHash(chainId, hash)
        return result ? res.json({code: 200, tx: result}) : res.json({code: 300, msg: "Not found transaction"});
    } catch (e) {
        console.error(e)
        return res.json({code: 300, msg: "DB_ERROR"});
    }
};

exports.getPeerCount = async function (req, res) {
    try {
        let socketServer = Socket.getInstance()
        return res.json({code: 200, data: socketServer._clientList.length + 1});
    } catch (e) {
        console.error(e)
        return res.json({code: 300, msg: "DB_ERROR"});
    }
};
