const level = require('level')
const fs = require('fs')
const path = require('path')
const config = require('../config/config')

class levelDb {
    constructor(options) {
        let dbPath = path.join(__dirname, config.database.path)
        if (!fs.existsSync(dbPath)) {
            fs.mkdirSync(dbPath)
        }
        this.options = options;
        this.db = level(dbPath, options, {valueEncoding: "json"});
    }

    async put(key, value) {
        try {
            await this.db.put(key, value)
            return true
        } catch (e) {
            // console.error(e)
            return false
        }
    }

    async get(key) {
        try {
            return await this.db.get(key)
        } catch (e) {
            // console.error(e)
            return null
        }
    }

    async delete(key) {
        try {
            await this.db.del(key)
            return true
        } catch (e) {
            // console.error(e)
            return false
        }
    }

    async batch(arr) {
        try {
            await this.db.batch(arr)
            return true
        } catch (e) {
            // console.error(e)
            return false
        }
    }

    async getLastBlock() {
        try {
            let block = await this.db.get("LastBlock")
            return JSON.parse(block)
        } catch (e) {
            return false
        }
    }
}

module.exports = levelDb
