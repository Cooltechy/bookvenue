import { X, CheckCircle, AlertCircle, Clock, Info } from 'lucide-react'

export default function Popup({ isOpen, onClose, title, message, type = 'info', actions = [] }) {
  if (!isOpen) return null

  const icons = {
    success: <CheckCircle className="w-12 h-12 text-green-500" />,
    error: <AlertCircle className="w-12 h-12 text-red-500" />,
    warning: <AlertCircle className="w-12 h-12 text-yellow-500" />,
    info: <Info className="w-12 h-12 text-blue-500" />,
    pending: <Clock className="w-12 h-12 text-yellow-500" />
  }

  const bgColors = {
    success: 'bg-green-50',
    error: 'bg-red-50',
    warning: 'bg-yellow-50',
    info: 'bg-blue-50',
    pending: 'bg-yellow-50'
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
        <div className={`${bgColors[type]} p-6 flex flex-col items-center text-center`}>
          {icons[type]}
          <h2 className="text-2xl font-bold mt-4 text-gray-800">{title}</h2>
        </div>
        
        <div className="p-6">
          <p className="text-gray-600 text-center mb-6">{message}</p>
          
          <div className="flex flex-col gap-2">
            {actions.length > 0 ? (
              actions.map((action, index) => (
                <button
                  key={index}
                  onClick={action.onClick}
                  className={`w-full py-2 px-4 rounded-lg font-medium transition ${
                    action.primary
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-700 hover:to-teal-700'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {action.label}
                </button>
              ))
            ) : (
              <button
                onClick={onClose}
                className="w-full py-2 px-4 rounded-lg font-medium bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-700 hover:to-teal-700 transition"
              >
                OK
              </button>
            )}
          </div>
        </div>
        
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition"
        >
          <X className="w-6 h-6" />
        </button>
      </div>
    </div>
  )
}
