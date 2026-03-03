import client from './client'

export const venuesAPI = {
  // Get all venues
  getAllVenues: () => {
    return client.get('/venues')
  },

  // Get admin's own venues
  getMyVenues: () => {
    return client.get('/venues/my-venues')
  },

  // Get venue by ID
  getVenueById: (id) => {
    return client.get(`/venues/${id}`)
  },

  // Search venues
  searchVenues: (params) => {
    return client.get('/venues/search', { params })
  },

  // Create venue (admin only)
  createVenue: (venueData) => {
    return client.post('/venues', venueData)
  },

  // Update venue (admin only)
  updateVenue: (id, venueData) => {
    return client.put(`/venues/${id}`, venueData)
  },

  // Delete venue (admin only)
  deleteVenue: (id) => {
    return client.delete(`/venues/${id}`)
  }
}
