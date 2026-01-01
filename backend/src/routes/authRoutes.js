const express = require('express');
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// Public endpoints
router.post('/register', authController.register);
router.post('/login', authController.login);

// Protected endpoints
router.get('/me', authMiddleware, authController.getCurrentUser);
router.get('/my-organizations', authMiddleware, authController.getMyOrganizations);
router.post('/switch-organization', authMiddleware, authController.switchOrganization);

module.exports = router;

