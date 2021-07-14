const {hdkey} = require('ethereumjs-wallet')
let ethUtil = require('ethereumjs-util');
let bip39 = require('bip39');
let config = require('../config/config')
let util = require('../util/util')

exports.initNode = async () => {
    let initNode = await this.InitNodeAccount()
    if (initNode) {
        global.NODE_ID = initNode.address
        global.NODE_INFO = initNode
        util.log('msg', initNode)
    }
    return initNode
}

exports.InitNodeAccount = async () => {
    let mnemonic = config.mnemonic;
    if (!mnemonic) return false;

    let seed = bip39.mnemonicToSeedSync(mnemonic)
    let hdWallet = hdkey.fromMasterSeed(seed)

    let key = hdWallet.derivePath("m/44'/60'/0'/0/0")
    let privateKey = ethUtil.bufferToHex(key._hdkey._privateKey);
    let publicKey = ethUtil.bufferToHex(key._hdkey._publicKey);
    let address = ethUtil.pubToAddress(key._hdkey._publicKey, true)

    // address = ethUtil.toChecksumAddress(`0x${address.toString('hex')}`)
    address = `0x${address.toString('hex')}`.toLowerCase()
    return {
        mnemonic: mnemonic,
        privateKey: privateKey,
        publicKey: publicKey,
        address: address
    }
}

exports.pubToAddress = async (publicKey) => {
    try {
        if (publicKey.substr(0, 2).toLowerCase() === "0x") {
            publicKey = publicKey.substr(2)
        }
        let address = ethUtil.pubToAddress(Buffer.from(publicKey, "hex"), true).toString('hex')
        return `0x${address.toString('hex')}`.toLowerCase()
    } catch (e) {
        return null;
    }
}