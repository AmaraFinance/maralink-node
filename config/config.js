module.exports = {
    mnemonic: "",
    tcpServerPort: 17090,
    tcpClientPort: 17091,
    httpPort: 17100,
    address: '0.0.0.0',
    logLevel: 'info', //info, warning, debug
    net: 'mainNet',// mainNet testNet
    peers: {
        seed: {
            host: "",
            port: 17091
        },
        originUrl: "https://ll-1304964229.cos.ap-nanjing.myqcloud.com/peers.json"
    },
    queue: {
        txPool: {
            maxLength: 2000
        }
    },
    initBlock: {
        BlockNumber: "0",
        OriginContract: "0x409e0e931D436C788a2ad1E981a10BA25F15A8a6",
        TargetContract: "",
        OriginTransactionHash: "0xmaraLink",
        From: "",
        To: "",
        Coin: "",
        Amount: "",
        Timestamp: "1623812289910",
        ParentHash: "",
        Signature: "maraLink",
        Node: "0x7A9d8357d962680F3C44DD97a0C9c993Fa226f96"
    },
    database: {
        path: "../database"
    }
}