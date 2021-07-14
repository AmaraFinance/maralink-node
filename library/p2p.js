let config = require('../config/config')
let dgram = require('dgram')
let fs = require('fs')
const key = require('./keys')
const assert = require('assert');
const crypto = require('crypto')

class Blockchain {
    constructor() {
        this.blockchain = [
            config.initBlock
        ]
        // 还没打包的交易数据
        this.data = []
        // p2p网络节点
        this.peers = []
        // seed网络验证节点
        this.seed = config.peers.list
        // 本地节点对外的公网ip和端口
        this.remote = {}

        // 远程地址存文件
        this.remoteFile = `${__dirname}/address.json`
        this.udp = dgram.createSocket('udp4')
        this.init()
    }

    init() {
        this.bindP2p()
        this.bindEvent()
    }

    bindP2p() {
        this.udp.on('message', (msg, remote) => {
            const address = remote.address
            const port = remote.port
            const action = JSON.parse(msg)
            if (action.type) {
                this.message(action, {address, port})
            }
        })
        this.udp.on('error', (err) => {
            console.error('[ERROR]', err)
        })

        this.udp.on('listening', () => {
            let address = this.udp.address()
            console.log(`[MSG]: UDP service is listening: ${address.address}:${address.port}`)
        })
        const port = Number(config.port) || 0
        this.startNode(port)
    }

    bindEvent() {
        process.on('exit', () => {
            console.log(`[MSG]: MaraLink is existed`)
        })
    }

    startNode(port) {
        console.log(`[MSG]: Start peer and port: ${port}`)
        this.udp.bind(port)

        // if (fs.existsSync(this.remoteFile)) {
        //     let address = JSON.parse(fs.readFileSync(this.remoteFile))
        //     if (address.address && address.port) {
        //         this.send({
        //             type: 'goodbye',
        //             data: address
        //         }, this.seed.port, this.seed.address)
        //     }
        // }

        // 告诉所有预备节点，有新节点加入
        this.seed.forEach(v => {
            this.send({
                type: 'newPeer'
            }, v.port, v.address)
            this.peers.push(v)
        })
        // if (port != config.port) {
        //
        // } else {
        //     this.mint()
        //     setInterval(() => {
        //         this.mint()
        //     }, 1000 * 60 * 60)
        // }
    }

    send(message, port, host) {
        console.log(`[MSG]: Send msg ${message.type} from ${host}:${port}`)
        this.udp.send(JSON.stringify(message), port, host)
    }

    broadcast(action) {
        console.log(`[MSG]: broadcast msg ${action.type}`)
        // 广播
        this.peers.forEach(v => {
            this.send(action, v.port, v.address)
        })
    }

