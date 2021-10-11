const tables = require('cli-table')
const {keccak256} = require('ethereumjs-util')
const BN = require('bn.js')
const request = require('request')
const abiDecoder = require('abi-decoder'); // NodeJS
const config = require('../config/config')
let logger = require("log4js").getLogger("MaraLink")
logger.level = config.logLevel

const structBlock = {
    OriginContract: "",
    TargetContract: "",
    TargetToken: "",
    OriginTransactionHash: "",
    TargetTransactionHash: "",
    FromChainId: "",
    ToChainId: "",
    From: "",
    To: "",
    Amount: "",
    Timestamp: "",
    Signature: "",
    Node: ""
}
let util = {
    raceHTTPGet: async function (urls) {
        try {
            const promiseArr = []
            for (let index = 0; index < urls.length; index++) {
                const url = urls[index];
                promiseArr.push(new Promise((resolve, reject) => {
                    request.get({
                        url: url
                    }, function (error, response, body) {
                        if (!error) {
                            resolve(body);
                        } else {
                            reject(error);
                        }
                    });
                }))
            }
            return Promise.any(promiseArr)
        } catch (e) {
            console.log(e)
            return false
        }
    },
    httpGet: function (url) {
        return new Promise((resolve, reject) => {
            request.get({
                url: url
            }, function (error, response, body) {
                if (!error) {
                    resolve({success: true, data: body});
                } else {
                    resolve({success: false, msg: "request error"});
                }
            });
        })
    },

    jsonSort: function (obj) {
        let newKey = Object.keys(obj).sort();
        let newObj = {};
        for (let v in newKey) {
            newObj[newKey[v]] = obj[newKey[v]];
        }
        return newObj
    },

    getServerIP: async function () {
        const internalIp = require('internal-ip');
        const publicIp = require('public-ip');

        let internal_Ip = internalIp.v4.sync()
        let public_Ip = await publicIp.v4()
        return {internal_Ip, public_Ip}
    },

    getParams: function (urlStr) {
        let url = "?" + urlStr.split("?")[1];
        let theRequest = new Object();
        if (url.indexOf("?") != -1) {
            let str = url.substr(1);
            let strs = str.split("&");
            for (let i = 0; i < strs.length; i++) {
                theRequest[strs[i].split("=")[0]] = decodeURI(strs[i].split("=")[1]);
            }
        }
        return theRequest;
    },

    delUrlPrefix: function (url) {
        if (url.substr(0, 7) == "::ffff:") {
            url = url.substr(7)
        }
        return url;
    },

    structBlock: function (data) {
        let block = {}
        for (let i of Object.keys(structBlock)) {
            block[i] = data.hasOwnProperty(i) ? data[i] : structBlock[i]
        }
        return block
    },

    getBlockHash: function (data) {
        try {
            if (!data) return false;

            let block = this.structBlock(data)
            block = this.jsonSort(block)

            // this.log('msg', block)
            return `0x${keccak256(Buffer.from(JSON.stringify(block))).toString('hex')}`
        } catch (e) {
            this.log('err', e)
            return false;
        }
    },

    decodeInput: function (inputData, abi) {
        try {
            abiDecoder.addABI(abi);
            const decodedData = abiDecoder.decodeMethod(inputData);
            abiDecoder.removeABI(abi)
            return decodedData ? decodedData : false
        } catch (e) {
            console.error(e)
            return false;
        }
    },

    log: function (type, info) {
        switch (type) {
            case "trace":
                logger.trace(info)
                break;
            case "debug":
                logger.debug(info)
                break;
            case "info":
                logger.info(info)
                break;
            case "warn":
                logger.warn(info)
                break;
            case "error":
                logger.error(info)
                break;
            case "fatal":
                logger.fatal(info)
                break;
        }
    }
}

module.exports = util
