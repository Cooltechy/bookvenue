import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { authAPI } from '../api/auth'
import { useAuth } from '../context/AuthContext'
import { UserPlus, AlertCircle, Loader2 } from 'lucide-react'

export default function Register() {
  const [step, setStep] = useState(1) // Step 1: Email, Step 2: Details
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [mobile, setMobile] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [verifyingEmail, setVerifyingEmail] = useState(false)
  const [emailVerified, setEmailVerified] = useState(false)
  const navigate = useNavigate()
  const { login } = useAuth()

  // Auto-verify email as user types
  useEffect(() => {
    const timer = setTimeout(() => {
      if (email && email.endsWith('@uohyd.ac.in')) {
        const emailRegex = /^[a-z0-9._%+-]+@uohyd\.ac\.in$/
        if (emailRegex.test(email)) {
          verifyUniversityEmail(email)
        }
      } else {
        setName('')
        setMobile('')
        setEmailVerified(false)
      }
    }, 800)

    return () => clearTimeout(timer)
  }, [email])

  const verifyUniversityEmail = async (emailToVerify) => {
    setVerifyingEmail(true)
    setError('')
    
    try {
      const response = await authAPI.verifyUniversityEmail(emailToVerify)
      
      if (response.data.exists && response.data.user) {
        const user = response.data.user
        setName(user.name || '')
        setMobile(user.phone || '')
        setEmailVerified(true)
        // Automatically move to step 2
        setStep(2)
      } else {
        setError('Email not found in university database')
        setName('')
        setMobile('')
        setEmailVerified(false)
      }
    } catch (err) {
      setError('Unable to verify email with university database')
      setName('')
      setMobile('')
      setEmailVerified(false)
    } finally {
      setVerifyingEmail(false)
    }
  }

  const handleFinalSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!password || !confirmPassword) {
      setError('Please fill in all required fields')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)

    try {
      const response = await authAPI.register({
        email,
        password,
        name
      })
      
      login(response.data.token, response.data.user)
      navigate('/venues')
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Registration failed'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="flex items-center justify-center mb-8">
          <UserPlus className="w-8 h-8 text-emerald-600 mr-2" />
          <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">Create Account</h1>
        </div>

        {step === 1 ? (
          // Step 1: Email verification
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                University Email
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value.toLowerCase())}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                  placeholder="yourname@uohyd.ac.in"
                  pattern="[a-z0-9._%+-]+@uohyd\.ac\.in"
                  title="Please enter a valid university email in lowercase (e.g., yourname@uohyd.ac.in)"
                  autoFocus
                />
                {verifyingEmail && (
                  <div className="absolute right-3 top-2.5">
                    <Loader2 className="w-5 h-5 text-emerald-500 animate-spin" />
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">Only lowercase @uohyd.ac.in emails are allowed</p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start">
                <AlertCircle className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>
        ) : (
          // Step 2: Complete registration
          <form onSubmit={handleFinalSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                University Email
              </label>
              <input
                type="email"
                value={email}
                readOnly
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
              />
              <button
                type="button"
                onClick={() => {
                  setStep(1)
                  setEmailVerified(false)
                  setName('')
                  setMobile('')
                  setPassword('')
                  setConfirmPassword('')
                  setError('')
                }}
                className="text-xs text-emerald-600 hover:text-emerald-700 mt-1"
              >
                Change email
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input
                type="text"
                value={name}
                readOnly
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
                placeholder="Will be fetched from university database"
              />
              <p className="text-xs text-gray-500 mt-1">Automatically fetched from university database</p>
            </div>

            {mobile && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number</label>
                <input
                  type="text"
                  value={mobile}
                  readOnly
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
                />
                <p className="text-xs text-gray-500 mt-1">From university database</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                placeholder="At least 6 characters"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                placeholder="Re-enter your password"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start">
                <AlertCircle className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !password || !confirmPassword}
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-2 rounded-lg font-medium hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg"
            >
              {loading ? 'Creating account...' : 'Register'}
            </button>
          </form>
        )}

        <div className="mt-6 text-center">
          <p className="text-gray-600">Already have an account?</p>
          <Link to="/login" className="text-emerald-600 hover:text-emerald-700 font-medium">
            Login here
          </Link>
        </div>
      </div>
    </div>
  )
}
