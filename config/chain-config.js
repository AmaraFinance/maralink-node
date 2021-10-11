const config = require('./config')
const mainNet = require('./chain/main-net')
const testNet = require('./chain/test-net')
const util = require("../util/util");
if (process.env.NODE_ENV === 'production') {
    util.log('info', `The MaraLink main-net node has been started`)
    module.exports = mainNet;
} else {
    util.log('info', `The MaraLink test-net node has been started`)
    module.exports = testNet;
}
