import { useState, useEffect } from 'react'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { useAuthStore } from '../../store/auth.store'
import { Copy, ChevronDown, ChevronRight, Info, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react'

const BASE_URL = 'http://localhost:5000'
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

function CopyBtn({ text, id, copiedKey, copy, short = false }) {
  const ok = copiedKey === id
  return (
    <button
      onClick={() => copy(text, id)}
      title="Salin"
      className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded transition-colors flex-shrink-0
        ${ok ? 'bg-green-100 text-green-700' : 'bg-gray-100 hover:bg-gray-200 text-gray-500'}`}
    >
      {ok ? <CheckCircle size={10} /> : <Copy size={10} />}
      {ok ? 'Disalin!' : (short ? 'Salin' : 'Salin ID')}
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
    setLoading(true)
    setError(null)
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
    } finally {
      setLoading(false)
    }
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
          <p className="text-xs text-gray-400 mt-0.5">Data langsung dari database. Salin ID yang dibutuhkan untuk request tokenisasi.</p>
        </div>
        <button
          onClick={fetchAll}
          disabled={loading}
          className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Memuat...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          <AlertCircle size={13} /> {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-100">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`text-xs px-3 py-2 font-medium border-b-2 transition-colors -mb-px ${
              tab === t.key
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            {t.label}
            {data[t.key] && (
              <span className="ml-1.5 text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
                {data[t.key].length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Table content */}
      {loading && !data[tab] && (
        <div className="text-center py-8 text-xs text-gray-400">Memuat data dari database...</div>
      )}

      {tab === 'rules' && data.rules && (
        <RulesTable rows={data.rules} copiedKey={copiedKey} copy={copy} />
      )}
      {tab === 'piiTypes' && data.piiTypes && (
        <SimpleTable
          rows={data.piiTypes}
          cols={[
            { key: 'name',          label: 'Nama' },
            { key: 'category',      label: 'Kategori' },
            { key: 'example_value', label: 'Contoh Nilai' },
            { key: 'is_active',     label: 'Status', render: v => v ? <span className="text-green-600 font-medium">Aktif</span> : <span className="text-gray-400">Nonaktif</span> },
          ]}
          copiedKey={copiedKey} copy={copy}
        />
      )}
      {tab === 'methods' && data.methods && (
        <SimpleTable
          rows={data.methods}
          cols={[
            { key: 'method_name',      label: 'Nama Metode' },
            { key: 'supports_tweak',   label: 'Tweak', render: v => v ? '✓' : '–' },
            { key: 'is_deterministic', label: 'Deterministik', render: v => v ? '✓' : '–' },
            { key: 'is_active',        label: 'Status', render: v => v ? <span className="text-green-600 font-medium">Aktif</span> : <span className="text-gray-400">Nonaktif</span> },
          ]}
          copiedKey={copiedKey} copy={copy}
        />
      )}
      {tab === 'tweaks' && data.tweaks && (
        <SimpleTable
          rows={data.tweaks}
          cols={[
            { key: 'tweak_name',  label: 'Nama Tweak' },
            { key: 'tweak_type',  label: 'Tipe' },
            { key: 'tweak_value', label: 'Nilai', render: v => v || <span className="text-gray-300">—</span> },
            { key: 'tweak_length',label: 'Panjang' },
          ]}
          copiedKey={copiedKey} copy={copy}
        />
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
            <th className="text-left px-3 py-2 font-semibold text-gray-500">Nama Rule</th>
            <th className="text-left px-3 py-2 font-semibold text-gray-500">PII Type</th>
            <th className="text-left px-3 py-2 font-semibold text-gray-500">Metode</th>
            <th className="text-left px-3 py-2 font-semibold text-gray-500">Prefix/Suffix</th>
            <th className="text-left px-3 py-2 font-semibold text-gray-500">Rule ID (untuk tokenize)</th>
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
                  ? `${r.preserve_prefix} prefix, ${r.preserve_suffix} suffix`
                  : 'Full'}
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
            {cols.map(c => (
              <th key={c.key} className="text-left px-3 py-2 font-semibold text-gray-500">{c.label}</th>
            ))}
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
      <button
        onClick={() => copy(code, 'block')}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-200 px-2 py-1 rounded"
      >
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
            <th className="text-left px-3 py-2 font-semibold text-gray-500 w-20">Tipe</th>
            <th className="text-left px-3 py-2 font-semibold text-gray-500 w-20">Wajib</th>
            <th className="text-left px-3 py-2 font-semibold text-gray-500">Keterangan</th>
          </tr>
        </thead>
        <tbody>
          {fields.map((f, i) => (
            <tr key={i} className="border-t border-gray-50">
              <td className="px-3 py-2 font-mono text-primary font-medium">{f.name}</td>
              <td className="px-3 py-2 text-gray-400">{f.type}</td>
              <td className="px-3 py-2">
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${f.required ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-400'}`}>
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
            <th className="text-left px-3 py-2 font-semibold text-gray-500 w-20">Default</th>
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

function Endpoint({ method, path, title, description, auth = true, fields, queryParams, request, response, notes }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors text-left"
      >
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

          {auth && (
            <div className="px-5 py-3 bg-amber-50">
              <p className="text-xs text-amber-700">
                🔐 <span className="font-semibold">Header wajib:</span>{' '}
                <code className="font-mono bg-amber-100 px-1.5 py-0.5 rounded">Authorization: Bearer &lt;token&gt;</code>
                {' '}— Token JWT dari endpoint login.
              </p>
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
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Request Body — Penjelasan Field</p>
              <FieldTable fields={fields} />
            </div>
          )}

          {request && (
            <div className="px-5 py-4 space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Contoh Request Body (JSON)</p>
              <JsonBlock code={request} />
            </div>
          )}

          <div className="px-5 py-4 space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Contoh Response</p>
            <JsonBlock code={response} />
          </div>
        </div>
      )}
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-gray-600 px-1 mt-2">{title}</h3>
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

        {/* Overview */}
        <div className="card space-y-5">
          <div>
            <h2 className="text-sm font-semibold text-gray-700 mb-2">Base URL</h2>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-sm font-mono bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-primary">
                {BASE_URL}/api
              </code>
              <button
                onClick={() => copy(BASE_URL + '/api', 'baseurl')}
                className="btn-secondary text-xs px-3 py-2 flex-shrink-0 flex items-center gap-1"
              >
                <Copy size={12} /> {copiedKey === 'baseurl' ? 'Tersalin!' : 'Salin'}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1.5">Semua endpoint di bawah ini diawali dengan base URL di atas.</p>
          </div>

          {/* Workflow */}
          <div>
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Alur Penggunaan API</h2>
            <div className="grid grid-cols-4 gap-3">
              {[
                { step: '1', title: 'Login', desc: 'POST /api/auth/login untuk mendapatkan token JWT' },
                { step: '2', title: 'Salin ID', desc: 'Lihat tabel "Referensi ID Sistem" di bawah, salin rule_id yang dibutuhkan' },
                { step: '3', title: 'Tokenisasi', desc: 'POST /api/tokenization/tokenize dengan rule_id yang sudah disalin' },
                { step: '4', title: 'Cek Hasil', desc: 'GET /api/tokenization/results untuk melihat hasil yang tersimpan' },
              ].map(s => (
                <div key={s.step} className="bg-gray-50 rounded-xl p-3 text-center">
                  <div className="w-7 h-7 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center mx-auto mb-2">{s.step}</div>
                  <p className="text-xs font-semibold text-gray-700 mb-1">{s.title}</p>
                  <p className="text-xs text-gray-400 leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-gray-700 mb-2">Format Header</h2>
            <JsonBlock code={`Content-Type: application/json\nAuthorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`} />
          </div>
        </div>

        {/* Live Reference */}
        {token && <LiveRefPanel token={token} />}

        {/* Auth */}
        <Section title="🔑 1. Autentikasi">
          <Endpoint
            method="POST"
            path="/api/auth/login"
            title="Login — Dapatkan Token JWT"
            description="Langkah pertama sebelum menggunakan API lainnya. Kirim email dan password, sistem akan mengembalikan token JWT. Token ini harus disertakan di header setiap request berikutnya."
            auth={false}
            fields={[
              { name: 'email',    type: 'string', required: true,  desc: 'Email akun yang terdaftar di sistem. Default admin: admin@system.id' },
              { name: 'password', type: 'string', required: true,  desc: 'Password akun. Default admin: Admin@12345' },
            ]}
            request={`{
  "email": "admin@system.id",
  "password": "Admin@12345"
}`}
            response={`{
  "status": "success",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEyMzQiLCJyb2xlIjoiQWRtaW4ifQ.xxx",
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "full_name": "System Administrator",
      "email": "admin@system.id",
      "role": "Admin"
    }
  }
}`}
            notes='Simpan nilai "token" dari response. Token ini akan dipakai sebagai nilai Bearer di header Authorization untuk semua request selanjutnya. Token berlaku selama 7 hari.'
          />
          <Endpoint
            method="GET"
            path="/api/auth/profile"
            title="Get Profile — Cek identitas token aktif"
            description="Gunakan endpoint ini untuk memverifikasi bahwa token JWT Anda masih valid dan melihat data user yang sedang login."
            response={`{
  "status": "success",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "full_name": "System Administrator",
    "email": "admin@system.id",
    "role": { "role_name": "Admin" },
    "status": "active"
  }
}`}
          />
        </Section>

        {/* Master Data */}
        <Section title="📋 2. Endpoint Referensi (GET)">
          <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700 leading-relaxed">
            <Info size={13} className="inline mr-1" />
            Endpoint ini mengembalikan data yang sama dengan tabel <strong>Referensi ID Sistem</strong> di atas. Gunakan tabel di atas untuk menyalin ID secara langsung, atau panggil endpoint ini secara programatik dari aplikasi Anda.
          </div>

          <Endpoint
            method="GET"
            path="/api/pii-types"
            title="Daftar PII Types"
            description='Mengembalikan daftar jenis data PII beserta UUID-nya. Salin nilai "id" dari jenis PII yang ingin Anda tokenisasi, lalu gunakan sebagai nilai pii_type_id saat tokenisasi.'
            response={`{
  "status": "success",
  "data": [
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "name": "NIK",
      "category": "Identitas",
      "validation_regex": "^\\d{16}$",
      "min_length": 16,
      "max_length": 16,
      "example_value": "3276011203990001",
      "is_active": true
    }
  ]
}`}
          />

          <Endpoint
            method="GET"
            path="/api/tokenization-methods"
            title="Daftar Metode FPE"
            description='Mengembalikan daftar metode tokenisasi yang tersedia beserta UUID-nya.'
            response={`{
  "status": "success",
  "data": [
    {
      "id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
      "method_name": "Full FPE FF1",
      "description": "Format-Preserving Encryption FF1",
      "supports_tweak": true,
      "is_deterministic": true,
      "is_active": true
    }
  ]
}`}
          />

          <Endpoint
            method="GET"
            path="/api/tokenization-rules"
            title="Daftar Rules Tokenisasi"
            description='Mengembalikan daftar rule tokenisasi lengkap. Setiap rule sudah mengandung konfigurasi PII type + metode + tweak. Gunakan "id" rule sebagai rule_id pada endpoint tokenisasi.'
            queryParams={[
              { name: 'page',  default: '1',  desc: 'Nomor halaman.' },
              { name: 'limit', default: '20', desc: 'Jumlah data per halaman.' },
            ]}
            response={`{
  "status": "success",
  "data": [
    {
      "id": "f6a7b8c9-d0e1-2345-f012-456789012345",
      "rule_name": "NIK - Full FPE FF1",
      "pii_type": { "name": "NIK" },
      "method": { "method_name": "Full FPE FF1" },
      "tweak": { "tweak_name": "Static Tweak Default" },
      "preserve_prefix": 0,
      "preserve_suffix": 0,
      "maintain_length": true,
      "is_active": true
    }
  ]
}`}
          />

          <Endpoint
            method="GET"
            path="/api/tweaks"
            title="Daftar Tweaks"
            description="Tweak adalah parameter tambahan dalam FPE yang mempengaruhi hasil tokenisasi. Tweak sudah terintegrasi dalam setiap rule."
            response={`{
  "status": "success",
  "data": [
    {
      "id": "b8c9d0e1-f2a3-4567-1234-678901234567",
      "tweak_name": "Static Tweak Default",
      "tweak_type": "STATIC",
      "tweak_value": "TOKENSYSTEM2024",
      "tweak_length": 15,
      "description": "Tweak statis, hasil token selalu sama untuk input yang sama"
    }
  ]
}`}
          />
        </Section>

        {/* Tokenization */}
        <Section title="🔐 3. Tokenisasi">
          <Endpoint
            method="POST"
            path="/api/tokenization/tokenize"
            title="Single Tokenisasi — Tokenisasi satu nilai PII"
            description="Endpoint utama untuk melakukan tokenisasi. Gunakan rule_id dari tabel Referensi ID Sistem di atas. Rule sudah mengandung konfigurasi lengkap sehingga Anda tidak perlu mengisi pii_type_id dan method_id secara terpisah."
            fields={[
              { name: 'pii_type_id', type: 'UUID string', required: true,  desc: 'ID jenis PII. Salin dari tab "PII Types" pada tabel Referensi di atas.' },
              { name: 'method_id',   type: 'UUID string', required: true,  desc: 'ID metode tokenisasi. Salin dari tab "Methods" pada tabel Referensi. Diabaikan jika rule_id diisi.' },
              { name: 'rule_id',     type: 'UUID string', required: false, desc: 'ID rule tokenisasi. Salin dari tab "Tokenization Rules" pada tabel Referensi di atas. DIREKOMENDASIKAN — jika diisi, pii_type_id dan method_id diabaikan.' },
              { name: 'value',       type: 'string',      required: true,  desc: 'Nilai PII yang akan ditokenisasi. Harus sesuai format PII type yang dipilih. Contoh untuk NIK: "3276011203990001" (16 digit angka).' },
              { name: 'save_result', type: 'boolean',     required: false, desc: 'true = hasil disimpan ke database dan bisa dilihat via GET /api/tokenization/results. false = hanya return token tanpa menyimpan. Default: false.' },
            ]}
            request={`{
  "pii_type_id": "<salin dari tab PII Types>",
  "method_id":   "<salin dari tab Methods>",
  "rule_id":     "<salin dari tab Tokenization Rules>",
  "value":       "3276011203990001",
  "save_result": true
}`}
            response={`{
  "status": "success",
  "data": {
    "tokenized_value": "3276018A4C7F9001",
    "method_used": "Full FPE FF1",
    "tweak_used": "a3f8d2c1-9b4e-41d2-b6c3-5e7f2a1d8c4b",
    "processing_time_ms": 11,
    "length_preserved": true
  }
}`}
            notes='Gunakan rule_id dari tabel Referensi ID Sistem di atas. Klik tombol "Salin ID" pada baris rule yang diinginkan, lalu tempel ke field rule_id.'
          />

          <Endpoint
            method="POST"
            path="/api/tokenization/batch"
            title="Batch Tokenisasi — Tokenisasi banyak nilai sekaligus (maks. 1000)"
            description="Memproses banyak nilai PII dalam satu request menggunakan satu rule yang sama. Cocok untuk migrasi data atau pemrosesan massal."
            fields={[
              { name: 'job_name',         type: 'string',      required: true, desc: 'Label untuk batch job ini. Bebas diisi. Contoh: "Batch NIK Nasabah Mei 2026".' },
              { name: 'rule_id',          type: 'UUID string', required: true, desc: 'ID rule untuk semua data dalam batch. Salin dari tab "Tokenization Rules" pada tabel Referensi di atas.' },
              { name: 'data',             type: 'array',       required: true, desc: 'Array nilai PII yang akan ditokenisasi. Min. 1, maks. 1000 item.' },
              { name: 'data[].pii_type_id', type: 'UUID string', required: true, desc: 'ID jenis PII untuk setiap item. Salin dari tab "PII Types" pada tabel Referensi.' },
              { name: 'data[].value',     type: 'string',      required: true, desc: 'Nilai PII yang akan ditokenisasi.' },
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
    "job_id": "e1f2a3b4-c5d6-7890-ef12-345678901234",
    "total": 3,
    "success": 3,
    "failed": 0,
    "results": [
      { "original": "3276011203990001", "tokenized": "3276018A4C7F9001", "status": "success" },
      { "original": "3276011203990002", "tokenized": "3276013D2B8E9002", "status": "success" },
      { "original": "3276011203990003", "tokenized": "3276015C6A1F9003", "status": "success" }
    ]
  }
}`}
            notes='Semua data dalam satu batch menggunakan rule yang sama. Item yang gagal (format tidak sesuai) berstatus "failed" namun tidak menghentikan pemrosesan item lainnya.'
          />

          <Endpoint
            method="GET"
            path="/api/tokenization/results"
            title="Hasil Tokenisasi — Daftar hasil yang tersimpan"
            description="Mengambil daftar hasil tokenisasi yang telah disimpan (save_result: true atau dari batch job)."
            queryParams={[
              { name: 'page',   default: '1',  desc: 'Nomor halaman untuk pagination.' },
              { name: 'limit',  default: '20', desc: 'Jumlah data per halaman. Maks. 100.' },
              { name: 'job_id', default: '—',  desc: 'UUID job untuk filter hasil dari satu batch job tertentu. Opsional.' },
            ]}
            response={`{
  "status": "success",
  "data": [
    {
      "id": "f1a2b3c4-d5e6-7890-f012-345678901234",
      "tokenized_value": "3276018A4C7F9001",
      "processing_time_ms": 11,
      "status": "success",
      "created_at": "2026-05-09T10:35:21.000Z",
      "job": { "job_name": "Batch NIK Nasabah Mei 2026" },
      "rule": { "rule_name": "NIK - Full FPE FF1" }
    }
  ],
  "pagination": { "total": 150, "page": 1, "limit": 20 }
}`}
          />

          <Endpoint
            method="GET"
            path="/api/tokenization/stats"
            title="Statistik — Ringkasan total operasi tokenisasi"
            description="Ringkasan statistik seluruh operasi tokenisasi di sistem."
            response={`{
  "status": "success",
  "data": {
    "total_tokenizations": 1500,
    "success_count": 1485,
    "failed_count": 15,
    "success_rate": "99.0",
    "total_jobs": 12,
    "avg_processing_time_ms": 11
  }
}`}
          />
        </Section>

        {/* Code Examples */}
        <Section title="💡 4. Contoh Kode Lengkap (Copy-Paste Ready)">
          <div className="card space-y-5">
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-1">cURL — Login lalu Tokenisasi NIK</p>
              <p className="text-xs text-gray-400 mb-2">Jalankan satu per satu di terminal. Ganti TOKEN dan UUID dengan nilai dari tabel Referensi ID Sistem di atas.</p>
              <JsonBlock code={`# Langkah 1: Login dan ambil token
curl -X POST http://localhost:5000/api/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"email":"admin@system.id","password":"Admin@12345"}'

# Salin nilai "token" dari response, lalu gunakan di bawah.

# Langkah 2: Tokenisasi menggunakan rule_id dari tabel Referensi di halaman ini
curl -X POST http://localhost:5000/api/tokenization/tokenize \\
  -H "Authorization: Bearer <TOKEN_DARI_LANGKAH_1>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "pii_type_id": "<salin dari tab PII Types>",
    "method_id":   "<salin dari tab Methods>",
    "rule_id":     "<salin dari tab Tokenization Rules>",
    "value":       "3276011203990001",
    "save_result": true
  }'`} />
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-600 mb-1">JavaScript (fetch) — Alur lengkap otomatis</p>
              <p className="text-xs text-gray-400 mb-2">Contoh kode JavaScript yang mengambil rule_id secara otomatis berdasarkan nama rule.</p>
              <JsonBlock code={`const BASE = 'http://localhost:5000/api'

async function tokenizeNIK(nikValue) {
  // 1. Login
  const { data: loginData } = await fetch(\`\${BASE}/auth/login\`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@system.id', password: 'Admin@12345' })
  }).then(r => r.json())

  const token = loginData.token
  const headers = { 'Authorization': \`Bearer \${token}\`, 'Content-Type': 'application/json' }

  // 2. Cari rule "NIK - Full FPE FF1" dan ambil ID-nya
  const { data: rules } = await fetch(\`\${BASE}/tokenization-rules\`, { headers }).then(r => r.json())
  const rule = rules.find(r => r.rule_name === 'NIK - Full FPE FF1')

  // 3. Cari pii_type "NIK" dan ambil ID-nya
  const { data: piiTypes } = await fetch(\`\${BASE}/pii-types\`, { headers }).then(r => r.json())
  const nikType = piiTypes.find(p => p.name === 'NIK')

  // 4. Tokenisasi
  const { data: result } = await fetch(\`\${BASE}/tokenization/tokenize\`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      pii_type_id: nikType.id,
      method_id:   rule.method?.id,
      rule_id:     rule.id,
      value:       nikValue,
      save_result: true
    })
  }).then(r => r.json())

  console.log('Token:', result.tokenized_value)
  return result.tokenized_value
}

tokenizeNIK('3276011203990001')`} />
            </div>
          </div>
        </Section>

      </div>
    </DashboardLayout>
  )
}