    message(action, remote) {
        try {
            switch (action.type) {
                case 'newPeer':
                    var isSet = this.peers.findIndex(v => v.address === remote.address && v.port === remote.port)
                    if (isSet > -1) return false;
                    console.log(`[MSG]: Found a new peer. ${action.address}:${remote.port}`)

                    // 广播给其他节点
                    this.broadcast({
                        type: 'sayHi',
                        data: remote
                    })
                    //告诉新节点，我的节点信息
                    this.send({
                        type: 'peerList',
                        data: {
                            peers: this.peers
                        }
                    }, remote.port, remote.address)
                    //告诉新节点，保存远程节点数据
                    // this.send({
                    //     type: 'remoteAddress',
                    //     data: remote
                    // }, remote.port, remote.address)
                    //交换区块信息
                    this.send({
                        type: 'blockChain',
                        data: JSON.stringify({blockchain: this.blockchain, trans: this.data})
                    }, remote.port, remote.address)

                    this.peers.push(remote)
                    break

                case 'sayHi':
                    let peer = action.data
                    var isSet = this.peers.findIndex(v => v.address === peer.address && v.port === peer.port)
                    if (isSet > -1) return false;
                    console.log('[MSG]: Broadcasting to discover a new peer', data.port, data.address)

                    this.peers.push(peer)
                    //与新节点打招呼
                    this.send({type: 'hi'}, data.port, data.address)
                    break

                case 'peerList':
                    // 本地获取到 所有节点，hi一下新朋友
                    console.log('[MSG]: PeerList get  peer list from seed peer', data.port, data.address)
                    const newPeers = action.data.peers
                    this.addPeers(newPeers)
                    this.broadcast({type: 'hi'})
                    break

                case 'hi':
                    // hi没有意义，udp打洞给网件加白名单用的
                    break

                // case 'remoteAddress':
                //     this.remote = action.data
                //     fs.writeFileSync(this.remoteFile, JSON.stringify(action.data))
                //     break

                case 'blockChain':
                    let allData = JSON.parse(action.data)
                    let newChain = allData.blockchain
                    let newTrans = allData.trans

                    console.log('[信息]: 更新本地区块链')
                    this.replaceTrans(newTrans)
                    if (newChain.length > 1) {
                        // 只有创始区块 不需要更新
                        this.replaceChain(JSON.parse(action.data).blockchain)
                    }

                    break
                case 'goodbye':
                    const target = action.data
                    let i = this.peers.findIndex(v => v.address === target.address && v.port === target.port)
                    if (i > -1) {
                        //移除当前节点
                        this.peers.splice(i, 1)
                        // 有的话 在广播一次 怕udp打洞失败
                        this.broadcast(action)
                    }
                    break
                case 'trans':
                    // 网络上的交易请求 传给本地区块链
                    if (!this.data.find(v => this.isEqualObj(v, action.data))) {
                        console.log('[信息]: 交易合法 新增一下', action.data)

                        this.addTrans(action.data)
                        this.broadcast({type: 'trans', data: action.data})
                    }
                    break
                case 'mint':
                    const lastBlock = this.getLastBlock()
                    // let {blockchain,trans} = action.data

                    if (lastBlock.hash === action.data.hash) {
                        return
                    }
                    if (this.isValidNewBlock(action.data, lastBlock)) {
                        console.log('[信息]: 有人挖矿成功，我们恭喜这位幸运儿')

                        this.blockchain.push(action.data)
                        this.data = []
                        this.broadcast({type: 'mint', data: action.data})
                    } else {
                        console.log('[错误]: 不合法的区块', action.data)
                    }
                    break
                default:
                    console.log(
                        `[错误]: 不合法的消息 '${JSON.stringify(action)}' from ${remote.address}:${
                            remote.port
                        }`
                    )
            }
        } catch (e) {
            console.error(e)
        }
    }

    formatPeer(peer) {
        return `${peer.address}:${peer.port}`
    }

    isEqualObj(obj1, obj2) {
        const keys1 = Object.keys(obj1)
        const keys2 = Object.keys(obj2)
        if (keys1.length !== keys2.length) {
            return false
        }
        return keys1.every(key => obj1[key] === obj2[key])
    }

    addPeers(newPeers) {
        newPeers.forEach(peer => {
            if (!this.peers.find(v => this.isEqualObj(v, peer))) {
                this.peers.push(peer)
            }
        })
    }

    calculateHashForBlock(block) {
        const {index, previousHash, timestamp, data, nonce} = block
        return this.calculateHash(
            index,
            previousHash,
            timestamp,
            data,
            nonce
        )
    }

    sha256Hash(value, showLog = false) {
        const hash = crypto
            .createHash('sha256')
            .update(String(value))
            .digest('hex')
        if (showLog) {
            console.log(`[信息] 数据是 ${value} 哈希值是${hash}`)
        }
        return hash
    }

    calculateHash(index, previousHash, timestamp, data, nonce) {
        return this.sha256Hash(index + previousHash + timestamp + JSON.stringify(data) + nonce)
    }

    getLastBlock() {
        return this.blockchain[this.blockchain.length - 1]
    }

    addTrans(trans) {
        if (this.verifyTransfer(trans)) {
            this.data.push(trans)
        }
    }

    transfer(from, to, money) {
        let amount = parseInt(money)

        if (isNaN(amount)) {
            console.log('[信息]: amount必须是数字')
            return
        }
        const timestamp = new Date().getTime()
        const sig = key.sign({from, to, amount, timestamp})
        let transObj = {from, to, amount, sig, timestamp}
        if (from !== '0') {
            const blance = this.blance(from)
            if (blance < amount) {
                console.log(`[信息]: 余额不足，还剩${blance},想支出${amount}`)
                return
            }
            this.broadcast({type: 'trans', data: transObj})
        }
        this.data.push(transObj)
        return transObj
    }

    // mint (address) {

