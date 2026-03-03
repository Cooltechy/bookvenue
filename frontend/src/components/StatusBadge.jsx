import { Clock, CreditCard, CheckCircle, XCircle, Ban } from 'lucide-react'

export default function StatusBadge({ status, workflowStage }) {
  const statusConfig = {
    pending_approval: {
      label: 'Pending Approval',
      color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      icon: Clock,
      description: 'Waiting for admin review'
    },
    payment_pending: {
      label: 'Payment Required',
      color: 'bg-orange-100 text-orange-800 border-orange-300',
      icon: CreditCard,
      description: 'Approved - Please make payment'
    },
    payment_completed: {
      label: 'Confirmed',
      color: 'bg-green-100 text-green-800 border-green-300',
      icon: CheckCircle,
      description: 'Booking confirmed'
    },
    rejected: {
      label: 'Rejected',
      color: 'bg-red-100 text-red-800 border-red-300',
      icon: XCircle,
      description: 'Request rejected'
    },
    cancelled: {
      label: 'Cancelled',
      color: 'bg-gray-100 text-gray-800 border-gray-300',
      icon: Ban,
      description: 'Booking cancelled'
    }
  }

  const config = statusConfig[status] || statusConfig.pending_approval
  const Icon = config.icon

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${config.color} font-medium text-sm`}>
      <Icon className="w-4 h-4" />
      <span>{config.label}</span>
    </div>
  )
}
