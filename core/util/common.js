// const Buffer = require('buffer')
let blockPrefix = "b", // blockPrefix + num + hash -> block
    numberPrefix = "n", // numberPrefix + hash -> number
    hashPrefix = "h", // hashPrefix + number -> hash
    originHashPrefix = "o"  // originHashPrefix + originHash -> hash + number

let common = {
    blockKey: function (number, hash) {
        return [blockPrefix, number, hash];
    },

    numberKey: function (hash) {
        return [numberPrefix, hash];
    },

    hashKey: function (number) {
        return [hashPrefix, number];
    },

    originHashKey: function (originHash) {
        return [originHashPrefix, originHash];
    }
}

module.exports = common
