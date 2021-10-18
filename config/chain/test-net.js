module.exports = {
    //bsc
    "1": {
        confirmBlocks: 20,
        contractAddress: "0xd53314c692A870d3969DDe0D913E638cb9E87087",
        chainAddress: "https://data-seed-prebsc-1-s1.binance.org:8545/",
        chainId: 97,
        fee: 0.01,
        tokenList: [
            {
                address: "0x337610d27c682E347C9cD60BD4b3b107C9d34dDd",
                decimals: 18,
                symbol: "USDT",
                fee: 1
            },
            {
                address: "0x5492F17F8B09129e342016bD33019dcF7B07BcAd",
                decimals: 8,
                symbol: "FIL",
                fil: 0.01
            }
        ]
    },
    //eth
    "2": {
        confirmBlocks: 4,
        contractAddress: "",
        chainAddress: "",
        chainId: 3,
        fee: 0.5,
        tokenList: []
    },
    //matic
    "3": {
        confirmBlocks: 20,
        contractAddress: "0xEa76fe55CB2497e251cAC4E76cb627d9E10C0be7",
        chainAddress: "https://rpc-mumbai.maticvigil.com/",
        chainId: 80001,
        fee: 0.01,
        tokenList: [
            {
                address: "0x58aE10d450eabC0E9cD03C878Ba4c6b0768d7569",
                decimals: 8,
                symbol: "USDT",
                fee: 1
            },
            {
                address: "0x88ded5A6d9D591762C0FD1118eDBeb2F0cF71b4C",
                decimals: 8,
                symbol: "FIL",
                fee: 0.01
            },
            {
                address: "0x7353F1812588033a6dB3687144dC8938252f23f3",
                decimals: 8,
                symbol: "BTC",
                fee: 0.0001
            },
            {
                address: "0xf1f0741ddD2D78bc7D71A836d75997f0eB2B0d2d",
                decimals: 8,
                symbol: "KSM",
                fee: 0.01
            },
            {
                address: "0x20C34f982Affae7e33E8140888C7fa82061d4A1C",
                decimals: 8,
                symbol: "DOT",
                fee: 0.1
            },
            {
                address: '0x2A79D0F6e6062fB12041385224643C58B09C8b38',
                decimals: 18,
                symbol: "MOVR",
                fee: 0.01
            }
        ]
    },
    //moonbeam
    "4": {
        confirmBlocks: 5,
        contractAddress: "0xfa161aF8A31f934932E98c0aB13F388f87da2071",
        chainAddress: "https://rpc.testnet.moonbeam.network",
        chainId: 1287,
        fee: 0.01,
        tokenList: [
            {
                address: "0x0b77D7BDd78b2a4C2c50980968166D99e321DfB6",
                decimals: 18,
                symbol: "USDT",
                fee: 1
            },
            {
                address: "0xD50E4638B5f58A66a5F4FF81F092Db2357EcC6FB",
                decimals: 18,
                symbol: "BTC",
                fee: 0.0001
            },
            {
                address: "0xF4693eD43c9c691c4bAEc0648223B2A6Aaf26583",
                decimals: 18,
                symbol: "KSM",
                fee: 0.01
            },
            {
                address: "0x167aCF3d633b9693B9cB4BCcE060f9178D4bAA8D",
                decimals: 18,
                symbol: "DOT",
                fee: 0.1
            }, {
                address: '0x0F14010E779AE9603756778aF4aEaD35239b41d5',
                decimals: 18,
                symbol: 'MATIC',
                fee: 0.01
            }
        ]
    },
    //moonriver
    "5": {
        confirmBlocks: 5,
        contractAddress: "0x0000000000000000000000000000000000000000",
        chainAddress: "https://rpc.moonriver.moonbeam.network",
        chainId: 1285,
        fee: 0.1,
        tokenList: []
    }
}
