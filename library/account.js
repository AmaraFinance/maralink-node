let util = require('../util/util')
let ioUtil = require("./ioUtil");
var ethers = require('ethers');
var crypto = require('crypto');
exports.initNode = async () => {
    let initNode = await this.InitNodeAccount()
    if (initNode) {
        global.NODE_ID = initNode.address;
        global.NODE_INFO = initNode;
        
        util.log('msg', initNode)
    }
    return initNode
}

exports.InitNodeAccount = async () => {
    let isExists=await ioUtil.fileExists("./pem");
    if (isExists) {
        try{
            let content=await ioUtil.readFile("./pem");
            content=JSON.parse(content);
            return content;
        }catch(ex){
            throw new Error("error format pem file")
        }
    } else {
        var id = crypto.randomBytes(32).toString('hex');
        var privateKey = "0x" + id;
        console.log("SAVE BUT DO NOT SHARE THIS:", privateKey);

        var wallet = new ethers.Wallet(privateKey);
        console.log("Address: " + wallet.address);
        let result= {
            privateKey: privateKey,
            publicKey: wallet.publicKey,
            address: wallet.address
        }
        await ioUtil.writeFile("./pem",JSON.stringify(result));
        return result
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