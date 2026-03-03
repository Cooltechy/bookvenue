import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { venuesAPI } from '../../api/venues'
import { Plus, Edit, Trash2, ArrowLeft, MapPin, Users, DollarSign, X } from 'lucide-react'
import Popup from '../../components/Popup'

export default function VenueManager() {
  const navigate = useNavigate()
  const [venues, setVenues] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingVenue, setEditingVenue] = useState(null)
  const [popup, setPopup] = useState({ isOpen: false })
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    capacity: '',
    location: '',
    authority: '',
    price: '',
    halfDayPrice: '',
    fullDayPrice: '',
    currency: 'INR',
    amenities: ''
  })
  
  const [availability, setAvailability] = useState([
    { dayOfWeek: 1, dayName: 'Monday', enabled: true, startTime: '08:00', endTime: '22:00' },
    { dayOfWeek: 2, dayName: 'Tuesday', enabled: true, startTime: '08:00', endTime: '22:00' },
    { dayOfWeek: 3, dayName: 'Wednesday', enabled: true, startTime: '08:00', endTime: '22:00' },
    { dayOfWeek: 4, dayName: 'Thursday', enabled: true, startTime: '08:00', endTime: '22:00' },
    { dayOfWeek: 5, dayName: 'Friday', enabled: true, startTime: '08:00', endTime: '22:00' },
    { dayOfWeek: 6, dayName: 'Saturday', enabled: true, startTime: '08:00', endTime: '22:00' },
    { dayOfWeek: 0, dayName: 'Sunday', enabled: true, startTime: '08:00', endTime: '22:00' }
  ])

  useEffect(() => {
    fetchVenues()
  }, [])

  const fetchVenues = async () => {
    try {
      const response = await venuesAPI.getMyVenues()
      setVenues(response.data)
    } catch (error) {
      console.error('Failed to fetch venues:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleAvailabilityChange = (dayOfWeek, field, value) => {
    setAvailability(prev => prev.map(day => 
      day.dayOfWeek === dayOfWeek 
        ? { ...day, [field]: value }
        : day
    ))
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      capacity: '',
      location: '',
      authority: '',
      price: '',
      halfDayPrice: '',
      fullDayPrice: '',
      currency: 'INR',
      amenities: ''
    })
    setAvailability([
      { dayOfWeek: 1, dayName: 'Monday', enabled: true, startTime: '08:00', endTime: '22:00' },
      { dayOfWeek: 2, dayName: 'Tuesday', enabled: true, startTime: '08:00', endTime: '22:00' },
      { dayOfWeek: 3, dayName: 'Wednesday', enabled: true, startTime: '08:00', endTime: '22:00' },
      { dayOfWeek: 4, dayName: 'Thursday', enabled: true, startTime: '08:00', endTime: '22:00' },
      { dayOfWeek: 5, dayName: 'Friday', enabled: true, startTime: '08:00', endTime: '22:00' },
      { dayOfWeek: 6, dayName: 'Saturday', enabled: true, startTime: '08:00', endTime: '22:00' },
      { dayOfWeek: 0, dayName: 'Sunday', enabled: true, startTime: '08:00', endTime: '22:00' }
    ])
    setEditingVenue(null)
    setShowForm(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Validate at least one day is enabled
    const enabledDays = availability.filter(day => day.enabled)
    if (enabledDays.length === 0) {
      setPopup({
        isOpen: true,
        type: 'error',
        title: 'No Days Selected',
        message: 'Please enable at least one day for venue availability',
        actions: [{ label: 'OK', onClick: () => setPopup({ isOpen: false }), primary: true }]
      })
      return
    }
    
    // Validate time ranges for enabled days
    for (const day of enabledDays) {
      if (day.startTime >= day.endTime) {
        setPopup({
          isOpen: true,
          type: 'error',
          title: 'Invalid Time Range',
          message: `${day.dayName}: End time must be after start time`,
          actions: [{ label: 'OK', onClick: () => setPopup({ isOpen: false }), primary: true }]
        })
        return
      }
    }
    
    try {
      const venueData = {
        ...formData,
        capacity: parseInt(formData.capacity),
        price: parseFloat(formData.price),
        halfDayPrice: parseFloat(formData.halfDayPrice),
        fullDayPrice: parseFloat(formData.fullDayPrice),
        amenities: formData.amenities.split(',').map(a => a.trim()).filter(a => a),
        availability: enabledDays.map(day => ({
          dayOfWeek: day.dayOfWeek,
          startTime: day.startTime,
          endTime: day.endTime
        }))
      }

      if (editingVenue) {
        await venuesAPI.updateVenue(editingVenue._id, venueData)
        setPopup({
          isOpen: true,
          type: 'success',
          title: 'Venue Updated!',
          message: 'The venue has been updated successfully.',
          actions: [{ label: 'OK', onClick: () => setPopup({ isOpen: false }), primary: true }]
        })
      } else {
        await venuesAPI.createVenue(venueData)
        setPopup({
          isOpen: true,
          type: 'success',
          title: 'Venue Created!',
          message: 'The new venue has been created successfully.',
          actions: [{ label: 'OK', onClick: () => setPopup({ isOpen: false }), primary: true }]
        })
      }

      resetForm()
      fetchVenues()
    } catch (error) {
      setPopup({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: error.response?.data?.message || 'Failed to save venue',
        actions: [{ label: 'OK', onClick: () => setPopup({ isOpen: false }), primary: true }]
      })
    }
  }

  const handleEdit = (venue) => {
    setEditingVenue(venue)
    setFormData({
      name: venue.name,
      description: venue.description,
      capacity: venue.capacity.toString(),
      location: venue.location,
      authority: venue.authority,
      price: venue.price.toString(),
      halfDayPrice: venue.halfDayPrice.toString(),
      fullDayPrice: venue.fullDayPrice.toString(),
      currency: venue.currency || 'INR',
      amenities: venue.amenities.join(', ')
    })
    
    // Set availability from venue data
    if (venue.availability && venue.availability.length > 0) {
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      const availabilityMap = {}
      venue.availability.forEach(slot => {
        availabilityMap[slot.dayOfWeek] = slot
      })
      
      setAvailability([1, 2, 3, 4, 5, 6, 0].map(dayOfWeek => {
        const slot = availabilityMap[dayOfWeek]
        return {
          dayOfWeek,
          dayName: dayNames[dayOfWeek],
          enabled: !!slot,
          startTime: slot?.startTime || '08:00',
          endTime: slot?.endTime || '22:00'
        }
      }))
    }
    
    setShowForm(true)
  }

  const handleDelete = async (venueId, venueName) => {
    setPopup({
      isOpen: true,
      type: 'warning',
      title: 'Delete Venue?',
      message: `Are you sure you want to delete "${venueName}"? This action cannot be undone.`,
      actions: [
        {
          label: 'Cancel',
          onClick: () => setPopup({ isOpen: false })
        },
        {
          label: 'Delete',
          onClick: async () => {
            try {
              await venuesAPI.deleteVenue(venueId)
              setPopup({
                isOpen: true,
                type: 'success',
                title: 'Venue Deleted',
                message: 'The venue has been deleted successfully.',
                actions: [{ label: 'OK', onClick: () => setPopup({ isOpen: false }), primary: true }]
              })
              fetchVenues()
            } catch (error) {
              setPopup({
                isOpen: true,
                type: 'error',
                title: 'Error',
                message: 'Failed to delete venue',
                actions: [{ label: 'OK', onClick: () => setPopup({ isOpen: false }), primary: true }]
              })
            }
          },
          primary: true
        }
      ]
    })
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-emerald-600 to-teal-600 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <button
              onClick={() => navigate('/venues')}
              className="flex items-center gap-2 text-white hover:bg-white hover:bg-opacity-20 px-4 py-2 rounded-lg transition"
            >
              <ArrowLeft className="w-5 h-5" />
              Back
            </button>
            <h1 className="text-3xl font-bold text-white">Venue Management</h1>
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 bg-white text-emerald-600 px-4 py-2 rounded-lg hover:bg-emerald-50 transition font-medium"
            >
              <Plus className="w-5 h-5" />
              Add Venue
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Venue Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-800">
                  {editingVenue ? 'Edit Venue' : 'Add New Venue'}
                </h2>
                <button
                  onClick={resetForm}
                  className="text-gray-400 hover:text-gray-600 transition"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Venue Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows="3"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Capacity *</label>
                    <input
                      type="number"
                      name="capacity"
                      value={formData.capacity}
                      onChange={handleInputChange}
                      min="1"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
                    <select
                      name="currency"
                      value={formData.currency}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    >
                      <option value="INR">INR (₹)</option>
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Location *</label>
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Authority *</label>
                  <input
                    type="text"
                    name="authority"
                    value={formData.authority}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    placeholder="e.g., Campus Events Authority"
                    required
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Hourly Price *</label>
                    <input
                      type="number"
                      name="price"
                      value={formData.price}
                      onChange={handleInputChange}
                      min="0"
                      step="0.01"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Half-Day Price *</label>
                    <input
                      type="number"
                      name="halfDayPrice"
                      value={formData.halfDayPrice}
                      onChange={handleInputChange}
                      min="0"
                      step="0.01"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">1-5 hours</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Full-Day Price *</label>
                    <input
                      type="number"
                      name="fullDayPrice"
                      value={formData.fullDayPrice}
                      onChange={handleInputChange}
                      min="0"
                      step="0.01"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">6+ hours</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Amenities</label>
                  <input
                    type="text"
                    name="amenities"
                    value={formData.amenities}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    placeholder="WiFi, Parking, Catering (comma separated)"
                  />
                  <p className="text-xs text-gray-500 mt-1">Separate multiple amenities with commas</p>
                </div>

                {/* Availability Schedule */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Availability Schedule *
                  </label>
                  <div className="space-y-2 max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-3">
                    {availability.map((day) => (
                      <div key={day.dayOfWeek} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
                        <input
                          type="checkbox"
                          checked={day.enabled}
                          onChange={(e) => handleAvailabilityChange(day.dayOfWeek, 'enabled', e.target.checked)}
                          className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                        />
                        <span className="w-24 text-sm font-medium text-gray-700">{day.dayName}</span>
                        {day.enabled ? (
                          <>
                            <input
                              type="time"
                              value={day.startTime}
                              onChange={(e) => handleAvailabilityChange(day.dayOfWeek, 'startTime', e.target.value)}
                              className="px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-emerald-500"
                            />
                            <span className="text-gray-500">to</span>
                            <input
                              type="time"
                              value={day.endTime}
                              onChange={(e) => handleAvailabilityChange(day.dayOfWeek, 'endTime', e.target.value)}
                              className="px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-emerald-500"
                            />
                          </>
                        ) : (
                          <span className="text-sm text-gray-400 italic">Closed</span>
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Select days and set hours when the venue is available for booking
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg hover:from-emerald-700 hover:to-teal-700 transition"
                  >
                    {editingVenue ? 'Update Venue' : 'Create Venue'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Venues List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {venues.map((venue) => (
            <div key={venue._id} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition">
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-2">{venue.name}</h3>
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">{venue.description}</p>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MapPin className="w-4 h-4 text-emerald-600" />
                    {venue.location}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Users className="w-4 h-4 text-emerald-600" />
                    Capacity: {venue.capacity}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                    {venue.currency} {venue.halfDayPrice} (half) / {venue.fullDayPrice} (full)
                  </div>
                </div>

                {venue.amenities && venue.amenities.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {venue.amenities.slice(0, 3).map((amenity, idx) => (
                      <span key={idx} className="px-2 py-1 bg-emerald-50 text-emerald-700 text-xs rounded-full">
                        {amenity}
                      </span>
                    ))}
                    {venue.amenities.length > 3 && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                        +{venue.amenities.length - 3} more
                      </span>
                    )}
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(venue)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  >
                    <Edit className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(venue._id, venue.name)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {venues.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg mb-4">No venues yet</p>
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-lg hover:bg-emerald-700 transition"
            >
              <Plus className="w-5 h-5" />
              Add Your First Venue
            </button>
          </div>
        )}
      </main>

      <Popup {...popup} onClose={() => setPopup({ isOpen: false })} />
    </div>
  )
}
