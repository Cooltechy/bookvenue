const express = require('express');
const authService = require('../services/AuthService');
const { authMiddleware } = require('../middleware/auth');
const universityService = require('../services/UniversityService');

const router = express.Router();

router.post('/register', async (req, res, next) => {
  try {
    const result = await authService.register(req.body);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const result = await authService.login(req.body);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

router.post('/validate', authMiddleware, async (req, res, next) => {
  try {
    res.status(200).json({ user: req.user });
  } catch (error) {
    next(error);
  }
});

router.get('/verify-university-email/:email', async (req, res, next) => {
  try {
    const email = req.params.email.toLowerCase();
    const verification = await universityService.verifyUserByEmail(email);
    res.status(200).json(verification);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
