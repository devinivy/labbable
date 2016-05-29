'use strict';

const Package = require('../package.json');

const internals = {};

module.exports = class Labbable {

    constructor(server) {

        this._server = null;
        this._cache = null;
        this._queues = { immediate: [], init: [] };

        if (server) {
            this.using(server);
        }
    }

    using(server) {

        if (this._server) {
            throw new Error('Can\'t call labbable.using(server) more than once.');
        }

        const self = this;

        this._server = server;
        this._cache = this._server.cache({ segment: '_labbable' });

        // Anyone who wants the server as soon as it's available
        this._clearQueue('immediate');

        // Anyone who wants the server as soon as it's available and initialized
        this._server.ext('onPreStart', (srv, next) => {

            self._clearQueue('init');
            next();
        });
    }

    ready(immediate, timeout, cb) {

        // ready(x, cb)
        if (typeof timeout === 'function') {
            cb = timeout;
            timeout = null;
        }

        // ready(cb)
        if (typeof immediate === 'function') {
            cb = immediate;
            immediate = false;
        }

        // ready(timeout) or ready(timeout, cb)
        if (Number.isInteger(immediate)) {
            timeout = immediate;
            immediate = false;
        }

        timeout = (timeout || timeout === 0) ? timeout : 2000;

        if ((immediate && this._server) || this.isInitialized()) {
            return cb ? setImmediate(cb.bind(null, this._server)) : Promise.resolve(this._server);
        }

        let deferral;

        if (!cb) {
            deferral = internals.defer();
            cb = internals.makeCb(deferral);
        }

        const queue = this._queues[immediate ? 'immediate' : 'init'];

        queue.push(cb);

        if (timeout) {
            setTimeout(() => {

                const index = queue.indexOf(cb);

                if (index !== -1) {
                    queue.splice(index, 1);
                    cb(internals.error(immediate, timeout));
                }

            }, timeout);
        }

        if (deferral) {
            return deferral.promise;
        }
    }

    isInitialized() {

        return this._cache && this._cache.isReady();
    }

    _clearQueue(name) {

        const queue = this._queues[name];

        queue.forEach((cb) => cb(null, this._server));
        queue.splice(0);
    }

    static plugin(srv, options, next) {

        const labbable = new Labbable(srv.root);

        server.decorate('server', 'isInitialized', labbable.isInitialized.bind(labbable));
        server.decorate('server', 'labbableReady', labbable.ready.bind(labbable));

        next();
    }

};

module.exports.plugin.attributes = { pkg: Package };

internals.defer = () => {

    const deferral = {};

    const promise = new Promise((res, rej) => {

        deferral.resolve = res;
        deferral.reject = rej;
    });

    deferral.promise = promise;

    return deferral;
};

internals.makeCb = (deferral) => {

    return (err, srv) => {

        if (err) {
            return deferral.reject(err);
        }

        deferral.resolve(srv);
    };
};

internals.error = (immediate, timeout) => {

    let message = `Labbable timed-out after ${timeout}ms.  `;

    if (immediate) {
        message += 'Did you forget to call labbable.using(server)?';
    }
    else {
        message += 'Did you forget to call server.initialize() or labbable.using(server)?';
    }

    return new Error(message);
};
