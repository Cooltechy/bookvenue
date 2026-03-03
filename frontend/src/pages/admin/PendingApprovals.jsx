import { useState, useEffect } from 'react'
import { bookingsAPI } from '../../api/bookings'
import { Calendar, Clock, MapPin, FileText, Download, CheckCircle, XCircle, User } from 'lucide-react'
import Popup from '../../components/Popup'

export default function PendingApprovals() {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedBooking, setSelectedBooking] = useState(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [showApproveModal, setShowApproveModal] = useState(false)
  const [popup, setPopup] = useState({ isOpen: false })

  useEffect(() => {
    fetchPendingBookings()
  }, [])

  const fetchPendingBookings = async () => {
    try {
      const response = await bookingsAPI.getPendingApprovalBookings()
      setBookings(response.data)
    } catch (err) {
      console.error('Failed to fetch pending bookings:', err)
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
      link.setAttribute('download', `permission-${bookingId}.pdf`)
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

  const handleApprove = async () => {
    try {
      const response = await bookingsAPI.approveBooking(selectedBooking._id)
      setShowApproveModal(false)
      setSelectedBooking(null)
      setPopup({
        isOpen: true,
        type: 'success',
        title: 'Booking Approved',
        message: response.data.message || 'Booking has been approved. User will be notified to make payment.',
        actions: [
          {
            label: 'OK',
            onClick: () => {
              setPopup({ isOpen: false })
              fetchPendingBookings()
            },
            primary: true
          }
        ]
      })
    } catch (err) {
      setShowApproveModal(false)
      setSelectedBooking(null)
      setPopup({
        isOpen: true,
        type: 'error',
        title: 'Approval Failed',
        message: err.response?.data?.message || 'Failed to approve booking'
      })
    }
  }

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      alert('Please provide a reason for rejection')
      return
    }

    try {
      const response = await bookingsAPI.rejectBooking(selectedBooking._id, rejectionReason)
      setPopup({
        isOpen: true,
        type: 'success',
        title: 'Booking Rejected',
        message: response.data.message || 'Booking has been rejected. User will be notified.',
        actions: [
          {
            label: 'OK',
            onClick: () => {
              setPopup({ isOpen: false })
              setShowRejectModal(false)
              setRejectionReason('')
              setSelectedBooking(null)
              fetchPendingBookings()
            },
            primary: true
          }
        ]
      })
    } catch (err) {
      setPopup({
        isOpen: true,
        type: 'error',
        title: 'Rejection Failed',
        message: err.response?.data?.message || 'Failed to reject booking'
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
        <div className="text-gray-600">Loading pending approvals...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">Pending Approvals</h1>

        {bookings.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-600 mb-2">All caught up!</h2>
            <p className="text-gray-500">No bookings pending approval</p>
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
                  <div className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium">
                    Pending Review
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="flex items-center gap-2 text-gray-700">
                    <User className="w-5 h-5 text-emerald-600" />
                    <span>{booking.userId?.firstName} {booking.userId?.lastName}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <span className="text-sm text-gray-500">{booking.userId?.email}</span>
                  </div>
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
                    <span>{booking.currency} {booking.price}</span>
                  </div>
                </div>

                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Purpose:</span> {booking.purpose}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleDownloadDocument(booking._id)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition text-sm font-medium"
                  >
                    <Download className="w-4 h-4" />
                    View Permission Document
                  </button>

                  <button
                    onClick={() => {
                      setSelectedBooking(booking)
                      setShowApproveModal(true)
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Approve Booking
                  </button>

                  <button
                    onClick={() => {
                      setSelectedBooking(booking)
                      setShowRejectModal(true)
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm font-medium"
                  >
                    <XCircle className="w-4 h-4" />
                    Reject Booking
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Approve Modal */}
      {showApproveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Approve Booking</h2>
            <p className="text-gray-600 mb-6">
              Are you sure you want to approve this booking? The user will be notified to complete the payment.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleApprove}
                className="flex-1 bg-green-600 text-white py-2 rounded-lg font-medium hover:bg-green-700 transition"
              >
                Confirm Approval
              </button>
              <button
                onClick={() => {
                  setShowApproveModal(false)
                  setSelectedBooking(null)
                }}
                className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-300 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Reject Booking</h2>
            <p className="text-gray-600 mb-4">
              Please provide a reason for rejecting this booking. The user will be notified.
            </p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Enter rejection reason..."
              rows="4"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent mb-4"
              required
            />
            <div className="flex gap-2">
              <button
                onClick={handleReject}
                className="flex-1 bg-red-600 text-white py-2 rounded-lg font-medium hover:bg-red-700 transition"
              >
                Confirm Rejection
              </button>
              <button
                onClick={() => {
                  setShowRejectModal(false)
                  setRejectionReason('')
                  setSelectedBooking(null)
                }}
                className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-300 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <Popup {...popup} onClose={() => setPopup({ isOpen: false })} />
    </div>
  )
}
