import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { Copy, RefreshCw, Save, Play, CheckCircle, Zap } from 'lucide-react'
import { usePiiStore } from '../../store/pii.store'
import { useResultsStore } from '../../store/results.store'
import { useRulesStore, METHODS_LIST, TWEAKS_LIST } from '../../store/rules.store'
import { useAuditStore } from '../../store/audit.store'
import { piiTypesApi, methodsApi, rulesApi, tokenizationApi } from '../../api'

function genTweakValue(tweak) {
  if (!tweak) return ''
  if (tweak.type === 'STATIC') return tweak.value || 'TOKENSYSTEM2024'
  if (tweak.type === 'DYNAMIC') return Date.now().toString(16).padStart(16, '0') + '-ts'
  return Array.from({ length: 36 }, (_, i) =>
    [8, 13, 18, 23].includes(i) ? '-' : Math.random().toString(16)[2] || '0'
  ).join('')
}

// DJB2 hash — deterministic seed from tweak + position + char
function deterministicOffset(seed, pos, char, modulo) {
  let h = 5381
  const s = seed + ':' + pos + ':' + char
  for (let i = 0; i < s.length; i++) {
    h = ((h * 33) ^ s.charCodeAt(i)) >>> 0
  }
  return h % modulo
}

// tweakSeed: string → deterministic result; null → random
function simulate(value, mode, prefixLen, suffixLen, tweakSeed, maintainChar = true, maintainLen = true) {
  const numericOnly = /^\d+$/.test(value)
  const charset = (!maintainChar || !numericOnly)
    ? '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    : '0123456789'

  let prefix = '', suffix = '', core = value

  if (mode === 'prefix' || mode === 'both') {
    prefix = value.substring(0, prefixLen)
    core   = core.substring(prefixLen)
  }
  if (mode === 'suffix' || mode === 'both') {
    suffix = value.substring(value.length - suffixLen)
    core   = core.substring(0, core.length - suffixLen)
  }

  const tok = core.split('').map((c, pos) => {
    const ci = charset.indexOf(/^\d$/.test(c) ? c : c.toUpperCase())
    if (ci < 0) return c
    const offset = tweakSeed
      ? deterministicOffset(tweakSeed, pos, c, charset.length)
      : Math.floor(Math.random() * charset.length)
    return charset[(ci + offset) % charset.length]
  }).join('')

  let result = prefix + tok + suffix
  if (!maintainLen) {
    // Tambah 1-3 karakter acak di akhir untuk menunjukkan panjang tidak dipertahankan
    const extra = Math.floor(Math.random() * 3) + 1
    for (let i = 0; i < extra; i++) {
      result += charset[Math.floor(Math.random() * charset.length)]
    }
  }
  return result
}

function ruleSummary(method, mode, pre, suf) {
  if (!method) return '—'
  if (!method.supports_prefix && !method.supports_suffix) return method.name
  if (mode === 'none')   return `${method.name} (Full)`
  if (mode === 'prefix') return `${method.name} — Prefix ${pre}`
  if (mode === 'suffix') return `${method.name} — Suffix ${suf}`
  return `${method.name} — Prefix ${pre} & Suffix ${suf}`
}

function fmtTime(d) {
  if (!(d instanceof Date)) return '—'
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('id-ID')
}

