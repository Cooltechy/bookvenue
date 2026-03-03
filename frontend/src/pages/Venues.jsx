import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import apiClient from '../api/client'
import { useAuth } from '../context/AuthContext'
import { MapPin, Users, LogOut, Calendar, Clock, X, CheckCircle, ChevronDown } from 'lucide-react'

export default function Venues() {
  const [venues, setVenues] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedVenue, setSelectedVenue] = useState(null)
  const [selectedDate, setSelectedDate] = useState('')
  const [timeSlots, setTimeSlots] = useState([])
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [purpose, setPurpose] = useState('')
  const [bookingLoading, setBookingLoading] = useState(false)
  const [bookingError, setBookingError] = useState('')
  const [bookingSuccess, setBookingSuccess] = useState(false)
  const [showAdminMenu, setShowAdminMenu] = useState(false)
  const navigate = useNavigate()
  const { logout, user } = useAuth()

  useEffect(() => {
    fetchVenues()
  }, [])

  const fetchVenues = async () => {
    try {
      const response = await apiClient.get('/venues')
      // Ensure venues is always an array
      const venuesData = Array.isArray(response.data) ? response.data : []
      setVenues(venuesData)
    } catch (err) {
      setError('Failed to load venues')
      console.error(err)
      setVenues([]) // Set empty array on error
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleDateSelect = async (venue, date) => {
    setSelectedVenue(venue)
    setSelectedDate(date)
    setTimeSlots([])
    setSelectedSlot(null)
    setBookingError('')
    
    try {
      const response = await apiClient.get(`/bookings/availability/${venue._id}?date=${date}`)
      setTimeSlots(response.data || [])
    } catch (err) {
      setBookingError('Failed to load time slots')
      console.error(err)
    }
  }

  const handleBooking = async () => {
    if (!selectedSlot || !selectedVenue) {
      setBookingError('Please select a time slot')
      return
    }

    if (!purpose.trim()) {
      setBookingError('Please provide a purpose for the booking')
      return
    }

    setBookingLoading(true)
    setBookingError('')

    try {
      await apiClient.post('/bookings', {
        venueId: selectedVenue._id,
        date: selectedDate,
        startTime: selectedSlot.startTime,
        purpose: purpose.trim()
      })

      setBookingSuccess(true)
      setTimeout(() => {
        setSelectedVenue(null)
        setSelectedDate('')
        setTimeSlots([])
        setSelectedSlot(null)
        setPurpose('')
        setBookingSuccess(false)
      }, 3000)
    } catch (err) {
      setBookingError(err.response?.data?.message || 'Booking failed')
      console.error(err)
    } finally {
      setBookingLoading(false)
    }
  }

  const closeBooking = () => {
    setSelectedVenue(null)
    setSelectedDate('')
    setTimeSlots([])
    setSelectedSlot(null)
    setPurpose('')
    setBookingError('')
  }

  const getMinBookingDate = () => {
    const date = new Date()
    date.setDate(date.getDate() + 7) // 7 days from today
    return date.toISOString().split('T')[0]
  }

  const today = new Date().toISOString().split('T')[0]
  const minBookingDate = getMinBookingDate()

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading venues...</div>
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-emerald-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-emerald-600 to-teal-600 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
          <div className="flex-1"></div>
          <div className="flex-1 text-center">
            <h1 className="text-3xl font-bold text-white mb-2">Venue Booking</h1>
            <p className="text-emerald-100 text-lg">Welcome, {user?.firstName} {user?.lastName}</p>
          </div>
          <div className="flex-1 flex justify-end gap-4">
            <button
              onClick={() => navigate('/my-bookings')}
              className="flex items-center gap-2 bg-emerald-500 text-white px-4 py-2 rounded-lg hover:bg-emerald-600 transition shadow-md"
            >
              My Bookings
            </button>
            {user?.role === 'admin' && (
              <div className="relative">
                <button
                  onClick={() => setShowAdminMenu(!showAdminMenu)}
                  className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition shadow-md"
                >
                  Admin
                  <ChevronDown className="w-4 h-4" />
                </button>
                {showAdminMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
                    <button
                      onClick={() => {
                        navigate('/admin/pending-approvals')
                        setShowAdminMenu(false)
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 transition text-gray-700 rounded-t-lg"
                    >
                      Pending Approvals
                    </button>
                    <button
                      onClick={() => {
                        navigate('/admin/venues')
                        setShowAdminMenu(false)
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 transition text-gray-700 rounded-b-lg border-t border-gray-100"
                    >
                      Manage Venues
                    </button>
                  </div>
                )}
              </div>
            )}
            {user?.role === 'super_admin' && (
              <button
                onClick={() => navigate('/super-admin/admins')}
                className="flex items-center gap-2 bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 transition shadow-md"
              >
                Manage Admins
              </button>
            )}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition shadow-md"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-12">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {venues.map(venue => (
            <div key={venue._id} className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition transform hover:scale-105">
              <div className="bg-gradient-to-r from-emerald-500 to-teal-500 h-40"></div>
              
              <div className="p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-2">{venue.name}</h2>
                <p className="text-gray-600 text-sm mb-4">{venue.description}</p>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-gray-700">
                    <MapPin className="w-4 h-4 mr-2 text-emerald-600" />
                    <span className="text-sm">{venue.location}</span>
                  </div>
                  <div className="flex items-center text-gray-700">
                    <Users className="w-4 h-4 mr-2 text-emerald-600" />
                    <span className="text-sm">Capacity: {venue.capacity} people</span>
                  </div>
                  {venue.authority && (
                    <div className="flex items-center text-gray-700">
                      <span className="text-sm">
                        <span className="font-medium text-gray-800">Department:</span> {venue.authority}
                      </span>
                    </div>
                  )}
                  {venue.ownerId && (
                    <div className="flex items-center text-gray-700">
                      <span className="text-sm">
                        <span className="font-medium text-gray-800">Managed by:</span> {venue.ownerId.firstName} {venue.ownerId.lastName}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center text-gray-700">
                    <span className="text-sm font-semibold text-emerald-600">
                      Half-day: ₹{venue.halfDayPrice} | Full-day: ₹{venue.fullDayPrice}
                    </span>
                  </div>
                </div>

                {venue.amenities && venue.amenities.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm font-semibold text-gray-700 mb-2">Amenities:</p>
                    <div className="flex flex-wrap gap-2">
                      {venue.amenities.map((amenity, idx) => (
                        <span key={idx} className="bg-emerald-100 text-emerald-800 text-xs px-2 py-1 rounded-full">
                          {amenity}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={() => navigate(`/book/${venue._id}`)}
                  className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-2 rounded-lg font-medium hover:from-emerald-700 hover:to-teal-700 transition shadow-md"
                >
                  Book Now
                </button>
              </div>
            </div>
          ))}
        </div>

        {venues.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg">No venues available</p>
          </div>
        )}
      </main>

      {/* Booking Modal */}
      {selectedVenue && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-gradient-to-r from-emerald-600 to-teal-600 p-6 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-white">{selectedVenue.name}</h2>
              <button
                onClick={closeBooking}
                className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {bookingSuccess ? (
                <div className="bg-blue-50 border-2 border-blue-400 rounded-lg p-6 text-center">
                  <CheckCircle className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-blue-800 mb-2">Booking Submitted!</h3>
                  <p className="text-blue-700 mb-2">Your booking request has been submitted successfully.</p>
                  <p className="text-sm text-blue-600">Status: <strong>Pending Approval</strong></p>
                  <p className="text-sm text-blue-600 mt-2">The venue authority will review and approve your booking shortly.</p>
                </div>
              ) : (
                <>
                  {/* Purpose Input */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Purpose of Booking
                    </label>
                    <textarea
                      value={purpose}
                      onChange={(e) => setPurpose(e.target.value)}
                      placeholder="Please describe the purpose of your booking..."
                      className="w-full px-4 py-2 border border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-500 resize-none"
                      rows="3"
                    />
                  </div>

                  {/* Date Selection */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Calendar className="inline w-4 h-4 mr-2" />
                      Select Date (7 days in advance)
                    </label>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => handleDateSelect(selectedVenue, e.target.value)}
                      min={minBookingDate}
                      className="w-full px-4 py-2 border border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      Bookings must be made at least 7 days in advance
                    </p>
                  </div>

                  {/* Time Slots */}
                  {selectedDate && timeSlots.length > 0 && (
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-4">
                        <Clock className="inline w-4 h-4 mr-2" />
                        Available Time Slots (4 hours each)
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        {timeSlots.map((slot, idx) => (
                          <button
                            key={idx}
                            onClick={() => setSelectedSlot(slot)}
                            disabled={slot.isBooked}
                            className={`p-4 rounded-lg font-medium transition text-center ${
                              slot.isBooked
                                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                : selectedSlot === slot
                                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white ring-2 ring-emerald-400 shadow-lg'
                                : 'bg-gray-100 text-gray-800 hover:bg-emerald-50 border border-emerald-200'
                            }`}
                          >
                            <div className="font-semibold">{slot.startTime} - {slot.endTime}</div>
                            <div className="text-xs mt-1">
                              {slot.isBooked ? '❌ Booked' : '✓ Available'}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Booking Summary */}
                  {selectedSlot && (
                    <div className="bg-emerald-50 border-2 border-emerald-200 rounded-lg p-4 mb-6">
                      <h3 className="font-semibold text-gray-800 mb-3">Booking Summary</h3>
                      <div className="space-y-2">
                        <p className="text-gray-700"><strong>Venue:</strong> {selectedVenue.name}</p>
                        <p className="text-gray-700"><strong>Date:</strong> {new Date(selectedDate).toLocaleDateString()}</p>
                        <p className="text-gray-700"><strong>Time:</strong> {selectedSlot.startTime} - {selectedSlot.endTime}</p>
                        <p className="text-gray-700"><strong>Duration:</strong> 4 hours</p>
                        <p className="text-gray-700"><strong>Price:</strong> ₹{selectedVenue.price}</p>
                        <p className="text-gray-700"><strong>Purpose:</strong> {purpose || 'Not specified'}</p>
                      </div>
                    </div>
                  )}

                  {/* Error Message */}
                  {bookingError && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
                      {bookingError}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <button
                      onClick={closeBooking}
                      className="flex-1 bg-gray-300 text-gray-800 py-2 rounded-lg font-medium hover:bg-gray-400 transition"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleBooking}
                      disabled={!selectedSlot || bookingLoading}
                      className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-2 rounded-lg font-medium hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 transition"
                    >
                      {bookingLoading ? 'Booking...' : 'Confirm Booking'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
