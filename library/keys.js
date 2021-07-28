let fs = require('fs')
let EC = require('elliptic').ec
let ec = new EC('secp256k1')
let keypair = ec.genKeyPair()

let { hdkey } = require('ethereumjs-wallet')
let ethUtil = require('ethereumjs-util')
let bip39 = require('bip39')

let Account = require('./account.js')
const keys = genKeys()

function getPub(privateKey) {

    const privateKeyBuffer = ethUtil.toBuffer(privateKey);
    // Get public key
    let publicKey = ethUtil.privateToPublic(privateKeyBuffer);
    publicKey = ethUtil.bufferToHex(publicKey);
    console.log(publicKey);
    return publicKey
    // return ec.keyFromPrivate(privateKey).getPublic('hex').toString()
}

function genKeys() {
    const fileName = `${__dirname}/woniu-wallet.json`
    try {
        let res = JSON.parse(fs.readFileSync(fileName))
        if (res.privateKey && res.publicKey ) {
            // keypair = ec.keyFromPrivate(res.privateKey)
            return res
        } else {
            throw new Error('not valid json')
        }
    } catch (error) {

        let res = account.createAccount();

        // let res = {
        //   privateKey: keypair.getPrivate('hex').toString(),
        //   pub: keypair.getPublic('hex').toString()
        // }
        fs.writeFileSync(fileName, JSON.stringify(res))
        return res
    }
}

function signMsg(value, privateKey = keys.privateKey) {
    const keypairTemp = ec.keyFromPrivate(privateKey)
    const buffferMsg = Buffer.from(value)
    let hexSignature = Buffer.from(keypairTemp.sign(buffferMsg).toDER()).toString('hex')

    return hexSignature
}

function verifyMsg(value, sig, pub) {
    const keypairTemp = ec.keyFromPublic(pub, 'hex')
    let binaryMessage = Buffer.from(value)

    return keypairTemp.verify(binaryMessage, sig)
}

function sign({from, to, amount, timestamp}) {
    return signMsg(`${timestamp}-${amount}-${from}-${to}`)

    // const buffferMsg = Buffer.from(`${from}-${to}-${amount}`)
    // let hexSignature = Buffer.from(keypair.sign(buffferMsg).toDER()).toString('hex')
    // return hexSignature
}

function verify({from, to, amount, timestamp, sig}) {
    return verifyMsg(`${timestamp}-${amount}-${from}-${to}`, sig, from)
    // const keypairTemp = ec.keyFromPublic(pub, 'hex')

    // let binaryMessage = Buffer.from(`${from}-${to}-${amount}`)
    // return keypairTemp.verify(binaryMessage, sig)
}

module.exports = {keys, sign, verify, signMsg, verifyMsg, getPub}
