module.exports = {
    //bsc
    "1": {
        confirmBlocks: 200,
        contractAddress: "0x0000000000000000000000000000000000000000",
        chainAddress: "https://bsc-dataseed1.binance.org:443",
        chainId: 56,
        fee: 0.001,
        tokenList: []
    },
    //eth
    "2": {
        confirmBlocks: 40,
        contractAddress: "",
        chainAddress: "",
        chainId: 1,
        fee: 0.001,
        tokenList: []
    },
    //matic
    "3": {
        confirmBlocks: 200,
        contractAddress: "0x19966C5f9f2324e93998Ab816958E5e1E7FD012A",
        chainAddress: "https://polygon-rpc.com/",
        chainId: 137,
        fee: 1,
        tokenList: [
            {
                address: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
                decimals: 6,
                symbol: "USDT",
                fee: 1
            },
            {
                address: "0x2DF15fe83734455FAF6857a7dD308B3797FbC580",
                decimals: 18,
                symbol: "DOT",
                fee: 0.025
            },
            {
                address: "0xd73d28855A14c617f14030f545C6d664eF1F3213",
                decimals: 18,
                symbol: "KSM",
                fee: 0.01
            },
            {
                address: "0x9268e643A160088D2512b5Ad9FD1BabB84853628",
                decimals: 18,
                symbol: "MOVR",
                fee: 0.01
            }
        ]
    },
    //moonbeam
    "4": {
        confirmBlocks: 200,
        contractAddress: "0x0000000000000000000000000000000000000000",
        chainAddress: "https://rpc.testnet.moonbeam.network",
        chainId: 1287,
        fee: 0.01,
        tokenList: []
    },
    //moonriver
    "5": {
        confirmBlocks: 50,
        contractAddress: "0x19966C5f9f2324e93998Ab816958E5e1E7FD012A",
        chainAddress: "https://rpc.moonriver.moonbeam.network",
        chainId: 1285,
        fee: 0.01,
        tokenList: [
            {
                address: "0x2D8B15A34700d3F1da11523f2300fc64942bA17D",
                decimals: 6,
                symbol: "USDT",
                fee: 1
            },
            {
                address: "0xe7Ff9620c090016Eb644dEdb90ae81Bb5533212a",
                decimals: 18,
                symbol: "KSM",
                fee: 0.01
            },
            {
                address: "0xD102151Fa8E19Bb9A1F61C19e73756c05954c660",
                decimals: 18,
                symbol: "DOT",
                fee: 0.025
            }
        ]
    }
}
