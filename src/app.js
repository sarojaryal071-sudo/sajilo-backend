const express = require('express')
const cors = require('cors')

const authRoutes = require('./modules/auth/auth.routes')
const userRoutes = require('./modules/users/users.routes')
const bookingRoutes = require('./modules/bookings/bookings.routes')
const paymentsRoutes = require('./modules/payments/payments.routes')
const chatRoutes = require('./modules/chat/chat.routes')
const errorHandler = require('./middleware/errorHandler')
const authModel = require('./modules/auth/auth.model')
const bookingsModel = require('./modules/bookings/bookings.model')
const chatModel = require('./modules/chat/chat.model')
const workerRoutes = require('./modules/workers/worker.routes')

const app = express()

app.use(cors({
  origin: ['http://localhost:5173', 'https://sajilo-app.vercel.app'],
  credentials: true,
}))
app.use(express.json())

async function initDB() {
  await authModel.createUserTable()
  console.log('Users table ready')
  // await bookingsModel.createBookingsTable()
  // console.log('Bookings table ready')
  await chatModel.createChatTables()
  console.log('Chat tables ready')
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
app.use('/api/chat', chatRoutes)
app.use('/api/workers', workerRoutes)
app.use('/api/locations', require('./modules/locations/locations.routes'))
app.use('/api/reviews', require('./modules/reviews/reviews.routes'))
app.use('/api/notifications', require('./modules/notification/notification.routes'))
app.use('/api/payments', require('./modules/payments/payments.routes'))
app.use('/api/system', require('./modules/system/system.routes'));
app.use('/health', require('./modules/system/health.routes'))
app.use('/api/support/tickets', require('./modules/support/supportTickets.routes').userRouter)


app.use(errorHandler)

app.use('/api/admin/support', require('./modules/admin/support.routes'))
app.use('/api/admin/support/tickets', require('./modules/support/supportTickets.routes').adminRouter)
app.use('/api/admin/announcements', require('./modules/admin/announcements.routes').adminRouter)
app.use('/api/admin/activity', require('./modules/activity/activity.routes'))
app.use('/api/admin/search', require('./modules/admin/admin.search.routes'))
app.use('/api/admin/staff', require('./modules/admin/admin.staff.routes'))
app.use('/api/admin/policies', require('./modules/admin/policy.routes'))
app.use('/api/announcements', require('./modules/admin/announcements.routes').publicRouter)


module.exports = app