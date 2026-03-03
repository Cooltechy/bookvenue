const express = require('express');
const venueService = require('../services/VenueService');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const venues = await venueService.getAllVenues();
    res.status(200).json(venues);
  } catch (error) {
    next(error);
  }
});

// Search route must come before :id route to avoid matching 'search' as an ID
router.get('/search', async (req, res, next) => {
  try {
    const venues = await venueService.searchVenues(req.query);
    res.status(200).json(venues);
  } catch (error) {
    next(error);
  }
});

// Get venues by owner (admin only - their own venues) - must come before :id route
router.get('/my-venues', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    // Admins can only see their own venues
    const venues = await venueService.getVenuesByOwner(req.user.id);
    res.status(200).json(venues);
  } catch (error) {
    next(error);
  }
});

// Get venue by ID - must come after specific routes like /search and /my-venues
router.get('/:id', async (req, res, next) => {
  try {
    const venue = await venueService.getVenueById(req.params.id);
    if (!venue) {
      return res.status(404).json({ message: 'Venue not found' });
    }
    res.status(200).json(venue);
  } catch (error) {
    next(error);
  }
});

router.post('/', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const venue = await venueService.createVenue(req.body, req.user.id);
    res.status(201).json(venue);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const venue = await venueService.updateVenue(req.params.id, req.body, req.user.id);
    res.status(200).json(venue);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    await venueService.deleteVenue(req.params.id, req.user.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

router.post('/:id/availability', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const venue = await venueService.setAvailability(req.params.id, req.body.availability);
    res.status(200).json(venue);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
