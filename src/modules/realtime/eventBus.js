// EventBus — centralized registry for all system events enabling decoupled communication between modules
const SOCKET_EVENTS = require('../../constants/socketEvents')

class EventBus {
  constructor() {
    this.handlers = {}
  }

  // Register a handler for a specific event
  on(event, handler) {
    if (!this.handlers[event]) this.handlers[event] = []
    this.handlers[event].push(handler)
  }

  // Trigger all handlers for an event with data
  emit(event, data) {
    const handlers = this.handlers[event] || []
    handlers.forEach(handler => handler(data))
  }

  // Remove a specific handler
  off(event, handler) {
    if (!this.handlers[event]) return
    this.handlers[event] = this.handlers[event].filter(h => h !== handler)
  }
}

const eventBus = new EventBus()
module.exports = { eventBus, SOCKET_EVENTS }