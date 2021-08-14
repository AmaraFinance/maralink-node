let common = {
    blockPrefix: "block", // blockPrefix + num + hash -> block
    numberPrefix: "number", // numberPrefix + hash -> number
    hashPrefix: "hash", // hashPrefix + number -> hash
    originHashPrefix: "originHash",  // originHashPrefix + originHash -> hash + number
    targetHashPrefix: "targetHash",  // originHashPrefix + originHash -> hash + number
    tempTxPrefix: "tempTx",

    blockKey: function (number, hash) {
        return [this.blockPrefix, number, hash];
    },

    numberKey: function (hash) {
        return [this.numberPrefix, hash];
    },

    hashKey: function (number) {
        return [this.hashPrefix, number];
    },

    originHashKey: function (chainId, originHash) {
        return [this.originHashPrefix, chainId, originHash];
    },

    targetHashKey: function (chainId, hash) {
        return [this.targetHashPrefix, chainId, hash];
    },

    tempHashKey: function (chainId, hash) {
        return [this.tempTxPrefix, chainId, hash];
    }
}

module.exports = common
