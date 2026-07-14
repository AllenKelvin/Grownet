import { Router } from 'express'
import {
  getCurrentUser,
  listUsers,
  updateUser,
  loginUser,
  signupUser,
  forgotPassword,
  listServices,
  listCategories,
  syncServices,
  createService,
  listOrders,
  createDeposit,
  listDeposits,
  dashboardStats,
} from '../controllers/catalogController.js'
import { placeOrder, placeMassOrder } from '../controllers/orderController.js'
import mockSmsRouter from './mockSms.js'

const router = Router()

// Auth
router.post('/auth/login', loginUser)
router.post('/auth/signup', signupUser)
router.post('/auth/forgot-password', forgotPassword)

// Users
router.get('/users', listUsers)
router.get('/users/:id', getCurrentUser)
router.put('/users/:id', updateUser)

// Services
router.get('/services', listServices)
router.get('/categories', listCategories)
router.post('/services/sync', syncServices)
router.post('/services', createService)

// Orders
router.post('/orders', placeOrder)
router.post('/orders/mass', placeMassOrder)
router.get('/orders', listOrders)

// Deposits
router.post('/deposits', createDeposit)
router.get('/deposits', listDeposits)

// Dashboard
router.get('/dashboard/:user_id', dashboardStats)

// Mock SMS
router.use(mockSmsRouter)

export default router
