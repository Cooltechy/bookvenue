import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { venuesAPI } from '../api/venues'
import { bookingsAPI } from '../api/bookings'
import { systemAPI } from '../api/system'
import { Upload, Calendar, Clock, FileText, AlertCircle, DollarSign, CheckCircle } from 'lucide-react'
import Popup from '../components/Popup'

export default function CreateBooking() {
  const { venueId } = useParams()
  const navigate = useNavigate()
  
  const [venue, setVenue] = useState(null)
  const [formData, setFormData] = useState({
    date: '',
    purpose: ''
  })
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [availableSlots, setAvailableSlots] = useState([])
  const [permissionFile, setPermissionFile] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [popup, setPopup] = useState({ isOpen: false })
  const [minBookingDate, setMinBookingDate] = useState('')
  const [minAdvanceDays, setMinAdvanceDays] = useState(10)
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [confirmedBookings, setConfirmedBookings] = useState([])

  useEffect(() => {
    fetchVenue()
    fetchMinAdvanceBookingDays()
  }, [venueId])

  useEffect(() => {
    if (formData.date) {
      fetchConfirmedBookingsAndGenerateSlots()
    }
  }, [formData.date])

  const fetchConfirmedBookingsAndGenerateSlots = async () => {
    if (!formData.date || !venueId) return
    
    setLoadingSlots(true)
    
    try {
      // First fetch confirmed bookings
      const response = await bookingsAPI.getConfirmedBookings(venueId, formData.date)
      setConfirmedBookings(response.data)
      
      // Then generate slots with the confirmed bookings data
      generateTimeSlotsWithConfirmed(response.data)
    } catch (err) {
      console.error('Failed to fetch confirmed bookings:', err)
      setConfirmedBookings([])
      // Generate slots anyway even if fetch fails
      generateTimeSlotsWithConfirmed([])
    }
  }

  const fetchVenue = async () => {
    try {
      const response = await venuesAPI.getVenueById(venueId)
      setVenue(response.data)
    } catch (err) {
      setError('Failed to load venue details')
    }
  }

  const fetchMinAdvanceBookingDays = async () => {
    try {
      const response = await systemAPI.getMinAdvanceBookingDays()
      setMinBookingDate(response.data.minDate)
      setMinAdvanceDays(response.data.minAdvanceDays)
    } catch (err) {
      // Use default values if API fails
      const today = new Date()
      const minDate = new Date(today)
      minDate.setDate(minDate.getDate() + 10)
      setMinBookingDate(minDate.toISOString().split('T')[0])
      setMinAdvanceDays(10)
    }
  }

  const generateTimeSlotsWithConfirmed = (confirmedBookingsData) => {
    if (!formData.date || !venue) {
      setAvailableSlots([])
      setLoadingSlots(false)
      return
    }
    
    // Get day of week for selected date (0 = Sunday, 1 = Monday, etc.)
    const selectedDate = new Date(formData.date)
    const dayOfWeek = selectedDate.getDay()
    
    // Find availability for this day
    const dayAvailability = venue.availability?.find(a => a.dayOfWeek === dayOfWeek)
    
    if (!dayAvailability) {
      // Venue is closed on this day
      setAvailableSlots([])
      setError(`This venue is not available on ${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek]}s`)
      setLoadingSlots(false)
      return
    }
    
    setError('')
    const slots = []
    
    // Parse hours from venue's availability for this day
    const [fromHour] = dayAvailability.startTime.split(':').map(Number)
    const [toHour] = dayAvailability.endTime.split(':').map(Number)
    
    // Generate hourly slots within venue's available hours for this day
    // Filter out confirmed bookings
    for (let hour = fromHour; hour < toHour; hour++) {
      // Check if this hour falls within any confirmed booking
      const isConfirmed = confirmedBookingsData.some(booking => {
        return hour >= booking.startHour && hour < booking.endHour
      })
      
      // Skip this slot if it's part of a confirmed booking
      if (isConfirmed) {
        continue
      }
      
      const startTime = `${hour.toString().padStart(2, '0')}:00`
      const endHour = hour + 1
      const endTime = `${endHour.toString().padStart(2, '0')}:00`
      
      slots.push({
        startTime,
        endTime,
        label: `${startTime} - ${endTime}`,
        duration: 1
      })
    }
    
    setAvailableSlots(slots)
    setLoadingSlots(false)
  }

  const calculatePricing = (startTime, endTime) => {
    if (!startTime || !endTime || !venue) return null
    
    const [startHour] = startTime.split(':').map(Number)
    const [endHour] = endTime.split(':').map(Number)
    const duration = endHour - startHour
    
    if (duration > 5) {
      return {
        duration,
        price: venue.fullDayPrice,
        pricingType: 'full-day',
        currency: venue.currency || 'INR'
      }
    } else {
      return {
        duration,
        price: venue.halfDayPrice,
        pricingType: 'half-day',
        currency: venue.currency || 'INR'
      }
    }
  }

  const handleSlotSelection = (slot) => {
    if (selectedSlot && selectedSlot.startTime === slot.startTime) {
      // Deselect if clicking the same slot
      setSelectedSlot(null)
    } else if (!selectedSlot) {
      // First selection - set as start
      setSelectedSlot({ ...slot, isStart: true })
    } else {
      // Second selection - create range
      const startHour = parseInt(selectedSlot.startTime.split(':')[0])
      const endHour = parseInt(slot.endTime.split(':')[0])
      
      if (endHour <= startHour) {
        setError('End time must be after start time')
        return
      }
      
      // Check if all slots between start and end are continuous
      const isContinuous = checkContinuousSlots(startHour, endHour)
      if (!isContinuous) {
        setError('Selected time range contains unavailable slots. Please select continuous available time slots only.')
        return
      }
      
      setSelectedSlot({
        startTime: selectedSlot.startTime,
        endTime: slot.endTime,
        label: `${selectedSlot.startTime} - ${slot.endTime}`,
        duration: endHour - startHour
      })
    }
    setError('')
  }

  const checkContinuousSlots = (startHour, endHour) => {
    // Check if all hours between startHour and endHour exist in availableSlots
    for (let hour = startHour; hour < endHour; hour++) {
      const slotExists = availableSlots.some(slot => {
        const slotHour = parseInt(slot.startTime.split(':')[0])
        return slotHour === hour
      })
      
      if (!slotExists) {
        return false
      }
    }
    return true
  }

  const isSlotInRange = (slot) => {
    if (!selectedSlot || !selectedSlot.endTime) return false
    
    const slotHour = parseInt(slot.startTime.split(':')[0])
    const startHour = parseInt(selectedSlot.startTime.split(':')[0])
    const endHour = parseInt(selectedSlot.endTime.split(':')[0])
    
    return slotHour >= startHour && slotHour < endHour
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    
    if (file && file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB')
      e.target.value = ''
      return
    }
    
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/jpg',
      'image/png'
    ]
    
    if (file && !allowedTypes.includes(file.type)) {
      setError('Invalid file type. Only PDF, DOC, DOCX, JPG, JPEG, and PNG are allowed.')
      e.target.value = ''
      return
    }
    
    setError('')
    setPermissionFile(file)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!selectedSlot || !selectedSlot.endTime) {
      setError('Please select a time range by clicking start and end time slots')
      return
    }

    if (!permissionFile) {
      setError('Permission document is required')
      return
    }

    setLoading(true)

    try {
      const data = new FormData()
      data.append('venueId', venueId)
      data.append('date', formData.date)
      data.append('startTime', selectedSlot.startTime)
      data.append('endTime', selectedSlot.endTime)
      data.append('purpose', formData.purpose)
      data.append('permissionDocument', permissionFile)

      const response = await bookingsAPI.createBooking(data)

      setPopup({
        isOpen: true,
        type: 'pending',
        title: 'Booking Submitted!',
        message: response.data.message || 'Your booking request has been submitted successfully. It is currently pending admin approval. You will be notified about the next steps once the admin reviews your request.',
        actions: [
          {
            label: 'View My Bookings',
            onClick: () => navigate('/my-bookings'),
            primary: true
          },
          {
            label: 'Book Another Venue',
            onClick: () => {
              setPopup({ isOpen: false })
              navigate('/venues')
            }
          }
        ]
      })
    } catch (err) {
      setPopup({
        isOpen: true,
        type: 'error',
        title: 'Booking Failed',
        message: err.response?.data?.message || 'Failed to submit booking. Please try again.',
        actions: [
          {
            label: 'Try Again',
            onClick: () => setPopup({ isOpen: false }),
            primary: true
          }
        ]
      })
    } finally {
      setLoading(false)
    }
  }

  if (!venue) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  const pricing = selectedSlot?.endTime ? calculatePricing(selectedSlot.startTime, selectedSlot.endTime) : null

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Book {venue.name}</h1>
          <p className="text-gray-600 mb-6">{venue.location} • Capacity: {venue.capacity}</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Date Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-2" />
                Booking Date
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => {
                    setFormData({ ...formData, date: e.target.value })
                    setSelectedSlot(null)
                  }}
                  onFocus={(e) => {
                    // When field gets focus, try to open the calendar picker
                    setIsCalendarOpen(true)
                    try {
                      e.target.showPicker?.()
                    } catch (err) {
                      // showPicker might fail in some browsers, that's okay
                    }
                  }}
                  onKeyDown={(e) => {
                    // When user starts typing, close the calendar
                    if (e.key.length === 1 || e.key === 'Backspace' || e.key === 'Delete') {
                      setIsCalendarOpen(false)
                      // The calendar will close automatically when typing
                    }
                  }}
                  onBlur={() => {
                    setIsCalendarOpen(false)
                  }}
                  min={minBookingDate || new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="Select date"
                  required
                />
              </div>
              {minAdvanceDays > 0 && (
                <p className="text-xs text-gray-500 mt-2">
                  💡 Click to open calendar or type date directly. Bookings must be made at least {minAdvanceDays} day{minAdvanceDays !== 1 ? 's' : ''} in advance. 
                  Earliest available date: {minBookingDate ? new Date(minBookingDate).toLocaleDateString() : 'Loading...'}
                </p>
              )}
            </div>

            {/* Time Slot Selection */}
            {formData.date && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  <Clock className="w-4 h-4 inline mr-2" />
                  Select Time Slots (Click start time, then end time)
                </label>
                
                {selectedSlot && !selectedSlot.endTime && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                    <p className="text-sm text-blue-800">
                      ✓ Start time selected: <strong>{selectedSlot.startTime}</strong>
                      <br />
                      Now click on an end time slot
                    </p>
                  </div>
                )}

                {loadingSlots ? (
                  <div className="text-center py-8 text-gray-500">Loading time slots...</div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {availableSlots.map((slot, idx) => {
                      const isSelected = selectedSlot && selectedSlot.startTime === slot.startTime
                      const isInRange = isSlotInRange(slot)
                      
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSlotSelection(slot)}
                          className={`p-3 rounded-lg font-medium transition text-center text-sm ${
                            isSelected
                              ? 'bg-emerald-600 text-white ring-2 ring-emerald-400 shadow-lg'
                              : isInRange
                              ? 'bg-emerald-100 text-emerald-800 border-2 border-emerald-400'
                              : 'bg-gray-100 text-gray-800 hover:bg-emerald-50 border border-gray-300 hover:border-emerald-300'
                          }`}
                        >
                          <div className="text-xs leading-tight">
                            {slot.startTime}
                            <span className="block text-[10px] opacity-75">to</span>
                            {slot.endTime}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}

                <p className="text-xs text-gray-500 mt-3">
                  Click on a start time, then click on an end time to select your booking duration
                </p>
              </div>
            )}

            {/* Selected Time Range Display */}
            {selectedSlot?.endTime && pricing && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-600 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-emerald-900 mb-2">Selected Time Slot</h3>
                    <div className="space-y-1 text-sm text-emerald-800">
                      <p><strong>Time:</strong> {selectedSlot.startTime} - {selectedSlot.endTime}</p>
                      <p><strong>Duration:</strong> {pricing.duration} hours</p>
                      <p><strong>Pricing:</strong> {pricing.pricingType === 'half-day' ? 'Half-day rate' : 'Full-day rate'}</p>
                      <p className="text-lg font-bold pt-2 border-t border-emerald-300 mt-2">
                        Total: {pricing.currency} {pricing.price}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Purpose */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FileText className="w-4 h-4 inline mr-2" />
                Purpose of Booking
              </label>
              <textarea
                value={formData.purpose}
                onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                rows="3"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="Describe the purpose of your booking..."
                required
              />
            </div>

            {/* Permission Document Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Upload className="w-4 h-4 inline mr-2" />
                Department Permission Document *
              </label>
              <input
                type="file"
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                required
              />
              <p className="text-xs text-gray-500 mt-2">
                Upload written permission from your department (PDF, DOC, DOCX, JPG, JPEG, or PNG, max 5MB)
              </p>
              {permissionFile && (
                <p className="text-sm text-green-600 mt-2">
                  ✓ Selected: {permissionFile.name} ({(permissionFile.size / 1024).toFixed(2)} KB)
                </p>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start">
                <AlertCircle className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !selectedSlot?.endTime}
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-3 rounded-lg font-medium hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg"
            >
              {loading ? 'Submitting...' : 'Submit Booking Request'}
            </button>

            <p className="text-sm text-gray-500 text-center">
              Your booking will be reviewed by an admin before confirmation
            </p>
          </form>
        </div>
      </div>

      <Popup {...popup} onClose={() => setPopup({ isOpen: false })} />
    </div>
  )
}
