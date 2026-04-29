const authService = require('./auth.service')

async function register(req, res, next) {
  try {
    const { email, password, role, name } = req.body
    const result = await authService.register({ email, password, role, name })
    res.status(201).json({
      success: true,
      data: result,
    })
  } catch (err) {
    next(err)
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body
    const result = await authService.login({ email, password })
    res.json({
      success: true,
      data: result,
    })
  } catch (err) {
    next(err)
  }
}

async function me(req, res, next) {
  try {
    const user = await authService.getProfile(req.user.id)
    res.json({
      success: true,
      data: user,
    })
  } catch (err) {
    next(err)
  }
}

module.exports = { register, login, me }