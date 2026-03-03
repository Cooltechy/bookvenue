import client from './client'

export const systemAPI = {
  // Get minimum advance booking days configuration
  getMinAdvanceBookingDays: () => {
    return client.get('/admin/parameters/min-advance-booking-days')
  }
}
