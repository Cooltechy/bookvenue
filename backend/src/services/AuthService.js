const userRepository = require('../repositories/UserRepository');
const { generateToken, verifyToken } = require('../utils/jwt');
const { hashPassword, comparePassword } = require('../utils/password');
const { validateEmail, validateUniversityEmail, validatePassword } = require('../utils/validation');
const { ValidationError, AuthenticationError } = require('../utils/errors');

class AuthService {
  async register(input) {
    // Convert email to lowercase for consistency
    const email = input.email.toLowerCase();
    
    if (!validateEmail(email)) {
      throw new ValidationError('Invalid email format');
    }
    if (!validateUniversityEmail(email)) {
      throw new ValidationError('Only lowercase university email addresses (@uohyd.ac.in) are allowed');
    }
    if (!validatePassword(input.password)) {
      throw new ValidationError('Password must be at least 6 characters');
    }

    const existingUser = await userRepository.findByEmail(email);
    if (existingUser) {
      throw new ValidationError('Email already registered');
    }

    const hashedPassword = await hashPassword(input.password);
    const user = await userRepository.create({
      ...input,
      email, // Use lowercase email
      password: hashedPassword
    });

    // Convert to plain object and remove password
    const userObj = user.toObject ? user.toObject() : user;
    const token = generateToken(userObj);
    const { password, ...userWithoutPassword } = userObj;
    return { token, user: userWithoutPassword };
  }

  async login(request) {
    // Convert email to lowercase for consistency
    const email = request.email.toLowerCase();
    
    if (!validateEmail(email)) {
      throw new ValidationError('Invalid email format');
    }

    const user = await userRepository.findByEmail(email);
    if (!user) {
      throw new AuthenticationError('Invalid email or password');
    }

    const isPasswordValid = await comparePassword(request.password, user.password);
    if (!isPasswordValid) {
      throw new AuthenticationError('Invalid email or password');
    }

    // Convert to plain object and remove password
    const userObj = user.toObject ? user.toObject() : user;
    const token = generateToken(userObj);
    const { password, ...userWithoutPassword } = userObj;
    return { token, user: userWithoutPassword };
  }

  async validateToken(token) {
    try {
      const payload = verifyToken(token);
      const user = await userRepository.findById(payload.id);
      return user || null;
    } catch {
      return null;
    }
  }

  hasRole(user, role) {
    return user.role === role;
  }

  isAdmin(user) {
    return this.hasRole(user, 'admin');
  }

  isRegularUser(user) {
    return this.hasRole(user, 'user');
  }
}

module.exports = new AuthService();
