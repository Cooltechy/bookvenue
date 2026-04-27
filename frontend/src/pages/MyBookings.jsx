import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { bookingsAPI } from '../api/bookings'
import StatusBadge from '../components/StatusBadge'
import { Calendar, Clock, MapPin, FileText, Download, CreditCard, XCircle, ArrowLeft, LogOut } from 'lucide-react'
import Popup from '../components/Popup'
import NotificationIcon from '../components/NotificationIcon'
import { useAuth } from '../context/AuthContext'

export default function MyBookings() {
  const navigate = useNavigate()
  const { logout, user } = useAuth()
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [popup, setPopup] = useState({ isOpen: false })

  useEffect(() => {
    fetchBookings()
  }, [])

  const fetchBookings = async () => {
    try {
      const response = await bookingsAPI.getMyBookings()
      setBookings(response.data)
    } catch (err) {
      console.error('Failed to fetch bookings:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadDocument = async (bookingId) => {
    try {
      const response = await bookingsAPI.downloadPermissionDocument(bookingId)
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `permission-document-${bookingId}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      setPopup({
        isOpen: true,
        type: 'error',
        title: 'Download Failed',
        message: 'Failed to download permission document'
      })
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleMakePayment = (booking) => {
    navigate(`/payment/${booking._id}`)
  }

  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) {
      return
    }

    try {
      await bookingsAPI.cancelBooking(bookingId)
      setPopup({
        isOpen: true,
        type: 'success',
        title: 'Booking Cancelled',
        message: 'Your booking has been cancelled successfully'
      })
      fetchBookings()
    } catch (err) {
      setPopup({
        isOpen: true,
        type: 'error',
        title: 'Cancellation Failed',
        message: err.response?.data?.message || 'Failed to cancel booking'
      })
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading your bookings...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-emerald-600 to-teal-600 shadow-lg mb-8">
        <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
          <button
            onClick={() => navigate('/venues')}
            className="flex items-center gap-2 text-white hover:bg-white hover:bg-opacity-20 px-4 py-2 rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Venues
          </button>
          <h1 className="text-3xl font-bold text-white">My Bookings</h1>
          <div className="flex items-center gap-4">
            <NotificationIcon />
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-white hover:bg-white hover:bg-opacity-20 px-4 py-2 rounded-lg transition"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4">

        {bookings.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-600 mb-2">No bookings yet</h2>
            <p className="text-gray-500 mb-6">Start by booking a venue for your event</p>
            <button
              onClick={() => navigate('/venues')}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-6 py-2 rounded-lg font-medium hover:from-emerald-700 hover:to-teal-700 transition"
            >
              Browse Venues
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => (
              <div key={booking._id} className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">{booking.venueId?.name || 'Venue'}</h3>
                    <p className="text-gray-600 flex items-center gap-1 mt-1">
                      <MapPin className="w-4 h-4" />
                      {booking.venueId?.location || 'Location'}
                    </p>
                  </div>
                  <StatusBadge status={booking.status} workflowStage={booking.workflowStage} chargesWaived={booking.chargesWaived} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="flex items-center gap-2 text-gray-700">
                    <Calendar className="w-5 h-5 text-emerald-600" />
                    <span>{formatDate(booking.startTime)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <Clock className="w-5 h-5 text-emerald-600" />
                    <span>{formatTime(booking.startTime)} - {formatTime(booking.endTime)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <FileText className="w-5 h-5 text-emerald-600" />
                    <span>{booking.durationHours} hours ({booking.pricingType})</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700 font-semibold">
                    <CreditCard className="w-5 h-5 text-emerald-600" />
                    <span>{booking.currency} {booking.price}</span>
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Purpose:</span> {booking.purpose}
                  </p>
                </div>

                {booking.rejectionReason && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                    <p className="text-sm text-red-800">
                      <span className="font-medium">Rejection Reason:</span> {booking.rejectionReason}
                    </p>
                  </div>
                )}

                {booking.status === 'payment_pending' && !booking.chargesWaived && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
                    <p className="text-sm text-orange-800 font-medium">
                      ⚠️ Your booking has been approved! Please complete the payment to confirm your booking.
                    </p>
                  </div>
                )}

                {booking.status === 'payment_completed' && booking.chargesWaived && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                    <p className="text-sm text-green-800 font-medium">
                      ✓ Your booking has been approved with charges waived. No payment is required!
                    </p>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleDownloadDocument(booking._id)}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm"
                  >
                    <Download className="w-4 h-4" />
                    Download Permission
                  </button>

                  {booking.status === 'payment_pending' && !booking.chargesWaived && (
                    <button
                      onClick={() => handleMakePayment(booking)}
                      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg hover:from-emerald-700 hover:to-teal-700 transition text-sm font-medium"
                    >
                      <CreditCard className="w-4 h-4" />
                      Make Payment
                    </button>
                  )}

                  {(booking.status === 'pending_approval' || booking.status === 'payment_pending') && (
                    <button
                      onClick={() => handleCancelBooking(booking._id)}
                      className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition text-sm"
                    >
                      <XCircle className="w-4 h-4" />
                      Cancel Booking
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Popup {...popup} onClose={() => setPopup({ isOpen: false })} />
    </div>
  )
}
