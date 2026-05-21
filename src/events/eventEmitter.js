const EventEmitter = require('events');

// Shared event emitter – used for lightweight internal events.
const emitter = new EventEmitter();

// Prevents memory leaks warning for unlimited listeners
emitter.setMaxListeners(50);

module.exports = emitter;