import { useState } from 'react'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { useResultsStore } from '../../store/results.store'
import { Eye, EyeOff, Copy, Unlock, Search } from 'lucide-react'

function fmtTime(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ' ' + new Date(d).toLocaleTimeString('id-ID')
}

export default function Detokenisasi() {
  const { results, detokenize } = useResultsStore()
  const [search, setSearch]         = useState('')
  const [modalItem, setModalItem]   = useState(null)
  const [processing, setProcessing] = useState(null)
  const [revealed, setRevealed]     = useState({})

  const filtered = results.filter(r =>
    r.name?.toLowerCase().includes(search.toLowerCase()) ||
    r.pii?.toLowerCase().includes(search.toLowerCase()) ||
    r.token?.toLowerCase().includes(search.toLowerCase())
  )

  const handleDetokenize = (item) => {
    setModalItem(item)
  }

  const confirmDetokenize = () => {
    if (!modalItem) return
    setProcessing(modalItem.id)
    setTimeout(() => {
      detokenize(modalItem.id)
      setRevealed(r => ({ ...r, [modalItem.id]: true }))
      setProcessing(null)
      setModalItem(null)
    }, 800)
  }

  const toggleReveal = (id) => {
    setRevealed(r => ({ ...r, [id]: !r[id] }))
  }

  const copy = (text) => navigator.clipboard.writeText(text)

  return (
    <DashboardLayout title="Detokenisasi">
      <div className="space-y-5">

        {/* Info banner */}
        <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700 leading-relaxed">
          <span className="font-semibold">ℹ Tentang Detokenisasi:</span>{' '}
          Proses ini memulihkan nilai asli dari token yang tersimpan menggunakan kunci FPE yang sama.
          Hanya pengguna dengan hak akses yang dapat melakukan detokenisasi.
        </div>

        {/* Search */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="input-field pl-9"
              placeholder="Cari nama demo, jenis data, atau token..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <span className="text-xs text-gray-400">{filtered.length} data</span>
        </div>

        {/* Table */}
        <div className="card overflow-x-auto">
          {results.length === 0 ? (
            <div className="text-center py-16 text-gray-300 text-sm">
              Belum ada data tersimpan.<br />
              Simpan hasil tokenisasi dari menu <span className="font-medium">Demo</span> terlebih dahulu.
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-10 text-gray-300 text-sm">Tidak ada hasil yang cocok.</div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="table-header">
                  <th className="w-8">No</th>
                  <th>Nama Demo</th>
                  <th>Jenis Data</th>
                  <th>Nilai Token</th>
                  <th>Nilai Asli</th>
                  <th>Metode Tokenisasi</th>
                  <th>Aturan / Konfigurasi</th>
                  <th>Status</th>
                  <th>Dibuat Pada</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item, i) => {
                  const isDetokenized = item.detokenized || revealed[item.id]
                  const isVisible     = revealed[item.id]
                  const isLoading     = processing === item.id
                  return (
                    <tr key={item.id} className="table-row">
                      <td className="text-gray-400 text-center">{i + 1}</td>
                      <td className="font-medium text-gray-800">{item.name || `Demo ${item.pii}`}</td>
                      <td className="text-gray-600">{item.pii}</td>

                      {/* Nilai Token */}
                      <td>
                        <div className="flex items-center gap-1.5">
                          <code className="font-mono text-primary bg-primary-light px-1.5 py-0.5 rounded">{item.token}</code>
                          <button onClick={() => copy(item.token)} className="text-gray-300 hover:text-primary transition-colors">
                            <Copy size={11} />
                          </button>
                        </div>
                      </td>

                      {/* Nilai Asli — tersembunyi sampai detokenisasi */}
                      <td>
                        {isDetokenized ? (
                          <div className="flex items-center gap-1.5">
                            <code className={`font-mono text-green-700 bg-green-50 px-1.5 py-0.5 rounded transition-all ${isVisible ? '' : 'blur-sm select-none'}`}>
                              {item.original}
                            </code>
                            <button onClick={() => toggleReveal(item.id)} className="text-gray-300 hover:text-primary transition-colors">
                              {isVisible ? <EyeOff size={12} /> : <Eye size={12} />}
                            </button>
                            {isVisible && (
                              <button onClick={() => copy(item.original)} className="text-gray-300 hover:text-primary transition-colors">
                                <Copy size={12} />
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="font-mono text-gray-300 tracking-widest">{'•'.repeat(Math.min(item.original?.length || 8, 12))}</span>
                        )}
                      </td>

                      <td className="text-gray-600">{item.method}</td>

                      <td>
                        <span className="inline-block bg-primary-light text-primary text-xs font-medium px-2 py-0.5 rounded-full">
                          {item.rule?.replace(item.pii + ' - ', '') || item.rule}
                        </span>
                      </td>

                      <td>
                        <span className="inline-flex items-center gap-1 text-green-700 bg-green-50 border border-green-200 text-xs px-2 py-0.5 rounded-full font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                          Berhasil
                        </span>
                      </td>

                      <td className="text-gray-400 whitespace-nowrap">{fmtTime(item.savedAt)}</td>

                      <td>
                        <div className="flex items-center gap-1.5">
                          {isDetokenized ? (
                            <button
                              onClick={() => toggleReveal(item.id)}
                              className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg border border-green-200 text-green-700 bg-green-50 hover:bg-green-100 transition-colors"
                            >
                              {isVisible ? <EyeOff size={11} /> : <Eye size={11} />}
                              {isVisible ? 'Sembunyikan' : 'Tampilkan'}
                            </button>
                          ) : (
                            <button
                              onClick={() => handleDetokenize(item)}
                              disabled={isLoading}
                              className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg border border-primary text-primary hover:bg-primary-light transition-colors disabled:opacity-50"
                            >
                              {isLoading
                                ? <><span className="w-3 h-3 border border-primary border-t-transparent rounded-full animate-spin" /> Proses...</>
                                : <><Unlock size={11} /> Detokenisasi</>}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Konfirmasi Modal */}
      {modalItem && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-primary-light flex items-center justify-center">
                <Unlock size={18} className="text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 text-sm">Konfirmasi Detokenisasi</h3>
                <p className="text-xs text-gray-400">Proses ini akan memulihkan nilai asli</p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 mb-5 space-y-2.5 text-xs">
              {[
                ['Nama Demo',   modalItem.name || `Demo ${modalItem.pii}`],
                ['Jenis Data',  modalItem.pii],
                ['Metode',      modalItem.method],
                ['Token',       modalItem.token],
                ['Aturan',      modalItem.rule],
              ].map(([k, v]) => (
                <div key={k} className="flex items-start justify-between gap-3">
                  <span className="text-gray-400 flex-shrink-0">{k}</span>
                  <span className="font-medium text-gray-700 text-right font-mono">{v}</span>
                </div>
              ))}
            </div>

            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mb-5">
              ⚠ Pastikan Anda memiliki otorisasi untuk mengakses nilai asli data ini.
            </p>

            <div className="flex gap-2 justify-end">
              <button onClick={() => setModalItem(null)} className="btn-secondary px-4 py-2 text-sm">Batal</button>
              <button onClick={confirmDetokenize} className="btn-primary px-4 py-2 text-sm">
                <Unlock size={13} /> Detokenisasi Sekarang
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
