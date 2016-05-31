# labbable

No-fuss hapi server testing

[![Build Status](https://travis-ci.org/devinivy/labbable.svg?branch=master)](https://travis-ci.org/devinivy/labbable) [![Coverage Status](https://coveralls.io/repos/devinivy/labbable/badge.svg?branch=master&service=github)](https://coveralls.io/github/devinivy/labbable?branch=master)

It can be a pain to get your hapi server into your tests, especially when using otherwise wonderful tools such as **[glue](https://github.com/hapijs/glue)**.  Labbable makes this process very simple, and encourages the best practice of testing an initialized (but not started) hapi server.

##### Why initialize the server?
Plugin dependencies are only enforced at the time of server initialization.  This means code that relies on a plugin being present (typically by the `after` callback of `server.dependency(deps, after)`) will only run during initialization.  And if there are any dependencies missing, those errors will surface only during initialization.  Your server's caches will also be started and `onPreStart` server extensions will run.

Should you so desire, labbable can also pass an uninitialized server into your tests using options for [`labbable.ready()`](#labbablereadyoptions-cb).

## Usage

### Directly (as plugin)
In this case the server is immediately available and can be placed in `module.exports`.  Registering the `Labbable.plugin` hapi plugin adds a server decoration `server.labbableReady()` that can be used in a test to guarantee the server is initialized.

#### `server.js`
```js
const Hapi = require('hapi');
const Labbable = require('labbable');

// Step 1.
// Simply export your server
const server = module.exports = new Hapi.Server();

server.connection();

// Step 2.
// Register the labbable plugin plus any others
server.register([Labbable.plugin], (err) => {

    if (err) {
        throw err;
    }

    server.initialize((err) => {

        if (err) {
            throw err;
        }

        // Don't continue to start server if module
        // is being require()'d (likely in a test)
        if (module.parent) {
            return;
        }

        server.start((err) => {

            if (err) {
                throw err;
            }

            console.log('Server started');
        });
    });

});
```

#### `test/index.js`
```js
const Code = require('code');
const Lab = require('lab');
const MyServer = require('../server.js')

const lab = exports.lab = Lab.script();
const describe = lab.describe;
const it = lab.it;
const expect = Code.expect;

describe('My server', () => {

    const server = MyServer;

    before((done) => {

        // Callback fires once the server is initialized
        // or immediately if the server is already initialized
        server.labbableReady((err) => {

            if (err) {
                return done(err);
            }

            return done();
        });
    });

    // server is now available to be tested
    it('initializes.' (done) => {

        // server.isInitialized() can be used to check the server's init state
        expect(server.isInitialized()).to.equal(true);
        done();
    });

});
```

### With glue
In this case the server is composed by **glue** then made available asynchronously, so it can't be exported as in the previous example.

Instead we export an instance `lababble` of Labbable, then call `labbable.using(server)` as soon as the server is available.  The method `labbable.ready()`
 can then be used in a test to get a hold of `server` once it's initialized.

#### `server.js`
```js
const Glue = require('glue');
const Labbable = require('labbable');

// Step 1.
// Make an instance of Labbable
// to which we can pass the server
const labbable = module.exports = new Labbable();
const manifest = {/* ... */};

Glue.compose(manifest, (err, server) => {

    if (err) {
        throw err;
    }

    // Step 2.
    // Show the server to our instance of labbable
    labbable.using(server);

    server.initialize((err) => {

        if (err) {
            throw err;
        }

        // Don't continue to start server if module
        // is being require()'d (likely in a test)
        if (module.parent) {
            return;
        }

        server.start((err) => {

            if (err) {
                throw err;
            }

            console.log('Server started');
        });
    });

});
```

#### `test/index.js`
```js
const Code = require('code');
const Lab = require('lab');
const LabbableServer = require('../server.js');

const lab = exports.lab = Lab.script();
const describe = lab.describe;
const it = lab.it;
const expect = Code.expect;

describe('My server', () => {

    let server;

    before((done) => {

        // Callback fires once the server is initialized
        // or immediately if the server is already initialized
        LabbableServer.ready((err, srv) => {

            if (err) {
                return done(err);
            }

            server = srv;

            return done();
        });
    });

    // server is now available to be tested
    it('initializes.' (done) => {

        // isInitialized() can be used to check the server's init state
        expect(LabbableServer.isInitialized()).to.equal(true);
        done();
    });

});
```
