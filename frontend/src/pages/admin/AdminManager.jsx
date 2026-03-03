import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import apiClient from '../../api/client'
import { ArrowLeft, Mail, User, X, Building2, UserPlus, UserMinus, Users } from 'lucide-react'
import Popup from '../../components/Popup'

export default function AdminManager() {
  const navigate = useNavigate()
  const [admins, setAdmins] = useState([])
  const [allUsers, setAllUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [popup, setPopup] = useState({ isOpen: false })
  const [adminVenues, setAdminVenues] = useState({})
  const [showUsersList, setShowUsersList] = useState(false)
  const [userFilter, setUserFilter] = useState('all') // 'all', 'user', 'admin'
  const [showDemoteModal, setShowDemoteModal] = useState(false)
  const [demotingAdmin, setDemotingAdmin] = useState(null)
  const [selectedUserToPromote, setSelectedUserToPromote] = useState('')
  const [checkingVenues, setCheckingVenues] = useState(false)

  useEffect(() => {
    fetchAdmins()
    fetchAllUsers()
  }, [])

  const fetchAllUsers = async () => {
    try {
      const response = await apiClient.get('/super-admin/users')
      setAllUsers(response.data)
    } catch (error) {
      console.error('Failed to fetch users:', error)
    }
  }

  const fetchAdmins = async () => {
    try {
      const response = await apiClient.get('/super-admin/admins')
      setAdmins(response.data)
      
      // Fetch venue counts for each admin
      const venuePromises = response.data
        .filter(a => a.role === 'admin')
        .map(admin => 
          apiClient.get(`/super-admin/admins/${admin._id}/venues`)
            .then(res => ({ adminId: admin._id, venues: res.data }))
            .catch(() => ({ adminId: admin._id, venues: [] }))
        )
      
      const venueResults = await Promise.all(venuePromises)
      const venueMap = {}
      venueResults.forEach(result => {
        venueMap[result.adminId] = result.venues
      })
      setAdminVenues(venueMap)
    } catch (error) {
      console.error('Failed to fetch admins:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePromoteUser = async (userId, userName) => {
    setPopup({
      isOpen: true,
      type: 'warning',
      title: 'Promote to Admin?',
      message: `Are you sure you want to promote "${userName}" to admin? They will be able to manage venues and bookings.`,
      actions: [
        {
          label: 'Cancel',
          onClick: () => setPopup({ isOpen: false })
        },
        {
          label: 'Promote',
          onClick: async () => {
            try {
              await apiClient.post(`/super-admin/users/${userId}/promote`)
              setPopup({
                isOpen: true,
                type: 'success',
                title: 'User Promoted',
                message: `${userName} has been promoted to admin successfully.`,
                actions: [{ label: 'OK', onClick: () => setPopup({ isOpen: false }), primary: true }]
              })
              fetchAdmins()
              fetchAllUsers()
            } catch (error) {
              setPopup({
                isOpen: true,
                type: 'error',
                title: 'Error',
                message: error.response?.data?.message || 'Failed to promote user',
                actions: [{ label: 'OK', onClick: () => setPopup({ isOpen: false }), primary: true }]
              })
            }
          },
          primary: true
        }
      ]
    })
  }

  const handleDemoteAdmin = async (adminId, adminName) => {
    const admin = admins.find(a => a._id === adminId)
    if (!admin) {
      console.error('Admin not found:', adminId)
      return
    }

    // Show loading state
    setCheckingVenues(true)

    try {
      // Fetch venues for this admin to ensure we have current data
      const venuesResponse = await apiClient.get(`/super-admin/admins/${adminId}/venues`)
      const venues = venuesResponse.data || []
      
      // Update adminVenues state with fresh data
      setAdminVenues(prev => ({
        ...prev,
        [adminId]: venues
      }))
      
      setCheckingVenues(false)
      
      if (venues.length > 0) {
        // Admin has venues - need to promote a user and transfer
        setDemotingAdmin(admin)
        setSelectedUserToPromote('')
        setShowDemoteModal(true)
        return
      }

      // Admin has no venues - can demote directly
      setPopup({
        isOpen: true,
        type: 'warning',
        title: 'Demote Admin?',
        message: `Are you sure you want to demote "${adminName}" to regular user? They will lose admin privileges but can continue as a normal user.`,
        actions: [
          {
            label: 'Cancel',
            onClick: () => setPopup({ isOpen: false })
          },
          {
            label: 'Demote',
            onClick: async () => {
              try {
                console.log('Attempting to demote admin:', adminId)
                const response = await apiClient.post(`/super-admin/admins/${adminId}/demote`)
                console.log('Demote response:', response)
                
                // Close the users list modal first
                setShowUsersList(false)
                
                // Show success popup
                setPopup({
                  isOpen: true,
                  type: 'success',
                  title: 'Admin Demoted',
                  message: `${adminName} has been demoted to regular user successfully.`,
                  actions: [{ label: 'OK', onClick: () => setPopup({ isOpen: false }), primary: true }]
                })
                
                // Refresh lists
                await fetchAdmins()
                await fetchAllUsers()
              } catch (error) {
                console.error('Demote error:', error)
                console.error('Error response:', error.response)
                
                // Close the users list modal
                setShowUsersList(false)
                
                setPopup({
                  isOpen: true,
                  type: 'error',
                  title: 'Error',
                  message: error.response?.data?.message || 'Failed to demote admin',
                  actions: [{ label: 'OK', onClick: () => setPopup({ isOpen: false }), primary: true }]
                })
              }
            },
            primary: true
          }
        ]
      })
    } catch (error) {
      setCheckingVenues(false)
      console.error('Failed to fetch venues for admin:', error)
      setPopup({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: 'Failed to check admin venues. Please try again.',
        actions: [{ label: 'OK', onClick: () => setPopup({ isOpen: false }), primary: true }]
      })
    }
  }

  const handleConfirmDemoteWithTransfer = async () => {
    if (!selectedUserToPromote) {
      setPopup({
        isOpen: true,
        type: 'error',
        title: 'No User Selected',
        message: 'Please select a user to promote to admin and transfer venues to.',
        actions: [{ label: 'OK', onClick: () => setPopup({ isOpen: false }), primary: true }]
      })
      return
    }

    try {
      console.log('Starting replace admin process...')
      
      // Step 1: Promote the selected user to admin
      console.log('Step 1: Promoting user', selectedUserToPromote)
      await apiClient.post(`/super-admin/users/${selectedUserToPromote}/promote`)
      
      // Step 2: Transfer all venues to the newly promoted admin
      console.log('Step 2: Transferring venues from', demotingAdmin._id, 'to', selectedUserToPromote)
      await apiClient.post(
        `/super-admin/admins/${demotingAdmin._id}/transfer-venues`,
        { toAdminId: selectedUserToPromote }
      )
      
      // Step 3: Demote the old admin
      console.log('Step 3: Demoting admin', demotingAdmin._id)
      await apiClient.post(`/super-admin/admins/${demotingAdmin._id}/demote`)
      
      console.log('Replace admin completed successfully')
      
      // Close modals
      setShowDemoteModal(false)
      setShowUsersList(false)
      
      // Show success popup
      setPopup({
        isOpen: true,
        type: 'success',
        title: 'Admin Replaced Successfully',
        message: `${demotingAdmin.firstName} ${demotingAdmin.lastName} has been demoted and all venues transferred to the new admin.`,
        actions: [{ label: 'OK', onClick: () => setPopup({ isOpen: false }), primary: true }]
      })
      
      // Refresh lists
      await fetchAdmins()
      await fetchAllUsers()
    } catch (error) {
      console.error('Replace admin error:', error)
      console.error('Error response:', error.response)
      
      // Close modals
      setShowDemoteModal(false)
      
      setPopup({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: error.response?.data?.message || 'Failed to complete the operation',
        actions: [{ label: 'OK', onClick: () => setPopup({ isOpen: false }), primary: true }]
      })
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-purple-600 to-indigo-600 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <button
              onClick={() => navigate('/venues')}
              className="flex items-center gap-2 text-white hover:bg-white hover:bg-opacity-20 px-4 py-2 rounded-lg transition"
            >
              <ArrowLeft className="w-5 h-5" />
              Back
            </button>
            <h1 className="text-3xl font-bold text-white">Admin Management</h1>
            <button
              onClick={() => setShowUsersList(true)}
              className="flex items-center gap-2 bg-white text-purple-600 px-4 py-2 rounded-lg hover:bg-purple-50 transition font-medium"
            >
              <Users className="w-5 h-5" />
              Manage Roles
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Demote Admin Modal */}
        {showDemoteModal && demotingAdmin && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center rounded-t-2xl">
                <h2 className="text-2xl font-bold text-gray-800">Replace Admin</h2>
                <button
                  onClick={() => setShowDemoteModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm font-semibold text-gray-800 mb-2">
                    Demoting: {demotingAdmin.firstName} {demotingAdmin.lastName}
                  </p>
                  <p className="text-sm text-gray-700">
                    This admin has {(adminVenues[demotingAdmin._id] || []).length} venue(s) that need to be transferred.
                  </p>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800">
                    ℹ️ Select a regular user to promote to admin. They will receive all venues from the current admin.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select User to Promote *
                  </label>
                  <select
                    value={selectedUserToPromote}
                    onChange={(e) => setSelectedUserToPromote(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    required
                  >
                    <option value="">Choose a user to promote...</option>
                    {allUsers
                      .filter(u => u.role === 'user')
                      .map(user => (
                        <option key={user._id} value={user._id}>
                          {user.firstName} {user.lastName} ({user.email})
                          {user.department ? ` - ${user.department}` : ''}
                        </option>
                      ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Only regular users are shown. The selected user will be promoted to admin.
                  </p>
                </div>

                {selectedUserToPromote && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-sm text-green-800 font-medium mb-2">
                      ✓ What will happen:
                    </p>
                    <ol className="text-sm text-green-700 space-y-1 list-decimal list-inside">
                      <li>Selected user will be promoted to admin</li>
                      <li>All {(adminVenues[demotingAdmin._id] || []).length} venue(s) will be transferred to them</li>
                      <li>{demotingAdmin.firstName} {demotingAdmin.lastName} will be demoted to regular user</li>
                    </ol>
                  </div>
                )}

                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-800">
                    ⚠️ This action cannot be undone. Make sure you've selected the correct user.
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowDemoteModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmDemoteWithTransfer}
                    disabled={!selectedUserToPromote}
                    className={`flex-1 px-4 py-2 rounded-lg transition font-medium ${
                      selectedUserToPromote
                        ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white hover:from-orange-700 hover:to-red-700'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    Replace Admin
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Users List Modal */}
        {showUsersList && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center rounded-t-2xl">
                <h2 className="text-2xl font-bold text-gray-800">Manage User Roles</h2>
                <button
                  onClick={() => setShowUsersList(false)}
                  className="text-gray-400 hover:text-gray-600 transition"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Filter Tabs */}
              <div className="px-6 pt-4">
                <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
                  <button
                    onClick={() => setUserFilter('all')}
                    className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition ${
                      userFilter === 'all'
                        ? 'bg-white text-purple-600 shadow'
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    All Users ({allUsers.length})
                  </button>
                  <button
                    onClick={() => setUserFilter('user')}
                    className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition ${
                      userFilter === 'user'
                        ? 'bg-white text-purple-600 shadow'
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    Regular Users ({allUsers.filter(u => u.role === 'user').length})
                  </button>
                  <button
                    onClick={() => setUserFilter('admin')}
                    className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition ${
                      userFilter === 'admin'
                        ? 'bg-white text-purple-600 shadow'
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    Admins ({allUsers.filter(u => u.role === 'admin').length})
                  </button>
                </div>
              </div>

              {/* Users List */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-3">
                  {allUsers
                    .filter(user => userFilter === 'all' || user.role === userFilter)
                    .map(user => (
                      <div key={user._id} className="bg-gray-50 rounded-lg p-4 flex items-center justify-between hover:bg-gray-100 transition">
                        <div className="flex items-center gap-3 flex-1">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            user.role === 'super_admin' 
                              ? 'bg-gradient-to-br from-yellow-400 to-orange-500'
                              : user.role === 'admin'
                              ? 'bg-gradient-to-br from-purple-500 to-indigo-500'
                              : 'bg-gradient-to-br from-gray-400 to-gray-500'
                          }`}>
                            <User className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-gray-800">
                                {user.firstName} {user.lastName}
                              </h3>
                              <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                user.role === 'super_admin'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : user.role === 'admin'
                                  ? 'bg-purple-100 text-purple-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {user.role === 'super_admin' ? 'Super Admin' : user.role === 'admin' ? 'Admin' : 'User'}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600">{user.email}</p>
                            {user.department && (
                              <p className="text-xs text-gray-500">{user.department}</p>
                            )}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2">
                          {user.role === 'user' && (
                            <button
                              onClick={() => handlePromoteUser(user._id, `${user.firstName} ${user.lastName}`)}
                              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium"
                            >
                              <UserPlus className="w-4 h-4" />
                              Promote to Admin
                            </button>
                          )}
                          {user.role === 'admin' && (
                            <button
                              onClick={() => handleDemoteAdmin(user._id, `${user.firstName} ${user.lastName}`)}
                              disabled={checkingVenues}
                              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition text-sm font-medium ${
                                checkingVenues
                                  ? 'bg-gray-400 cursor-not-allowed'
                                  : 'bg-orange-600 hover:bg-orange-700'
                              } text-white`}
                            >
                              <UserMinus className="w-4 h-4" />
                              {checkingVenues ? 'Checking...' : 'Demote to User'}
                            </button>
                          )}
                          {user.role === 'super_admin' && (
                            <span className="text-sm text-gray-500 italic px-4 py-2">
                              Cannot modify
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                </div>

                {allUsers.filter(user => userFilter === 'all' || user.role === userFilter).length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-gray-500">No users found</p>
                  </div>
                )}
              </div>

              <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
                <button
                  onClick={() => setShowUsersList(false)}
                  className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Admins List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {admins.filter(a => a.role === 'admin').map((admin) => (
            <div key={admin._id} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-full flex items-center justify-center">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-800">
                      {admin.firstName} {admin.lastName}
                    </h3>
                    <p className="text-sm text-gray-500">{admin.department || 'No department'}</p>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Mail className="w-4 h-4 text-purple-600" />
                    {admin.email}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Building2 className="w-4 h-4 text-purple-600" />
                    {(adminVenues[admin._id] || []).length} venue(s)
                  </div>
                  <div className="text-xs text-gray-500">
                    Created: {new Date(admin.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {admins.filter(a => a.role === 'admin').length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg mb-4">No admins yet</p>
            <p className="text-gray-500 text-sm">
              Click "Manage Roles" to promote users to admin
            </p>
          </div>
        )}
      </main>

      <Popup {...popup} onClose={() => setPopup({ isOpen: false })} />
    </div>
  )
}
