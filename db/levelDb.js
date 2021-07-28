const level = require('level')
const fs = require('fs')
const path = require('path')
const config = require('../config/config')

let LevelDb = class {
    constructor(options) {
        let dbPath = path.join(__dirname, config.database.path)
        if (!fs.existsSync(dbPath)) {
            fs.mkdirSync(dbPath)
        }
        this.options = options;
        this.db = level(dbPath, options, {valueEncoding: "json"});
        this.instance = null;
    }

    static getInstance(options) {
        if (!this.instance) {
            this.instance = new LevelDb(options);
        }
        return this.instance;
    }

    async put(key, value) {
        try {
            await this.db.put(key, value)
            return true
        } catch (e) {
            return false
        }
    }

    async get(key) {
        try {
            return await this.db.get(key)
        } catch (e) {
            return null
        }
    }

    async delete(key) {
        try {
            await this.db.del(key)
            return true
        } catch (e) {
            return false
        }
    }

    async batch(arr) {
        try {
            await this.db.batch(arr)
            return true
        } catch (e) {
            return false
        }
    }
}

module.exports = LevelDb
