const util = require('../util/util')
const common = require('../core/util/common')
const listen = require('../core/listen')

function cli(vorpal) {
    vorpal
        .use(getOriginBlockNumberCommand)
        .use(getBlockByNumberCommand)
        .use(getTxPoolTransactionCommand)

        .use(getGlobalCommand)
        .use(stopMintCommand)

        .delimiter('blockchain => ')
        .show()
}

module.exports = cli

function getOriginBlockNumberCommand(vorpal) {
    vorpal
        .command('getOriginBlockNumber', 'View the latest block number')
        .action(function (args, callback) {
            util.log('msg', `The latest origin block number ${global.WEB3_BLOCK_NUMBER}`)
            callback()
        })
}

async function getBlockByNumberCommand(vorpal) {
    vorpal
        .command('getBlockByNumber', 'Get block detail by block number')
        .option('--height <height>', 'Block height')
        .action(function (args, callback) {
            try {
                if (args.options.height == null) throw 'Missing parameters';
            } catch (err) {
                util.log("err", err)
            }
            callback()
        })
}

async function getTxPoolTransactionCommand(vorpal) {
    vorpal
        .command('getTxPoolTransaction', 'Get transaction from tx pool by hash')
        .option('--hash <hash>', 'Transaction hash')
        .action(async function (args, callback) {
            try {
                if (args.options.hash == null) throw 'Missing parameters';
                let tx = await global.TXPOOL.GetTransaction(args.hash)
                if (tx) {
                    util.log('msg', tx)
                } else {
                    util.log('err', 'Not found transaction')
                }
            } catch (err) {
                util.log("err", err)
            }
            callback()
        })
}

function getGlobalCommand(vorpal) {
    vorpal
        .command('getGlobal', 'Start listen contract logs')
        .option('--name <name>', 'name')
        .action(function (args, callback) {
            try {
                console.log(global[args.options.name])
            } catch (e) {
                util.log("err", e)
            }
            callback()
        })
}

function stopMintCommand(vorpal) {
    vorpal
        .command('stopMint', 'Stop listen contract logs')
        .action(async function (args, callback) {
            try {
                await listen.stopListen()
            } catch (e) {
                util.log("err", e)
            }
            callback()
        })
}
