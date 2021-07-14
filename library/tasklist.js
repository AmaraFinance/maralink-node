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
        this.#list.push(task)
    }

    /**
     * Execute the next function on the queue for the matched elements fifo
     */
    dequeue() {
        let that = this;
        let task = this.#list.shift();
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
        this.enqueue(task);
        this.#pendingList = this.#pendingList.filter(item => item.uuid !== uuid);
    }

    pendingList() {
        return this.#pendingList
    }

    update(task) {
        let taskIndex = this.#pendingList.findIndex((i) => i.uuid === task.uuid);
        if (taskIndex !== -1) {
            this.#pendingList = this.#pendingList.filter(item => item.uuid !== task.uuid);
            this.#pendingList.push(task)
        }

        taskIndex = this.#list.findIndex((i) => i.uuid === task.uuid);
        if (taskIndex !== -1) {
            this.#list = this.#list.filter(item => item.uuid !== task.uuid);
            this.#list.push(task)
        }
    }

    find(filters) {
        const filterKeys = Object.keys(filters)
        return this.#pendingList.filter((item) => {
            return filterKeys.every(key => {
                return filters[key].indexOf(item[key]) !== -1
            })
        })
    }

    remove(uuid) {
        this.#pendingList = this.#pendingList.filter(item => item.uuid !== uuid);
        this.#list = this.#list.filter(item => item.uuid !== uuid);
    }
};
module.exports = TaskList;