module.exports = {
    tcpServerPort: 17090,
    tcpClientPort: 17091,
    httpPort: 17100,
    address: '0.0.0.0',
    logLevel: 'info', //trace、debug、info、warn、error、fatal
    peers: {
        seed: {
            host: "",
            port: 17090
        }
    },
    database: {
        path: "../database"
    }
}
