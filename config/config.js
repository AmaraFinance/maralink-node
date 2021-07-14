module.exports = {
    mnemonic: "",
    port: 17090,
    tcpServerPort: 17091,
    tcpClientPort: 17092,
    address: '0.0.0.0',
    logLevel: 'info', //info, warning, debug
    net: 'mainNet',// mainNet testNet
    peers: {
        seed: {
            host: "192.168.3.191",
            port: 17091
        },
        originUrl: "https://ll-1304964229.cos.ap-nanjing.myqcloud.com/peers.json",
        options: {
            timeout: 5000
        }
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
    },
    originChainHttp: "https://ropsten.infura.io/v3/2a4a86c77f1f468f83a5450a1d6be263",
    originChainWss: "wss://ropsten.infura.io/ws/v3/2a4a86c77f1f468f83a5450a1d6be263",
    targetChain: "",
    originContractAbi: [
        {
            "anonymous": false,
            "inputs": [
                {
                    "indexed": false,
                    "internalType": "uint256",
                    "name": "CoinType",
                    "type": "uint256"
                },
                {
                    "indexed": false,
                    "internalType": "address",
                    "name": "tokenAddress",
                    "type": "address"
                },
                {
                    "indexed": false,
                    "internalType": "uint256",
                    "name": "amount",
                    "type": "uint256"
                },
                {
                    "indexed": false,
                    "internalType": "address",
                    "name": "_toaddress",
                    "type": "address"
                }
            ],
            "name": "Cross",
            "type": "event"
        },
        {
            "anonymous": false,
            "inputs": [
                {
                    "indexed": true,
                    "internalType": "address",
                    "name": "previousOwner",
                    "type": "address"
                },
                {
                    "indexed": true,
                    "internalType": "address",
                    "name": "newOwner",
                    "type": "address"
                }
            ],
            "name": "OwnershipTransferred",
            "type": "event"
        },
        {
            "anonymous": false,
            "inputs": [
                {
                    "indexed": true,
                    "internalType": "address",
                    "name": "dst",
                    "type": "address"
                },
                {
                    "indexed": false,
                    "internalType": "uint256",
                    "name": "sad",
                    "type": "uint256"
                }
            ],
            "name": "Rescue",
            "type": "event"
        },
        {
            "anonymous": false,
            "inputs": [
                {
                    "indexed": true,
                    "internalType": "address",
                    "name": "dst",
                    "type": "address"
                },
                {
                    "indexed": true,
                    "internalType": "address",
                    "name": "token",
                    "type": "address"
                },
                {
                    "indexed": false,
                    "internalType": "uint256",
                    "name": "sad",
                    "type": "uint256"
                }
            ],
            "name": "RescueToken",
            "type": "event"
        },
        {
            "constant": true,
            "inputs": [
                {
                    "internalType": "address",
                    "name": "",
                    "type": "address"
                },
                {
                    "internalType": "uint256",
                    "name": "",
                    "type": "uint256"
                }
            ],
            "name": "AllData",
            "outputs": [
                {
                    "internalType": "uint256",
                    "name": "CoinType",
                    "type": "uint256"
                },
                {
                    "internalType": "address",
                    "name": "tokenAddress",
                    "type": "address"
                },
                {
                    "internalType": "uint256",
                    "name": "amount",
                    "type": "uint256"
                },
                {
                    "internalType": "address",
                    "name": "_toaddress",
                    "type": "address"
                }
            ],
            "payable": false,
            "stateMutability": "view",
            "type": "function"
        },
        {
            "constant": true,
            "inputs": [],
            "name": "getIndexArr",
            "outputs": [
                {
                    "internalType": "uint256[]",
                    "name": "",
                    "type": "uint256[]"
                }
            ],
            "payable": false,
            "stateMutability": "view",
            "type": "function"
        },
        {
            "constant": true,
            "inputs": [],
            "name": "isOwner",
            "outputs": [
                {
                    "internalType": "bool",
                    "name": "",
                    "type": "bool"
                }
            ],
            "payable": false,
            "stateMutability": "view",
            "type": "function"
        },
        {
            "constant": true,
            "inputs": [],
            "name": "owner",
            "outputs": [
                {
                    "internalType": "address",
                    "name": "",
                    "type": "address"
                }
            ],
            "payable": false,
            "stateMutability": "view",
            "type": "function"
        },
        {
            "constant": false,
            "inputs": [],
            "name": "renounceOwnership",
            "outputs": [],
            "payable": false,
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "constant": false,
            "inputs": [
                {
                    "internalType": "address",
                    "name": "to_",
                    "type": "address"
                },
                {
                    "internalType": "contract ITRC20",
                    "name": "token_",
                    "type": "address"
                },
                {
                    "internalType": "uint256",
                    "name": "amount_",
                    "type": "uint256"
                }
            ],
            "name": "rescue",
            "outputs": [],
            "payable": false,
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "constant": false,
            "inputs": [
                {
                    "internalType": "address payable",
                    "name": "to_",
                    "type": "address"
                },
                {
                    "internalType": "uint256",
                    "name": "amount_",
                    "type": "uint256"
                }
            ],
            "name": "rescue",
            "outputs": [],
            "payable": false,
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "constant": false,
            "inputs": [
                {
                    "internalType": "uint256",
                    "name": "_index",
                    "type": "uint256"
                },
                {
                    "internalType": "address",
                    "name": "_trc20",
                    "type": "address"
                },
                {
                    "internalType": "uint256",
                    "name": "CoinType",
                    "type": "uint256"
                },
                {
                    "internalType": "address",
                    "name": "tokenAddress",
                    "type": "address"
                },
                {
                    "internalType": "uint256",
                    "name": "amount",
                    "type": "uint256"
                },
                {
                    "internalType": "address",
                    "name": "_toaddress",
                    "type": "address"
                }
            ],
            "name": "setData",
            "outputs": [
                {
                    "internalType": "bool",
                    "name": "success",
                    "type": "bool"
                }
            ],
            "payable": false,
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "constant": true,
            "inputs": [],
            "name": "tokenAddr",
            "outputs": [
                {
                    "internalType": "contract ITRC20",
                    "name": "",
                    "type": "address"
                }
            ],
            "payable": false,
            "stateMutability": "view",
            "type": "function"
        },
        {
            "constant": false,
            "inputs": [
                {
                    "internalType": "address",
                    "name": "newOwner",
                    "type": "address"
                }
            ],
            "name": "transferOwnership",
            "outputs": [],
            "payable": false,
            "stateMutability": "nonpayable",
            "type": "function"
        }
    ],
    targetContractAbi: [],
}