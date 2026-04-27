import { useState, useEffect, useRef } from 'react'
import { Bell, Check, Info, AlertTriangle, X } from 'lucide-react'
import apiClient from '../api/client'
import { useAuth } from '../context/AuthContext'

export default function NotificationIcon() {
    const [notifications, setNotifications] = useState([])
    const [showDropdown, setShowDropdown] = useState(false)
    const [unreadCount, setUnreadCount] = useState(0)
    const dropdownRef = useRef(null)
    const { user } = useAuth()

    useEffect(() => {
        fetchNotifications()
        const interval = setInterval(fetchNotifications, 30000) // Poll every 30 seconds
        return () => clearInterval(interval)
    }, [])

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowDropdown(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const fetchNotifications = async () => {
        try {
            const response = await apiClient.get('/notifications')
            const data = response.data || []
            setNotifications(data)
            setUnreadCount(data.filter(n => !n.read).length)
        } catch (err) {
            console.error('Failed to fetch notifications:', err)
        }
    }

    const markAsRead = async (id) => {
        try {
            await apiClient.put(`/notifications/${id}/read`)
            setNotifications(notifications.map(n =>
                n._id === id ? { ...n, read: true } : n
            ))
            setUnreadCount(prev => Math.max(0, prev - 1))
        } catch (err) {
            console.error('Failed to mark notification as read:', err)
        }
    }

    const getIcon = (type) => {
        switch (type) {
            case 'booking_confirmed':
                return <Check className="w-4 h-4 text-emerald-500" />
            case 'booking_cancelled':
                return <X className="w-4 h-4 text-red-500" />
            case 'priority_rejected':
                return <AlertTriangle className="w-4 h-4 text-amber-500" />
            case 'system':
            default:
                return <Info className="w-4 h-4 text-blue-500" />
        }
    }

    const formatTime = (dateString) => {
        const date = new Date(dateString)
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    const formatDate = (dateString) => {
        const date = new Date(dateString)
        return date.toLocaleDateString()
    }

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="relative p-2 text-white hover:bg-white hover:bg-opacity-20 rounded-full transition"
                title="Notifications"
            >
                <Bell className="w-6 h-6" />
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
                        {unreadCount}
                    </span>
                )}
            </button>

            {showDropdown && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-2xl border border-gray-200 z-50 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                        <h3 className="font-bold text-gray-800">Notifications</h3>
                        {unreadCount > 0 && (
                            <span className="text-xs font-medium text-emerald-600">
                                {unreadCount} unread
                            </span>
                        )}
                    </div>

                    <div className="max-h-96 overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="p-8 text-center text-gray-500 italic">
                                No notifications yet
                            </div>
                        ) : (
                            notifications.map((notification) => (
                                <div
                                    key={notification._id}
                                    onClick={() => !notification.read && markAsRead(notification._id)}
                                    className={`p-4 border-b border-gray-50 last:border-0 cursor-pointer hover:bg-gray-50 transition ${!notification.read ? 'bg-emerald-50 bg-opacity-30' : ''
                                        }`}
                                >
                                    <div className="flex gap-3">
                                        <div className="mt-1 bg-white p-1.5 rounded-full shadow-sm">
                                            {getIcon(notification.type)}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-start mb-1">
                                                <h4 className={`text-sm font-semibold ${!notification.read ? 'text-gray-900' : 'text-gray-700'}`}>
                                                    {notification.subject}
                                                </h4>
                                                <span className="text-[10px] text-gray-400 whitespace-nowrap ml-2">
                                                    {formatTime(notification.createdAt)}
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-600 line-clamp-3">
                                                {notification.message}
                                            </p>
                                            <div className="text-[10px] text-gray-400 mt-2">
                                                {formatDate(notification.createdAt)}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {notifications.length > 0 && (
                        <div className="p-2 border-t border-gray-100 bg-gray-50 text-center">
                            <button
                                onClick={() => setShowDropdown(false)}
                                className="text-xs text-emerald-600 font-semibold hover:text-emerald-700 transition"
                            >
                                Close
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
