import client from './client'

export const bookingsAPI = {
  // Create a new booking with permission document
  createBooking: (formData) => {
    return client.post('/bookings', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
  },

  // Check slot availability
  checkAvailability: (data) => {
    return client.post('/bookings/check-availability', data)
  },

  // Get confirmed bookings for a venue on a specific date
  getConfirmedBookings: (venueId, date) => {
    return client.get(`/bookings/confirmed/${venueId}?date=${date}`)
  },

  // Get user's bookings
  getMyBookings: () => {
    return client.get('/bookings/my-bookings')
  },

  // Get booking by ID
  getBookingById: (id) => {
    return client.get(`/bookings/${id}`)
  },

  // Cancel booking
  cancelBooking: (id) => {
    return client.delete(`/bookings/${id}`)
  },

  // Download permission document
  downloadPermissionDocument: (id) => {
    return client.get(`/bookings/${id}/permission-document`, {
      responseType: 'blob'
    })
  },

  // Submit payment
  submitPayment: (id, formData) => {
    return client.post(`/bookings/${id}/payment`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
  },

  // Admin: Get pending approval bookings
  getPendingApprovalBookings: () => {
    return client.get('/bookings/admin/pending')
  },

  // Admin: Get payment pending bookings
  getPaymentPendingBookings: () => {
    return client.get('/bookings/admin/payment-pending')
  },

  // Admin: Approve booking
  approveBooking: (id) => {
    return client.put(`/bookings/${id}/approve`)
  },

  // Admin: Reject booking
  rejectBooking: (id, reason) => {
    return client.put(`/bookings/${id}/reject`, { rejectionReason: reason })
  }
}