    mint() {
        console.log('[MSG]: start mint')
        const start = new Date().getTime()

        // let bcLen = this.blockchain.length
        // if (bcLen > 5 && this.blockchain[bcLen - 1].timestamp - this.blockchain[1].timestamp < 1000 * 60) {
        //   this.difficulty += 1
        // }
        // if (!this.data.every(v => this.verifyTransfer(v))) {
        //     return
        // }
        this.transfer('0', key.keys.address, 100)

        const newBlock = this.generateNewBlock()

        if (this.isValidNewBlock(newBlock, this.getLastBlock())) {
            this.blockchain.push(newBlock)
            this.data = []
        } else {
            console.log('[错误]: 不合法的区块或者是链', newBlock)
        }
        // 告诉p2p网络交易信息
        this.broadcast({type: 'mint', data: newBlock})

        const end = new Date().getTime()
        const offset = ((end - start) / 1000).toFixed(2)
        console.log(`[信息]: 挖矿结束 用时${offset}s , 算了${newBlock.nonce}次, 哈希值是${newBlock.hash}，入账100 请笑纳`)


        MongoClient.connect(url, function (err, client) {
            assert.strictEqual(null, err);
            console.log("Connected successfully to server");

            const db = client.db(dbName).collection('test3');

            db.insert(newBlock, function (err, result) {
                assert.strictEqual(null, err);
            });

            client.close();
        });

        return newBlock
    }

    generateNewBlock() {
        const nextIndex = this.blockchain.length
        const previousHash = this.getLastBlock().hash

        let data = this.data
        let timestamp = new Date().getTime()
        let nonce = 0
        let hash = this.calculateHash(nextIndex, previousHash, timestamp, data, nonce)
        while (hash.slice(0, this.difficulty) !== '0'.repeat(this.difficulty)) {
            nonce = nonce + 1
            timestamp = new Date().getTime()
            hash = this.calculateHash(nextIndex, previousHash, timestamp, data, nonce)
        }
        return {
            index: nextIndex,
            previousHash,
            timestamp,
            nonce,
            hash,
            data: this.data

        }
    }

    isValidNewBlock(newBlock, previousBlock) {
        const newBlockHash = this.calculateHashForBlock(newBlock)
        if (previousBlock.BlockNumber + 1 !== newBlock.BlockNumber) {
            console.log('[错误]: 新区快index不对')

            return false
        } else if (previousBlock.hash !== newBlock.previousHash) {
            console.log(`[错误]: 第${newBlock.BlockNumber}个区块的previousHash不对`)

            return false
        } else if (newBlockHash !== newBlock.hash) {
            console.log(`[错误]: 第 ${newBlock.BlockNumber}个区块hash不对,算出的是${newBlockHash} 区块里本来的hash是${newBlock.hash} 看来数据被篡改了`)

            return false
        } else if (newBlockHash.slice(0, this.difficulty) !== '0'.repeat(this.difficulty)) {
            return false
        } else if (!this.isValidTrans(newBlock.data)) {
            console.log('[错误]: 交易不合法')
            return false
        } else {
            return true
        }
    }

    isValidChain(chain = this.blockchain) {

        if (JSON.stringify(chain[0]) !== JSON.stringify(initBlock)) {
            return false
        }
        for (let i = chain.length - 1; i >= 1; i = i - 1) {
            if (!this.isValidNewBlock(chain[i], chain[i - 1])) {
                console.log(`[ERROR]: 第${i}个区块不合法`)
                return false
            }
        }
        return true
    }

    replaceChain(newChain) {
        if (newChain.length === 1) {
            return
        }
        if (this.isValidChain(newChain) && newChain.length > this.blockchain.length) {
            this.blockchain = JSON.parse(JSON.stringify(newChain))
        } else {
            console.log(`[ERROR]: 区块链数据不合法`)
        }
    }

    mintDemo(data, difficulty) {
        let nonce = 0
        let hash = this.sha256Hash(String(data) + nonce, true)
        while (hash.slice(0, difficulty) !== '0'.repeat(difficulty)) {
            nonce = nonce + 1
            hash = this.sha256Hash(String(data) + nonce, true)
        }
    }

    mintForBlock(index) {
        const block = this.blockchain[index]
        if (this.isValidNewBlock(block, this.blockchain[index - 1])) {
            console.log('[MSG]: 区块本来就好好地，瞎合计啥呢')
            return
        }
        // const previousHash = '0'
        const previousHash = this.blockchain[index - 1].hash
        let data = block.data
        let timestamp = block.timestamp
        let nonce = 0
        let hash = this.calculateHash(index, previousHash, timestamp, data, nonce)
        while (hash.slice(0, this.difficulty) !== '0'.repeat(this.difficulty)) {
            nonce = nonce + 1
            hash = this.calculateHash(index, previousHash, timestamp, data, nonce)
        }
        this.blockchain[index] = {
            index,
            previousHash,
            timestamp,
            nonce,
            hash,
            data
        }
        console.log(`[信息]: 区块${index}修复完毕`)
    }
}

module.exports = Blockchain