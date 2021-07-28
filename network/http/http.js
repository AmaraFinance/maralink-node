let express = require('express');
let http = require("http");
let apiRouter = require('./http-router');
let config = require('../../config/config')
let util = require('../../util/util')

class HttpServer {
    _parent = null

    constructor(parent) {
        this.app = express();
        this.app.use(apiRouter);
        this._parent = parent
        http.createServer(this.app).listen(config.httpPort, function () {
            util.log('msg', 'Http server listening on port ' + config.httpPort)
        });
    }

    static getInstance(parent) {
        if (!this.instance) {
            this.instance = new HttpServer(parent);
        }
        return this.instance;
    }
}

module.exports = HttpServer