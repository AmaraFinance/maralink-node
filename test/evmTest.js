let ethers = require('ethers').ethers

exports.test = async function (req, res) {
    let result;
    try {
        let {hash} = req.body
        const provider = new ethers.providers.JsonRpcProvider("https://data-seed-prebsc-1-s1.binance.org:8545/");
        const wallet = new ethers.Wallet("", provider)

        if (hash) {
            return res.json({code: 200, data: await provider.getTransactionReceipt(hash)});
        } else {
            let abi = [
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
            ]

            let contract = new ethers.Contract("0x9BcEE6c6e2983B5EB0F94D3E4B28c8E163236180", abi, wallet);

            //设置清算激励
            result = await contract.setData("1", "0x1a3d5aE18E3b735458A01ecE7CabB9c9067877aF", "1", "0x409e0e931d436c788a2ad1e981a10ba25f15a8a6", "1000000000000000000", "0xDeEa89B207cC8Ff462722bB2c55846ea5a6AdC3F")
            await result.wait()
            // console.log(result)
            return res.json({code: 200, data: result});
        }
    } catch (e) {
        console.error("error:", e)
        return res.json({code: 300, msg: e.msg});
    }
}