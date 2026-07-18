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
  createDataPackage,
  listDataPackages,
  listOrders,
  createDeposit,
  listDeposits,
  dashboardStats,
  initPaystackDeposit,
} from '../controllers/catalogController.js'
import { placeOrder, placeMassOrder } from '../controllers/orderController.js'
import { listDataOrders, createDataOrder, createAllenDataHubPurchase, listAllenDataHubProducts } from '../controllers/dataController.js'
import fiveSimCatalogRouter from './fiveSimCatalog.js'

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
router.post('/services/data-package', createDataPackage)
router.get('/datapackages', listDataPackages)
router.post('/datapackages', createDataPackage)

// Orders
router.post('/orders', placeOrder)
router.post('/orders/mass', placeMassOrder)
router.get('/orders', listOrders)

// Deposits
router.post('/deposits', createDeposit)
router.post('/deposits/paystack-init', initPaystackDeposit)
router.get('/deposits', listDeposits)

// Dashboard
router.get('/dashboard/:user_id', dashboardStats)

// Data orders
router.get('/data-orders', listDataOrders)
router.post('/data-orders', createDataOrder)
router.get('/allendatahub/products', listAllenDataHubProducts)
router.post('/data-orders/allendatahub', createAllenDataHubPurchase)

// 5sim live catalog bridge
router.use(fiveSimCatalogRouter)

export default router
