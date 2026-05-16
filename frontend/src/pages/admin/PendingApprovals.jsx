import { useState, useEffect } from 'react'
import React from 'react'
import { bookingsAPI } from '../../api/bookings'
import { Calendar, Clock, MapPin, FileText, Download, CheckCircle, XCircle, User, Award, Briefcase, GraduationCap, AlertTriangle } from 'lucide-react'
import Popup from '../../components/Popup'

export default function PendingApprovals() {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedBooking, setSelectedBooking] = useState(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [showApproveModal, setShowApproveModal] = useState(false)
  const [popup, setPopup] = useState({ isOpen: false })
  const [activeFilters, setActiveFilters] = useState(['faculty', 'staff', 'student']) // All active by default
  const [showConflictsModal, setShowConflictsModal] = useState(false)
  const [selectedBookingForConflicts, setSelectedBookingForConflicts] = useState(null)
  const [conflictingBookings, setConflictingBookings] = useState([])
  const [waiveCharges, setWaiveCharges] = useState(false)

  useEffect(() => {
    fetchPendingBookings()
  }, [])

  const fetchPendingBookings = async () => {
    try {
      const response = await bookingsAPI.getPendingApprovalBookings()
      // Sort bookings by user type priority: faculty > staff > student
      const sortedBookings = response.data.sort((a, b) => {
        const priorityOrder = { faculty: 1, staff: 2, student: 3 };
        const aPriority = priorityOrder[a.userId?.type] || 3;
        const bPriority = priorityOrder[b.userId?.type] || 3;
        return aPriority - bPriority;
      });
      setBookings(sortedBookings)
    } catch (err) {
      console.error('Failed to fetch pending bookings:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadDocument = async (bookingId) => {
    try {
      const response = await bookingsAPI.downloadPermissionDocument(bookingId)
      const contentType = response.headers['content-type'];
      let ext = '.pdf';
      if (contentType) {
        if (contentType.includes('image/png')) ext = '.png';
        else if (contentType.includes('image/jpeg')) ext = '.jpg';
        else if (contentType.includes('application/msword')) ext = '.doc';
        else if (contentType.includes('wordprocessingml')) ext = '.docx';
      }

      const blob = new Blob([response.data], { type: contentType || 'application/pdf' });
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `permission-${bookingId}${ext}`)
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
      const response = await bookingsAPI.approveBooking(selectedBooking._id, waiveCharges)
      setShowApproveModal(false)
      setSelectedBooking(null)
      setWaiveCharges(false)
      setPopup({
        isOpen: true,
        type: 'success',
        title: 'Booking Approved',
        message: response.data.message || (waiveCharges
          ? 'Booking has been approved with charges waived. User will be notified that no payment is required.'
          : 'Booking has been approved. User will be notified to make payment.'),
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
      setWaiveCharges(false)
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

  const getUserTypeConfig = (userType) => {
    switch (userType) {
      case 'faculty':
        return {
          label: 'Faculty',
          icon: Award,
          bgColor: 'bg-gradient-to-r from-amber-50 to-white',
          ringColor: 'ring-2 ring-amber-400',
          badgeBg: 'bg-amber-100',
          badgeText: 'text-amber-800',
          smallBadgeBg: 'bg-amber-200',
          smallBadgeText: 'text-amber-800',
          priority: 'High Priority',
          legendColor: 'bg-amber-400',
          legendIconColor: 'text-amber-600'
        };
      case 'staff':
        return {
          label: 'Staff',
          icon: Briefcase,
          bgColor: 'bg-gradient-to-r from-blue-50 to-white',
          ringColor: 'ring-2 ring-blue-400',
          badgeBg: 'bg-blue-100',
          badgeText: 'text-blue-800',
          smallBadgeBg: 'bg-blue-200',
          smallBadgeText: 'text-blue-800',
          priority: 'Priority',
          legendColor: 'bg-blue-400',
          legendIconColor: 'text-blue-600'
        };
      case 'student':
      default:
        return {
          label: 'Student',
          icon: GraduationCap,
          bgColor: 'bg-white',
          ringColor: '',
          badgeBg: 'bg-gray-100',
          badgeText: 'text-gray-700',
          smallBadgeBg: 'bg-gray-200',
          smallBadgeText: 'text-gray-700',
          priority: null,
          legendColor: 'bg-gray-300',
          legendIconColor: 'text-gray-600'
        };
    }
  }

  const toggleFilter = (userType) => {
    setActiveFilters(prev => {
      if (prev.includes(userType)) {
        // Prevent removing the last active filter
        if (prev.length === 1) {
          return prev; // Keep at least one filter active
        }
        // Remove filter if already active and not the last one
        return prev.filter(type => type !== userType);
      } else {
        // Add filter if not active
        return [...prev, userType];
      }
    });
  }

  const filteredBookings = bookings.filter(booking => {
    const userType = booking.userId?.type || 'student';
    return activeFilters.includes(userType);
  });

  const checkConflicts = (booking) => {
    const conflicts = bookings.filter(b => {
      // Don't compare with itself
      if (b._id === booking._id) return false;

      // Check if same venue
      if (b.venueId?._id !== booking.venueId?._id) return false;

      // Check if time slots overlap
      const bStart = new Date(b.startTime);
      const bEnd = new Date(b.endTime);
      const bookingStart = new Date(booking.startTime);
      const bookingEnd = new Date(booking.endTime);

      // Overlap condition: (StartA < EndB) AND (EndA > StartB)
      return bStart < bookingEnd && bEnd > bookingStart;
    });

    return conflicts;
  }

  const handleApproveFromConflicts = async (bookingToApprove) => {
    try {
      // Get all conflicting bookings for the one being approved
      const conflicts = checkConflicts(bookingToApprove);

      // Approve the selected booking
      await bookingsAPI.approveBooking(bookingToApprove._id);

      // Reject all conflicting bookings
      const rejectionPromises = conflicts.map(conflict =>
        bookingsAPI.rejectBooking(
          conflict._id,
          `Booking rejected due to time slot conflict. Another booking for the same venue and time has been approved.`
        )
      );

      await Promise.all(rejectionPromises);

      setShowConflictsModal(false);
      setSelectedBookingForConflicts(null);
      setConflictingBookings([]);

      setPopup({
        isOpen: true,
        type: 'success',
        title: 'Booking Approved',
        message: `Booking approved successfully. ${conflicts.length} conflicting booking(s) have been automatically rejected.`,
        actions: [
          {
            label: 'OK',
            onClick: () => {
              setPopup({ isOpen: false });
              fetchPendingBookings();
            },
            primary: true
          }
        ]
      });
    } catch (err) {
      setPopup({
        isOpen: true,
        type: 'error',
        title: 'Approval Failed',
        message: err.response?.data?.message || 'Failed to approve booking'
      });
    }
  };

  const handleRejectFromConflicts = async (bookingToReject) => {
    try {
      await bookingsAPI.rejectBooking(
        bookingToReject._id,
        'Booking rejected by admin after reviewing conflicting requests.'
      );

      // Remove from conflicts list
      setConflictingBookings(prev => prev.filter(b => b._id !== bookingToReject._id));

      // If this was the selected booking, close modal
      if (selectedBookingForConflicts._id === bookingToReject._id) {
        setShowConflictsModal(false);
        setSelectedBookingForConflicts(null);
        setConflictingBookings([]);
      }

      setPopup({
        isOpen: true,
        type: 'success',
        title: 'Booking Rejected',
        message: 'Booking has been rejected successfully.',
        actions: [
          {
            label: 'OK',
            onClick: () => {
              setPopup({ isOpen: false });
              fetchPendingBookings();
            },
            primary: true
          }
        ]
      });
    } catch (err) {
      setPopup({
        isOpen: true,
        type: 'error',
        title: 'Rejection Failed',
        message: err.response?.data?.message || 'Failed to reject booking'
      });
    }
  };

  const handleViewConflicts = (booking) => {
    const conflicts = checkConflicts(booking);
    setSelectedBookingForConflicts(booking);
    setConflictingBookings(conflicts);
    setShowConflictsModal(true);
  };

  const hasConflicts = (booking) => {
    return checkConflicts(booking).length > 0;
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
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl font-bold text-gray-800">Pending Approvals</h1>
          {bookings.length > 0 && (
            <div className="flex gap-3">
              {bookings.filter(b => hasConflicts(b)).length > 0 && (
                <div className="bg-red-100 text-red-800 px-4 py-2 rounded-lg flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  <span className="font-semibold text-sm">
                    {bookings.filter(b => hasConflicts(b)).length} Conflict{bookings.filter(b => hasConflicts(b)).length !== 1 ? 's' : ''}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Legend with Filters */}
        <div className="bg-white rounded-xl shadow-md p-4 mb-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Request Types (Click to filter):</h2>
          <div className="flex flex-wrap gap-4">
            {['faculty', 'staff', 'student'].map(type => {
              const config = getUserTypeConfig(type);
              const TypeIcon = config.icon;
              const isActive = activeFilters.includes(type);
              const isLastActive = isActive && activeFilters.length === 1;

              return (
                <button
                  key={type}
                  onClick={() => toggleFilter(type)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${isActive
                      ? `bg-white border-2 ${isLastActive ? 'border-green-400' : 'border-gray-300'} shadow-sm hover:shadow-md`
                      : 'bg-gray-100 border-2 border-transparent opacity-40 hover:opacity-60'
                    } ${isLastActive ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                  title={isLastActive ? 'At least one filter must be selected' : `Click to ${isActive ? 'hide' : 'show'} ${config.label} requests`}
                >
                  <div className={`w-4 h-4 rounded ${config.legendColor} ${isActive ? '' : 'opacity-50'}`}></div>
                  <TypeIcon className={`w-4 h-4 ${config.legendIconColor} ${isActive ? '' : 'opacity-50'}`} />
                  <span className={`text-sm ${isActive ? 'text-gray-700 font-medium' : 'text-gray-500'}`}>
                    {config.label} - {config.priority || 'Standard'}
                  </span>
                  {isActive && (
                    <CheckCircle className={`w-4 h-4 ${isLastActive ? 'text-green-600' : 'text-green-600'}`} />
                  )}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Showing {filteredBookings.length} of {bookings.length} requests
            {activeFilters.length === 1 && <span className="text-amber-600 ml-1">(At least one filter must remain selected)</span>}
          </p>
        </div>

        {bookings.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-600 mb-2">All caught up!</h2>
            <p className="text-gray-500">No bookings pending approval</p>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <XCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-600 mb-2">No matching requests</h2>
            <p className="text-gray-500">Try selecting different filters above</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredBookings.map((booking) => {
              const userType = booking.userId?.type || 'student';
              const config = getUserTypeConfig(userType);
              const TypeIcon = config.icon;

              return (
                <div
                  key={booking._id}
                  className={`rounded-xl shadow-md p-6 hover:shadow-lg transition ${config.bgColor} ${config.ringColor} ${hasConflicts(booking) ? 'border-2 border-red-500' : ''}`}
                >
                  {hasConflicts(booking) && (
                    <div className="flex items-center gap-2 mb-3 bg-red-100 text-red-800 px-3 py-2 rounded-lg w-fit">
                      <AlertTriangle className="w-5 h-5" />
                      <span className="font-semibold text-sm">Conflicting Time Slot Detected!</span>
                    </div>
                  )}

                  {config.priority && (
                    <div className={`flex items-center gap-2 mb-3 ${config.badgeBg} ${config.badgeText} px-3 py-2 rounded-lg w-fit`}>
                      <TypeIcon className="w-5 h-5" />
                      <span className="font-semibold text-sm">{config.label} Request - {config.priority}</span>
                    </div>
                  )}

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
                      <span>{booking.userId?.name}</span>
                      <span className={`text-xs ${config.smallBadgeBg} ${config.smallBadgeText} px-2 py-0.5 rounded-full font-medium flex items-center gap-1`}>
                        <TypeIcon className="w-3 h-3" />
                        {config.label}
                      </span>
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
                    {hasConflicts(booking) && (
                      <button
                        onClick={() => handleViewConflicts(booking)}
                        className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition text-sm font-medium border-2 border-red-300"
                      >
                        <AlertTriangle className="w-4 h-4" />
                        View Conflicts ({checkConflicts(booking).length})
                      </button>
                    )}

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
              )
            })}
          </div>
        )}
      </div>

      {/* Approve Modal */}
      {showApproveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Approve Booking</h2>

            {selectedBooking && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-700 mb-2">
                  <span className="font-semibold">Venue:</span> {selectedBooking.venueId?.name}
                </p>
                <p className="text-sm text-gray-700 mb-2">
                  <span className="font-semibold">User:</span> {selectedBooking.userId?.name}
                </p>
                <p className="text-sm text-gray-700 font-semibold">
                  <span className="font-semibold">Amount:</span> {selectedBooking.currency} {selectedBooking.price}
                </p>
              </div>
            )}

            <p className="text-gray-600 mb-4">
              Are you sure you want to approve this booking?
            </p>

            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={waiveCharges}
                  onChange={(e) => setWaiveCharges(e.target.checked)}
                  className="mt-1 w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <span className="font-semibold text-gray-800 block mb-1">Waive Charges</span>
                  <span className="text-sm text-gray-600">
                    Check this box to waive the booking charges. The user will not be required to make any payment.
                  </span>
                </div>
              </label>
            </div>

            <p className="text-sm text-gray-500 mb-6">
              {waiveCharges
                ? '✓ User will be notified that the booking is confirmed with no payment required.'
                : 'User will be notified to complete the payment.'}
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
                  setWaiveCharges(false)
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

      {/* Conflicts Modal */}
      {showConflictsModal && selectedBookingForConflicts && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <AlertTriangle className="w-6 h-6 text-red-600" />
                    Conflicting Bookings
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Found {conflictingBookings.length} booking(s) with overlapping time slots
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowConflictsModal(false)
                    setSelectedBookingForConflicts(null)
                    setConflictingBookings([])
                  }}
                  className="text-gray-400 hover:text-gray-600 transition"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* Current Booking */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Current Request:</h3>
                <div className="bg-blue-50 border-2 border-blue-300 rounded-xl p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="text-lg font-bold text-gray-800">{selectedBookingForConflicts.venueId?.name}</h4>
                      <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                        <MapPin className="w-3 h-3" />
                        {selectedBookingForConflicts.venueId?.location}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="bg-blue-200 text-blue-800 px-3 py-1 rounded-full text-xs font-medium">
                        Selected
                      </div>
                      {selectedBookingForConflicts.userId?.type && (
                        <div className={`${getUserTypeConfig(selectedBookingForConflicts.userId.type).smallBadgeBg} ${getUserTypeConfig(selectedBookingForConflicts.userId.type).smallBadgeText} px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1`}>
                          {React.createElement(getUserTypeConfig(selectedBookingForConflicts.userId.type).icon, { className: "w-3 h-3" })}
                          {getUserTypeConfig(selectedBookingForConflicts.userId.type).label}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-blue-600" />
                      <span>{selectedBookingForConflicts.userId?.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-blue-600" />
                      <span>{formatDate(selectedBookingForConflicts.startTime)}</span>
                    </div>
                    <div className="flex items-center gap-2 col-span-2">
                      <Clock className="w-4 h-4 text-blue-600" />
                      <span className="font-semibold">
                        {formatTime(selectedBookingForConflicts.startTime)} - {formatTime(selectedBookingForConflicts.endTime)}
                      </span>
                    </div>
                  </div>
                  <div className="p-3 bg-white rounded-lg mb-3">
                    <p className="text-sm text-gray-700">
                      <span className="font-semibold text-blue-800">Purpose:</span> {selectedBookingForConflicts.purpose}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApproveFromConflicts(selectedBookingForConflicts)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Approve This Request
                    </button>
                    <button
                      onClick={() => handleRejectFromConflicts(selectedBookingForConflicts)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm font-medium"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject This Request
                    </button>
                  </div>
                </div>
              </div>

              {/* Conflicting Bookings */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Conflicting Requests:</h3>
                <div className="space-y-3">
                  {conflictingBookings.map((conflict) => {
                    const conflictUserType = conflict.userId?.type || 'student';
                    const conflictConfig = getUserTypeConfig(conflictUserType);
                    const ConflictIcon = conflictConfig.icon;

                    return (
                      <div key={conflict._id} className="bg-red-50 border-2 border-red-300 rounded-xl p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="text-lg font-bold text-gray-800">{conflict.venueId?.name}</h4>
                            <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                              <MapPin className="w-3 h-3" />
                              {conflict.venueId?.location}
                            </p>
                          </div>
                          <div className="flex flex-col gap-1 items-end">
                            <div className="bg-red-200 text-red-800 px-3 py-1 rounded-full text-xs font-medium">
                              Conflict
                            </div>
                            <div className={`${conflictConfig.smallBadgeBg} ${conflictConfig.smallBadgeText} px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1`}>
                              <ConflictIcon className="w-3 h-3" />
                              {conflictConfig.label}
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-red-600" />
                            <span>{conflict.userId?.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-red-600" />
                            <span>{formatDate(conflict.startTime)}</span>
                          </div>
                          <div className="flex items-center gap-2 col-span-2">
                            <Clock className="w-4 h-4 text-red-600" />
                            <span className="font-semibold">
                              {formatTime(conflict.startTime)} - {formatTime(conflict.endTime)}
                            </span>
                          </div>
                        </div>
                        <div className="p-3 bg-white rounded-lg mb-2">
                          <p className="text-sm text-gray-700">
                            <span className="font-semibold text-red-800">Purpose:</span> {conflict.purpose}
                          </p>
                        </div>
                        <div className="text-xs text-gray-500 mb-3">
                          <span className="font-medium">Status:</span> {conflict.status.replace('_', ' ').toUpperCase()}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleApproveFromConflicts(conflict)}
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-xs font-medium"
                          >
                            <CheckCircle className="w-3 h-3" />
                            Approve
                          </button>
                          <button
                            onClick={() => handleRejectFromConflicts(conflict)}
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-xs font-medium"
                          >
                            <XCircle className="w-3 h-3" />
                            Reject
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-800">
                  <span className="font-semibold">⚠️ Important:</span> Approving any booking will automatically reject all conflicting bookings for the same time slot.
                  Consider the priority levels and user types when making your decision.
                </p>
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-6 rounded-b-2xl">
              <button
                onClick={() => {
                  setShowConflictsModal(false)
                  setSelectedBookingForConflicts(null)
                  setConflictingBookings([])
                }}
                className="w-full bg-gray-600 text-white py-3 rounded-lg font-medium hover:bg-gray-700 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <Popup {...popup} onClose={() => setPopup({ isOpen: false })} />
    </div>
  )
}
