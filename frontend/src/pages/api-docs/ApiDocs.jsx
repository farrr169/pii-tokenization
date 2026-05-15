import { useState, useEffect } from 'react'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { useAuthStore } from '../../store/auth.store'
import { Copy, ChevronDown, ChevronRight, Info, RefreshCw, CheckCircle, AlertCircle, Lock } from 'lucide-react'

const BASE_URL = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace('/api', '')
  : 'http://localhost:5000'
const API = `${BASE_URL}/api`

// ─── Utilities ───────────────────────────────────────────────────────────────

function useCopy() {
  const [copiedKey, setCopiedKey] = useState(null)
  const copy = (text, key) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 1500)
  }
  return { copiedKey, copy }
}

function CopyBtn({ text, id, copiedKey, copy, label = 'Salin ID' }) {
  const ok = copiedKey === id
  return (
    <button onClick={() => copy(text, id)} title="Salin"
      className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded transition-colors flex-shrink-0
        ${ok ? 'bg-green-100 text-green-700' : 'bg-gray-100 hover:bg-gray-200 text-gray-500'}`}>
      {ok ? <CheckCircle size={10} /> : <Copy size={10} />}
      {ok ? 'Disalin!' : label}
    </button>
  )
}

// ─── Live Reference Panel ─────────────────────────────────────────────────────

function LiveRefPanel({ token }) {
  const [tab, setTab] = useState('rules')
  const [data, setData] = useState({ rules: null, piiTypes: null, methods: null, tweaks: null })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const { copiedKey, copy } = useCopy()

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

  const fetchAll = async () => {
    setLoading(true); setError(null)
    try {
      const [rules, piiTypes, methods, tweaks] = await Promise.all([
        fetch(`${API}/tokenization-rules?limit=100`, { headers }).then(r => r.json()),
        fetch(`${API}/pii-types?limit=100`,          { headers }).then(r => r.json()),
        fetch(`${API}/tokenization-methods`,          { headers }).then(r => r.json()),
        fetch(`${API}/tweaks`,                        { headers }).then(r => r.json()),
      ])
      setData({
        rules:    rules.data    || [],
        piiTypes: piiTypes.data || [],
        methods:  methods.data  || [],
        tweaks:   tweaks.data   || [],
      })
    } catch {
      setError('Gagal memuat data. Pastikan backend berjalan dan Anda sudah login.')
    } finally { setLoading(false) }
  }

  useEffect(() => { fetchAll() }, [])

  const TABS = [
    { key: 'rules',    label: 'Tokenization Rules' },
    { key: 'piiTypes', label: 'PII Types' },
    { key: 'methods',  label: 'Methods' },
    { key: 'tweaks',   label: 'Tweaks' },
  ]

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-gray-800">Referensi ID Sistem (Live)</h2>
          <p className="text-xs text-gray-400 mt-0.5">Data langsung dari database. Salin ID yang dibutuhkan untuk request.</p>
        </div>
        <button onClick={fetchAll} disabled={loading}
          className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5">
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Memuat...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          <AlertCircle size={13} /> {error}
        </div>
      )}

      <div className="flex gap-1 border-b border-gray-100">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`text-xs px-3 py-2 font-medium border-b-2 transition-colors -mb-px
              ${tab === t.key ? 'border-primary text-primary' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
            {t.label}
            {data[t.key] && (
              <span className="ml-1.5 text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
                {data[t.key].length}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading && !data[tab] && (
        <div className="text-center py-8 text-xs text-gray-400">Memuat data dari database...</div>
      )}

      {tab === 'rules'    && data.rules    && <RulesTable rows={data.rules} copiedKey={copiedKey} copy={copy} />}
      {tab === 'piiTypes' && data.piiTypes && (
        <SimpleTable rows={data.piiTypes} copiedKey={copiedKey} copy={copy} cols={[
          { key: 'name',          label: 'Nama' },
          { key: 'category',      label: 'Kategori' },
          { key: 'example_value', label: 'Contoh Nilai' },
          { key: 'is_active',     label: 'Status', render: v => v ? <span className="text-green-600 font-medium">Aktif</span> : <span className="text-gray-400">Nonaktif</span> },
        ]} />
      )}
      {tab === 'methods' && data.methods && (
        <SimpleTable rows={data.methods} copiedKey={copiedKey} copy={copy} cols={[
          { key: 'method_name',      label: 'Nama Metode' },
          { key: 'supports_tweak',   label: 'Tweak',        render: v => v ? '✓' : '–' },
          { key: 'is_deterministic', label: 'Deterministik', render: v => v ? '✓' : '–' },
          { key: 'is_active',        label: 'Status',        render: v => v ? <span className="text-green-600 font-medium">Aktif</span> : <span className="text-gray-400">Nonaktif</span> },
        ]} />
      )}
      {tab === 'tweaks' && data.tweaks && (
        <SimpleTable rows={data.tweaks} copiedKey={copiedKey} copy={copy} cols={[
          { key: 'tweak_name',   label: 'Nama Tweak' },
          { key: 'tweak_type',   label: 'Tipe' },
          { key: 'tweak_length', label: 'Panjang (bytes)' },
          { key: 'tweak_value',  label: 'Nilai Statis', render: v => v || <span className="text-gray-300">—</span> },
        ]} />
      )}
    </div>
  )
}

function RulesTable({ rows, copiedKey, copy }) {
  if (!rows.length) return <p className="text-xs text-gray-400 text-center py-4">Belum ada rule. Jalankan seed terlebih dahulu.</p>
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-100">
            {['Nama Rule', 'PII Type', 'Metode', 'Prefix / Suffix', 'Rule ID (untuk tokenize)'].map(h => (
              <th key={h} className="text-left px-3 py-2 font-semibold text-gray-500">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id} className={`border-t border-gray-50 ${i % 2 === 1 ? 'bg-gray-50/40' : ''}`}>
              <td className="px-3 py-2.5 font-medium text-gray-800 whitespace-nowrap">{r.rule_name}</td>
              <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">{r.pii_type?.name || '—'}</td>
              <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">{r.method?.method_name || '—'}</td>
              <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap">
                {r.preserve_prefix > 0 || r.preserve_suffix > 0
                  ? `${r.preserve_prefix}px / ${r.preserve_suffix}sx` : 'Full'}
              </td>
              <td className="px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <code className="font-mono text-primary bg-blue-50 px-1.5 py-0.5 rounded text-xs break-all">{r.id}</code>
                  <CopyBtn text={r.id} id={r.id} copiedKey={copiedKey} copy={copy} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function SimpleTable({ rows, cols, copiedKey, copy }) {
  if (!rows.length) return <p className="text-xs text-gray-400 text-center py-4">Tidak ada data.</p>
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-100">
            {cols.map(c => <th key={c.key} className="text-left px-3 py-2 font-semibold text-gray-500">{c.label}</th>)}
            <th className="text-left px-3 py-2 font-semibold text-gray-500">ID</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id} className={`border-t border-gray-50 ${i % 2 === 1 ? 'bg-gray-50/40' : ''}`}>
              {cols.map(c => (
                <td key={c.key} className="px-3 py-2.5 text-gray-600 whitespace-nowrap">
                  {c.render ? c.render(r[c.key]) : (r[c.key] ?? '—')}
                </td>
              ))}
              <td className="px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <code className="font-mono text-primary bg-blue-50 px-1.5 py-0.5 rounded text-xs">{r.id.slice(0, 8)}…</code>
                  <CopyBtn text={r.id} id={r.id} copiedKey={copiedKey} copy={copy} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Docs Components ──────────────────────────────────────────────────────────

function MethodBadge({ method }) {
  const colors = {
    POST:   'bg-green-100 text-green-700 border-green-200',
    GET:    'bg-blue-100 text-blue-700 border-blue-200',
    PUT:    'bg-amber-100 text-amber-700 border-amber-200',
    PATCH:  'bg-purple-100 text-purple-700 border-purple-200',
    DELETE: 'bg-red-100 text-red-700 border-red-200',
  }
  return (
    <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border flex-shrink-0 ${colors[method] || 'bg-gray-100 text-gray-600'}`}>
      {method}
    </span>
  )
}

function JsonBlock({ code }) {
  const { copiedKey, copy } = useCopy()
  return (
    <div className="relative group">
      <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 text-xs font-mono overflow-x-auto leading-relaxed whitespace-pre-wrap">{code}</pre>
      <button onClick={() => copy(code, 'block')}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-200 px-2 py-1 rounded">
        <Copy size={10} /> {copiedKey === 'block' ? 'Tersalin!' : 'Salin'}
      </button>
    </div>
  )
}

function FieldTable({ fields }) {
  return (
    <div className="border border-gray-100 rounded-lg overflow-hidden">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-100">
            <th className="text-left px-3 py-2 font-semibold text-gray-500 w-36">Field</th>
            <th className="text-left px-3 py-2 font-semibold text-gray-500 w-24">Tipe</th>
            <th className="text-left px-3 py-2 font-semibold text-gray-500 w-20">Status</th>
            <th className="text-left px-3 py-2 font-semibold text-gray-500">Keterangan</th>
          </tr>
        </thead>
        <tbody>
          {fields.map((f, i) => (
            <tr key={i} className="border-t border-gray-50">
              <td className="px-3 py-2 font-mono text-primary font-medium">{f.name}</td>
              <td className="px-3 py-2 text-gray-400 font-mono">{f.type}</td>
              <td className="px-3 py-2">
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  f.required ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-400'
                }`}>
                  {f.required ? 'Wajib' : 'Opsional'}
                </span>
              </td>
              <td className="px-3 py-2 text-gray-600 leading-relaxed">{f.desc}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function QueryParamTable({ params }) {
  return (
    <div className="border border-gray-100 rounded-lg overflow-hidden">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-100">
            <th className="text-left px-3 py-2 font-semibold text-gray-500 w-32">Parameter</th>
            <th className="text-left px-3 py-2 font-semibold text-gray-500 w-24">Default</th>
            <th className="text-left px-3 py-2 font-semibold text-gray-500">Keterangan</th>
          </tr>
        </thead>
        <tbody>
          {params.map((p, i) => (
            <tr key={i} className="border-t border-gray-50">
              <td className="px-3 py-2 font-mono text-primary font-medium">{p.name}</td>
              <td className="px-3 py-2 text-gray-400 font-mono">{p.default}</td>
              <td className="px-3 py-2 text-gray-600">{p.desc}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Endpoint({ method, path, title, description, auth = true, permission, fields, queryParams, request, response, notes, errorCodes }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors text-left">
        <MethodBadge method={method} />
        <code className="text-sm text-gray-800 font-mono flex-1">{path}</code>
        <span className="text-xs text-gray-400 hidden sm:block mr-2">{title}</span>
        {open ? <ChevronDown size={15} className="text-gray-400 flex-shrink-0" /> : <ChevronRight size={15} className="text-gray-400 flex-shrink-0" />}
      </button>

      {open && (
        <div className="border-t border-gray-100 divide-y divide-gray-50">
          <div className="px-5 py-4 space-y-1">
            <p className="text-sm font-semibold text-gray-800">{title}</p>
            <p className="text-xs text-gray-500 leading-relaxed">{description}</p>
          </div>

          {auth ? (
            <div className="px-5 py-3 bg-amber-50">
              <p className="text-xs text-amber-700">
                🔐 <span className="font-semibold">Autentikasi wajib:</span>{' '}
                <code className="font-mono bg-amber-100 px-1.5 py-0.5 rounded">Authorization: Bearer &lt;token&gt;</code>
                {permission && <span className="ml-2 text-amber-600">— Hak akses: <code className="font-mono bg-amber-100 px-1 rounded">{permission}</code></span>}
              </p>
            </div>
          ) : (
            <div className="px-5 py-3 bg-gray-50">
              <p className="text-xs text-gray-500">🔓 <span className="font-semibold">Publik</span> — Tidak memerlukan token JWT.</p>
            </div>
          )}

          {notes && (
            <div className="px-5 py-3 bg-blue-50">
              <div className="flex gap-2">
                <Info size={13} className="text-blue-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700 leading-relaxed">{notes}</p>
              </div>
            </div>
          )}

          {queryParams && (
            <div className="px-5 py-4 space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Query Parameters</p>
              <QueryParamTable params={queryParams} />
            </div>
          )}

          {fields && (
            <div className="px-5 py-4 space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Request Body</p>
              <FieldTable fields={fields} />
            </div>
          )}

          {request && (
            <div className="px-5 py-4 space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Contoh Request Body</p>
              <JsonBlock code={request} />
            </div>
          )}

          <div className="px-5 py-4 space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Contoh Response Sukses</p>
            <JsonBlock code={response} />
          </div>

          {errorCodes && (
            <div className="px-5 py-4 space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Kemungkinan Error</p>
              <div className="border border-gray-100 rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="text-left px-3 py-2 font-semibold text-gray-500 w-16">Kode</th>
                      <th className="text-left px-3 py-2 font-semibold text-gray-500">Penyebab</th>
                    </tr>
                  </thead>
                  <tbody>
                    {errorCodes.map((e, i) => (
                      <tr key={i} className="border-t border-gray-50">
                        <td className="px-3 py-2 font-mono font-bold text-red-600">{e.code}</td>
                        <td className="px-3 py-2 text-gray-600">{e.desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Section({ id, title, children }) {
  return (
    <div id={id} className="space-y-2 scroll-mt-4">
      <h3 className="text-sm font-semibold text-gray-600 px-1 mt-2 pt-2 border-t border-gray-100">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ApiDocs() {
  const { token } = useAuthStore()
  const { copiedKey, copy } = useCopy()

  return (
    <DashboardLayout title="Panduan Penggunaan API">
      <div className="space-y-6 max-w-4xl">

        {/* ── Overview Card ── */}
        <div className="card space-y-5">

          {/* Base URL */}
          <div>
            <h2 className="text-sm font-semibold text-gray-700 mb-2">Base URL</h2>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-sm font-mono bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-primary">
                {API}
              </code>
              <button onClick={() => copy(API, 'baseurl')}
                className="btn-secondary text-xs px-3 py-2 flex-shrink-0 flex items-center gap-1">
                <Copy size={12} /> {copiedKey === 'baseurl' ? 'Tersalin!' : 'Salin'}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1.5">Semua endpoint di bawah ini diawali dengan base URL di atas.</p>
          </div>

          {/* Auth header */}
          <div>
            <h2 className="text-sm font-semibold text-gray-700 mb-2">Format Header Autentikasi</h2>
            <JsonBlock code={`Content-Type: application/json\nAuthorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`} />
            <p className="text-xs text-gray-400 mt-1.5">Token JWT diperoleh dari endpoint <code className="font-mono bg-gray-100 px-1 rounded">POST /api/auth/login</code>. Token berlaku selama <strong>7 hari</strong>.</p>
          </div>

          {/* Response format */}
          <div>
            <h2 className="text-sm font-semibold text-gray-700 mb-2">Format Response</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-gray-500 mb-1.5">✅ Response Sukses</p>
                <JsonBlock code={`{
  "status": "success",
  "data": { ... },
  "pagination": {          // hanya pada list
    "total": 150,
    "page": 1,
    "limit": 20
  }
}`} />
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1.5">❌ Response Error</p>
                <JsonBlock code={`{
  "status": "error",
  "message": "Pesan error",
  "errors": [            // hanya pada validasi
    {
      "field": "email",
      "message": "Invalid email"
    }
  ]
}`} />
              </div>
            </div>
          </div>

          {/* HTTP Status Codes */}
          <div>
            <h2 className="text-sm font-semibold text-gray-700 mb-2">HTTP Status Code</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              {[
                { code: '200', label: 'OK', desc: 'Request berhasil' },
                { code: '201', label: 'Created', desc: 'Data berhasil dibuat' },
                { code: '400', label: 'Bad Request', desc: 'Validasi gagal / input salah' },
                { code: '401', label: 'Unauthorized', desc: 'Token tidak ada atau kadaluarsa' },
                { code: '403', label: 'Forbidden', desc: 'Tidak punya hak akses' },
                { code: '404', label: 'Not Found', desc: 'Data tidak ditemukan' },
                { code: '500', label: 'Server Error', desc: 'Kesalahan internal server' },
              ].map(s => (
                <div key={s.code} className="flex items-start gap-2 bg-gray-50 rounded-lg p-2">
                  <span className={`font-mono font-bold flex-shrink-0 ${
                    s.code.startsWith('2') ? 'text-green-600' :
                    s.code.startsWith('4') ? 'text-amber-600' : 'text-red-600'
                  }`}>{s.code}</span>
                  <div>
                    <div className="font-medium text-gray-700">{s.label}</div>
                    <div className="text-gray-400">{s.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Roles */}
          <div>
            <h2 className="text-sm font-semibold text-gray-700 mb-2">Role &amp; Hak Akses</h2>
            <div className="border border-gray-100 rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {['Role', 'Tokenisasi', 'PII Types', 'Audit Log', 'Pengaturan', 'User Mgmt'].map(h => (
                      <th key={h} className="text-left px-3 py-2 font-semibold text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { role: 'Admin',         color: 'text-red-600',    token: 'execute, read', pii: 'CRUD', audit: 'read', settings: 'read, update', users: 'CRUD' },
                    { role: 'Operator',      color: 'text-blue-600',   token: 'execute, read', pii: 'read', audit: '—',    settings: '—',            users: '—' },
                    { role: 'Auditor',       color: 'text-amber-600',  token: 'read',          pii: 'read', audit: 'read', settings: 'read',          users: 'read' },
                    { role: 'Data Consumer', color: 'text-gray-600',   token: 'read',          pii: 'read', audit: '—',    settings: '—',             users: '—' },
                  ].map(r => (
                    <tr key={r.role} className="border-t border-gray-50">
                      <td className={`px-3 py-2 font-semibold ${r.color}`}>{r.role}</td>
                      <td className="px-3 py-2 text-gray-600">{r.token}</td>
                      <td className="px-3 py-2 text-gray-600">{r.pii}</td>
                      <td className="px-3 py-2 text-gray-600">{r.audit}</td>
                      <td className="px-3 py-2 text-gray-600">{r.settings}</td>
                      <td className="px-3 py-2 text-gray-600">{r.users}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Workflow */}
          <div>
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Alur Penggunaan API (Quickstart)</h2>
            <div className="grid grid-cols-5 gap-2">
              {[
                { step: '1', title: 'Login',      desc: 'POST /auth/login → ambil token JWT' },
                { step: '2', title: 'Salin ID',   desc: 'Salin rule_id dari tabel Referensi di bawah' },
                { step: '3', title: 'Tokenisasi', desc: 'POST /tokenization/tokenize dengan rule_id' },
                { step: '4', title: 'Cek Hasil',  desc: 'GET /tokenization/results untuk lihat histori' },
                { step: '5', title: 'Detokenisasi', desc: 'POST /tokenization/detokenize untuk kembalikan nilai asli' },
              ].map(s => (
                <div key={s.step} className="bg-gray-50 rounded-xl p-3 text-center">
                  <div className="w-7 h-7 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center mx-auto mb-2">{s.step}</div>
                  <p className="text-xs font-semibold text-gray-700 mb-1">{s.title}</p>
                  <p className="text-xs text-gray-400 leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Live Reference */}
        {token && <LiveRefPanel token={token} />}

        {/* ── 1. Auth ── */}
        <Section id="auth" title="🔑 1. Autentikasi">
          <Endpoint
            method="POST" path="/api/auth/login"
            title="Login — Dapatkan Token JWT"
            description="Langkah pertama sebelum menggunakan API lainnya. Kirim email dan password, sistem mengembalikan token JWT beserta data user dan daftar permissions."
            auth={false}
            fields={[
              { name: 'email',    type: 'string', required: true, desc: 'Email akun yang terdaftar. Default admin: admin@system.id' },
              { name: 'password', type: 'string', required: true, desc: 'Password akun. Min. 6 karakter. Default admin: Admin@12345' },
            ]}
            request={`{
  "email":    "admin@system.id",
  "password": "Admin@12345"
}`}
            response={`{
  "status": "success",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id":          "550e8400-e29b-41d4-a716-446655440000",
      "full_name":   "System Administrator",
      "email":       "admin@system.id",
      "role":        "Admin",
      "permissions": [
        { "module": "tokenization", "action": "execute" },
        { "module": "tokenization", "action": "read" },
        { "module": "users",        "action": "create" }
      ]
    }
  }
}`}
            notes='Simpan nilai "token" dari response dan sertakan di header Authorization setiap request berikutnya. Token berlaku 7 hari. Field "permissions" menentukan aksi apa saja yang boleh dilakukan user ini.'
            errorCodes={[
              { code: '400', desc: 'Format email/password tidak valid (panjang kurang dari minimum)' },
              { code: '401', desc: 'Email tidak ditemukan atau password salah' },
              { code: '403', desc: 'Akun dalam status nonaktif (diblokir oleh admin)' },
            ]}
          />
          <Endpoint
            method="POST" path="/api/auth/logout"
            title="Logout — Catat sesi keluar"
            description="Mencatat aktivitas logout ke audit log. Token tidak di-blacklist di server (stateless JWT), sehingga penghapusan token di sisi klien adalah tanggung jawab aplikasi."
            permission="(semua role)"
            response={`{
  "status":  "success",
  "message": "Logout berhasil"
}`}
          />
          <Endpoint
            method="GET" path="/api/auth/profile"
            title="Get Profile — Cek identitas token aktif"
            description="Memverifikasi bahwa token JWT masih valid dan mengembalikan data lengkap user yang sedang login termasuk daftar permissions."
            permission="(semua role)"
            response={`{
  "status": "success",
  "data": {
    "id":          "550e8400-e29b-41d4-a716-446655440000",
    "full_name":   "System Administrator",
    "email":       "admin@system.id",
    "role":        "Admin",
    "status":      "active",
    "last_login":  "2026-05-15T10:00:00.000Z",
    "permissions": [
      { "module": "tokenization", "action": "execute" }
    ]
  }
}`}
          />
        </Section>

        {/* ── 2. Tokenization ── */}
        <Section id="tokenization" title="🔐 2. Tokenisasi">
          <Endpoint
            method="POST" path="/api/tokenization/tokenize"
            title="Single Tokenisasi — Tokenisasi satu nilai PII"
            description="Endpoint utama untuk tokenisasi satu nilai PII. Gunakan rule_id dari tabel Referensi ID Sistem di atas — rule sudah berisi konfigurasi lengkap (PII type, metode, tweak)."
            permission="tokenization: execute"
            fields={[
              { name: 'rule_id',     type: 'UUID',    required: false, desc: 'ID rule tokenisasi (DIREKOMENDASIKAN). Salin dari tab "Tokenization Rules". Jika diisi, pii_type_id & method_id diabaikan.' },
              { name: 'pii_type_id', type: 'UUID',    required: false, desc: 'ID jenis PII. Wajib jika rule_id tidak diisi. Salin dari tab "PII Types".' },
              { name: 'method_id',   type: 'UUID',    required: false, desc: 'ID metode tokenisasi. Wajib jika rule_id tidak diisi.' },
              { name: 'value',       type: 'string',  required: true,  desc: 'Nilai PII yang akan ditokenisasi. Harus sesuai format PII type. Contoh NIK: "3276011203990001" (16 digit).' },
              { name: 'save_result', type: 'boolean', required: false, desc: 'true = simpan ke database (dapat dilihat di GET /results). false = hanya return tanpa menyimpan. Default: false.' },
            ]}
            request={`{
  "rule_id":     "<salin dari tab Tokenization Rules>",
  "pii_type_id": "<salin dari tab PII Types>",
  "method_id":   "<salin dari tab Methods>",
  "value":       "3276011203990001",
  "save_result": true
}`}
            response={`{
  "status": "success",
  "data": {
    "tokenized_value":    "3276018A4C7F9001",
    "method_used":        "Full FPE FF1",
    "tweak_used":         "a3f8d2c1-9b4e-41d2-b6c3-5e7f2a1d8c4b",
    "processing_time_ms": 11,
    "length_preserved":   true
  }
}`}
            errorCodes={[
              { code: '400', desc: 'rule_id, pii_type_id, atau method_id tidak ditemukan' },
              { code: '400', desc: 'Format nilai tidak sesuai validasi PII type (regex / panjang)' },
              { code: '403', desc: 'Role tidak memiliki hak akses tokenization:execute' },
            ]}
          />

          <Endpoint
            method="POST" path="/api/tokenization/batch"
            title="Batch Tokenisasi — Tokenisasi banyak nilai sekaligus (maks. 1000)"
            description="Memproses banyak nilai PII dalam satu request menggunakan satu rule yang sama. Cocok untuk migrasi data atau pemrosesan massal. Item yang gagal tidak menghentikan item lainnya."
            permission="tokenization: execute"
            fields={[
              { name: 'job_name',           type: 'string', required: true,  desc: 'Nama label untuk batch job ini. Bebas diisi. Contoh: "Batch NIK Nasabah Mei 2026".' },
              { name: 'rule_id',            type: 'UUID',   required: true,  desc: 'ID rule untuk semua data dalam batch. Salin dari tab "Tokenization Rules".' },
              { name: 'data',               type: 'array',  required: true,  desc: 'Array objek nilai PII. Min. 1, maks. 1000 item.' },
              { name: 'data[].pii_type_id', type: 'UUID',   required: true,  desc: 'ID jenis PII setiap item.' },
              { name: 'data[].value',       type: 'string', required: true,  desc: 'Nilai PII yang akan ditokenisasi.' },
            ]}
            request={`{
  "job_name": "Batch NIK Nasabah Mei 2026",
  "rule_id":  "<salin dari tab Tokenization Rules>",
  "data": [
    { "pii_type_id": "<salin dari tab PII Types>", "value": "3276011203990001" },
    { "pii_type_id": "<salin dari tab PII Types>", "value": "3276011203990002" },
    { "pii_type_id": "<salin dari tab PII Types>", "value": "3276011203990003" }
  ]
}`}
            response={`{
  "status": "success",
  "data": {
    "job_id":  "e1f2a3b4-c5d6-7890-ef12-345678901234",
    "total":   3,
    "success": 3,
    "failed":  0,
    "results": [
      { "original": "3276011203990001", "tokenized": "3276018A4C7F9001", "status": "success" },
      { "original": "3276011203990002", "tokenized": "3276013D2B8E9002", "status": "success" },
      { "original": "3276011203990003", "tokenized": "3276015C6A1F9003", "status": "success" }
    ]
  }
}`}
          />

          <Endpoint
            method="POST" path="/api/tokenization/detokenize"
            title="Detokenisasi — Kembalikan nilai asli dari token"
            description="Proses kebalikan tokenisasi. Mengambil tokenized_value dan result_id dari database untuk mengembalikan nilai PII asli. Hanya berlaku untuk token yang tersimpan di database (save_result: true)."
            permission="tokenization: execute"
            fields={[
              { name: 'result_id',       type: 'UUID',   required: true,  desc: 'ID hasil tokenisasi dari GET /tokenization/results. Digunakan untuk mencari token di database.' },
              { name: 'tokenized_value', type: 'string', required: false, desc: 'Nilai token yang ingin di-detokenisasi. Opsional jika result_id sudah diisi.' },
            ]}
            request={`{
  "result_id":       "f1a2b3c4-d5e6-7890-f012-345678901234",
  "tokenized_value": "3276018A4C7F9001"
}`}
            response={`{
  "status": "success",
  "data": {
    "original_value":  "3276011203990001",
    "tokenized_value": "3276018A4C7F9001",
    "pii_type":        "NIK",
    "rule_used":       "NIK - Full FPE FF1"
  }
}`}
            errorCodes={[
              { code: '404', desc: 'result_id tidak ditemukan di database' },
              { code: '403', desc: 'Role tidak memiliki hak akses tokenization:execute' },
            ]}
          />

          <Endpoint
            method="GET" path="/api/tokenization/results"
            title="Hasil Tokenisasi — Daftar hasil yang tersimpan"
            description="Mengambil riwayat hasil tokenisasi yang telah disimpan (save_result: true atau dari batch job)."
            permission="tokenization: read"
            queryParams={[
              { name: 'page',   default: '1',  desc: 'Nomor halaman untuk pagination.' },
              { name: 'limit',  default: '20', desc: 'Jumlah data per halaman. Maks. 100.' },
              { name: 'job_id', default: '—',  desc: 'UUID job untuk filter hasil dari satu batch job tertentu. Opsional.' },
            ]}
            response={`{
  "status": "success",
  "data": [
    {
      "id":                 "f1a2b3c4-d5e6-7890-f012-345678901234",
      "tokenized_value":    "3276018A4C7F9001",
      "processing_time_ms": 11,
      "status":             "success",
      "created_at":         "2026-05-15T10:35:21.000Z",
      "job":  { "job_name": "Batch NIK Nasabah Mei 2026" },
      "rule": { "rule_name": "NIK - Full FPE FF1" }
    }
  ],
  "pagination": { "total": 150, "page": 1, "limit": 20 }
}`}
          />

          <Endpoint
            method="GET" path="/api/tokenization/stats"
            title="Statistik — Ringkasan total operasi"
            description="Mengembalikan ringkasan statistik seluruh operasi tokenisasi di sistem."
            permission="tokenization: read"
            response={`{
  "status": "success",
  "data": {
    "total_tokenizations":  1500,
    "success_count":        1485,
    "failed_count":         15,
    "success_rate":         "99.0",
    "total_jobs":           12,
    "avg_processing_time_ms": 11
  }
}`}
          />
        </Section>

        {/* ── 3. Master Data ── */}
        <Section id="master" title="📋 3. Master Data (Referensi)">
          <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700 leading-relaxed">
            <Info size={13} className="inline mr-1" />
            Gunakan tabel <strong>Referensi ID Sistem</strong> di atas untuk menyalin ID secara langsung. Endpoint GET berikut bisa dipanggil secara programatik. Semua endpoint CRUD (POST/PUT/DELETE) memerlukan hak akses <code className="font-mono bg-blue-100 px-1 rounded">pii_types: create/update/delete</code>.
          </div>

          <Endpoint
            method="GET" path="/api/pii-types"
            title="Daftar PII Types"
            description="Mengembalikan daftar jenis data PII yang terdaftar di sistem beserta UUID, kategori, dan validasi."
            permission="pii_types: read"
            queryParams={[
              { name: 'page',   default: '1',  desc: 'Nomor halaman.' },
              { name: 'limit',  default: '20', desc: 'Jumlah data per halaman.' },
              { name: 'search', default: '—',  desc: 'Cari berdasarkan nama PII type.' },
            ]}
            response={`{
  "status": "success",
  "data": [
    {
      "id":               "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "name":             "NIK",
      "category":         "Identitas",
      "validation_regex": "^\\\\d{16}$",
      "min_length":       16,
      "max_length":       16,
      "example_value":    "3276011203990001",
      "is_active":        true,
      "created_at":       "2026-01-01T00:00:00.000Z"
    }
  ],
  "pagination": { "total": 8, "page": 1, "limit": 20 }
}`}
          />

          <Endpoint
            method="POST" path="/api/pii-types"
            title="Tambah PII Type Baru"
            description="Mendaftarkan jenis data PII baru ke dalam sistem."
            permission="pii_types: create"
            fields={[
              { name: 'name',             type: 'string',  required: true,  desc: 'Nama jenis PII. Contoh: "Nomor SIM", "BPJS".' },
              { name: 'category',         type: 'string',  required: false, desc: 'Kategori. Contoh: "Identitas", "Finansial", "Kontak".' },
              { name: 'validation_regex', type: 'string',  required: false, desc: 'Regex validasi format nilai. Contoh: "^\\\\d{16}$" untuk 16 digit angka.' },
              { name: 'min_length',       type: 'integer', required: false, desc: 'Panjang minimum nilai PII.' },
              { name: 'max_length',       type: 'integer', required: false, desc: 'Panjang maksimum nilai PII.' },
              { name: 'example_value',    type: 'string',  required: false, desc: 'Contoh nilai untuk dokumentasi. Contoh: "3276011203990001".' },
            ]}
            request={`{
  "name":             "Nomor SIM",
  "category":         "Identitas",
  "validation_regex": "^[A-Z0-9]{12,14}$",
  "min_length":       12,
  "max_length":       14,
  "example_value":    "A123456789012"
}`}
            response={`{
  "status": "success",
  "data": {
    "id":       "newuuid-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "name":     "Nomor SIM",
    "category": "Identitas",
    "is_active": true
  }
}`}
          />

          <Endpoint
            method="PUT" path="/api/pii-types/:id"
            title="Update PII Type"
            description="Memperbarui data PII type. Sertakan hanya field yang ingin diubah."
            permission="pii_types: update"
            fields={[
              { name: 'name',             type: 'string',  required: false, desc: 'Nama baru PII type.' },
              { name: 'category',         type: 'string',  required: false, desc: 'Kategori baru.' },
              { name: 'validation_regex', type: 'string',  required: false, desc: 'Regex validasi baru.' },
              { name: 'is_active',        type: 'boolean', required: false, desc: 'true = aktif, false = nonaktif.' },
            ]}
            request={`{
  "is_active": false
}`}
            response={`{
  "status": "success",
  "data": { "id": "...", "name": "NIK", "is_active": false }
}`}
          />

          <Endpoint
            method="DELETE" path="/api/pii-types/:id"
            title="Hapus PII Type"
            description="Menghapus PII type dari sistem. Tidak dapat dihapus jika masih direferensikan oleh tokenization rule."
            permission="pii_types: delete"
            response={`{
  "status":  "success",
  "message": "Data berhasil dihapus"
}`}
            errorCodes={[
              { code: '404', desc: 'PII type dengan ID tersebut tidak ditemukan' },
              { code: '400', desc: 'PII type masih digunakan oleh tokenization rule aktif' },
            ]}
          />

          <Endpoint
            method="GET" path="/api/tokenization-methods"
            title="Daftar Metode Tokenisasi"
            description="Mengembalikan daftar algoritma tokenisasi yang tersedia."
            permission="pii_types: read"
            response={`{
  "status": "success",
  "data": [
    {
      "id":               "c3d4e5f6-a7b8-9012-cdef-123456789012",
      "method_name":      "Full FPE FF1",
      "description":      "Format-Preserving Encryption menggunakan algoritma FF1",
      "supports_prefix":  false,
      "supports_suffix":  false,
      "supports_tweak":   true,
      "is_deterministic": true,
      "is_active":        true
    }
  ]
}`}
          />

          <Endpoint
            method="GET" path="/api/tweaks"
            title="Daftar Tweaks"
            description="Tweak adalah parameter tambahan dalam FPE yang mempengaruhi hasil tokenisasi. Tweak sudah terintegrasi dalam setiap rule."
            permission="pii_types: read"
            queryParams={[
              { name: 'page',  default: '1',  desc: 'Nomor halaman.' },
              { name: 'limit', default: '20', desc: 'Jumlah per halaman.' },
            ]}
            response={`{
  "status": "success",
  "data": [
    {
      "id":           "b8c9d0e1-f2a3-4567-1234-678901234567",
      "tweak_name":   "Static Tweak Default",
      "tweak_type":   "STATIC",
      "tweak_value":  "TOKENSYSTEM2024",
      "tweak_length": 15,
      "is_active":    true,
      "description":  "Tweak statis — hasil token selalu sama untuk input yang sama"
    }
  ]
}`}
            notes='Tipe tweak: STATIC (nilai tetap), DYNAMIC (berdasarkan timestamp), RANDOMIZED (acak setiap tokenisasi), USER_BASED (unik per user).'
          />

          <Endpoint
            method="GET" path="/api/tokenization-rules"
            title="Daftar Tokenization Rules"
            description='Mengembalikan daftar rule tokenisasi lengkap. Rule sudah berisi konfigurasi PII type + metode + tweak. Gunakan "id" sebagai rule_id pada endpoint tokenisasi.'
            permission="pii_types: read"
            queryParams={[
              { name: 'page',   default: '1',  desc: 'Nomor halaman.' },
              { name: 'limit',  default: '20', desc: 'Jumlah per halaman.' },
              { name: 'search', default: '—',  desc: 'Cari berdasarkan nama rule.' },
            ]}
            response={`{
  "status": "success",
  "data": [
    {
      "id":              "f6a7b8c9-d0e1-2345-f012-456789012345",
      "rule_name":       "NIK - Full FPE FF1",
      "preserve_prefix": 0,
      "preserve_suffix": 0,
      "preserve_domain": false,
      "maintain_length": true,
      "is_active":       true,
      "pii_type": { "id": "...", "name": "NIK" },
      "method":   { "id": "...", "method_name": "Full FPE FF1" },
      "tweak":    { "id": "...", "tweak_name": "Static Tweak Default" }
    }
  ],
  "pagination": { "total": 13, "page": 1, "limit": 20 }
}`}
          />

          <Endpoint
            method="POST" path="/api/tokenization-rules"
            title="Tambah Tokenization Rule"
            description="Membuat konfigurasi rule tokenisasi baru dengan menggabungkan PII type, metode, dan tweak."
            permission="pii_types: create"
            fields={[
              { name: 'rule_name',       type: 'string',  required: true,  desc: 'Nama rule. Contoh: "NIK - Partial FPE (8 Prefix)".' },
              { name: 'pii_type_id',     type: 'UUID',    required: false, desc: 'ID PII type dari GET /pii-types.' },
              { name: 'method_id',       type: 'UUID',    required: false, desc: 'ID metode dari GET /tokenization-methods.' },
              { name: 'tweak_id',        type: 'UUID',    required: false, desc: 'ID tweak dari GET /tweaks.' },
              { name: 'preserve_prefix', type: 'integer', required: false, desc: 'Jumlah karakter awal yang tidak diubah. Default: 0.' },
              { name: 'preserve_suffix', type: 'integer', required: false, desc: 'Jumlah karakter akhir yang tidak diubah. Default: 0.' },
              { name: 'maintain_length', type: 'boolean', required: false, desc: 'true = panjang token sama dengan nilai asli. Default: true.' },
            ]}
            request={`{
  "rule_name":       "NIK - Partial FPE (8 Prefix)",
  "pii_type_id":     "<id dari GET /pii-types>",
  "method_id":       "<id dari GET /tokenization-methods>",
  "tweak_id":        "<id dari GET /tweaks>",
  "preserve_prefix": 8,
  "preserve_suffix": 0,
  "maintain_length": true
}`}
            response={`{
  "status": "success",
  "data": {
    "id":        "newruleid-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "rule_name": "NIK - Partial FPE (8 Prefix)",
    "is_active": true
  }
}`}
          />
        </Section>

        {/* ── 4. Users ── */}
        <Section id="users" title="👥 4. Manajemen Pengguna">
          <Endpoint
            method="GET" path="/api/users"
            title="Daftar Pengguna"
            description="Mengambil daftar semua pengguna sistem beserta role dan informasi login terakhir."
            permission="users: read"
            queryParams={[
              { name: 'page',   default: '1',   desc: 'Nomor halaman.' },
              { name: 'limit',  default: '50',  desc: 'Jumlah per halaman.' },
              { name: 'search', default: '—',   desc: 'Cari berdasarkan nama atau email.' },
            ]}
            response={`{
  "status": "success",
  "data": [
    {
      "id":         "550e8400-e29b-41d4-a716-446655440000",
      "full_name":  "System Administrator",
      "email":      "admin@system.id",
      "status":     "active",
      "last_login": "2026-05-15T10:00:00.000Z",
      "created_at": "2026-01-01T00:00:00.000Z",
      "role": { "id": "...", "role_name": "Admin" }
    }
  ],
  "pagination": { "total": 4, "page": 1, "limit": 50 }
}`}
            notes='Field password_hash tidak pernah disertakan dalam response API manapun.'
          />

          <Endpoint
            method="POST" path="/api/users"
            title="Tambah Pengguna Baru"
            description="Membuat akun pengguna baru. Password otomatis di-hash dengan bcrypt (salt 12) sebelum disimpan ke database."
            permission="users: create"
            fields={[
              { name: 'full_name', type: 'string', required: true,  desc: 'Nama lengkap pengguna.' },
              { name: 'email',     type: 'string', required: true,  desc: 'Email unik. Akan digunakan untuk login.' },
              { name: 'password',  type: 'string', required: true,  desc: 'Password awal. Min. 8 karakter. Akan di-hash bcrypt.' },
              { name: 'role',      type: 'string', required: false, desc: 'Nama role: "Admin", "Operator", "Auditor", atau "Data Consumer". Default: "Data Consumer".' },
            ]}
            request={`{
  "full_name": "Budi Santoso",
  "email":     "budi@bank.id",
  "password":  "Rahasia@123",
  "role":      "Operator"
}`}
            response={`{
  "status": "success",
  "data": {
    "id":        "newuserid-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "full_name": "Budi Santoso",
    "email":     "budi@bank.id",
    "status":    "active",
    "role":      { "role_name": "Operator" }
  }
}`}
            errorCodes={[
              { code: '400', desc: 'Email sudah terdaftar di sistem' },
              { code: '400', desc: 'full_name, email, atau password tidak diisi' },
            ]}
          />

          <Endpoint
            method="PUT" path="/api/users/:id"
            title="Update Data Pengguna"
            description="Memperbarui data pengguna termasuk email, nama, role, dan/atau password. Sertakan hanya field yang ingin diubah. Jika password diisi, akan di-hash ulang dengan bcrypt."
            permission="users: update"
            fields={[
              { name: 'full_name', type: 'string', required: false, desc: 'Nama baru pengguna.' },
              { name: 'email',     type: 'string', required: false, desc: 'Email baru. Harus unik.' },
              { name: 'password',  type: 'string', required: false, desc: 'Password baru. Kosongkan jika tidak ingin mengubah. Akan di-hash bcrypt.' },
              { name: 'role',      type: 'string', required: false, desc: 'Role baru: "Admin", "Operator", "Auditor", atau "Data Consumer".' },
              { name: 'status',    type: 'string', required: false, desc: '"active" atau "inactive".' },
            ]}
            request={`{
  "email":    "budi.baru@bank.id",
  "password": "PasswordBaru@456",
  "role":     "Auditor"
}`}
            response={`{
  "status": "success",
  "data": {
    "id":        "...",
    "full_name": "Budi Santoso",
    "email":     "budi.baru@bank.id",
    "status":    "active",
    "role":      { "role_name": "Auditor" }
  }
}`}
            notes='Setelah email atau password diubah, user yang bersangkutan perlu login ulang karena token JWT lama masih mengacu pada email/data lama.'
            errorCodes={[
              { code: '404', desc: 'User dengan ID tersebut tidak ditemukan' },
              { code: '400', desc: 'Email baru sudah digunakan akun lain' },
            ]}
          />

          <Endpoint
            method="PATCH" path="/api/users/:id/status"
            title="Toggle Status Aktif/Nonaktif"
            description="Mengaktifkan atau menonaktifkan akun pengguna secara toggle. Tidak dapat diterapkan pada akun sendiri."
            permission="users: update"
            response={`{
  "status": "success",
  "data": {
    "id":       "...",
    "full_name":"Budi Santoso",
    "status":   "inactive",
    "role":     { "role_name": "Operator" }
  }
}`}
            errorCodes={[
              { code: '400', desc: 'Tidak dapat menonaktifkan akun sendiri yang sedang login' },
              { code: '404', desc: 'User dengan ID tersebut tidak ditemukan' },
            ]}
          />

          <Endpoint
            method="DELETE" path="/api/users/:id"
            title="Hapus Pengguna"
            description="Menghapus akun pengguna secara permanen. Tidak dapat menghapus akun sendiri."
            permission="users: delete"
            response={`{
  "status":  "success",
  "message": "User berhasil dihapus"
}`}
            errorCodes={[
              { code: '400', desc: 'Tidak dapat menghapus akun yang sedang digunakan untuk login' },
              { code: '404', desc: 'User dengan ID tersebut tidak ditemukan' },
            ]}
          />
        </Section>

        {/* ── 5. Audit Log ── */}
        <Section id="audit" title="📝 5. Audit Log">
          <Endpoint
            method="GET" path="/api/audit-logs"
            title="Daftar Audit Log"
            description="Mengambil riwayat seluruh aktivitas sistem dengan filter dan pagination. Setiap aksi (login, tokenisasi, CRUD, logout) tercatat otomatis."
            permission="audit_logs: read"
            queryParams={[
              { name: 'page',        default: '1',  desc: 'Nomor halaman.' },
              { name: 'limit',       default: '50', desc: 'Jumlah per halaman. Maks. 200.' },
              { name: 'module_name', default: '—',  desc: 'Filter modul: auth, tokenization, users, pii_types, tweaks, rules, audit_logs, settings.' },
              { name: 'activity',    default: '—',  desc: 'Filter aktivitas: login, logout, login_failed, tokenize, detokenize, create, update, delete, activate, deactivate.' },
              { name: 'user_id',     default: '—',  desc: 'Filter berdasarkan UUID user tertentu.' },
              { name: 'search',      default: '—',  desc: 'Cari di kolom description.' },
            ]}
            response={`{
  "status": "success",
  "data": [
    {
      "id":          "log-uuid-xxxx",
      "module_name": "auth",
      "activity":    "login",
      "description": "Login berhasil sebagai Admin",
      "ip_address":  "172.18.0.1",
      "created_at":  "2026-05-15T10:00:00.000Z",
      "user": {
        "full_name": "System Administrator",
        "email":     "admin@system.id"
      }
    }
  ],
  "pagination":     { "total": 320, "page": 1, "limit": 50 },
  "retention_days": 30
}`}
          />

          <Endpoint
            method="POST" path="/api/audit-logs/write"
            title="Tulis Audit Log (Frontend)"
            description="Endpoint khusus untuk mencatat aktivitas yang terjadi di sisi frontend, seperti perubahan rule, toggle status, atau aksi UI lainnya yang tidak melalui API terpisah."
            permission="(semua role yang sudah login)"
            fields={[
              { name: 'module_name', type: 'string', required: true,  desc: 'Modul yang terpengaruh. Contoh: "tweaks", "rules", "users", "settings".' },
              { name: 'activity',    type: 'string', required: true,  desc: 'Jenis aktivitas. Contoh: "create", "update", "delete", "activate", "deactivate".' },
              { name: 'description', type: 'string', required: false, desc: 'Deskripsi detail aktivitas. Contoh: "Tweak Dynamic Timestamp dinonaktifkan".' },
            ]}
            request={`{
  "module_name": "tweaks",
  "activity":    "deactivate",
  "description": "Tweak \\"Dynamic Timestamp\\" dinonaktifkan"
}`}
            response={`{
  "status": "success"
}`}
          />

          <Endpoint
            method="POST" path="/api/audit-logs/archive"
            title="Arsipkan Log Lama"
            description="Memindahkan semua log yang lebih tua dari 30 hari ke file .log di server (backend/logs/archives/audit_YYYY-MM-DD.log) dan menghapusnya dari database. Proses archival juga berjalan otomatis setiap hari pukul 00:05."
            permission="users: create (Admin only)"
            response={`{
  "status": "success",
  "data": {
    "archived": 150,
    "file":     "audit_2026-05-15.log"
  }
}`}
            notes='Jika tidak ada log yang lebih tua dari 30 hari, "archived" akan bernilai 0 dan tidak ada file yang dibuat. Proses ini tidak dapat dibatalkan — pastikan data sudah di-backup sebelum menjalankan.'
          />

          <Endpoint
            method="GET" path="/api/audit-logs/archives"
            title="Daftar File Arsip"
            description="Mengembalikan daftar file .log yang sudah diarsipkan di server."
            permission="audit_logs: read"
            response={`{
  "status": "success",
  "data": [
    {
      "filename":   "audit_2026-04-15.log",
      "size_bytes": 204800,
      "created_at": "2026-04-15T00:05:00.000Z"
    }
  ]
}`}
          />
        </Section>

        {/* ── 6. Settings ── */}
        <Section id="settings" title="⚙️ 6. Pengaturan Sistem">
          <Endpoint
            method="GET" path="/api/settings"
            title="Daftar Pengaturan"
            description="Mengambil semua pengaturan sistem seperti kunci FPE, batas batch, retensi audit log, dll."
            permission="settings: read"
            response={`{
  "status": "success",
  "data": [
    {
      "id":            "setting-uuid-xxxx",
      "setting_key":   "fpe_key",
      "setting_value": "AES256DEFAULTKEY...",
      "description":   "AES Key untuk FPE (ganti di production)",
      "updated_at":    "2026-05-01T00:00:00.000Z"
    },
    { "setting_key": "max_batch_size",       "setting_value": "1000",  "description": "Max record per batch job" },
    { "setting_key": "token_expiry_days",    "setting_value": "365",   "description": "Masa berlaku token dalam hari" },
    { "setting_key": "audit_retention_days", "setting_value": "30",    "description": "Retensi audit log dalam hari" },
    { "setting_key": "app_version",          "setting_value": "1.0.0", "description": "Versi aplikasi" }
  ]
}`}
          />

          <Endpoint
            method="PUT" path="/api/settings/:id"
            title="Update Pengaturan"
            description="Memperbarui nilai satu pengaturan sistem berdasarkan UUID-nya."
            permission="settings: update"
            fields={[
              { name: 'setting_value', type: 'string', required: true, desc: 'Nilai baru pengaturan. Untuk fpe_key: string AES 32 karakter. Untuk angka: string numerik.' },
            ]}
            request={`{
  "setting_value": "30"
}`}
            response={`{
  "status": "success",
  "data": {
    "id":            "setting-uuid-xxxx",
    "setting_key":   "audit_retention_days",
    "setting_value": "30"
  }
}`}
            notes='Perubahan fpe_key akan menyebabkan token lama tidak dapat di-detokenisasi. Ubah hanya jika benar-benar diperlukan dan semua token yang ada sudah diarsipkan.'
          />
        </Section>

        {/* ── 7. Code Examples ── */}
        <Section id="examples" title="💡 7. Contoh Kode Lengkap (Copy-Paste Ready)">
          <div className="card space-y-5">
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-1">cURL — Login lalu Tokenisasi NIK</p>
              <p className="text-xs text-gray-400 mb-2">Jalankan satu per satu di terminal. Ganti nilai dalam tanda kurung sudut dengan ID dari tabel Referensi di atas.</p>
              <JsonBlock code={`# Langkah 1: Login dan ambil token
curl -X POST ${API}/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"email":"admin@system.id","password":"Admin@12345"}'

# Salin nilai "token" dari response lalu isi TOKEN di bawah.

# Langkah 2: Tokenisasi NIK menggunakan rule_id
curl -X POST ${API}/tokenization/tokenize \\
  -H "Authorization: Bearer <TOKEN>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "rule_id":     "<salin dari tabel Referensi — tab Tokenization Rules>",
    "pii_type_id": "<salin dari tabel Referensi — tab PII Types>",
    "method_id":   "<salin dari tabel Referensi — tab Methods>",
    "value":       "3276011203990001",
    "save_result": true
  }'

# Langkah 3: Lihat hasil
curl -X GET "${API}/tokenization/results?page=1&limit=10" \\
  -H "Authorization: Bearer <TOKEN>"`} />
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-600 mb-1">cURL — Batch Tokenisasi</p>
              <JsonBlock code={`curl -X POST ${API}/tokenization/batch \\
  -H "Authorization: Bearer <TOKEN>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "job_name": "Batch NIK Nasabah Mei 2026",
    "rule_id":  "<rule_id>",
    "data": [
      { "pii_type_id": "<pii_type_id>", "value": "3276011203990001" },
      { "pii_type_id": "<pii_type_id>", "value": "3276011203990002" }
    ]
  }'`} />
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-600 mb-1">JavaScript (fetch) — Alur lengkap otomatis</p>
              <p className="text-xs text-gray-400 mb-2">Mengambil rule_id secara otomatis berdasarkan nama rule, tanpa perlu menyalin UUID secara manual.</p>
              <JsonBlock code={`const BASE = '${API}'

async function tokenizeNIK(nikValue) {
  // 1. Login
  const loginRes = await fetch(\`\${BASE}/auth/login\`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@system.id', password: 'Admin@12345' })
  }).then(r => r.json())
  const token = loginRes.data.token
  const headers = { Authorization: \`Bearer \${token}\`, 'Content-Type': 'application/json' }

  // 2. Ambil rule "NIK - Full FPE FF1"
  const rulesRes = await fetch(\`\${BASE}/tokenization-rules?limit=100\`, { headers }).then(r => r.json())
  const rule = rulesRes.data.find(r => r.rule_name === 'NIK - Full FPE FF1')
  if (!rule) throw new Error('Rule tidak ditemukan')

  // 3. Ambil PII type "NIK"
  const piiRes = await fetch(\`\${BASE}/pii-types?limit=100\`, { headers }).then(r => r.json())
  const nikType = piiRes.data.find(p => p.name === 'NIK')

  // 4. Tokenisasi
  const result = await fetch(\`\${BASE}/tokenization/tokenize\`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      rule_id:     rule.id,
      pii_type_id: nikType.id,
      method_id:   rule.method?.id,
      value:       nikValue,
      save_result: true
    })
  }).then(r => r.json())

  console.log('Token:', result.data.tokenized_value)
  return result.data.tokenized_value
}

tokenizeNIK('3276011203990001')`} />
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-600 mb-1">Python (requests) — Tokenisasi dan Detokenisasi</p>
              <JsonBlock code={`import requests

BASE = '${API}'

# 1. Login
login = requests.post(f'{BASE}/auth/login', json={
    'email': 'admin@system.id',
    'password': 'Admin@12345'
}).json()
token = login['data']['token']
headers = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}

# 2. Ambil rule_id
rules = requests.get(f'{BASE}/tokenization-rules?limit=100', headers=headers).json()
rule  = next(r for r in rules['data'] if r['rule_name'] == 'NIK - Full FPE FF1')

# 3. Ambil pii_type_id
piis     = requests.get(f'{BASE}/pii-types?limit=100', headers=headers).json()
nik_type = next(p for p in piis['data'] if p['name'] == 'NIK')

# 4. Tokenisasi
tok = requests.post(f'{BASE}/tokenization/tokenize', headers=headers, json={
    'rule_id':     rule['id'],
    'pii_type_id': nik_type['id'],
    'method_id':   rule['method']['id'],
    'value':       '3276011203990001',
    'save_result': True
}).json()
print('Token:', tok['data']['tokenized_value'])

# 5. Ambil result_id dari daftar hasil
results   = requests.get(f'{BASE}/tokenization/results?limit=1', headers=headers).json()
result_id = results['data'][0]['id']

# 6. Detokenisasi
detok = requests.post(f'{BASE}/tokenization/detokenize', headers=headers, json={
    'result_id': result_id
}).json()
print('Nilai asli:', detok['data']['original_value'])`} />
            </div>
          </div>
        </Section>

      </div>
    </DashboardLayout>
  )
}
