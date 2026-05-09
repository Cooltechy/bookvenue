const express = require('express');
const { authMiddleware, superAdminMiddleware } = require('../middleware/auth');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

const router = express.Router();

// Search university users (super admin only)
router.get('/search-university-users', authMiddleware, superAdminMiddleware, async (req, res, next) => {
  try {
    const { query } = req.query;
    
    if (!query || query.length < 2) {
      return res.status(400).json({ message: 'Search query must be at least 2 characters' });
    }

    const universityService = require('../services/UniversityService');
    const axios = require('axios');
    
    try {
      const apiUrl = process.env.UNIVERSITY_DB_API_URL || 'http://localhost:3002';
      const apiKey = process.env.UNIVERSITY_DB_API_KEY;
      
      const response = await axios.get(
        `${apiUrl}/api/users/search?query=${encodeURIComponent(query)}`,
        {
          headers: {
            'x-api-key': apiKey
          }
        }
      );
      
      const universityUsers = response.data.users || [];
      
      // Check which users are already registered locally
      const emails = universityUsers.map(u => u.email.toLowerCase());
      const localUsers = await User.find({ email: { $in: emails } }).select('email role');
      const localUserMap = {};
      localUsers.forEach(u => {
        localUserMap[u.email] = u.role;
      });
      
      // Add registration status to each user
      const usersWithStatus = universityUsers.map(u => ({
        ...u,
        name: u.name,
        isRegistered: !!localUserMap[u.email.toLowerCase()],
        currentRole: localUserMap[u.email.toLowerCase()] || null
      }));
      
      res.status(200).json({ users: usersWithStatus });
    } catch (error) {
      if (error.response && error.response.status === 404) {
        return res.status(200).json({ users: [] });
      }
      throw error;
    }
  } catch (error) {
    next(error);
  }
});

// Get all users (super admin only)
router.get('/users', authMiddleware, superAdminMiddleware, async (req, res, next) => {
  try {
    const { role } = req.query;
    const filter = role ? { role } : {};
    const users = await User.find(filter).select('-password').sort({ createdAt: -1 });
    
    // Fetch and merge university data for all users
    const universityService = require('../services/UniversityService');
    const completeUsers = await Promise.all(
      users.map(async (user) => {
        const universityUser = await universityService.getUserByEmail(user.email);
        return {
          ...user.toObject(),
          name: universityUser?.name || '',
          department: universityUser?.department || '',
          type: universityUser?.type || ''
        };
      })
    );
    
    // Filter out students - only show faculty and staff
    const nonStudentUsers = completeUsers.filter(u => u.type !== 'student');
    
    res.status(200).json(nonStudentUsers);
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
    
    // Fetch and merge university data for all admins
    const universityService = require('../services/UniversityService');
    const completeAdmins = await Promise.all(
      admins.map(async (admin) => {
        try {
          const universityUser = await universityService.getUserByEmail(admin.email);
          return {
            ...admin.toObject(),
            name: universityUser?.name || '',
            department: universityUser?.department || ''
          };
        } catch (error) {
          console.error(`Failed to fetch university data for ${admin.email}:`, error.message);
          // Return admin data without university info if fetch fails
          return {
            ...admin.toObject(),
            name: '',
            department: ''
          };
        }
      })
    );
    
    res.status(200).json(completeAdmins);
  } catch (error) {
    next(error);
  }
});

// Create new admin (super admin only)
router.post('/admins', authMiddleware, superAdminMiddleware, async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email) {
      return res.status(400).json({ 
        message: 'Email is required' 
      });
    }

    // Check if email is university email
    if (!email.toLowerCase().endsWith('@uohyd.ac.in')) {
      return res.status(400).json({ 
        message: 'Only university email addresses (@uohyd.ac.in) are allowed' 
      });
    }

    const normalizedEmail = email.toLowerCase();

    // Check if user already exists
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ message: 'User already registered in the system' });
    }

    // Verify user exists in university database
    const universityService = require('../services/UniversityService');
    const universityUser = await universityService.getUserByEmail(normalizedEmail);
    
    if (!universityUser) {
      return res.status(400).json({ 
        message: 'Email not found in university database. Only registered university members can be made admin.' 
      });
    }

    // Check if user is faculty or staff (not student)
    if (universityUser.type === 'student') {
      return res.status(403).json({ 
        message: 'Students cannot be assigned admin roles. Only faculty and staff members can be made admin.' 
      });
    }

    // Use provided password or default password
    const adminPassword = password || 'admin123';
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    // Create admin user
    const admin = new User({
      email: normalizedEmail,
      password: hashedPassword,
      role: 'admin'
    });

    await admin.save();

    // Return admin without password, merged with university data
    const { password: _, ...adminData } = admin.toObject();
    const completeAdmin = {
      ...adminData,
      name: universityUser?.name || '',
      department: universityUser?.department || '',
      defaultPassword: password ? undefined : 'admin123' // Only return if default was used
    };

    res.status(201).json(completeAdmin);
  } catch (error) {
    next(error);
  }
});

// Update admin (super admin only)
router.put('/admins/:id', authMiddleware, superAdminMiddleware, async (req, res, next) => {
  try {
    // Note: User details like name, department are stored in university DB
    // This endpoint can be used for other updates if needed in the future
    
    const admin = await User.findById(req.params.id).select('-password');

    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    // Fetch and merge university data
    const universityService = require('../services/UniversityService');
    const universityUser = await universityService.getUserByEmail(admin.email);
    
    const completeAdmin = {
      ...admin.toObject(),
      name: universityUser?.name || '',
      department: universityUser?.department || ''
    };

    res.status(200).json(completeAdmin);
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

    // Verify user is faculty or staff (not student)
    const universityService = require('../services/UniversityService');
    const universityUser = await universityService.getUserByEmail(user.email);
    
    if (!universityUser) {
      return res.status(400).json({ 
        message: 'User not found in university database' 
      });
    }

    if (universityUser.type === 'student') {
      return res.status(403).json({ 
        message: 'Students cannot be promoted to admin. Only faculty and staff members can be made admin.' 
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
