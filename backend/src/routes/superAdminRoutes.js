const express = require('express');
const { authMiddleware, superAdminMiddleware } = require('../middleware/auth');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

const router = express.Router();

// Get all users (super admin only)
router.get('/users', authMiddleware, superAdminMiddleware, async (req, res, next) => {
  try {
    const { role } = req.query;
    const filter = role ? { role } : {};
    const users = await User.find(filter).select('-password').sort({ createdAt: -1 });
    res.status(200).json(users);
  } catch (error) {
    next(error);
  }
});

// Get all admins (super admin only)
router.get('/admins', authMiddleware, superAdminMiddleware, async (req, res, next) => {
  try {
    const admins = await User.find({ 
      role: { $in: ['admin', 'super_admin'] } 
    }).select('-password');
    res.status(200).json(admins);
  } catch (error) {
    next(error);
  }
});

// Create new admin (super admin only)
router.post('/admins', authMiddleware, superAdminMiddleware, async (req, res, next) => {
  try {
    const { email, password, firstName, lastName, department } = req.body;

    // Validate required fields
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ 
        message: 'Email, password, first name, and last name are required' 
      });
    }

    // Check if email is university email
    if (!email.toLowerCase().endsWith('@uohyd.ac.in')) {
      return res.status(400).json({ 
        message: 'Only university email addresses (@uohyd.ac.in) are allowed' 
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create admin user
    const admin = new User({
      email: email.toLowerCase(),
      password: hashedPassword,
      firstName,
      lastName,
      role: 'admin',
      department: department || 'Not specified',
      studentId: `ADMIN${Date.now().toString().slice(-6)}`
    });

    await admin.save();

    // Return admin without password
    const { password: _, ...adminData } = admin.toObject();
    res.status(201).json(adminData);
  } catch (error) {
    next(error);
  }
});

// Update admin (super admin only)
router.put('/admins/:id', authMiddleware, superAdminMiddleware, async (req, res, next) => {
  try {
    const { firstName, lastName, department } = req.body;
    const updates = {};

    if (firstName) updates.firstName = firstName;
    if (lastName) updates.lastName = lastName;
    if (department !== undefined) updates.department = department; // Allow empty string

    // Email cannot be changed - it's the unique identifier
    // Removed email update logic

    const admin = await User.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true }
    ).select('-password');

    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    res.status(200).json(admin);
  } catch (error) {
    next(error);
  }
});

// Promote user to admin (super admin only)
router.post('/users/:id/promote', authMiddleware, superAdminMiddleware, async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if already an admin
    if (user.role === 'admin' || user.role === 'super_admin') {
      return res.status(400).json({ 
        message: `User is already ${user.role === 'super_admin' ? 'a super admin' : 'an admin'}` 
      });
    }

    // Promote to admin
    user.role = 'admin';
    await user.save();

    const { password: _, ...userData } = user.toObject();
    res.status(200).json({
      message: 'User promoted to admin successfully',
      user: userData
    });
  } catch (error) {
    next(error);
  }
});

// Demote admin to user (super admin only)
router.post('/admins/:id/demote', authMiddleware, superAdminMiddleware, async (req, res, next) => {
  try {
    // Prevent demoting yourself
    if (req.params.id === req.user.id) {
      return res.status(400).json({ message: 'Cannot demote your own account' });
    }

    const admin = await User.findById(req.params.id);
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    // Only allow demoting admins, not super admins
    if (admin.role === 'super_admin') {
      return res.status(400).json({ 
        message: 'Cannot demote super admin users' 
      });
    }

    if (admin.role !== 'admin') {
      return res.status(400).json({ 
        message: 'User is not an admin' 
      });
    }

    // Check if admin has venues
    const venueService = require('../services/VenueService');
    const venues = await venueService.getVenuesByOwner(req.params.id);
    
    if (venues.length > 0) {
      return res.status(400).json({ 
        message: `Cannot demote admin. They have ${venues.length} venue(s) assigned. Please transfer venues to another admin first.`,
        venueCount: venues.length,
        venues: venues.map(v => ({ id: v._id, name: v.name }))
      });
    }

    // Demote to regular user
    admin.role = 'user';
    await admin.save();

    const { password: _, ...userData } = admin.toObject();
    res.status(200).json({
      message: 'Admin demoted to user successfully',
      user: userData
    });
  } catch (error) {
    next(error);
  }
});

// Delete admin (super admin only)
router.delete('/admins/:id', authMiddleware, superAdminMiddleware, async (req, res, next) => {
  try {
    // Prevent deleting yourself
    if (req.params.id === req.user.id) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }

    const admin = await User.findById(req.params.id);
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    // Only allow deleting admins, not super admins or regular users
    if (admin.role !== 'admin') {
      return res.status(400).json({ 
        message: 'Can only delete admin users. Cannot delete super admins or regular users.' 
      });
    }

    // Check if admin has venues
    const venueService = require('../services/VenueService');
    const venues = await venueService.getVenuesByOwner(req.params.id);
    
    if (venues.length > 0) {
      return res.status(400).json({ 
        message: `Cannot delete admin. They have ${venues.length} venue(s) assigned. Please transfer venues to another admin first.`,
        venueCount: venues.length,
        venues: venues.map(v => ({ id: v._id, name: v.name }))
      });
    }

    await User.findByIdAndDelete(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// Reset admin password (super admin only)
router.post('/admins/:id/reset-password', authMiddleware, superAdminMiddleware, async (req, res, next) => {
  try {
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ 
        message: 'Password must be at least 6 characters' 
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    const admin = await User.findByIdAndUpdate(
      req.params.id,
      { password: hashedPassword },
      { new: true }
    ).select('-password');

    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    res.status(200).json({ 
      message: 'Password reset successfully',
      admin 
    });
  } catch (error) {
    next(error);
  }
});

// Get admin's venues (super admin only)
router.get('/admins/:id/venues', authMiddleware, superAdminMiddleware, async (req, res, next) => {
  try {
    const venueService = require('../services/VenueService');
    const venues = await venueService.getVenuesByOwner(req.params.id);
    res.status(200).json(venues);
  } catch (error) {
    next(error);
  }
});

// Transfer single venue to another admin (super admin only)
router.post('/venues/:venueId/transfer', authMiddleware, superAdminMiddleware, async (req, res, next) => {
  try {
    const { newOwnerId } = req.body;

    if (!newOwnerId) {
      return res.status(400).json({ message: 'New owner ID is required' });
    }

    const venueService = require('../services/VenueService');
    const venue = await venueService.transferVenueOwnership(req.params.venueId, newOwnerId);
    
    res.status(200).json({
      message: 'Venue ownership transferred successfully',
      venue
    });
  } catch (error) {
    next(error);
  }
});

// Transfer all venues from one admin to another (super admin only)
router.post('/admins/:fromAdminId/transfer-venues', authMiddleware, superAdminMiddleware, async (req, res, next) => {
  try {
    const { toAdminId } = req.body;

    if (!toAdminId) {
      return res.status(400).json({ message: 'Target admin ID is required' });
    }

    if (req.params.fromAdminId === toAdminId) {
      return res.status(400).json({ message: 'Cannot transfer venues to the same admin' });
    }

    const venueService = require('../services/VenueService');
    const result = await venueService.transferAllVenues(req.params.fromAdminId, toAdminId);
    
    res.status(200).json({
      message: `Successfully transferred ${result.transferredCount} venue(s)`,
      ...result
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
