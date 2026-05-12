import { useState } from 'react'
import { X, AlertCircle, CheckCircle, Info } from 'lucide-react'

// ── StatCard ──────────────────────────────────
export function StatCard({ label, value, sub, icon: Icon, color = '#185FA5' }) {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-gray-500">{label}</span>
        {Icon && (
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: color + '18' }}>
            <Icon size={15} style={{ color }} />
          </div>
        )}
      </div>
      <div className="text-2xl font-semibold text-gray-900">{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
    </div>
  )
}

// ── Badge ─────────────────────────────────────
export function Badge({ text, variant = 'gray' }) {
  const classes = {
    gray: 'badge-gray', blue: 'badge-blue', green: 'badge-green',
    amber: 'badge-amber', red: 'badge-red'
  }
  return <span className={classes[variant] || 'badge-gray'}>{text}</span>
}

export function StatusBadge({ status }) {
  const map = {
    completed: ['green', 'Selesai'], success: ['green', 'Berhasil'],
    pending: ['amber', 'Menunggu'], running: ['blue', 'Berjalan'],
    failed: ['red', 'Gagal'], active: ['green', 'Aktif'],
    inactive: ['gray', 'Nonaktif'],
  }
  const [variant, label] = map[status] || ['gray', status]
  return <Badge text={label} variant={variant} />
}

// ── Button ────────────────────────────────────
export function Button({ label, onClick, variant = 'secondary', icon: Icon, disabled, size = 'md' }) {
  const base = variant === 'primary' ? 'btn-primary' : variant === 'danger'
    ? 'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-danger-light text-red-700 hover:bg-red-100 transition-colors'
    : 'btn-secondary'
  const sizes = { sm: 'text-xs px-3 py-1.5', md: '', lg: 'text-base px-5 py-3' }
  return (
    <button onClick={onClick} disabled={disabled}
      className={`${base} ${sizes[size]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
      {Icon && <Icon size={14} />}
      {label}
    </button>
  )
}

// ── Modal ─────────────────────────────────────
export function Modal({ open, onClose, title, children, footer }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg border border-gray-100">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 p-5 border-t border-gray-100">{footer}</div>}
      </div>
    </div>
  )
}

// ── FormField ─────────────────────────────────
export function FormField({ label, children, required, hint }) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  )
}

// ── DataTable ─────────────────────────────────
export function DataTable({ columns, data, loading, emptyText = 'Tidak ada data' }) {
  if (loading) return (
    <div className="card text-center py-12 text-gray-400">
      <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-3"></div>
      Memuat data...
    </div>
  )
  return (
    <div className="card overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr className="table-header">
              {columns.map(c => <th key={c.key}>{c.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr><td colSpan={columns.length} className="text-center py-10 text-sm text-gray-400">{emptyText}</td></tr>
            ) : (
              data.map((row, i) => (
                <tr key={row.id || i} className="table-row hover:bg-gray-50/50 transition-colors">
                  {columns.map(c => (
                    <td key={c.key}>{c.render ? c.render(row[c.key], row) : row[c.key] ?? '-'}</td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Alert ─────────────────────────────────────
export function Alert({ type = 'info', message }) {
  const config = {
    info:    { icon: Info, cls: 'bg-blue-50 border-blue-200 text-blue-800' },
    success: { icon: CheckCircle, cls: 'bg-green-50 border-green-200 text-green-800' },
    error:   { icon: AlertCircle, cls: 'bg-red-50 border-red-200 text-red-800' },
    warning: { icon: AlertCircle, cls: 'bg-amber-50 border-amber-200 text-amber-800' },
  }
  const { icon: Icon, cls } = config[type] || config.info
  return (
    <div className={`flex items-start gap-3 p-4 rounded-lg border text-sm ${cls}`}>
      <Icon size={16} className="mt-0.5 flex-shrink-0" />
      <span>{message}</span>
    </div>
  )
}

// ── Pagination ────────────────────────────────
export function Pagination({ page, total, limit, onPageChange }) {
  const totalPages = Math.ceil(total / limit)
  if (totalPages <= 1) return null
  return (
    <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
      <span>Menampilkan {Math.min((page-1)*limit+1, total)}–{Math.min(page*limit, total)} dari {total}</span>
      <div className="flex gap-1">
        <button disabled={page === 1} onClick={() => onPageChange(page-1)}
          className="px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50">←</button>
        {Array.from({length: Math.min(5, totalPages)}, (_, i) => i + 1).map(p => (
          <button key={p} onClick={() => onPageChange(p)}
            className={`px-3 py-1.5 rounded-lg border ${p === page ? 'bg-primary text-white border-primary' : 'border-gray-200 hover:bg-gray-50'}`}>{p}</button>
        ))}
        <button disabled={page === totalPages} onClick={() => onPageChange(page+1)}
          className="px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50">→</button>
      </div>
    </div>
  )
}

// ── Toggle ────────────────────────────────────
export function Toggle({ checked, onChange, label }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <div className={`w-10 h-5 rounded-full transition-colors relative ${checked ? 'bg-primary' : 'bg-gray-200'}`}
        onClick={() => onChange(!checked)}>
        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </div>
      {label && <span className="text-sm text-gray-600">{label}</span>}
    </label>
  )
}

// ── SearchInput ───────────────────────────────
export function SearchInput({ value, onChange, placeholder = 'Cari...' }) {
  return (
    <div className="relative">
      <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
      </svg>
      <input type="text" value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="input-field pl-9 max-w-xs" />
    </div>
  )
}
