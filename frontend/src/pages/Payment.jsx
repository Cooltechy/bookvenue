import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { bookingsAPI } from '../api/bookings'
import { CreditCard, Upload, AlertCircle, CheckCircle } from 'lucide-react'
import Popup from '../components/Popup'

export default function Payment() {
  const { bookingId } = useParams()
  const navigate = useNavigate()
  
  const [booking, setBooking] = useState(null)
  const [formData, setFormData] = useState({
    transactionId: '',
    paymentMethod: ''
  })
  const [paymentProof, setPaymentProof] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [popup, setPopup] = useState({ isOpen: false })

  useEffect(() => {
    fetchBooking()
  }, [bookingId])

  const fetchBooking = async () => {
    try {
      const response = await bookingsAPI.getBookingById(bookingId)
      const bookingData = response.data
      
      if (bookingData.status !== 'payment_pending') {
        setPopup({
          isOpen: true,
          type: 'error',
          title: 'Payment Not Required',
          message: 'This booking does not require payment or payment has already been completed.',
          actions: [
            {
              label: 'View My Bookings',
              onClick: () => navigate('/my-bookings'),
              primary: true
            }
          ]
        })
        return
      }
      
      setBooking(bookingData)
    } catch (err) {
      setError('Failed to load booking details')
    }
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
      'image/jpeg',
      'image/jpg',
      'image/png'
    ]
    
    if (file && !allowedTypes.includes(file.type)) {
      setError('Invalid file type. Only PDF, JPG, JPEG, and PNG are allowed.')
      e.target.value = ''
      return
    }
    
    setError('')
    setPaymentProof(file)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!formData.transactionId || !formData.paymentMethod) {
      setError('Please fill in all required fields')
      return
    }

    setLoading(true)

    try {
      const data = new FormData()
      data.append('transactionId', formData.transactionId)
      data.append('paymentMethod', formData.paymentMethod)
      if (paymentProof) {
        data.append('paymentProof', paymentProof)
      }

      const response = await bookingsAPI.submitPayment(bookingId, data)

      setPopup({
        isOpen: true,
        type: 'success',
        title: 'Payment Confirmed!',
        message: response.data.message || 'Your payment has been submitted successfully. Your booking is now confirmed!',
        actions: [
          {
            label: 'View My Bookings',
            onClick: () => navigate('/my-bookings'),
            primary: true
          },
          {
            label: 'Book Another Venue',
            onClick: () => navigate('/venues')
          }
        ]
      })
    } catch (err) {
      setPopup({
        isOpen: true,
        type: 'error',
        title: 'Payment Failed',
        message: err.response?.data?.message || 'Failed to submit payment. Please try again.',
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

  if (!booking) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Complete Payment</h1>
              <p className="text-gray-600">Booking ID: {booking._id.slice(-8)}</p>
            </div>
          </div>

          {/* Booking Summary */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-emerald-900 mb-2">Booking Summary</h3>
            <div className="space-y-1 text-sm text-emerald-800">
              <p><span className="font-medium">Venue:</span> {booking.venueId?.name}</p>
              <p><span className="font-medium">Date:</span> {new Date(booking.startTime).toLocaleDateString()}</p>
              <p><span className="font-medium">Time:</span> {new Date(booking.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(booking.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
              <p><span className="font-medium">Duration:</span> {booking.durationHours} hours</p>
              <p className="text-lg font-bold pt-2 border-t border-emerald-300 mt-2">
                Amount to Pay: {booking.currency} {booking.price}
              </p>
            </div>
          </div>

          {/* Payment Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-blue-900 mb-2">Payment Instructions</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
              <li>Make payment via your preferred method</li>
              <li>Note down the transaction ID</li>
              <li>Upload payment proof (screenshot/receipt) - optional</li>
              <li>Submit the form below</li>
            </ol>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Payment Method */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Method *
              </label>
              <select
                value={formData.paymentMethod}
                onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                required
              >
                <option value="">Select payment method</option>
                <option value="UPI">UPI</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Credit Card">Credit Card</option>
                <option value="Debit Card">Debit Card</option>
                <option value="Cash">Cash</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Transaction ID */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Transaction ID / Reference Number *
              </label>
              <input
                type="text"
                value={formData.transactionId}
                onChange={(e) => setFormData({ ...formData, transactionId: e.target.value })}
                placeholder="Enter transaction ID or reference number"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                This will be used to verify your payment
              </p>
            </div>

            {/* Payment Proof Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Upload className="w-4 h-4 inline mr-2" />
                Payment Proof (Optional)
              </label>
              <input
                type="file"
                onChange={handleFileChange}
                accept=".pdf,.jpg,.jpeg,.png"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-2">
                Upload screenshot or receipt (PDF, JPG, JPEG, or PNG, max 5MB)
              </p>
              {paymentProof && (
                <p className="text-sm text-green-600 mt-2">
                  ✓ Selected: {paymentProof.name} ({(paymentProof.size / 1024).toFixed(2)} KB)
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
              disabled={loading}
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-3 rounded-lg font-medium hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg flex items-center justify-center gap-2"
            >
              {loading ? (
                'Processing...'
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Submit Payment
                </>
              )}
            </button>

            <p className="text-sm text-gray-500 text-center">
              Your booking will be confirmed once payment is verified
            </p>
          </form>
        </div>
      </div>

      <Popup {...popup} onClose={() => setPopup({ isOpen: false })} />
    </div>
  )
}
