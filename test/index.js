'use strict';

// Load modules

const Lab = require('lab');
const Code = require('code');
const Hapi = require('hapi');
const Labbable = require('..');

// Test shortcuts

const lab = exports.lab = Lab.script();
const describe = lab.describe;
const it = lab.it;
const expect = Code.expect;

const internals = {};

describe('Labbable', () => {

    describe('using()', () => {

        it('throws when called multiple times.', (done) => {

            const server = new Hapi.Server();
            server.connection();

            const labbable = new Labbable();

            labbable.using(server);

            expect(() => {

                labbable.using(server);
            }).to.throw('Can\'t call labbable.using(server) more than once.');

            done();
        });

    });

    describe('ready()', () => {

        it('hands-off server once initialized.', (done) => {

            const server = new Hapi.Server();
            server.connection();

            let init = false;

            const labbable = new Labbable();
            labbable.using(server);
            labbable.ready((err, srv) => {

                expect(err).to.not.exist();
                expect(init).to.equal(true);
                expect(srv).to.shallow.equal(server);
                done();
            });

            server.initialize((err) => {

                if (err) {
                    return done(err);
                }

                init = true;
            });
        });

        it('hands-off server that was already initialized.', (done) => {

            const server = new Hapi.Server();
            server.connection();

            const labbable = new Labbable();
            labbable.using(server);

            server.initialize((err) => {

                expect(err).to.not.exist();

                labbable.ready((err, srv) => {

                    expect(err).to.not.exist();
                    expect(srv).to.shallow.equal(server);
                    done();
                });
            });

        });

        it('hands-off initialized server in a queue.', (done) => {

            const server = new Hapi.Server();
            server.connection();

            const labbable = new Labbable();
            labbable.using(server);

            const order = [];
            const add = (n) => {

                return (err, srv) => {

                    expect(err).to.not.exist();
                    expect(srv).to.shallow.equal(server);
                    order.push(n);
                };
            };

            labbable.ready(add(1));
            labbable.ready(add(2));
            labbable.ready(add(3));

            expect(order).to.equal([]);

            server.initialize((err) => {

                expect(err).to.not.exist();

                setImmediate(() => {

                    labbable.ready(add(4));
                    labbable.ready(add(5));

                    // Make sure 4 and 5 happen on the next tick
                    expect(order).to.equal([1,2,3]);

                    labbable.ready((err, srv) => {

                        expect(err).to.not.exist();
                        expect(srv).to.shallow.equal(server);
                        expect(order).to.equal([1,2,3,4,5]);
                        done();
                    });
                });
            });

        });

        it('hands-off server from constructor.', (done) => {

            const server = new Hapi.Server();
            server.connection();

            let init = false;

            const labbable = new Labbable({ server });
            labbable.ready((err, srv) => {

                expect(err).to.not.exist();
                expect(init).to.equal(true);
                expect(srv).to.shallow.equal(server);
                done();
            });

            server.initialize((err) => {

                if (err) {
                    return done(err);
                }

                init = true;
            });
        });

        it('respects timeout specified in options (waiting for init).', (done) => {

            const server = new Hapi.Server();
            server.connection();

            const labbable = new Labbable({ server });

            setTimeout(() => server.initialize(() => {}), 20);

            labbable.ready({ timeout: 10 }, (err, srv) => {

                expect(err).to.exist();
                expect(err.message).to.equal('Labbable timed-out after 10ms.  Did you forget to call server.initialize() or labbable.using(server)?');
                expect(srv).to.not.exist();
                done();
            });

        });

        it('hands-off server as soon as it\'s available when using { immediate: true }.', (done) => {

            const server = new Hapi.Server();
            server.connection();

            const labbable = new Labbable();

            setImmediate(() => labbable.using(server));

            labbable.ready({ immediate: true }, (err, srv) => {

                expect(err).to.not.exist();
                expect(srv).to.shallow.equal(server);
                done();
            });

        });

        it('hands-off server that was already available when using { immediate: true }.', (done) => {

            const server = new Hapi.Server();
            server.connection();

            const labbable = new Labbable({ server });

            labbable.ready({ immediate: true }, (err, srv) => {

                expect(err).to.not.exist();
                expect(srv).to.shallow.equal(server);
                done();
            });

        });

        it('respects timeout specified in options (waiting for immediate).', (done) => {

            const server = new Hapi.Server();
            server.connection();

            const labbable = new Labbable();

            setTimeout(() => labbable.using(server), 20);

            labbable.ready({ timeout: 10, immediate: true }, (err, srv) => {

                expect(err).to.exist();
                expect(err.message).to.equal('Labbable timed-out after 10ms.  Did you forget to call labbable.using(server)?');
                expect(srv).to.not.exist();
                done();
            });

        });

        it('respects default timeout specified to the constructor.', (done, onCleanup) => {

            const server = new Hapi.Server();
            server.connection();

            const labbable = new Labbable({ defaultTimeout: 1000 });

            const setTimeout = global.setTimeout;
            onCleanup((next) => {

                global.setTimeout = setTimeout;
                next();
            });

            const called = [];
            global.setTimeout = (fn, time) => {

                called.push(time);
                return setTimeout(fn, 1);
            };

            labbable.ready({ immediate: true }, (err, srv) => {

                expect(err).to.exist();
                expect(err.message).to.equal('Labbable timed-out after 1000ms.  Did you forget to call labbable.using(server)?');
                expect(srv).to.not.exist();
                expect(called.length).to.equal(1);
                expect(called[0]).to.equal(1000);
                done();
            });

        });

        it('has default timeout of 2 seconds.', (done, onCleanup) => {

            const server = new Hapi.Server();
            server.connection();

            const labbable = new Labbable();

            const setTimeout = global.setTimeout;
            onCleanup((next) => {

                global.setTimeout = setTimeout;
                next();
            });

            const called = [];
            global.setTimeout = (fn, time) => {

                called.push(time);
                return setTimeout(fn, 1);
            };

            labbable.ready({ immediate: true }, (err, srv) => {

                expect(err).to.exist();
                expect(err.message).to.equal('Labbable timed-out after 2000ms.  Did you forget to call labbable.using(server)?');
                expect(srv).to.not.exist();
                expect(called.length).to.equal(1);
                expect(called[0]).to.equal(2000);
                done();
            });

        });

        it('never times-out with { timeout: false | 0 }.', (done, onCleanup) => {

            const server = new Hapi.Server();
            server.connection();

            const labbable = new Labbable();

            const setTimeout = global.setTimeout;
            onCleanup((next) => {

                global.setTimeout = setTimeout;
                next();
            });

            setTimeout(() => labbable.using(server), 10);

            const called = [];
            global.setTimeout = (fn, time) => {

                called.push(time);
                return setTimeout(fn, 1);
            };

            let firstReadied = false;
            labbable.ready({ timeout: false, immediate: true }, (err, srv) => {

                expect(err).to.not.exist();
                expect(srv).to.shallow.equal(server);
                firstReadied = true;
            });

            labbable.ready({ timeout: 0, immediate: true }, (err, srv) => {

                expect(err).to.not.exist();
                expect(srv).to.shallow.equal(server);
                expect(called.length).to.equal(0);
                expect(firstReadied).to.equal(true);
                done();
            });

        });

        it('does not call callback multiple times on using()-then-timeout.', (done) => {

            const server = new Hapi.Server();
            server.connection();

            const labbable = new Labbable();

            setImmediate(() => labbable.using(server));

            let called = 0;

            labbable.ready({ timeout: 10, immediate: true }, (err, srv) => {

                called++;

                expect(called).to.equal(1);
                expect(err).to.not.exist();
                expect(srv).to.shallow.equal(server);
                setTimeout(done, 20);
            });

        });

        it('does not call callback multiple times on timeout-then-using().', (done) => {

            const server = new Hapi.Server();
            server.connection();

            const labbable = new Labbable();

            let called = 0;

            labbable.ready({ timeout: 1, immediate: true }, (err, srv) => {

                called++;

                if (called === 1) {
                    labbable.using(server);
                }

                expect(called).to.equal(1);
                expect(err).to.exist();
                expect(srv).to.not.exist();
                setTimeout(done, 10);
            });

        });

        it('sans callback returns a promise that eventually resolves.', (done) => {

            const server = new Hapi.Server();
            server.connection();

            const labbable = new Labbable();

            setImmediate(() => labbable.using(server));

            labbable.ready({ immediate: true })
                .then((srv) => {

                    expect(srv).to.shallow.equal(server);
                    done();
                })
                .catch(done);

        });

        it('sans callback returns a promise that resolves immediately.', (done) => {

            const server = new Hapi.Server();
            server.connection();

            const labbable = new Labbable({ server });

            labbable.ready({ immediate: true })
                .then((srv) => {

                    expect(srv).to.shallow.equal(server);
                    done();
                })
                .catch(done);

        });

        it('sans callback returns a promise that eventually rejects on timeout.', (done) => {

            const server = new Hapi.Server();
            server.connection();

            const labbable = new Labbable();

            labbable.ready({ timeout: 1, immediate: true })
                .then(() => {

                    done(new Error('Shouldn\'t make it here.'));
                })
                .catch((err) => {

                    expect(err).to.exist();
                    expect(err.message).to.equal('Labbable timed-out after 1ms.  Did you forget to call labbable.using(server)?');
                    done();
                });

        });

    });

    describe('isInitialized()', () => {

        it('returns server init state.', (done) => {

            const server = new Hapi.Server();
            server.connection();

            const labbable = new Labbable();
            expect(labbable.isInitialized()).to.equal(false);

            labbable.using(server);
            expect(labbable.isInitialized()).to.equal(false);

            server.initialize((err) => {

                expect(err).to.not.exist();
                expect(labbable.isInitialized()).to.equal(true);
                done();
            });
        });

    });

    describe('plugin', () => {

        it('provides server decorations for isInitialized() and ready().', (done) => {

            const server = new Hapi.Server();
            server.connection();

            server.register(Labbable.plugin, () => {});
            setImmediate(() => server.initialize(() => {}));

            expect(server.isInitialized()).to.equal(false);

            server.labbableReady((err, srv) => {

                expect(err).to.not.exist();
                expect(srv).to.shallow.equal(server);
                expect(srv.isInitialized()).to.equal(true);
                done();
            });
        });
    });
});
