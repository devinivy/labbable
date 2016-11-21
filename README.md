# labbable

No-fuss hapi server testing

[![Build Status](https://travis-ci.org/devinivy/labbable.svg?branch=master)](https://travis-ci.org/devinivy/labbable) [![Coverage Status](https://coveralls.io/repos/devinivy/labbable/badge.svg?branch=master&service=github)](https://coveralls.io/github/devinivy/labbable?branch=master)

It can be a pain to get your hapi server into your tests, especially when using otherwise wonderful tools such as **[glue](https://github.com/hapijs/glue)**.  Labbable makes this process very simple, and encourages the best practice of testing an initialized (but not started) hapi server.

##### Why initialize the server for tests?
Plugin dependencies are only enforced at the time of [server initialization](https://github.com/hapijs/hapi/blob/master/API.md#serverinitializecallback).  This means code that relies on a plugin being present (typically by the `after` callback of [`server.dependency(deps, after)`](https://github.com/hapijs/hapi/blob/master/API.md#serverdependencydependencies-after)) will only run during initialization.  And if there are any dependencies missing, those errors will surface only during initialization.  Your server's caches will also be started and `onPreStart` server extensions will run.

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

    // Step 3.
    // Initialize your server
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
const MyServer = require('../server.js');

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
    it('initializes.', (done) => {

        // server.isInitialized() can be used to check the server's init state
        expect(server.isInitialized()).to.equal(true);
        done();
    });
});
```

### With glue
In this case the server is composed by **[glue](https://github.com/hapijs/glue)** then made available asynchronously, so it can't be exported as in the previous example.

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

    // Step 3.
    // Initialize your server
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
    it('initializes.', (done) => {

        expect(server).to.exist();

        // isInitialized() can be used to check the server's init state
        expect(LabbableServer.isInitialized()).to.equal(true);
        done();
    });
});
```

## API

### `Labbable`
The `Labbable` object is the container used to conveniently obtain a hapi server.

#### `new Labbable([options])`
Creates a new `Labbable` object.
  - `options` - an optional object with the following,
    - `server` - a hapi server.  When passed, the labbable instance is immediately made aware of `server`.
    - `defaultTimeout` - the number of milliseconds to wait (for the `server` to be made initialized and/or available) until a timeout error is raised.  When set to `0` or `false` no timeout will be set. Defaults to `2000` (2 seconds).

#### `labbable.using(server)`
  - `server` - a hapi server.  Makes the labbable instance aware of `server`.

The labbable instance should be made aware of the hapi server as soon as possible.  If the labbable instance is already aware of a server, this will throw an error.

#### `labbable.ready([options], [cb])`
  - `options` - an optional object with the following,
    - `immediate` - a boolean that when `true` passes along the `server` as soon as it is available to `labbable` (typically by calling `labbable.using(server)`).  By default, labbable will wait until the server is both available and also initialized.
    - `timeout` - a number in milliseconds, to override the `defaultTimeout` option specified in the constructor.
  - `cb` - a callback with the signature `cb(err, srv)`,
    - `err` - an error (such as a timeout).
    - `srv` - the hapi server instance that has been made initialized and/or available.

When `cb` is not passed `labbable.ready()` returns a `Promise` that resolves with `srv` as described above, or rejects with `err` as described above.

#### `labbable.isInitialized()`
Returns `true` when `labbable` is aware of a hapi server (typically by calling `labbable.using(server)`) that has been initialized, and `false` otherwise.


### `Labbable.plugin`
This is a hapi plugin.  It gives the server two server decorations that provide identical functionality to [an instance of labbable](#new-labbableserver).

#### `server.labbableReady([options], [cb])`
This is identical to [`labbable.ready()`](#labbablereadyoptions-cb), where the root server is already made available to `labbable`.

#### `server.isInitialized()`
Returns `true` if `server` is initialized and `false` otherwise.
