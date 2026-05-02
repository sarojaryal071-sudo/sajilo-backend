// Backend socket event constants
// Centralized socket event name constants for backend — single source of truth for all socket events
const SOCKET_EVENTS = {
  CONNECT: 'connection',
  DISCONNECT: 'disconnect',
  CONNECTED: 'connected',

  MESSAGE_SEND: 'send_message',
  MESSAGE_NEW: 'new_message',
  MESSAGE_SENT: 'message_sent',
  MESSAGE_ERROR: 'message_error',

  NOTIFICATION_NEW: 'notification_new',

  WORKER_ONLINE: 'worker_online',
  WORKER_OFFLINE: 'worker_offline',

  BOOKING_UPDATE: 'booking_update',
  STATUS_CHANGE: 'status_change',
}

module.exports = SOCKET_EVENTS