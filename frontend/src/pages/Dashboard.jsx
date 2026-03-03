import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import apiClient from '../api/client'
import { useAuth } from '../context/AuthContext'
import { ArrowLeft, Copy, Calendar, MapPin, Clock, User } from 'lucide-react'

export default function Dashboard() {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState('all')
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  useEffect(() => {
    fetchBookings()
  }, [])

  const fetchBookings = async () => {
    try {
      const response = await apiClient.get('/bookings')
      setBookings(response.data || [])
    } catch (err) {
      setError('Failed to load bookings')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const getFilteredBookings = () => {
    if (activeTab === 'all') return bookings
    return bookings.filter(b => b.status === activeTab)
  }

  const getStatusStats = () => {
    return {
      all: bookings.length,
      pending: bookings.filter(b => b.status === 'pending').length,
      approved: bookings.filter(b => b.status === 'approved').length,
      rejected: bookings.filter(b => b.status === 'rejected').length,
      cancelled: bookings.filter(b => b.status === 'cancelled').length
    }
  }

  const stats = getStatusStats()
  const filteredBookings = getFilteredBookings()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-emerald-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-emerald-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-emerald-600 to-teal-600 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
          <button
            onClick={() => navigate('/venues')}
            className="flex items-center gap-2 text-white hover:bg-white hover:bg-opacity-20 px-4 py-2 rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Venues
          </button>
          <h1 className="text-3xl font-bold text-white">My Dashboard</h1>
          <button
            onClick={handleLogout}
            className="text-white hover:bg-white hover:bg-opacity-20 px-4 py-2 rounded-lg transition"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-12">
        {/* User Profile Card */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <div className="flex items-center gap-6 mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {user?.firstName} {user?.lastName}
              </h2>
              <p className="text-gray-600">{user?.email}</p>
            </div>
          </div>

          {/* User ID Section */}
          <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-600 mb-2">Your Name</p>
              <p className="text-lg font-semibold text-gray-900">
                {user?.firstName} {user?.lastName}
              </p>
            </div>
            <p className="text-sm font-medium text-gray-600 mb-2">Your User ID</p>
            <div className="flex items-center gap-3">
              <code className="flex-1 bg-white px-4 py-3 rounded-lg font-mono text-sm text-gray-900 border border-gray-200">
                {user?.id}
              </code>
              <button
                onClick={() => copyToClipboard(user?.id)}
                className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-3 rounded-lg hover:bg-emerald-700 transition"
              >
                <Copy className="w-4 h-4" />
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        </div>

        {/* Booking History */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-6">Booking History</h3>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          {/* Status Tabs */}
          {bookings.length > 0 && (
            <div className="mb-6 flex flex-wrap gap-2 border-b border-gray-200 pb-4">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  activeTab === 'all'
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All ({stats.all})
              </button>
              {stats.pending > 0 && (
                <button
                  onClick={() => setActiveTab('pending')}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    activeTab === 'pending'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  ⏳ Pending ({stats.pending})
                </button>
              )}
              {stats.approved > 0 && (
                <button
                  onClick={() => setActiveTab('approved')}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    activeTab === 'approved'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  ✓ Approved ({stats.approved})
                </button>
              )}
              {stats.rejected > 0 && (
                <button
                  onClick={() => setActiveTab('rejected')}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    activeTab === 'rejected'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  ✗ Rejected ({stats.rejected})
                </button>
              )}
              {stats.cancelled > 0 && (
                <button
                  onClick={() => setActiveTab('cancelled')}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    activeTab === 'cancelled'
                      ? 'bg-gray-400 text-gray-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  ✗ Cancelled ({stats.cancelled})
                </button>
              )}
            </div>
          )}

          {bookings.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 text-lg">No bookings yet</p>
              <p className="text-gray-500 text-sm mt-2">Start booking venues to see your history here</p>
              <button
                onClick={() => navigate('/venues')}
                className="mt-6 bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700 transition"
              >
                Browse Venues
              </button>
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 text-lg">No {activeTab !== 'all' ? activeTab : ''} bookings</p>
              <p className="text-gray-500 text-sm mt-2">
                {activeTab === 'all' 
                  ? 'Start booking venues to see your history here'
                  : `You don't have any ${activeTab} bookings`}
              </p>
              {activeTab !== 'all' && (
                <button
                  onClick={() => setActiveTab('all')}
                  className="mt-4 text-emerald-600 hover:text-emerald-700 font-medium"
                >
                  View all bookings
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredBookings.map((booking) => (
                <div
                  key={booking._id}
                  className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Booking Details */}
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-4">
                        {booking.venueId?.name || 'Venue'}
                      </h4>
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <MapPin className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm text-gray-600">Location</p>
                            <p className="text-gray-900 font-medium">
                              {booking.venueId?.location || 'N/A'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <Calendar className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm text-gray-600">Date</p>
                            <p className="text-gray-900 font-medium">
                              {new Date(booking.startTime).toLocaleDateString('en-US', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Time and Status */}
                    <div>
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <Clock className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm text-gray-600">Time</p>
                            <p className="text-gray-900 font-medium">
                              {new Date(booking.startTime).toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                              {' - '}
                              {new Date(booking.endTime).toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 mb-2">Price</p>
                          <p className="text-gray-900 font-medium text-lg text-emerald-600">
                            ₹{booking.price}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 mb-2">Status</p>
                          <span
                            className={`inline-block px-4 py-2 rounded-full text-sm font-medium ${
                              booking.status === 'approved'
                                ? 'bg-green-100 text-green-800'
                                : booking.status === 'pending'
                                ? 'bg-yellow-100 text-yellow-800'
                                : booking.status === 'rejected'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {booking.status === 'approved' && '✓ Approved'}
                            {booking.status === 'pending' && '⏳ Pending Approval'}
                            {booking.status === 'rejected' && '✗ Rejected'}
                            {booking.status === 'cancelled' && '✗ Cancelled'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Purpose */}
                  {booking.purpose && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <p className="text-sm font-medium text-gray-700 mb-2">Purpose</p>
                      <p className="text-gray-600 text-sm">{booking.purpose}</p>
                    </div>
                  )}

                  {/* Rejection Reason */}
                  {booking.rejectionReason && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <p className="text-sm font-medium text-red-700 mb-2">Rejection Reason</p>
                      <p className="text-red-600 text-sm">{booking.rejectionReason}</p>
                    </div>
                  )}

                  {/* Booking ID */}
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-xs text-gray-600 mb-2">Booking ID</p>
                    <code className="text-xs text-gray-700 font-mono break-all">
                      {booking._id}
                    </code>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
