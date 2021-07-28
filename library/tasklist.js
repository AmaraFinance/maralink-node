const {v4: uuidv4} = require('uuid');

let TaskList = class {
    #list = []
    #pendingList = []
    #concurrency = 1
    timeouts = {}
    _taskHandle = null

    constructor(concurrency) {
        this.#concurrency = concurrency;
    }

    static displayName = "MaraLink TaskList";

    static version() {
        return "0.1-alpha";
    }

    /**
     * Displays the pending Queue
     */
    get pending() {
        return this.#pendingList;
    }

    set taskHandle(handle) {
        this._taskHandle = handle;
    }

    get taskCount() {
        let tobe = this.#list.length;
        let pending = this.#pendingList.length;
        return {tobe, pending};
    }

    /**
     * Push task in to the queue with params
     * @param {number} type 1-p2p task 2-contract task
     */
    enqueue(task) {
        let current = Date.now();
        task.timestamp = current;
        task.uuid = task.uuid || uuidv4();
        task.type = task.type || 1;
        task.timeout = task.timeout || 10000;
        if (task.timeoutHandle) {
            clearTimeout(task.timeoutHandle)
        }
        this.#list.push(task)
    }

    /**
     * Execute the next function on the queue for the matched elements fifo
     */
    dequeue(uuid) {
        let that = this;
        if (uuid) {
            var task = this.#list.findIndex((item) => item.uuid === uuid)
        } else {
            var task = this.#list.shift();
        }
        if (!task) return false

        this.#pendingList.push(task);
        this._taskHandle(task);
        task.timeoutHandle = setTimeout(() => {
            if (!task.done) {
                that.resume(task.uuid)
            }
        }, task.timeout);
    }

    resume(uuid) {
        let task = this.#pendingList.find((i) => i.uuid === uuid);
        if (task && task.hasOwnProperty('timeoutHandle') && task.timeoutHandle) clearTimeout(task.timeoutHandle)
        if (task) {
            this.enqueue(task);
            this.#pendingList = this.#pendingList.filter(item => item.uuid !== uuid);
        }
    }

    pendingList() {
        return this.#pendingList
    }

    update(uuid, options) {
        let pendTask = this.#pendingList.find((i) => i.uuid === uuid);
        let listTask = this.#list.find((i) => i.uuid === uuid);

        Object.keys(options).forEach((k) => {
            if (pendTask) {
                pendTask[k] = options[k]
            }
            if (listTask) {
                listTask[k] = options[k]
            }
        })
    }

    find(filters) {
        const filterKeys = Object.keys(filters)
        let findArr = this.#list.filter((item) => {
            return filterKeys.every(key => {
                return filters[key].toString().indexOf(item[key]) !== -1
            })
        })
        if (findArr.length > 0) return findArr[0]

        findArr = this.#pendingList.filter((item) => {
            return filterKeys.every(key => {
                return filters[key].toString().indexOf(item[key]) !== -1
            })
        })
        return findArr.length > 0 ? findArr[0] : null
    }

    remove(uuid) {
        let pendTask = this.#pendingList.find((i) => i.uuid === uuid);
        if (pendTask && pendTask.hasOwnProperty('timeoutHandle') && pendTask.timeoutHandle) clearTimeout(pendTask.timeoutHandle)

        let listTask = this.#list.find((i) => i.uuid === uuid);
        if (listTask && listTask.hasOwnProperty('timeoutHandle') && listTask.timeoutHandle) clearTimeout(listTask.timeoutHandle)

        this.#pendingList = this.#pendingList.filter(item => item.uuid !== uuid);
        this.#list = this.#list.filter(item => item.uuid !== uuid);
    }
};
module.exports = TaskList;