export default function Demo() {
  const navigate   = useNavigate()
  const { piiTypes }  = usePiiStore()
  const { rules }     = useRulesStore()
  const { addLog }    = useAuditStore()
  const activePii     = piiTypes.filter(p => p.is_active)

  // Real data from backend for persistence
  const [realPiiTypes, setRealPiiTypes] = useState([])
  const [realMethods,  setRealMethods]  = useState([])
  const [realRules,    setRealRules]    = useState([])

  useEffect(() => {
    Promise.all([
      piiTypesApi.list({ limit: 100 }),
      methodsApi.list({ limit: 100 }),
      rulesApi.list({ limit: 100 }),
    ]).then(([piis, methods, rulesList]) => {
      setRealPiiTypes(piis.data.data || [])
      setRealMethods(methods.data.data || [])
      setRealRules(rulesList.data.data || [])
    }).catch(() => {})
  }, [])

  // ── Config state ──────────────────────────────────────────────
  const [piiId,      setPiiId]      = useState('1')
  const [ruleId,     setRuleId]     = useState('1')    // 'manual' or rule id
  const [value,      setValue]      = useState('3276011203990001')
  const [methodId,   setMethodId]   = useState('1')
  const [mode,       setMode]       = useState('none')
  const [prefixLen,  setPrefixLen]  = useState(0)
  const [suffixLen,  setSuffixLen]  = useState(0)
  const [maintainLen,  setMaintainLen]  = useState(true)
  const [maintainChar, setMaintainChar] = useState(true)
  const [useTweak,   setUseTweak]   = useState(true)
  const [tweakId,    setTweakId]    = useState('2')
  const [tweakVal,   setTweakVal]   = useState(() => genTweakValue(TWEAKS_LIST[1]))
  const [result,     setResult]     = useState(null)
  const [loading,    setLoading]    = useState(false)
  const [saved,      setSaved]      = useState(false)
  const { addHistory, history } = useResultsStore()

  const pii    = piiTypes.find(p => p.id === piiId)
  const method = METHODS_LIST.find(m => m.id === methodId)
  const tweak  = TWEAKS_LIST.find(t => t.id === tweakId)

  const piiRules    = rules.filter(r => r.pii_type_id === piiId && r.is_active)
  const selectedRule = ruleId !== 'manual' ? rules.find(r => r.id === ruleId) : null
  const isManual    = ruleId === 'manual'

  const piiRegex       = pii?.validation_regex ? new RegExp(pii.validation_regex) : null
  const isValid        = pii && value.length >= pii.min_length && value.length <= pii.max_length && (!piiRegex || piiRegex.test(value))
  const preservedDigits = mode === 'prefix' ? prefixLen : mode === 'suffix' ? suffixLen : mode === 'both' ? prefixLen + suffixLen : 0
  const encryptedDigits = Math.max(0, value.length - preservedDigits)

  // Apply rule settings to all config states
  const applyRule = (rule) => {
    if (!rule) return
    const m = METHODS_LIST.find(x => x.id === rule.method_id)
    setMethodId(rule.method_id)
    setMaintainLen(rule.maintain_length)
    const t = TWEAKS_LIST.find(x => x.id === rule.tweak_id)
    setTweakId(rule.tweak_id)
    setTweakVal(genTweakValue(t))
    setPrefixLen(rule.preserve_prefix)
    setSuffixLen(rule.preserve_suffix)
    if (m?.supports_prefix || m?.supports_suffix) {
      const hasPre = rule.preserve_prefix > 0
      const hasSuf = rule.preserve_suffix > 0
      setMode(hasPre && hasSuf ? 'both' : hasPre ? 'prefix' : hasSuf ? 'suffix' : 'none')
    } else {
      setMode('none')
    }
  }

  const handlePiiChange = (id) => {
    const p = piiTypes.find(x => x.id === id)
    setPiiId(id)
    setValue(p?.example_value || '')
    setResult(null)
    setSaved(false)
    // Auto-select first active rule for this PII type
    const firstRule = rules.find(r => r.pii_type_id === id && r.is_active)
    if (firstRule) {
      setRuleId(firstRule.id)
      applyRule(firstRule)
    } else {
      setRuleId('manual')
    }
  }

  const handleRuleChange = (id) => {
    setRuleId(id)
    setResult(null)
    setSaved(false)
    if (id !== 'manual') {
      const rule = rules.find(r => r.id === id)
      applyRule(rule)
    }
  }

  const handleTweakChange = (id) => {
    setTweakId(id)
    setTweakVal(genTweakValue(TWEAKS_LIST.find(t => t.id === id)))
  }

  const copy = text => navigator.clipboard.writeText(text)

  const handleTokenize = () => {
    if (!value || !isValid) return
    setLoading(true)
    setTimeout(() => {
      // Regenerate tweak for non-static types so each tokenization is different
      let activeTweakVal = tweakVal
      if (useTweak && method?.supports_tweak && tweak && tweak.type !== 'STATIC') {
        activeTweakVal = genTweakValue(tweak)
        setTweakVal(activeTweakVal)
      }

      // Static tweak → deterministic (same seed = same token)
      // Dynamic/Randomized → new seed each time = different token
      // No tweak → pure random
      const tweakSeed = useTweak && method?.supports_tweak ? activeTweakVal : null
      const token = simulate(value, mode, prefixLen, suffixLen, tweakSeed, maintainChar, maintainLen)
      const now = new Date()
      const r = {
        id:        Date.now().toString(),
        pii:       pii.name,
        original:  value,
        method:    method?.name || '—',
        rule:      selectedRule ? selectedRule.rule_name : ruleSummary(method, mode, prefixLen, suffixLen),
        token,
        tweak:     tweakSeed,
        time:      5 + Math.floor(Math.random() * 20),
        timestamp: now,
      }
      setResult(r)
      addHistory(r)
      addLog({ module: 'tokenization', activity: 'tokenize', description: `Tokenisasi ${r.pii} dengan ${r.method} (rule: ${r.rule})` })
      setLoading(false)
    }, 400)
  }

  const handleReset = () => {
    setResult(null)
    setSaved(false)
    setValue(pii?.example_value || '')
  }

  const handleSave = async () => {
    if (!result || saved) return
    setSaved(true)
    // Try to persist to DB using real API IDs matched by name
    const realPii    = realPiiTypes.find(p => p.name === result.pii)
    const realRule   = selectedRule ? realRules.find(r => r.rule_name === selectedRule.rule_name) : null
    const realMethod = realMethods.find(m => m.method_name === result.method)
    if (realPii && (realRule || realMethod)) {
      try {
        await tokenizationApi.tokenize({
          pii_type_id: realPii.id,
          method_id:   realRule?.method_id || realMethod?.id,
          rule_id:     realRule?.id,
          value:       result.original,
          save_result: true,
        })
      } catch (e) {
        console.error('Demo: gagal simpan ke DB', e)
      }
    }
    addLog({ module: 'tokenization', activity: 'tokenize', description: `Hasil tokenisasi ${result.pii} disimpan (metode: ${result.method})` })
  }

  const showMethodConfig = method?.supports_prefix || method?.supports_suffix

  return (
    <DashboardLayout title="Demo">
      <div className="space-y-5">

        {/* ── Section 1: Konfigurasi ── */}
        <div className="card">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">1. Konfigurasi Tokenisasi</h2>

          {/* Row 1: PII Type + Rule + Value */}
          <div className="grid grid-cols-3 gap-5">

            {/* PII Type + Rule selector */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  Pilih Jenis Data (PII) <span className="text-red-500">*</span>
                </label>
                <select className="select-field" value={piiId} onChange={e => handlePiiChange(e.target.value)}>
                  {activePii.map(p => <option key={p.id} value={p.id}>{p.name} ({p.category})</option>)}
                </select>
              </div>

              {/* Rule selector */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  <Zap size={11} className="inline mr-1 text-amber-500" />
                  Rule / Template Tokenisasi
                </label>
                {piiRules.length > 0 ? (
                  <select className="select-field" value={ruleId} onChange={e => handleRuleChange(e.target.value)}>
                    {piiRules.map(r => <option key={r.id} value={r.id}>{r.rule_name}</option>)}
                    <option value="manual">— Manual (konfigurasi sendiri)</option>
                  </select>
                ) : (
                  <div className="text-xs text-gray-400 bg-gray-50 border border-dashed border-gray-200 rounded-lg px-3 py-2">
                    Belum ada rule untuk PII ini. Buat di menu <strong>Rules</strong>.
                  </div>
                )}
                {selectedRule && (
                  <div className="mt-1.5 p-2 bg-amber-50 border border-amber-100 rounded-lg">
                    <div className="text-xs text-amber-700 font-medium">
                      ✓ Rule diterapkan — konfigurasi di bawah otomatis diisi.
                    </div>
                  </div>
                )}
              </div>

              {pii && (
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                  <div className="text-xs font-medium text-blue-700 mb-0.5">Deskripsi PII</div>
                  <div className="text-xs text-blue-600">
                    Panjang: {pii.min_length === pii.max_length ? `${pii.min_length} karakter` : `${pii.min_length}–${pii.max_length} karakter`}.
                    {pii.validation_regex && <> Regex: <code className="font-mono">{pii.validation_regex}</code></>}
                  </div>
                </div>
              )}
            </div>

            {/* Value Input */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Masukkan Nilai Data <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  className={`input-field font-mono pr-16 ${
                    !value ? '' : isValid
                      ? 'border-green-300 focus:ring-green-200 focus:border-green-400'
                      : 'border-red-300 focus:ring-red-200 focus:border-red-400'
                  }`}
                  value={value}
                  onChange={e => setValue(e.target.value)}
                  placeholder={pii?.example_value}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-mono pointer-events-none">
                  {value.length} / {pii?.max_length}
                </span>
              </div>
              {value && (
                <div className={`mt-2 p-3 rounded-lg border text-xs font-medium ${
                  isValid ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-600'
                }`}>
                  {isValid
                    ? `✓ Valid — Format sesuai (${value.length} karakter${/^\d+$/.test(value) ? ' numeric' : ''}).`
                    : `✗ Tidak Valid — Format tidak sesuai untuk ${pii?.name}.`}
                </div>
              )}
            </div>

            {/* Method */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Metode Tokenisasi
                {selectedRule && <span className="ml-1.5 text-amber-600 text-xs">(dari rule)</span>}
              </label>
              <select
                className={`select-field ${selectedRule ? 'bg-amber-50 border-amber-200' : ''}`}
                value={methodId}
                onChange={e => { setMethodId(e.target.value); setRuleId('manual') }}
              >
                {METHODS_LIST.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select>
              {method && (
                <div className="mt-2 p-3 bg-purple-50 rounded-lg border border-purple-100">
                  <div className="text-xs font-medium text-purple-700 mb-0.5">Deskripsi</div>
                  <div className="text-xs text-purple-600">{method.description}</div>
                </div>
              )}
            </div>
          </div>

          {/* ── Konfigurasi Metode ── */}
          {showMethodConfig && (
            <div className="mt-5 pt-5 border-t border-gray-100">
              <div className="text-xs font-semibold text-gray-600 mb-4">
                ⚙️ Konfigurasi Metode
                {selectedRule && <span className="ml-2 text-amber-500 font-normal">(otomatis dari rule — dapat diubah manual)</span>}
              </div>
              <div className="grid grid-cols-4 gap-6">

                {/* Preserve Mode */}
                <div>
                  <div className="text-xs font-medium text-gray-600 mb-2">Pertahankan Bagian Data</div>
                  <div className="space-y-2">
                    {[
                      { val: 'prefix', label: 'Prefix (Depan)' },
                      { val: 'suffix', label: 'Suffix (Belakang)' },
                      { val: 'both',   label: 'Prefix & Suffix' },
                      { val: 'none',   label: 'Tidak ada (Full)' },
                    ].map(opt => (
                      <label key={opt.val} className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="mode" value={opt.val} checked={mode === opt.val}
                          onChange={e => { setMode(e.target.value); setRuleId('manual') }} />
                        <span className="text-xs text-gray-600">{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Digit Count */}
                <div>
                  <div className="text-xs font-medium text-gray-600 mb-2">Digit Dipertahankan</div>
                  {mode !== 'none' ? (
                    <div className="space-y-3">
                      {(mode === 'prefix' || mode === 'both') && (
                        <div>
                          {mode === 'both' && <div className="text-xs text-gray-400 mb-1">Prefix</div>}
                          <div className="flex items-center gap-2">
                            <button onClick={() => setPrefixLen(l => Math.max(0, l - 1))} className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 text-gray-600">−</button>
                            <input type="number" className="input-field text-center w-16 py-1.5 font-mono" value={prefixLen}
                              onChange={e => { setPrefixLen(Math.max(0, Number(e.target.value))); setRuleId('manual') }} min={0} max={value.length} />
                            <button onClick={() => setPrefixLen(l => Math.min(value.length, l + 1))} className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 text-gray-600">+</button>
                          </div>
                        </div>
                      )}
                      {(mode === 'suffix' || mode === 'both') && (
                        <div>
                          {mode === 'both' && <div className="text-xs text-gray-400 mb-1">Suffix</div>}
                          <div className="flex items-center gap-2">
                            <button onClick={() => setSuffixLen(l => Math.max(0, l - 1))} className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 text-gray-600">−</button>
                            <input type="number" className="input-field text-center w-16 py-1.5 font-mono" value={suffixLen}
                              onChange={e => { setSuffixLen(Math.max(0, Number(e.target.value))); setRuleId('manual') }} min={0} max={value.length} />
                            <button onClick={() => setSuffixLen(l => Math.min(value.length, l + 1))} className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 text-gray-600">+</button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400">Seluruh data akan ditokenisasi.</p>
                  )}
                </div>

                {/* Options */}
                <div>
                  <div className="text-xs font-medium text-gray-600 mb-2">Opsi Lainnya</div>
                  <div className="space-y-2.5">
                    {[
                      { key: 'len',   label: 'Pertahankan Panjang', val: maintainLen,  set: setMaintainLen },
                      { key: 'char',  label: 'Pertahankan Numeric', val: maintainChar, set: setMaintainChar },
                      { key: 'tweak', label: 'Gunakan Tweak',       val: useTweak,     set: setUseTweak },
                    ].map(opt => (
                      <label key={opt.key} className="flex items-start gap-2 cursor-pointer">
                        <input type="checkbox" checked={opt.val} onChange={e => opt.set(e.target.checked)} className="mt-0.5" />
                        <span className="text-xs text-gray-600">{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Tweak */}
                {useTweak && method?.supports_tweak && (
                  <div>
                    <div className="text-xs font-medium text-gray-600 mb-2">
                      Tweak
                      {selectedRule && <span className="ml-1.5 text-amber-600 text-xs">(dari rule)</span>}
                    </div>
                    <select className={`select-field text-xs ${selectedRule ? 'bg-amber-50 border-amber-200' : ''}`}
                      value={tweakId} onChange={e => { handleTweakChange(e.target.value); setRuleId('manual') }}>
                      {TWEAKS_LIST.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                    <div className="mt-2">
                      <div className="text-xs text-gray-400 mb-1">Tweak Value (Preview)</div>
                      <div className="flex items-center gap-1.5">
                        <code className="flex-1 min-w-0 text-xs bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 font-mono text-gray-600 truncate">{tweakVal}</code>
                        <button onClick={() => copy(tweakVal)} className="flex-shrink-0 p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-400"><Copy size={11} /></button>
                        <button onClick={() => setTweakVal(genTweakValue(tweak))} className="flex-shrink-0 p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-400"><RefreshCw size={11} /></button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Sections 2–4 ── */}
        <div className="grid grid-cols-5 gap-5">

          {/* Section 2: Preview */}
          <div className="col-span-2 card">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">2. Preview Hasil Tokenisasi</h2>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1">
                <div className="text-xs text-gray-400 mb-1.5">Data Asli</div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 font-mono text-sm text-gray-700 text-center min-h-[2.5rem] flex items-center justify-center">
                  {value || <span className="text-gray-300">—</span>}
                </div>
              </div>
              <span className="text-gray-300 text-xl mt-4">→</span>
              <div className="flex-1">
                <div className="text-xs text-gray-400 mb-1.5">Hasil Tokenisasi (Preview)</div>
                <div className={`relative border rounded-lg px-3 py-2.5 font-mono text-sm text-center min-h-[2.5rem] flex items-center justify-center ${
                  result ? 'bg-blue-50 border-blue-200 text-primary' : 'bg-gray-50 border-gray-200 text-gray-300'
                }`}>
                  {result ? result.token : '—'}
                  {result && (
                    <button onClick={() => copy(result.token)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-300 hover:text-primary">
                      <Copy size={12} />
                    </button>
                  )}
                </div>
                {result && <div className="text-xs text-green-600 mt-1.5">✓ Berhasil — {result.method}</div>}
              </div>
            </div>
          </div>

          {/* Section 3: Info */}
          <div className="col-span-2 card">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">3. Informasi</h2>
            <div className="space-y-2.5">
              {[
                ['Rule / Aturan',       selectedRule ? selectedRule.rule_name : (isManual ? 'Manual' : '—')],
                ['Metode',              result?.method || method?.name || '—'],
                ['Panjang Data Asli',   value ? `${value.length} karakter` : '—'],
                ['Digit Dipertahankan', value && mode !== 'none' ? `${preservedDigits} digit (${mode})` : '0 digit'],
                ['Digit Ditokenisasi',  value ? `${encryptedDigits} digit` : '—'],
                ['Tweak',               useTweak && method?.supports_tweak ? tweak?.name || 'Ya' : 'Tidak'],
                ['Waktu Proses',        result ? fmtTime(result.timestamp) : '—'],
              ].map(([label, val]) => (
                <div key={label} className="flex items-baseline justify-between text-xs gap-4">
                  <span className="text-gray-400 flex-shrink-0">{label}</span>
                  <span className={`font-medium text-right ${label === 'Rule / Aturan' && selectedRule ? 'text-amber-600' : 'text-gray-700'}`}>{val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Section 4: Actions */}
          <div className="col-span-1 card">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">4. Aksi</h2>
            <div className="space-y-2.5">
              <button onClick={handleTokenize} disabled={loading || !value || !isValid}
                className="w-full flex items-center justify-center gap-2 bg-primary text-white font-medium px-4 py-2.5 rounded-lg text-sm hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {loading
                  ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Memproses...</>
                  : <><Play size={14} /> Tokenisasi</>}
              </button>
              <button onClick={handleReset} className="w-full flex items-center justify-center gap-2 btn-secondary py-2.5">
                <RefreshCw size={14} /> Reset / Bersihkan
              </button>
              <button onClick={handleSave} disabled={!result || saved}
                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium border transition-colors disabled:cursor-not-allowed ${
                  saved ? 'bg-green-50 border-green-200 text-green-700' : 'btn-secondary disabled:opacity-40'
                }`}>
                {saved ? <><CheckCircle size={14} /> Tersimpan</> : <><Save size={14} /> Simpan Hasil</>}
              </button>
              <p className="text-xs text-gray-400 text-center pt-1 leading-relaxed">
                * Hasil akan tersimpan pada menu Hasil Tokenisasi.
              </p>
            </div>
          </div>
        </div>

        {/* ── Riwayat ── */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700">Riwayat Tokenisasi (Terakhir)</h2>
            {history.length > 0 && (
              <button onClick={() => navigate('/results')} className="text-xs text-primary hover:underline">Lihat Semua</button>
            )}
          </div>

          {history.length === 0 ? (
            <div className="text-center py-12 text-gray-300 text-sm">Belum ada riwayat tokenisasi.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="table-header">
                    <th>No</th><th>Jenis Data</th><th>Nilai Asli</th><th>Metode</th><th>Rule</th><th>Hasil Token</th><th>Tweak</th><th>Waktu</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h, i) => (
                    <tr key={h.id} className="table-row">
                      <td className="text-gray-400">{i + 1}</td>
                      <td className="font-medium">{h.pii}</td>
                      <td><code className="font-mono text-gray-600">{h.original}</code></td>
                      <td className="text-gray-600">{h.method}</td>
                      <td className="text-gray-500">{h.rule}</td>
                      <td>
                        <div className="flex items-center gap-1.5">
                          <code className="font-mono text-primary bg-primary-light px-1.5 py-0.5 rounded">{h.token}</code>
                          <button onClick={() => copy(h.token)} className="text-gray-300 hover:text-primary"><Copy size={10} /></button>
                        </div>
                      </td>
                      <td><code className="font-mono text-gray-400">{h.tweak ? h.tweak.substring(0, 16) + '…' : '—'}</code></td>
                      <td className="text-gray-400 whitespace-nowrap">{fmtTime(h.timestamp)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </DashboardLayout>
  )
}
