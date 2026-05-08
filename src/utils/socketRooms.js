function getUserRoom(userId, clientId) {
  return `user:${clientId || `U${userId}`}`
}
module.exports = { getUserRoom }