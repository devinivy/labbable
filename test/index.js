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

    it('', (done) => {

        const server = new Hapi.Server();
        server.connection();

        let init = false;
        server.ext('onPreStart', (srv, next) => {

            init = true;
            next();
        });

        const labbable = new Labbable(server);

        labbable.ready((err, srv) => {

            if (err) {
                return done(err);
            }

            expect(init).to.equal(true);
            expect(server).to.shallow.equal(server);
            done();
        });

        server.initialize((err) => err && done(err));
    });

});
