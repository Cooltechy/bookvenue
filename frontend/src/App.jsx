import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Register from './pages/Register'
import Venues from './pages/Venues'
import Dashboard from './pages/Dashboard'
import CreateBooking from './pages/CreateBooking'
import MyBookings from './pages/MyBookings'
import Payment from './pages/Payment'
import PendingApprovals from './pages/admin/PendingApprovals'
import VenueManager from './pages/admin/VenueManager'
import AdminManager from './pages/admin/AdminManager'

function ProtectedRoute({ children, adminOnly = false, superAdminOnly = false }) {
  const { isAuthenticated, loading, user } = useAuth()

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />
  }

  if (superAdminOnly && user?.role !== 'super_admin') {
    return <Navigate to="/venues" />
  }

  if (adminOnly && user?.role !== 'admin' && user?.role !== 'super_admin') {
    return <Navigate to="/venues" />
  }

  return children
}

function AppRoutes() {
  const { isAuthenticated } = useAuth()

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/venues" /> : <Login />} />
      <Route path="/register" element={isAuthenticated ? <Navigate to="/venues" /> : <Register />} />
      <Route
        path="/venues"
        element={
          <ProtectedRoute>
            <Venues />
          </ProtectedRoute>
        }
      />
      <Route
        path="/book/:venueId"
        element={
          <ProtectedRoute>
            <CreateBooking />
          </ProtectedRoute>
        }
      />
      <Route
        path="/my-bookings"
        element={
          <ProtectedRoute>
            <MyBookings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/payment/:bookingId"
        element={
          <ProtectedRoute>
            <Payment />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/pending-approvals"
        element={
          <ProtectedRoute adminOnly={true}>
            <PendingApprovals />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/venues"
        element={
          <ProtectedRoute adminOnly={true}>
            <VenueManager />
          </ProtectedRoute>
        }
      />
      <Route
        path="/super-admin/admins"
        element={
          <ProtectedRoute superAdminOnly={true}>
            <AdminManager />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to="/venues" />} />
    </Routes>
  )
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('❌ Error caught:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', color: 'red' }}>
          <h1>Something went wrong</h1>
          <p>{this.state.error?.message}</p>
          <pre>{this.state.error?.stack}</pre>
        </div>
      )
    }

    return this.props.children
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <AppRoutes />
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  )
}
