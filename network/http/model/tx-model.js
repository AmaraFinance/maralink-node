const blockChain = require("../../../library/blockChain");
const util = require("../../../util/util");

exports.getTransaction = async (chainId, hash) => {
    try {
        let result = await blockChain.getTransactionByHash(chainId, hash)
        if (result) {
            return {
                Type: 2,
                OriginTransactionHash: result.OriginTransactionHash,
                TargetTransactionHash: result.TargetTransactionHash,
                From: result.From,
                To: result.To,
                Amount: result.Amount
            }
        }

        result = await blockChain.getTempTransaction(chainId, hash)
        if (result) {
            return {
                Type: 1,
                OriginTransactionHash: result.transactionHash,
                TargetTransactionHash: "",
                From: result.fromAddress,
                To: result.toAddress,
                Amount: result.amount
            }
        }

        return null
    } catch (e) {
        util.log("error", e)
        return null;
    }
}
