import { useState, useEffect, useCallback } from 'react'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { tokenizationApi } from '../../api'
import { Eye, EyeOff, Copy, Unlock, Search, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react'

function fmtTime(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ' ' + new Date(d).toLocaleTimeString('id-ID')
}

export default function Detokenisasi() {
  const [results, setResults]       = useState([])
  const [total, setTotal]           = useState(0)
  const [page, setPage]             = useState(1)
  const [loading, setLoading]       = useState(false)
  const [search, setSearch]         = useState('')
  const [modalItem, setModalItem]   = useState(null)
  const [processing, setProcessing] = useState(null)
  const [detokError, setDetokError] = useState(null)
  const [revealed, setRevealed]     = useState({}) // { [id]: { original_value, pii_type, visible } }
  const limit = 20

  const fetchResults = useCallback(async () => {
    setLoading(true)
    try {
      const res = await tokenizationApi.results({ page, limit })
      setResults(res.data.data)
      setTotal(res.data.pagination.total)
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [page])

  useEffect(() => { fetchResults() }, [fetchResults])

  const totalPages = Math.ceil(total / limit)

  const filtered = results.filter(r =>
    r.tokenized_value?.toLowerCase().includes(search.toLowerCase()) ||
    r.rule?.rule_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.job?.job_name?.toLowerCase().includes(search.toLowerCase())
  )

  const confirmDetokenize = async () => {
    if (!modalItem) return
    setProcessing(modalItem.id)
    setDetokError(null)
    try {
      const res = await tokenizationApi.detokenize({ result_id: modalItem.id })
      const { original_value, pii_type } = res.data.data
      setRevealed(r => ({ ...r, [modalItem.id]: { original_value, pii_type, visible: true } }))
    } catch (e) {
      setDetokError(e?.response?.data?.message || 'Detokenisasi gagal')
    } finally {
      setProcessing(null)
      setModalItem(null)
    }
  }

  const toggleReveal = (id) => {
    setRevealed(r => ({ ...r, [id]: { ...r[id], visible: !r[id]?.visible } }))
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

        {detokError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">{detokError}</div>
        )}

        {/* Search + Refresh */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="input-field pl-9"
              placeholder="Cari token, aturan, atau nama job..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <span className="text-xs text-gray-400">{filtered.length} data</span>
          <button onClick={fetchResults} disabled={loading}
            className="flex items-center gap-1.5 btn-secondary px-3 py-1.5 text-xs">
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>

        {/* Table */}
        <div className="card overflow-x-auto">
          {loading && results.length === 0 ? (
            <div className="text-center py-16 text-gray-400 text-sm">
              <div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full mx-auto mb-3" />
              Memuat data...
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-16 text-gray-300 text-sm">
              Belum ada data tokenisasi tersimpan.<br />
              Lakukan tokenisasi melalui API atau menu Demo dengan <code className="font-mono">save_result: true</code>.
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-10 text-gray-300 text-sm">Tidak ada hasil yang cocok.</div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="table-header">
                  <th className="w-8">No</th>
                  <th>Aturan</th>
                  <th>Job</th>
                  <th>Nilai Token</th>
                  <th>Nilai Asli</th>
                  <th>Jenis Data</th>
                  <th>Status</th>
                  <th>Dibuat Pada</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item, i) => {
                  const det = revealed[item.id]
                  const isDetokenized = !!det
                  const isVisible = det?.visible
                  const isLoading = processing === item.id
                  return (
                    <tr key={item.id} className="table-row">
                      <td className="text-gray-400 text-center">{(page - 1) * limit + i + 1}</td>

                      <td>
                        <span className="inline-block bg-primary-light text-primary text-xs font-medium px-2 py-0.5 rounded-full">
                          {item.rule?.rule_name || '—'}
                        </span>
                      </td>

                      <td className="text-gray-500">{item.job?.job_name || '—'}</td>

                      {/* Nilai Token */}
                      <td>
                        <div className="flex items-center gap-1.5">
                          <code className="font-mono text-primary bg-primary-light px-1.5 py-0.5 rounded">{item.tokenized_value}</code>
                          <button onClick={() => copy(item.tokenized_value)} className="text-gray-300 hover:text-primary transition-colors">
                            <Copy size={11} />
                          </button>
                        </div>
                      </td>

                      {/* Nilai Asli */}
                      <td>
                        {isDetokenized ? (
                          <div className="flex items-center gap-1.5">
                            <code className={`font-mono text-green-700 bg-green-50 px-1.5 py-0.5 rounded transition-all ${isVisible ? '' : 'blur-sm select-none'}`}>
                              {det.original_value}
                            </code>
                            <button onClick={() => toggleReveal(item.id)} className="text-gray-300 hover:text-primary transition-colors">
                              {isVisible ? <EyeOff size={12} /> : <Eye size={12} />}
                            </button>
                            {isVisible && (
                              <button onClick={() => copy(det.original_value)} className="text-gray-300 hover:text-primary transition-colors">
                                <Copy size={12} />
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="font-mono text-gray-300 tracking-widest">{'•'.repeat(8)}</span>
                        )}
                      </td>

                      {/* Jenis Data — visible after detokenize */}
                      <td className="text-gray-600">{det?.pii_type || '—'}</td>

                      {/* Status */}
                      <td>
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium border ${
                          item.status === 'success'
                            ? 'text-green-700 bg-green-50 border-green-200'
                            : 'text-red-700 bg-red-50 border-red-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${item.status === 'success' ? 'bg-green-500' : 'bg-red-500'}`} />
                          {item.status === 'success' ? 'Berhasil' : 'Gagal'}
                        </span>
                      </td>

                      <td className="text-gray-400 whitespace-nowrap">{fmtTime(item.created_at)}</td>

                      {/* Aksi */}
                      <td>
                        {isDetokenized ? (
                          <button onClick={() => toggleReveal(item.id)}
                            className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg border border-green-200 text-green-700 bg-green-50 hover:bg-green-100 transition-colors">
                            {isVisible ? <EyeOff size={11} /> : <Eye size={11} />}
                            {isVisible ? 'Sembunyikan' : 'Tampilkan'}
                          </button>
                        ) : (
                          <button onClick={() => setModalItem(item)} disabled={isLoading || item.status !== 'success'}
                            className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg border border-primary text-primary hover:bg-primary-light transition-colors disabled:opacity-50">
                            {isLoading
                              ? <><span className="w-3 h-3 border border-primary border-t-transparent rounded-full animate-spin" /> Proses...</>
                              : <><Unlock size={11} /> Detokenisasi</>}
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>{total} total data</span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1 || loading}
                className="p-1.5 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-40">
                <ChevronLeft size={14} />
              </button>
              <span className="px-2">Halaman {page} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages || loading}
                className="p-1.5 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-40">
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
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
                ['Aturan',      modalItem.rule?.rule_name || '—'],
                ['Job',         modalItem.job?.job_name || '—'],
                ['Token',       modalItem.tokenized_value],
                ['Status',      modalItem.status],
                ['Dibuat Pada', fmtTime(modalItem.created_at)],
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
              <button onClick={confirmDetokenize} disabled={processing === modalItem?.id}
                className="btn-primary px-4 py-2 text-sm disabled:opacity-50 flex items-center gap-1.5">
                {processing === modalItem?.id
                  ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Memproses...</>
                  : <><Unlock size={13} /> Detokenisasi Sekarang</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
