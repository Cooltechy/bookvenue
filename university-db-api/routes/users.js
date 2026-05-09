const express = require('express');
const router = express.Router();
const UniversityUser = require('../models/universityUsers');

// Search users by name or email (for admin management)
router.get('/search', async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query || query.length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }
    
    const users = await UniversityUser.find({
      isActive: true,
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } },
        { universityId: { $regex: query, $options: 'i' } }
      ]
    })
    .select('-__v')
    .limit(20)
    .sort({ name: 1 });
    
    // Transform to match expected format
    const transformedUsers = users.map(user => ({
      email: user.email,
      firstName: user.name.split(' ')[0] || user.name,
      lastName: user.name.split(' ').slice(1).join(' ') || '',
      department: user.department,
      phone: user.phone,
      universityId: user.universityId,
      type: user.type
    }));
    
    res.json({ users: transformedUsers });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user by email (used for verification during registration)
router.get('/email/:email', async (req, res) => {
  try {
    const { email } = req.params;
    
    const user = await UniversityUser.findOne({ 
      email: email.toLowerCase(), 
      isActive: true 
    }).select('-__v');
    
    if (user) {
      res.json({ user });
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user by university ID (for university admin)
router.get('/id/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await UniversityUser.findOne({ 
      universityId: id
    }).select('-__v');
    
    if (user) {
      res.json({ user });
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all users (for university admin)
router.get('/', async (req, res) => {
  try {
    const { isActive } = req.query;
    const filter = isActive !== undefined ? { isActive: isActive === 'true' } : {};
    
    const users = await UniversityUser.find(filter)
      .select('-__v')
      .sort({ name: 1 });
    
    res.json({ users, count: users.length });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new user (for university admin to add users)
router.post('/', async (req, res) => {
  try {
    const { universityId, email, name, type, department, phone } = req.body;
    
    if (!universityId || !email || !name || !type || !department) {
      return res.status(400).json({ 
        error: 'universityId, email, name, type, and department are required' 
      });
    }
    
    const existingUser = await UniversityUser.findOne({
      $or: [{ email: email.toLowerCase() }, { universityId }]
    });
    
    if (existingUser) {
      return res.status(400).json({ 
        error: 'User with this email or university ID already exists' 
      });
    }
    
    const user = await UniversityUser.create({
      universityId,
      email: email.toLowerCase(),
      name,
      type,
      department,
      phone
    });
    
    res.status(201).json({ user });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user (for university admin to update user data)
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Don't allow updating universityId
    delete updates.universityId;
    
    if (updates.email) {
      updates.email = updates.email.toLowerCase();
      
      // Check if email already exists for another user
      const existingUser = await UniversityUser.findOne({
        email: updates.email,
        universityId: { $ne: id }
      });
      
      if (existingUser) {
        return res.status(400).json({ error: 'Email already in use by another user' });
      }
    }
    
    const user = await UniversityUser.findOneAndUpdate(
      { universityId: id },
      updates,
      { new: true, runValidators: true }
    ).select('-__v');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Deactivate user (for university admin to deactivate users)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await UniversityUser.findOneAndUpdate(
      { universityId: id },
      { isActive: false },
      { new: true }
    ).select('-__v');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ message: 'User deactivated successfully', user });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reactivate user (for university admin to reactivate users)
router.patch('/:id/activate', async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await UniversityUser.findOneAndUpdate(
      { universityId: id },
      { isActive: true },
      { new: true }
    ).select('-__v');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ message: 'User activated successfully', user });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
