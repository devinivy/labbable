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
