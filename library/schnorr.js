const schnorr = require('bip-schnorr');
const convert = schnorr.convert;
const muSig = schnorr.muSig;
const BigInteger = require('bigi');
const randomBytes = require('random-bytes');
const randomBuffer = (len) => Buffer.from(randomBytes.sync(len));
const math = require('bip-schnorr').math
let util = require("../util/util")

exports.publicKeyCombine = (pubKeys) => {
    try {
        let pubKeyHash = muSig.computeEll(pubKeys);
        const pkCombined = muSig.pubKeyCombine(pubKeys, pubKeyHash);
        let pubKeyCombined = convert.intToBuffer(pkCombined.affineX);
        let pubKeyParity = math.isEven(pkCombined);

        return {
            pubKeyHash: pubKeyHash,
            pubKeyCombined: pubKeyCombined,
            pubKeyParity: pubKeyParity
        }
    } catch (e) {
        util.log("error", e)
        return null
    }
}

exports.signByPrivate = (publicData, idx, privateKey) => {
    try {
        privateKey = (privateKey.substr(0, 2).toLowerCase() === '0x') ? privateKey.substr(2) : privateKey
        privateKey = BigInteger.fromHex(privateKey)

        const sessionId = randomBuffer(32); // must never be reused between sessions!
        let signerSession = muSig.sessionInitialize(
            sessionId,
            privateKey,
            publicData.message,
            publicData.pubKeyCombined,
            publicData.pubKeyParity,
            publicData.pubKeyHash,
            idx
        );
        return signerSession
    } catch (e) {
        util.log("error", e)
        return false
    }
}

exports.getPartialSignature = (session, message, nonceCombined, pubKeyCombined) => {
    return muSig.partialSign(session, message, nonceCombined, pubKeyCombined);
}

exports.sessionNonceCombine = (session, nonce) => {
    return muSig.sessionNonceCombine(session, nonce);
}

exports.partialSigVerify = (session, partialSignature, nonceCombined, idx, pubKey, nonce) => {
    return muSig.partialSigVerify(session, partialSignature, nonceCombined, idx, pubKey, nonce);
}

exports.partialSigCombine = (nonceCombined, partialSignatures) => {
    return muSig.partialSigCombine(nonceCombined, partialSignatures);
}