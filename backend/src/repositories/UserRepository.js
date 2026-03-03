const User = require('../models/User');

class UserRepository {
  async create(input) {
    const user = new User({
      email: input.email,
      password: input.password,
      firstName: input.firstName,
      lastName: input.lastName,
      role: input.role || 'user',
      department: input.department || ''
    });
    await user.save();
    return user;
  }

  async findById(id) {
    try {
      return await User.findById(id);
    } catch (error) {
      return null;
    }
  }

  async findByEmail(email) {
    return await User.findOne({ email: email.toLowerCase() });
  }

  async update(id, updates) {
    try {
      return await User.findByIdAndUpdate(
        id,
        updates,
        { new: true }
      );
    } catch (error) {
      return null;
    }
  }

  async delete(id) {
    try {
      const result = await User.findByIdAndDelete(id);
      return !!result;
    } catch (error) {
      return false;
    }
  }

  async findAll() {
    return await User.find({});
  }
}

module.exports = new UserRepository();
