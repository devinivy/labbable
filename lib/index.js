'use strict';

const Package = require('../package.json');

const internals = {};

module.exports = class Labbable {

    constructor(server) {

        this._server = null;
        this._cache = false;
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
        this._flushQueue('immediate');

        // Anyone who wants the server as soon as it's available and initialized
        this._server.ext('onPreStart', (srv, next) => {

            self._flushQueue('init');
            next();
        });
    }

    ready(options, cb) {

        if (typeof options === 'function') {
            cb = options;
            options = null;
        }

        options = options || {};

        const immediate = options.immediate || false;
        const timeout = internals.normalizeTimeout(options.timeout);

        // If we don't have to wait, hand-off the server very soon
        if ((immediate && this._server) || this.isInitialized()) {
            return cb ? setImmediate(cb.bind(null, null, this._server)) : Promise.resolve(this._server);
        }

        let deferral;

        // Prepare for some promise action
        if (!cb) {
            deferral = internals.defer();
            cb = internals.makeCb(deferral);
        }

        this._addQueueItem(cb, timeout, immediate);

        // If we prepared a deferral, return that
        if (deferral) {
            return deferral.promise;
        }
    }

    isInitialized() {

        return this._cache && this._cache.isReady();
    }

    _addQueueItem(fn, timeout, immediate) {

        const queue = this._queues[immediate ? 'immediate' : 'init'];

        if (timeout) {

            // Generate the timeout

            const timeoutId = setTimeout(() => {

                const index = queue.indexOf(fn);
                const ensuredFn = queue[index]; // Protect from bad index of -1, would be a flaw

                // Pluck timed-out callback out of the queue and error
                queue.splice(index, 1);
                ensuredFn(internals.timeoutError(immediate, timeout));

            }, timeout);

            // Wrap original fn in timeout-clearing callback

            const origFn = fn;

            fn = (err, srv) => {

                clearTimeout(timeoutId);

                if (err) {
                    return origFn(err);
                }

                return origFn(err, srv);
            };

        }

        // Queue-up the callback
        queue.push(fn);
    }

    _flushQueue(name) {

        const queue = this._queues[name];

        queue.forEach((cb) => cb(null, this._server));
        queue.splice(0);
    }

    static plugin(srv, options, next) {

        const labbable = new Labbable(srv.root);

        srv.decorate('server', 'isInitialized', labbable.isInitialized.bind(labbable));
        srv.decorate('server', 'labbableReady', labbable.ready.bind(labbable));

        next();
    }

};

module.exports.plugin.attributes = { pkg: Package };

internals.normalizeTimeout = (timeout) => {

    return (timeout || timeout === 0 || timeout === false) ? timeout : 2000;
};

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

internals.timeoutError = (immediate, timeout) => {

    let message = `Labbable timed-out after ${timeout}ms.  `;

    if (immediate) {
        message += 'Did you forget to call labbable.using(server)?';
    }
    else {
        message += 'Did you forget to call server.initialize() or labbable.using(server)?';
    }

    return new Error(message);
};
