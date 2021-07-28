let ioUtil = require('../library/ioUtil');
const api = ioUtil.readDirSync(__dirname).filter((value) => {
    return value.startsWith("bridge-");
}).map(value => require('./' + value));

let Watcher = class {
    _parent = null
    _account = {}
    listeners = {}

    constructor(parent, accountInfo) {
        this._parent = parent
        this._account = accountInfo
        for (let v of api) {
            if ('[object Function]' == Object.prototype.toString.call(v)) {
                let watcher = new v(this._parent, this, this._account);
                this.listeners[watcher.chainId] = watcher;
            }
        }
    }

    static getInstance(parent, accountInfo) {
        if (!this.instance) {
            this.instance = new Watcher(parent, accountInfo);
        }
        return this.instance;
    }
}

module.exports = Watcher;