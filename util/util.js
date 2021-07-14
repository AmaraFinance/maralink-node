const tables = require('cli-table')
const {keccak256} = require('ethereumjs-util')
const BN = require('bn.js')
const request = require('request')
const abiDecoder = require('abi-decoder'); // NodeJS
const config = require('../config/config')

let util = {
    raceHTTPGet: async function (urls) {
        for (let index = 0; index < urls.length; index++) {
            const url = urls[index];
            let result = await this.httpGet(url);
            if (result.success) {
                return result
            }
        }
    },
    httpGet: function (url) {
        return new Promise((resolve, reject) => {
            request.get({
                url: url
            }, function (error, response, body) {
                if (!error) {
                    // 请求成功的处理逻辑
                    resolve({success: true, data: body});
                } else {
                    resolve({success: false, msg: "服务异常！"});
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
        for (let i of Object.keys(global.BLOCK_STRUCT)) {
            block[i] = data.hasOwnProperty(i) ? data[i] : global.BLOCK_STRUCT[i]
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

    decodeInput: function (inputData) {
        try {
            abiDecoder.addABI(config.originContractAbi);
            let decodedData = abiDecoder.decodeMethod(inputData);
            abiDecoder.removeABI(config.originContractAbi)
            return decodedData ? decodedData : false
        } catch (e) {
            console.error(e)
            return false;
        }
    },

    log: function (type, info) {
        switch (type) {
            case "msg":
                console.log(`${new Date().toLocaleString()} [MSG]: `, info)
                break;
            case "err":
                console.error(`${new Date().toLocaleString()} [ERROR]: `, info)
                break;
        }
    },

    bnGt: function (a, b) {
        a = new BN(a, 10)
        b = new BN(b, 10)
        return a.gt(b);
    },

    bnGte: function (a, b) {
        a = new BN(a, 10)
        b = new BN(b, 10)
        return a.gte(b);
    },

    prevHex: function (str) {
        let number = new BN(str, 10)
        let next = number.subn(1)
        return next.toString(10)
    },

    nextHex: function (str) {
        let number = new BN(str, 10)
        let next = number.addn(1)
        return next.toString(10)
    },

    checkExistedNode: function (nodeId) {
        if (global.SOCKET_LIST.hasOwnProperty(nodeId)) {
            return true
        }
        global.SOCKET_SERVER.clients.forEach(ws => {
            if (ws.nodeId === nodeId) return true;
        })
        return false
    }
}

module.exports = util
