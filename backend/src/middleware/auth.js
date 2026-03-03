const { verifyToken } = require('../utils/jwt');
const { AuthenticationError, AuthorizationError } = require('../utils/errors');

const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    console.log('🔐 Auth Check - Header:', authHeader ? 'Present' : 'Missing');
    
    if (!authHeader) {
      throw new AuthenticationError('No authorization header provided');
    }
    
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      throw new AuthenticationError('Invalid authorization header format. Expected: Bearer <token>');
    }
    
    const token = parts[1];
    if (!token) {
      throw new AuthenticationError('No token provided');
    }
    
    const payload = verifyToken(token);
    console.log('✅ Token verified for user:', payload.email);
    req.user = payload;
    next();
  } catch (error) {
    console.error('❌ Auth error:', error.message);
    next(error);
  }
};

const adminMiddleware = (req, res, next) => {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'super_admin')) {
    return next(new AuthorizationError('Admin access required'));
  }
  next();
};

const superAdminMiddleware = (req, res, next) => {
  if (!req.user || req.user.role !== 'super_admin') {
    return next(new AuthorizationError('Super admin access required'));
  }
  next();
};

module.exports = {
  authMiddleware,
  adminMiddleware,
  superAdminMiddleware
};
