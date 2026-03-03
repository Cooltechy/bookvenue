const BookingRepository = require('../repositories/BookingRepository');
const VenueRepository = require('../repositories/VenueRepository');

class ReportService {
  static async getVenueUtilizationReport(venueId) {
    const bookings = await BookingRepository.findByVenue(venueId);
    return {
      venueId,
      totalBookings: bookings.length,
      confirmedBookings: bookings.filter(b => b.status === 'confirmed').length,
      cancelledBookings: bookings.filter(b => b.status === 'cancelled').length
    };
  }

  static async getSystemUtilizationReport() {
    const venues = await VenueRepository.findAll();
    const bookings = await BookingRepository.findAll();
    
    return {
      totalVenues: venues.length,
      totalBookings: bookings.length,
      confirmedBookings: bookings.filter(b => b.status === 'confirmed').length,
      cancelledBookings: bookings.filter(b => b.status === 'cancelled').length
    };
  }
}

module.exports = ReportService;
