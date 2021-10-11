let util = require('../util/util')
let ioUtil = require("./ioUtil");
let ethUtil = require('ethereumjs-util');
var ethers = require('ethers');
var crypto = require('crypto');

async function initNode() {
    try {
        let initNode = await this.InitNodeAccount()
        if (initNode) {
            util.log('info', initNode)
            return initNode
        }
        return false
    } catch (e) {
        util.log("fatal", `Init account error`)
        util.log("fatal", e)
        return false
    }
}

async function InitNodeAccount() {
    let isExists = await ioUtil.fileExists("./pem");
    if (isExists) {
        try {
            let content = await ioUtil.readFile("./pem");
            content = JSON.parse(content);
            if (!content.hasOwnProperty('privateKey')) {
                throw new Error("error format pem file")
            }
            content.privateKey = content.privateKey.substr(0, 2).toLowerCase() === '0x' ? content.privateKey : '0x' + content.privateKey
            if (!content.hasOwnProperty('privateKey') || !content.publicKey || content.length > 68) {
                var wallet = new ethers.Wallet(content.privateKey);
                util.log("debug", "Address: " + wallet.address);
                let result = {
                    privateKey: content.privateKey,
                    publicKey: ethers.utils.computePublicKey(wallet.publicKey, true),
                    address: wallet.address
                }
                await ioUtil.writeFile("./pem", JSON.stringify(result));
                return result
            }

            return content
        } catch (ex) {
            throw new Error("error format pem file")
        }
    } else {
        var id = crypto.randomBytes(32).toString('hex');
        var privateKey = "0x" + id;
        util.log("debug", "SAVE BUT DO NOT SHARE THIS:" + privateKey);

        var wallet = new ethers.Wallet(privateKey);
        util.log("debug", "Address: " + wallet.address);
        let result = {
            privateKey: privateKey,
            publicKey: ethers.utils.computePublicKey(wallet.publicKey, true),
            address: wallet.address
        }
        await ioUtil.writeFile("./pem", JSON.stringify(result));
        return result
    }
}

async function pubToAddress(publicKey) {
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

exports.initNode = initNode
exports.InitNodeAccount = InitNodeAccount
exports.pubToAddress = pubToAddress
