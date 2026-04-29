const express = require('express')
const cors = require('cors')

const authRoutes = require('./modules/auth/auth.routes')
const userRoutes = require('./modules/users/users.routes')
const bookingRoutes = require('./modules/bookings/bookings.routes')
const errorHandler = require('./middleware/errorHandler')
const authModel = require('./modules/auth/auth.model')
const bookingsModel = require('./modules/bookings/bookings.model')

const app = express()

app.use(cors())
app.use(express.json())

async function initDB() {
  await authModel.createUserTable()
  console.log('Users table ready')
  await bookingsModel.createBookingsTable()
  console.log('Bookings table ready')
}

initDB()
  .then(() => console.log('Database initialized'))
  .catch((err) => {
    console.error('FATAL: Database connection failed. Server cannot start.')
    console.error(err.message)
    process.exit(1)
  })

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})
const adminRoutes = require('./modules/admin/admin.routes')
app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/bookings', bookingRoutes)
app.use('/api/admin', adminRoutes)
const notificationRoutes = require('./modules/notifications/notification.routes')
app.use('/api/notifications', notificationRoutes)

app.use(errorHandler)

module.exports = app