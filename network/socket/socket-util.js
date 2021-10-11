const soltypes = require("soltypes");
const util = require("../../util/util");

async function signTransaction(hash) {
    try {
        return {
            message: soltypes.Bytes32.from(hash).toBuffer()
        }
    } catch (e) {
        util.log('debug', `Sign transaction error ${e}`)
        return null;
    }
}

exports.signTransaction = signTransaction;