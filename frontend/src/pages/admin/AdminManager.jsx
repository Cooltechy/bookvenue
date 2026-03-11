import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import apiClient from '../../api/client'
import { ArrowLeft, Mail, User, X, Building2, UserPlus, UserMinus, Users, Search, Loader2, CheckCircle, XCircle } from 'lucide-react'
import Popup from '../../components/Popup'

export default function AdminManager() {
  const navigate = useNavigate()
  const [admins, setAdmins] = useState([])
  const [allUsers, setAllUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [popup, setPopup] = useState({ isOpen: false })
  const [adminVenues, setAdminVenues] = useState({})
  const [showManageModal, setShowManageModal] = useState(false)
  const [activeTab, setActiveTab] = useState('local') // 'local' or 'search'
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [userFilter, setUserFilter] = useState('all')
  const [showDemoteModal, setShowDemoteModal] = useState(false)
  const [demotingAdmin, setDemotingAdmin] = useState(null)
  const [selectedUserToPromote, setSelectedUserToPromote] = useState('')
  const [checkingVenues, setCheckingVenues] = useState(false)

  useEffect(() => {
    fetchAdmins()
    fetchAllUsers()
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.length >= 2 && activeTab === 'search') {
        searchUniversityUsers()
      } else {
        setSearchResults([])
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [searchQuery, activeTab])

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

  const searchUniversityUsers = async () => {
    if (searchQuery.length < 2) return
    
    setSearching(true)
    try {
      const response = await apiClient.get(`/super-admin/search-university-users?query=${encodeURIComponent(searchQuery)}`)
      setSearchResults(response.data.users || [])
    } catch (error) {
      console.error('Failed to search university users:', error)
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }

  const handleCreateAdminFromUniversity = async (user) => {
    setPopup({
      isOpen: true,
      type: 'warning',
      title: 'Create Admin Account',
      message: `Create admin account for "${user.name}" (${user.email})? A default password will be assigned.`,
      actions: [
        {
          label: 'Cancel',
          onClick: () => setPopup({ isOpen: false })
        },
        {
          label: 'Create Admin',
          onClick: async () => {
            try {
              const response = await apiClient.post('/super-admin/admins', {
                email: user.email
              })
              
              const defaultPassword = response.data.defaultPassword
              
              setPopup({
                isOpen: true,
                type: 'success',
                title: 'Admin Created Successfully',
                message: (
                  <div className="space-y-2">
                    <p>Admin account created for {user.name}</p>
                    {defaultPassword && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mt-2">
                        <p className="font-semibold text-sm">Default Password:</p>
                        <p className="font-mono text-lg">{defaultPassword}</p>
                        <p className="text-xs text-yellow-700 mt-1">⚠️ Please share this with the admin and ask them to change it after first login</p>
                      </div>
                    )}
                  </div>
                ),
                actions: [{ label: 'OK', onClick: () => {
                  setPopup({ isOpen: false })
                  setSearchQuery('')
                  setSearchResults([])
                }, primary: true }]
              })
              
              fetchAdmins()
              fetchAllUsers()
            } catch (error) {
              setPopup({
                isOpen: true,
                type: 'error',
                title: 'Error',
                message: error.response?.data?.message || 'Failed to create admin',
                actions: [{ label: 'OK', onClick: () => setPopup({ isOpen: false }), primary: true }]
              })
            }
          },
          primary: true
        }
      ]
    })
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
    if (!admin) return

    setCheckingVenues(true)

    try {
      const venuesResponse = await apiClient.get(`/super-admin/admins/${adminId}/venues`)
      const venues = venuesResponse.data || []
      
      setAdminVenues(prev => ({
        ...prev,
        [adminId]: venues
      }))
      
      setCheckingVenues(false)
      
      if (venues.length > 0) {
        setDemotingAdmin(admin)
        setSelectedUserToPromote('')
        setShowDemoteModal(true)
        return
      }

      setPopup({
        isOpen: true,
        type: 'warning',
        title: 'Demote Admin?',
        message: `Are you sure you want to demote "${adminName}" to regular user?`,
        actions: [
          {
            label: 'Cancel',
            onClick: () => setPopup({ isOpen: false })
          },
          {
            label: 'Demote',
            onClick: async () => {
              try {
                await apiClient.post(`/super-admin/admins/${adminId}/demote`)
                setShowManageModal(false)
                setPopup({
                  isOpen: true,
                  type: 'success',
                  title: 'Admin Demoted',
                  message: `${adminName} has been demoted to regular user successfully.`,
                  actions: [{ label: 'OK', onClick: () => setPopup({ isOpen: false }), primary: true }]
                })
                await fetchAdmins()
                await fetchAllUsers()
              } catch (error) {
                setShowManageModal(false)
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
      await apiClient.post(`/super-admin/users/${selectedUserToPromote}/promote`)
      await apiClient.post(
        `/super-admin/admins/${demotingAdmin._id}/transfer-venues`,
        { toAdminId: selectedUserToPromote }
      )
      await apiClient.post(`/super-admin/admins/${demotingAdmin._id}/demote`)
      
      setShowDemoteModal(false)
      setShowManageModal(false)
      
      setPopup({
        isOpen: true,
        type: 'success',
        title: 'Admin Replaced Successfully',
        message: `${demotingAdmin.name} has been demoted and all venues transferred.`,
        actions: [{ label: 'OK', onClick: () => setPopup({ isOpen: false }), primary: true }]
      })
      
      await fetchAdmins()
      await fetchAllUsers()
    } catch (error) {
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
              onClick={() => setShowManageModal(true)}
              className="flex items-center gap-2 bg-white text-purple-600 px-4 py-2 rounded-lg hover:bg-purple-50 transition font-medium"
            >
              <Users className="w-5 h-5" />
              Manage Admins
            </button>
          </div>
        </div>
      </header>

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
                    Demoting: {demotingAdmin.name}
                  </p>
                  <p className="text-sm text-gray-700">
                    This admin has {(adminVenues[demotingAdmin._id] || []).length} venue(s) that need to be transferred.
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
                          {user.name} ({user.email})
                        </option>
                      ))}
                  </select>
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

        {/* Manage Admins Modal */}
        {showManageModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center rounded-t-2xl">
                <h2 className="text-2xl font-bold text-gray-800">Manage Admins</h2>
                <button
                  onClick={() => {
                    setShowManageModal(false)
                    setSearchQuery('')
                    setSearchResults([])
                  }}
                  className="text-gray-400 hover:text-gray-600 transition"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Tabs */}
              <div className="px-6 pt-4">
                <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
                  <button
                    onClick={() => {
                      setActiveTab('local')
                      setSearchQuery('')
                      setSearchResults([])
                    }}
                    className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition ${
                      activeTab === 'local'
                        ? 'bg-white text-purple-600 shadow'
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    Registered Users ({allUsers.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('search')}
                    className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition ${
                      activeTab === 'search'
                        ? 'bg-white text-purple-600 shadow'
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    Search University Database
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {activeTab === 'local' ? (
                  <>
                    {/* Filter Tabs for Local Users */}
                    <div className="flex gap-2 mb-4">
                      <button
                        onClick={() => setUserFilter('all')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                          userFilter === 'all'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        All ({allUsers.length})
                      </button>
                      <button
                        onClick={() => setUserFilter('user')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                          userFilter === 'user'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        Users ({allUsers.filter(u => u.role === 'user').length})
                      </button>
                      <button
                        onClick={() => setUserFilter('admin')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                          userFilter === 'admin'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        Admins ({allUsers.filter(u => u.role === 'admin').length})
                      </button>
                    </div>

                    {/* Local Users List */}
                    <div className="space-y-3">
                      {allUsers
                        .filter(user => userFilter === 'all' || user.role === userFilter)
                        .filter(user => user.type !== 'student')
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
                                    {user.name}
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
                                {user.type && (
                                  <p className="text-xs text-gray-500">
                                    Type: <span className={`font-medium ${
                                      user.type === 'student' ? 'text-blue-600' : 
                                      user.type === 'faculty' ? 'text-green-600' : 
                                      'text-purple-600'
                                    }`}>
                                      {user.type.charAt(0).toUpperCase() + user.type.slice(1)}
                                    </span>
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex gap-2">
                              {user.role === 'user' && (
                                <button
                                  onClick={() => handlePromoteUser(user._id, user.name)}
                                  disabled={user.type === 'student'}
                                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition text-sm font-medium ${
                                    user.type === 'student'
                                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                      : 'bg-green-600 text-white hover:bg-green-700'
                                  }`}
                                  title={user.type === 'student' ? 'Students cannot be promoted to admin' : 'Promote to admin'}
                                >
                                  <UserPlus className="w-4 h-4" />
                                  Promote
                                </button>
                              )}
                              {user.role === 'admin' && (
                                <button
                                  onClick={() => handleDemoteAdmin(user._id, user.name)}
                                  disabled={checkingVenues}
                                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition text-sm font-medium ${
                                    checkingVenues
                                      ? 'bg-gray-400 cursor-not-allowed'
                                      : 'bg-orange-600 hover:bg-orange-700'
                                  } text-white`}
                                >
                                  <UserMinus className="w-4 h-4" />
                                  Demote
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
                  </>
                ) : (
                  <>
                    {/* Search University Database */}
                    <div className="mb-6">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search by name, email, or university ID..."
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          autoFocus
                        />
                        {searching && (
                          <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 text-purple-600 w-5 h-5 animate-spin" />
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Search for university members who haven't registered yet to create admin accounts
                      </p>
                    </div>

                    {/* Search Results */}
                    {searchQuery.length < 2 ? (
                      <div className="text-center py-12">
                        <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500">Enter at least 2 characters to search</p>
                      </div>
                    ) : searching ? (
                      <div className="text-center py-12">
                        <Loader2 className="w-12 h-12 text-purple-600 mx-auto mb-3 animate-spin" />
                        <p className="text-gray-500">Searching university database...</p>
                      </div>
                    ) : searchResults.length === 0 ? (
                      <div className="text-center py-12">
                        <XCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500">No users found matching "{searchQuery}"</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {searchResults.map((user, index) => (
                          <div key={index} className="bg-gray-50 rounded-lg p-4 flex items-center justify-between hover:bg-gray-100 transition">
                            <div className="flex items-center gap-3 flex-1">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                user.isRegistered
                                  ? user.currentRole === 'admin'
                                    ? 'bg-gradient-to-br from-purple-500 to-indigo-500'
                                    : 'bg-gradient-to-br from-gray-400 to-gray-500'
                                  : 'bg-gradient-to-br from-blue-400 to-blue-500'
                              }`}>
                                <User className="w-5 h-5 text-white" />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <h3 className="font-semibold text-gray-800">
                                    {user.name}
                                  </h3>
                                  {user.isRegistered ? (
                                    <span className={`text-xs px-2 py-1 rounded-full font-medium flex items-center gap-1 ${
                                      user.currentRole === 'admin'
                                        ? 'bg-purple-100 text-purple-800'
                                        : user.currentRole === 'super_admin'
                                        ? 'bg-yellow-100 text-yellow-800'
                                        : 'bg-gray-100 text-gray-800'
                                    }`}>
                                      <CheckCircle className="w-3 h-3" />
                                      Registered ({user.currentRole})
                                    </span>
                                  ) : (
                                    <span className="text-xs px-2 py-1 rounded-full font-medium bg-blue-100 text-blue-800">
                                      Not Registered
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-gray-600">{user.email}</p>
                                {user.department && (
                                  <p className="text-xs text-gray-500">{user.department}</p>
                                )}
                                {user.type && (
                                  <p className="text-xs text-gray-500">
                                    Type: <span className={`font-medium ${
                                      user.type === 'student' ? 'text-blue-600' : 
                                      user.type === 'faculty' ? 'text-green-600' : 
                                      'text-purple-600'
                                    }`}>
                                      {user.type.charAt(0).toUpperCase() + user.type.slice(1)}
                                    </span>
                                  </p>
                                )}
                              </div>
                            </div>

                            <div>
                              {!user.isRegistered ? (
                                user.type === 'student' ? (
                                  <span className="text-sm text-gray-500 italic px-4 py-2">
                                    Students cannot be admin
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => handleCreateAdminFromUniversity(user)}
                                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition text-sm font-medium"
                                  >
                                    <UserPlus className="w-4 h-4" />
                                    Create Admin
                                  </button>
                                )
                              ) : user.currentRole === 'user' ? (
                                user.type === 'student' ? (
                                  <span className="text-sm text-gray-500 italic px-4 py-2">
                                    Students cannot be admin
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => {
                                      const localUser = allUsers.find(u => u.email === user.email)
                                      if (localUser) {
                                        handlePromoteUser(localUser._id, user.name)
                                      }
                                    }}
                                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium"
                                  >
                                    <UserPlus className="w-4 h-4" />
                                    Promote
                                  </button>
                                )
                              ) : (
                                <span className="text-sm text-gray-500 italic px-4 py-2">
                                  Already {user.currentRole}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
                <button
                  onClick={() => {
                    setShowManageModal(false)
                    setSearchQuery('')
                    setSearchResults([])
                  }}
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
                      {admin.name || admin.email.split('@')[0]}
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
              Click "Manage Admins" to promote users or create new admin accounts
            </p>
          </div>
        )}
      </main>

      <Popup {...popup} onClose={() => setPopup({ isOpen: false })} />
    </div>
  )
}
