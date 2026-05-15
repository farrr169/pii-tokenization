import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, Eye, EyeOff } from 'lucide-react'
import { authApi } from '../../api'
import { useAuthStore } from '../../store/auth.store'
import { useAuditStore } from '../../store/audit.store'
import { usePermissionsStore, INIT_PERMISSIONS } from '../../store/permissions.store'

export default function Login() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const { addLog } = useAuditStore()
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await authApi.login(form)
      const userData = res.data.data.user
      setAuth(userData, res.data.data.token)
      // Reset matrix ke initial state agar session sebelumnya tidak mempengaruhi
      usePermissionsStore.getState().save(INIT_PERMISSIONS)
      addLog({ module: 'auth', activity: 'login', description: `Login berhasil sebagai ${userData.role || 'user'}`, user: userData })
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.message || 'Login gagal, periksa kembali email dan password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/30">
            <Shield size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-semibold text-gray-900">PII Tokenization System</h1>
          <p className="text-sm text-gray-500 mt-1">Dynamic FPE + Tweak Engine</p>
        </div>

        {/* Card */}
        <div className="card shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input type="email" value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="input-field" placeholder="admin@system.id" required />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  className="input-field pr-10" required />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>
            )}

            <button type="submit" disabled={loading}
              className="btn-primary w-full justify-center py-2.5 mt-2">
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  Masuk...
                </span>
              ) : 'Masuk ke Sistem'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Dynamic PII Tokenization System — Confidential
        </p>
      </div>
    </div>
  )
}
