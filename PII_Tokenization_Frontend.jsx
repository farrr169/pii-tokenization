import { useState, useEffect, useCallback } from "react";

const API_BASE = "http://localhost:5000/api";

// ─── Mock Data ────────────────────────────────────────────────
const MOCK_STATS = {
  total_tokenizations: 14872,
  success_count: 14651,
  failed_count: 221,
  success_rate: "98.5",
  total_jobs: 47,
  avg_processing_time_ms: 12
};

const MOCK_PII_TYPES = [
  { id: "1", name: "NIK", category: "Identitas", min_length: 16, max_length: 16, example_value: "3276011203990001", is_active: true },
  { id: "2", name: "NPWP", category: "Pajak", min_length: 15, max_length: 15, example_value: "012345678901234", is_active: true },
  { id: "3", name: "Nomor Rekening", category: "Finansial", min_length: 10, max_length: 16, example_value: "1234567890", is_active: true },
  { id: "4", name: "Kartu Kredit", category: "Finansial", min_length: 13, max_length: 19, example_value: "4111111111111111", is_active: true },
  { id: "5", name: "Nomor Telepon", category: "Kontak", min_length: 10, max_length: 15, example_value: "081234567890", is_active: true },
  { id: "6", name: "Email", category: "Kontak", min_length: 5, max_length: 150, example_value: "user@example.com", is_active: true },
  { id: "7", name: "Passport", category: "Identitas", min_length: 7, max_length: 9, example_value: "A1234567", is_active: true },
  { id: "8", name: "Nama Lengkap", category: "Identitas", min_length: 2, max_length: 100, example_value: "John Doe", is_active: false },
];

const MOCK_METHODS = [
  { id: "1", method_name: "Full FPE FF1", description: "Format-Preserving Encryption FF1", supports_tweak: true, is_deterministic: true, is_active: true },
  { id: "2", method_name: "Full FPE FF3", description: "Format-Preserving Encryption FF3-1", supports_tweak: true, is_deterministic: true, is_active: true },
  { id: "3", method_name: "Partial FPE", description: "FPE dengan preserve prefix/suffix", supports_prefix: true, supports_suffix: true, supports_tweak: true, is_deterministic: true, is_active: true },
  { id: "4", method_name: "Masking", description: "Mengganti karakter dengan mask (*)", supports_prefix: true, supports_suffix: true, is_deterministic: false, is_active: true },
  { id: "5", method_name: "Hashing SHA-256", description: "One-way hash SHA-256", is_deterministic: true, is_active: true },
  { id: "6", method_name: "Random Token", description: "Token acak non-deterministik", is_deterministic: false, is_active: true },
];

const MOCK_RULES = [
  { id: "1", rule_name: "NIK Full FPE", pii_type: { name: "NIK" }, method: { method_name: "Full FPE FF1" }, tweak: { tweak_name: "Static Tweak" }, preserve_prefix: 6, preserve_suffix: 0, maintain_length: true, is_active: true },
  { id: "2", rule_name: "Rekening Partial Mask", pii_type: { name: "Nomor Rekening" }, method: { method_name: "Masking" }, tweak: null, preserve_prefix: 4, preserve_suffix: 2, maintain_length: true, is_active: true },
  { id: "3", rule_name: "Kartu Kredit PCI", pii_type: { name: "Kartu Kredit" }, method: { method_name: "Partial FPE" }, tweak: { tweak_name: "Randomized 8-byte" }, preserve_prefix: 6, preserve_suffix: 4, maintain_length: true, is_active: true },
];

const MOCK_AUDIT = [
  { id: "1", user: { full_name: "Admin System" }, module_name: "tokenization", activity: "tokenize", description: "Tokenisasi Full FPE FF1 berhasil", ip_address: "192.168.1.10", created_at: "2024-12-15T09:23:11Z" },
  { id: "2", user: { full_name: "Operator 1" }, module_name: "auth", activity: "login", description: "User operator1@bank.id berhasil login", ip_address: "192.168.1.25", created_at: "2024-12-15T09:20:00Z" },
  { id: "3", user: { full_name: "Admin System" }, module_name: "tokenization_rules", activity: "create", description: "Rule NIK Full FPE dibuat", ip_address: "192.168.1.10", created_at: "2024-12-15T08:55:30Z" },
  { id: "4", user: { full_name: "Auditor 1" }, module_name: "tokenization", activity: "tokenize", description: "Batch 100 NIK berhasil diproses", ip_address: "10.0.0.5", created_at: "2024-12-15T08:30:00Z" },
  { id: "5", user: { full_name: "Operator 2" }, module_name: "auth", activity: "login", description: "User operator2@bank.id berhasil login", ip_address: "192.168.1.30", created_at: "2024-12-15T08:10:00Z" },
];

const MOCK_JOBS = [
  { id: "1", job_name: "Batch NIK Nasabah Q4-2024", total_data: 500, success_count: 498, failed_count: 2, status: "completed", created_at: "2024-12-15T08:00:00Z" },
  { id: "2", job_name: "Batch Kartu Kredit Desember", total_data: 1000, success_count: 987, failed_count: 13, status: "completed", created_at: "2024-12-14T14:30:00Z" },
  { id: "3", job_name: "Batch Rekening Giro", total_data: 250, success_count: 0, failed_count: 0, status: "pending", created_at: "2024-12-15T10:00:00Z" },
];

// ─── FPE Simulation ───────────────────────────────────────────
function simulateTokenize(value, method, preservePrefix = 0, preserveSuffix = 0) {
  const chars = { numeric: "0123456789", alpha: "ABCDEFGHIJKLMNOPQRSTUVWXYZ", alphanum: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789" };
  const isNum = /^\d+$/.test(value);
  const charset = isNum ? chars.numeric : chars.alphanum;

  const prefix = value.substring(0, preservePrefix);
  const suffix = preserveSuffix > 0 ? value.substring(value.length - preserveSuffix) : "";
  const core = value.substring(preservePrefix, preserveSuffix > 0 ? value.length - preserveSuffix : undefined);

  let tokenized;
  if (method === "Masking") {
    tokenized = core.split("").map((c, i) => (i < 2 || i >= core.length - 2 ? c : "*")).join("");
  } else if (method === "Hashing SHA-256") {
    let hash = 0;
    for (let i = 0; i < core.length; i++) hash = ((hash << 5) - hash) + core.charCodeAt(i);
    tokenized = Math.abs(hash).toString(16).padStart(core.length, "0").substring(0, core.length).toUpperCase();
  } else {
    tokenized = core.split("").map(c => {
      const idx = charset.indexOf(isNum ? c : c.toUpperCase());
      if (idx < 0) return c;
      const shift = Math.floor(Math.random() * charset.length);
      return charset[(idx + shift) % charset.length];
    }).join("");
  }
  return prefix + tokenized + suffix;
}

// ─── Colors & Utils ───────────────────────────────────────────
const categoryColor = (cat) => ({
  "Identitas": "#185FA5", "Finansial": "#1D9E75", "Pajak": "#BA7517",
  "Kontak": "#993556"
})[cat] || "#5F5E5A";

const statusColor = (s) => ({
  "completed": "var(--color-text-success)", "pending": "var(--color-text-warning)",
  "running": "var(--color-text-info)", "failed": "var(--color-text-danger)"
})[s] || "var(--color-text-secondary)";

const statusBg = (s) => ({
  "completed": "var(--color-background-success)", "pending": "var(--color-background-warning)",
  "running": "var(--color-background-info)", "failed": "var(--color-background-danger)"
})[s] || "var(--color-background-secondary)";

const fmtDate = (d) => new Date(d).toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
const fmtNum = (n) => Number(n).toLocaleString("id-ID");

// ─── Components ───────────────────────────────────────────────
function StatCard({ icon, label, value, sub, color = "#185FA5" }) {
  return (
    <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: "1rem 1.25rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <div style={{ width: 32, height: 32, borderRadius: "var(--border-radius-md)", background: color + "18", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <i className={`ti ${icon}`} style={{ fontSize: 16, color }} aria-hidden="true" />
        </div>
        <span style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>{label}</span>
      </div>
      <div style={{ fontSize: 26, fontWeight: 500, color: "var(--color-text-primary)" }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function Badge({ text, color = "#185FA5" }) {
  return (
    <span style={{ fontSize: 11, fontWeight: 500, padding: "2px 8px", borderRadius: 20, background: color + "18", color }}>
      {text}
    </span>
  );
}

function NavItem({ icon, label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "9px 12px",
      borderRadius: "var(--border-radius-md)", border: "none", cursor: "pointer", textAlign: "left",
      background: active ? "var(--color-background-info)" : "transparent",
      color: active ? "var(--color-text-info)" : "var(--color-text-secondary)",
      fontWeight: active ? 500 : 400, fontSize: 14, transition: "all 0.15s"
    }}>
      <i className={`ti ${icon}`} style={{ fontSize: 17 }} aria-hidden="true" />
      {label}
    </button>
  );
}

function SectionHeader({ title, count, action }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <h2 style={{ fontSize: 16, fontWeight: 500, margin: 0 }}>{title}</h2>
        {count != null && <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{count} data</span>}
      </div>
      {action}
    </div>
  );
}

function ActionBtn({ label, icon, onClick, variant = "default" }) {
  const styles = {
    default: { background: "transparent", color: "var(--color-text-primary)", border: "0.5px solid var(--color-border-secondary)" },
    primary: { background: "#185FA5", color: "#fff", border: "none" }
  };
  return (
    <button onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: 6, padding: "7px 14px",
      borderRadius: "var(--border-radius-md)", cursor: "pointer", fontSize: 13, fontWeight: 500,
      ...styles[variant]
    }}>
      {icon && <i className={`ti ${icon}`} style={{ fontSize: 14 }} aria-hidden="true" />}
      {label}
    </button>
  );
}

// ─── Pages ────────────────────────────────────────────────────
function Dashboard() {
  const data = [65, 78, 82, 70, 94, 88, 98];
  const days = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
  const maxVal = Math.max(...data);

  return (
    <div>
      <h2 className="sr-only">Dashboard Tokenisasi PII</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 24 }}>
        <StatCard icon="ti-shield-lock" label="Total Tokenisasi" value={fmtNum(MOCK_STATS.total_tokenizations)} sub="Semua waktu" color="#185FA5" />
        <StatCard icon="ti-check" label="Berhasil" value={fmtNum(MOCK_STATS.success_count)} sub={`Rate: ${MOCK_STATS.success_rate}%`} color="#1D9E75" />
        <StatCard icon="ti-x" label="Gagal" value={fmtNum(MOCK_STATS.failed_count)} sub="Perlu perhatian" color="#A32D2D" />
        <StatCard icon="ti-stack" label="Total Jobs" value={MOCK_STATS.total_jobs} sub="Batch proses" color="#BA7517" />
        <StatCard icon="ti-clock" label="Rata-rata Waktu" value={`${MOCK_STATS.avg_processing_time_ms}ms`} sub="Per tokenisasi" color="#993556" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
        <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: "1rem 1.25rem" }}>
          <h3 style={{ fontSize: 14, fontWeight: 500, margin: "0 0 16px", color: "var(--color-text-secondary)" }}>Aktivitas 7 Hari Terakhir</h3>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 80 }}>
            {data.map((v, i) => (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div style={{ width: "100%", background: "#185FA5", borderRadius: 3, height: `${(v / maxVal) * 70}px`, opacity: 0.7 + (v / maxVal) * 0.3 }} />
                <span style={{ fontSize: 10, color: "var(--color-text-secondary)" }}>{days[i]}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: "1rem 1.25rem" }}>
          <h3 style={{ fontSize: 14, fontWeight: 500, margin: "0 0 16px", color: "var(--color-text-secondary)" }}>Distribusi PII Type</h3>
          {[["NIK", 42, "#185FA5"], ["Rekening", 28, "#1D9E75"], ["Kartu Kredit", 19, "#BA7517"], ["Lainnya", 11, "#5F5E5A"]].map(([n, p, c]) => (
            <div key={n} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 13 }}>{n}</span>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{p}%</span>
              </div>
              <div style={{ height: 6, background: "var(--color-background-secondary)", borderRadius: 3 }}>
                <div style={{ width: `${p}%`, height: "100%", background: c, borderRadius: 3 }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: "1rem 1.25rem" }}>
        <h3 style={{ fontSize: 14, fontWeight: 500, margin: "0 0 12px", color: "var(--color-text-secondary)" }}>Aktivitas Terbaru</h3>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
              {["User", "Modul", "Aktivitas", "Waktu"].map(h => (
                <th key={h} style={{ padding: "6px 8px", textAlign: "left", fontWeight: 500, color: "var(--color-text-secondary)", fontSize: 12 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MOCK_AUDIT.slice(0, 4).map(log => (
              <tr key={log.id} style={{ borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                <td style={{ padding: "8px 8px" }}>{log.user?.full_name}</td>
                <td style={{ padding: "8px 8px" }}><Badge text={log.module_name} color="#5F5E5A" /></td>
                <td style={{ padding: "8px 8px" }}>{log.activity}</td>
                <td style={{ padding: "8px 8px", color: "var(--color-text-secondary)" }}>{fmtDate(log.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DemoPOC() {
  const [piiTypeId, setPiiTypeId] = useState("1");
  const [value, setValue] = useState("3276011203990001");
  const [methodId, setMethodId] = useState("1");
  const [preservePrefix, setPreservePrefix] = useState(6);
  const [preserveSuffix, setPreserveSuffix] = useState(0);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);

  const selectedPii = MOCK_PII_TYPES.find(p => p.id === piiTypeId);
  const selectedMethod = MOCK_METHODS.find(m => m.id === methodId);

  const handleTokenize = () => {
    if (!value.trim()) return;
    setLoading(true);
    setTimeout(() => {
      const tokenized = simulateTokenize(value, selectedMethod.method_name, preservePrefix, preserveSuffix);
      const res = {
        original: value,
        tokenized,
        method: selectedMethod.method_name,
        piiType: selectedPii?.name,
        preservePrefix,
        preserveSuffix,
        time: Math.floor(Math.random() * 20) + 5,
        lengthPreserved: value.length === tokenized.length,
        ts: new Date().toLocaleTimeString("id-ID")
      };
      setResult(res);
      setHistory(prev => [res, ...prev.slice(0, 4)]);
      setLoading(false);
    }, 600);
  };

  const useExample = () => {
    setValue(selectedPii?.example_value || "");
    setPreservePrefix(selectedPii?.name === "NIK" ? 6 : selectedPii?.name === "Kartu Kredit" ? 6 : 4);
    setPreserveSuffix(selectedPii?.name === "Kartu Kredit" ? 4 : 0);
  };

  return (
    <div>
      <h2 className="sr-only">Demo POC Tokenisasi</h2>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: "1rem 1.25rem" }}>
            <h3 style={{ fontSize: 14, fontWeight: 500, margin: "0 0 16px" }}>Konfigurasi Tokenisasi</h3>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>Jenis PII</label>
              <select value={piiTypeId} onChange={e => setPiiTypeId(e.target.value)} style={{ width: "100%" }}>
                {MOCK_PII_TYPES.filter(p => p.is_active).map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.category})</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>
                Nilai Input
                <button onClick={useExample} style={{ marginLeft: 8, fontSize: 11, color: "var(--color-text-info)", background: "none", border: "none", cursor: "pointer" }}>Gunakan contoh</button>
              </label>
              <input type="text" value={value} onChange={e => setValue(e.target.value)}
                placeholder={selectedPii?.example_value} style={{ width: "100%", fontFamily: "var(--font-mono)", letterSpacing: 1 }} />
              {selectedPii && (
                <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 4 }}>
                  Panjang: {value.length} | Min: {selectedPii.min_length} | Max: {selectedPii.max_length}
                </div>
              )}
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>Metode Tokenisasi</label>
              <select value={methodId} onChange={e => setMethodId(e.target.value)} style={{ width: "100%" }}>
                {MOCK_METHODS.filter(m => m.is_active).map(m => (
                  <option key={m.id} value={m.id}>{m.method_name}</option>
                ))}
              </select>
              {selectedMethod && <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 4 }}>{selectedMethod.description}</div>}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
              <div>
                <label style={{ fontSize: 12, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>Preserve Prefix</label>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input type="range" min={0} max={Math.floor(value.length / 2)} value={preservePrefix}
                    onChange={e => setPreservePrefix(Number(e.target.value))} style={{ flex: 1 }} />
                  <span style={{ fontSize: 13, fontWeight: 500, minWidth: 16 }}>{preservePrefix}</span>
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>Preserve Suffix</label>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input type="range" min={0} max={Math.floor(value.length / 2)} value={preserveSuffix}
                    onChange={e => setPreserveSuffix(Number(e.target.value))} style={{ flex: 1 }} />
                  <span style={{ fontSize: 13, fontWeight: 500, minWidth: 16 }}>{preserveSuffix}</span>
                </div>
              </div>
            </div>

            {value && preservePrefix + preserveSuffix < value.length && (
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", padding: "8px 12px", marginBottom: 16, letterSpacing: 1 }}>
                <span style={{ color: "#1D9E75" }}>{value.substring(0, preservePrefix)}</span>
                <span style={{ color: "var(--color-text-secondary)" }}>{value.substring(preservePrefix, preserveSuffix > 0 ? value.length - preserveSuffix : undefined)}</span>
                <span style={{ color: "#BA7517" }}>{preserveSuffix > 0 ? value.substring(value.length - preserveSuffix) : ""}</span>
              </div>
            )}

            <button onClick={handleTokenize} disabled={loading || !value.trim()} style={{
              width: "100%", padding: "10px", background: loading ? "var(--color-border-tertiary)" : "#185FA5",
              color: "#fff", border: "none", borderRadius: "var(--border-radius-md)", cursor: loading ? "not-allowed" : "pointer",
              fontWeight: 500, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 8
            }}>
              <i className="ti ti-shield-lock" style={{ fontSize: 16 }} aria-hidden="true" />
              {loading ? "Memproses..." : "Tokenisasi Sekarang"}
            </button>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {result && (
            <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-success)", borderRadius: "var(--border-radius-lg)", padding: "1rem 1.25rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <i className="ti ti-check" style={{ color: "var(--color-text-success)", fontSize: 18 }} aria-hidden="true" />
                <span style={{ fontWeight: 500, color: "var(--color-text-success)" }}>Tokenisasi Berhasil</span>
                <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--color-text-secondary)" }}>{result.time}ms</span>
              </div>

              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 4 }}>NILAI ASLI</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 15, letterSpacing: 2, color: "var(--color-text-primary)", background: "var(--color-background-secondary)", padding: "8px 12px", borderRadius: "var(--border-radius-md)" }}>
                  {result.original}
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", margin: "8px 0" }}>
                <i className="ti ti-arrow-down" style={{ color: "#185FA5", fontSize: 20 }} aria-hidden="true" />
              </div>

              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 4 }}>TOKEN HASIL</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 15, letterSpacing: 2, color: "#185FA5", background: "#E6F1FB", padding: "8px 12px", borderRadius: "var(--border-radius-md)" }}>
                  {result.tokenized}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 12 }}>
                {[
                  ["Metode", result.method],
                  ["Panjang Terjaga", result.lengthPreserved ? "Ya ✓" : "Tidak"],
                  ["PII Type", result.piiType]
                ].map(([k, v]) => (
                  <div key={k} style={{ background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", padding: "8px 10px" }}>
                    <div style={{ fontSize: 10, color: "var(--color-text-secondary)", marginBottom: 2 }}>{k}</div>
                    <div style={{ fontSize: 12, fontWeight: 500 }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!result && (
            <div style={{ background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-lg)", padding: "2rem", textAlign: "center", color: "var(--color-text-secondary)" }}>
              <i className="ti ti-shield" style={{ fontSize: 40, display: "block", marginBottom: 12 }} aria-hidden="true" />
              <div style={{ fontSize: 14 }}>Hasil tokenisasi akan tampil di sini</div>
            </div>
          )}

          {history.length > 0 && (
            <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: "1rem 1.25rem" }}>
              <h3 style={{ fontSize: 13, fontWeight: 500, margin: "0 0 10px", color: "var(--color-text-secondary)" }}>Riwayat Session</h3>
              {history.map((h, i) => (
                <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, fontSize: 12 }}>
                  <span style={{ fontFamily: "var(--font-mono)", color: "var(--color-text-secondary)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.original}</span>
                  <span style={{ color: "#185FA5" }}>→</span>
                  <span style={{ fontFamily: "var(--font-mono)", color: "#185FA5", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.tokenized}</span>
                  <span style={{ color: "var(--color-text-secondary)", minWidth: 45, textAlign: "right" }}>{h.ts}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PIITypePage() {
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: "", category: "Identitas", min_length: "", max_length: "", example_value: "" });
  const [list, setList] = useState(MOCK_PII_TYPES);

  const filtered = list.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.category.toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = () => {
    if (!form.name) return;
    setList(prev => [...prev, { ...form, id: String(Date.now()), is_active: true, created_at: new Date().toISOString() }]);
    setShowModal(false);
    setForm({ name: "", category: "Identitas", min_length: "", max_length: "", example_value: "" });
  };

  const toggleActive = (id) => setList(prev => prev.map(p => p.id === id ? { ...p, is_active: !p.is_active } : p));

  return (
    <div>
      <h2 className="sr-only">Master PII Types</h2>
      <SectionHeader title="Master PII Types" count={filtered.length}
        action={<ActionBtn label="Tambah PII Type" icon="ti-plus" variant="primary" onClick={() => setShowModal(true)} />}
      />

      <div style={{ marginBottom: 16 }}>
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Cari nama atau kategori..." style={{ width: "100%", maxWidth: 320 }} />
      </div>

      <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead style={{ background: "var(--color-background-secondary)" }}>
            <tr>
              {["Nama", "Kategori", "Panjang", "Contoh Nilai", "Status", "Aksi"].map(h => (
                <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontWeight: 500, fontSize: 12, color: "var(--color-text-secondary)", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.id} style={{ borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                <td style={{ padding: "10px 12px", fontWeight: 500 }}>{p.name}</td>
                <td style={{ padding: "10px 12px" }}><Badge text={p.category} color={categoryColor(p.category)} /></td>
                <td style={{ padding: "10px 12px", color: "var(--color-text-secondary)" }}>{p.min_length}–{p.max_length}</td>
                <td style={{ padding: "10px 12px", fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--color-text-secondary)" }}>{p.example_value}</td>
                <td style={{ padding: "10px 12px" }}>
                  <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: p.is_active ? "var(--color-background-success)" : "var(--color-background-secondary)", color: p.is_active ? "var(--color-text-success)" : "var(--color-text-secondary)" }}>
                    {p.is_active ? "Aktif" : "Nonaktif"}
                  </span>
                </td>
                <td style={{ padding: "10px 12px" }}>
                  <button onClick={() => toggleActive(p.id)} style={{ fontSize: 11, padding: "4px 10px", border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", background: "transparent", cursor: "pointer" }}>
                    {p.is_active ? "Nonaktifkan" : "Aktifkan"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div style={{ background: "var(--color-background-primary)", borderRadius: "var(--border-radius-lg)", padding: "1.5rem", width: 420, border: "0.5px solid var(--color-border-secondary)" }}>
            <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 500 }}>Tambah PII Type</h3>
            {[["name", "Nama PII Type", "text"], ["example_value", "Contoh Nilai", "text"]].map(([k, l, t]) => (
              <div key={k} style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 12, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>{l}</label>
                <input type={t} value={form[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} style={{ width: "100%" }} />
              </div>
            ))}
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 12, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>Kategori</label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} style={{ width: "100%" }}>
                {["Identitas", "Finansial", "Pajak", "Kontak"].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
              {[["min_length", "Min Panjang"], ["max_length", "Max Panjang"]].map(([k, l]) => (
                <div key={k}>
                  <label style={{ fontSize: 12, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>{l}</label>
                  <input type="number" value={form[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} style={{ width: "100%" }} />
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <ActionBtn label="Batal" onClick={() => setShowModal(false)} />
              <ActionBtn label="Simpan" variant="primary" onClick={handleAdd} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RulesPage() {
  return (
    <div>
      <h2 className="sr-only">Tokenization Rules</h2>
      <SectionHeader title="Tokenization Rules" count={MOCK_RULES.length}
        action={<ActionBtn label="Buat Rule" icon="ti-plus" variant="primary" onClick={() => {}} />}
      />
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {MOCK_RULES.map(rule => (
          <div key={rule.id} style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: "1rem 1.25rem" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontWeight: 500, fontSize: 14, marginBottom: 6 }}>{rule.rule_name}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  <Badge text={rule.pii_type?.name} color="#185FA5" />
                  <Badge text={rule.method?.method_name} color="#1D9E75" />
                  {rule.tweak && <Badge text={rule.tweak.tweak_name} color="#BA7517" />}
                </div>
              </div>
              <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: "var(--color-background-success)", color: "var(--color-text-success)" }}>Aktif</span>
            </div>
            <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
              {[
                ["Preserve Prefix", rule.preserve_prefix],
                ["Preserve Suffix", rule.preserve_suffix],
                ["Maintain Length", rule.maintain_length ? "Ya" : "Tidak"],
                ["Deterministik", rule.method?.is_deterministic ? "Ya" : "Tidak"]
              ].map(([k, v]) => (
                <div key={k} style={{ background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", padding: "6px 10px" }}>
                  <div style={{ fontSize: 10, color: "var(--color-text-secondary)" }}>{k}</div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function JobsPage() {
  return (
    <div>
      <h2 className="sr-only">Tokenization Jobs</h2>
      <SectionHeader title="Batch Jobs" count={MOCK_JOBS.length}
        action={<ActionBtn label="Buat Job Baru" icon="ti-plus" variant="primary" onClick={() => {}} />}
      />
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {MOCK_JOBS.map(job => {
          const successRate = job.total_data > 0 ? Math.round((job.success_count / job.total_data) * 100) : 0;
          return (
            <div key={job.id} style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: "1rem 1.25rem" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <div>
                  <div style={{ fontWeight: 500, fontSize: 14 }}>{job.job_name}</div>
                  <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 2 }}>{fmtDate(job.created_at)}</div>
                </div>
                <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: statusBg(job.status), color: statusColor(job.status), fontWeight: 500 }}>
                  {job.status}
                </span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 10 }}>
                {[["Total", job.total_data], ["Berhasil", job.success_count], ["Gagal", job.failed_count], ["Success Rate", job.total_data > 0 ? `${successRate}%` : "-"]].map(([k, v]) => (
                  <div key={k} style={{ background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", padding: "6px 10px" }}>
                    <div style={{ fontSize: 10, color: "var(--color-text-secondary)" }}>{k}</div>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{fmtNum(v)}</div>
                  </div>
                ))}
              </div>
              {job.total_data > 0 && (
                <div style={{ height: 6, background: "var(--color-background-secondary)", borderRadius: 3 }}>
                  <div style={{ height: "100%", background: successRate >= 95 ? "#1D9E75" : "#BA7517", borderRadius: 3, width: `${successRate}%` }} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AuditPage() {
  const [moduleFilter, setModuleFilter] = useState("");
  const modules = [...new Set(MOCK_AUDIT.map(a => a.module_name))];
  const filtered = moduleFilter ? MOCK_AUDIT.filter(a => a.module_name === moduleFilter) : MOCK_AUDIT;

  return (
    <div>
      <h2 className="sr-only">Audit Log</h2>
      <SectionHeader title="Audit Log" count={filtered.length} />

      <div style={{ marginBottom: 16, display: "flex", gap: 8 }}>
        <select value={moduleFilter} onChange={e => setModuleFilter(e.target.value)}>
          <option value="">Semua Modul</option>
          {modules.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead style={{ background: "var(--color-background-secondary)" }}>
            <tr>
              {["Waktu", "User", "Modul", "Aktivitas", "Deskripsi", "IP"].map(h => (
                <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontWeight: 500, fontSize: 12, color: "var(--color-text-secondary)", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(log => (
              <tr key={log.id} style={{ borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                <td style={{ padding: "9px 12px", color: "var(--color-text-secondary)", whiteSpace: "nowrap" }}>{fmtDate(log.created_at)}</td>
                <td style={{ padding: "9px 12px", fontWeight: 500 }}>{log.user?.full_name}</td>
                <td style={{ padding: "9px 12px" }}><Badge text={log.module_name} color="#5F5E5A" /></td>
                <td style={{ padding: "9px 12px" }}>{log.activity}</td>
                <td style={{ padding: "9px 12px", color: "var(--color-text-secondary)" }}>{log.description}</td>
                <td style={{ padding: "9px 12px", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-text-secondary)" }}>{log.ip_address}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MethodsPage() {
  return (
    <div>
      <h2 className="sr-only">Tokenization Methods</h2>
      <SectionHeader title="Tokenization Methods" count={MOCK_METHODS.length} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
        {MOCK_METHODS.map(m => (
          <div key={m.id} style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: "1rem 1.25rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <div style={{ width: 32, height: 32, borderRadius: "var(--border-radius-md)", background: "#185FA518", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <i className="ti ti-shield-lock" style={{ fontSize: 16, color: "#185FA5" }} aria-hidden="true" />
              </div>
              <span style={{ fontWeight: 500, fontSize: 13 }}>{m.method_name}</span>
            </div>
            <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: "0 0 12px" }}>{m.description}</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {m.supports_tweak && <Badge text="Tweak" color="#BA7517" />}
              {m.supports_prefix && <Badge text="Prefix" color="#1D9E75" />}
              {m.supports_suffix && <Badge text="Suffix" color="#1D9E75" />}
              <Badge text={m.is_deterministic ? "Deterministik" : "Random"} color={m.is_deterministic ? "#185FA5" : "#993556"} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Login ────────────────────────────────────────────────────
function Login({ onLogin }) {
  const [email, setEmail] = useState("admin@bank.id");
  const [password, setPassword] = useState("admin123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setTimeout(() => {
      if (email && password.length >= 6) {
        onLogin({ name: "Admin System", role: "Admin", email });
      } else {
        setError("Email atau password tidak valid");
        setLoading(false);
      }
    }, 800);
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--color-background-tertiary)" }}>
      <div style={{ width: 380, background: "var(--color-background-primary)", borderRadius: "var(--border-radius-lg)", border: "0.5px solid var(--color-border-tertiary)", padding: "2rem" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ width: 48, height: 48, borderRadius: "var(--border-radius-lg)", background: "#185FA5", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
            <i className="ti ti-shield-lock" style={{ fontSize: 24, color: "#fff" }} aria-hidden="true" />
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 500, margin: "0 0 4px" }}>PII Tokenization System</h1>
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0 }}>Dynamic FPE + Tweak Engine</p>
        </div>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} style={{ width: "100%" }} required />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 12, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} style={{ width: "100%" }} required />
          </div>
          {error && <div style={{ color: "var(--color-text-danger)", fontSize: 13, marginBottom: 12 }}>{error}</div>}
          <button type="submit" disabled={loading} style={{
            width: "100%", padding: "10px", background: "#185FA5", color: "#fff", border: "none",
            borderRadius: "var(--border-radius-md)", cursor: loading ? "not-allowed" : "pointer", fontWeight: 500, fontSize: 14
          }}>
            {loading ? "Masuk..." : "Masuk"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────
const NAV = [
  { id: "dashboard", label: "Dashboard", icon: "ti-layout-dashboard" },
  { id: "demo", label: "Demo POC", icon: "ti-test-pipe" },
  { id: "pii-types", label: "PII Types", icon: "ti-database" },
  { id: "methods", label: "Metode", icon: "ti-cpu" },
  { id: "rules", label: "Rules", icon: "ti-list-check" },
  { id: "jobs", label: "Batch Jobs", icon: "ti-stack" },
  { id: "audit", label: "Audit Log", icon: "ti-clipboard-list" },
];

export default function App() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState("dashboard");

  if (!user) return <Login onLogin={setUser} />;

  const pages = {
    dashboard: <Dashboard />,
    demo: <DemoPOC />,
    "pii-types": <PIITypePage />,
    methods: <MethodsPage />,
    rules: <RulesPage />,
    jobs: <JobsPage />,
    audit: <AuditPage />
  };

  const pageTitle = NAV.find(n => n.id === page)?.label || "";

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--color-background-tertiary)" }}>
      <aside style={{ width: 220, background: "var(--color-background-primary)", borderRight: "0.5px solid var(--color-border-tertiary)", padding: "1rem", display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 4px 16px", borderBottom: "0.5px solid var(--color-border-tertiary)", marginBottom: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: "var(--border-radius-md)", background: "#185FA5", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <i className="ti ti-shield-lock" style={{ fontSize: 16, color: "#fff" }} aria-hidden="true" />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.2 }}>PII Tokenization</div>
            <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>v1.0.0</div>
          </div>
        </div>

        <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
          {NAV.map(item => (
            <NavItem key={item.id} icon={item.icon} label={item.label} active={page === item.id} onClick={() => setPage(item.id)} />
          ))}
        </nav>

        <div style={{ paddingTop: 12, borderTop: "0.5px solid var(--color-border-tertiary)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 4px" }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#185FA518", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 500, color: "#185FA5" }}>
              {user.name.charAt(0)}
            </div>
            <div style={{ flex: 1, overflow: "hidden" }}>
              <div style={{ fontSize: 12, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.name}</div>
              <div style={{ fontSize: 10, color: "var(--color-text-secondary)" }}>{user.role}</div>
            </div>
            <button onClick={() => setUser(null)} title="Logout" style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "var(--color-text-secondary)" }}>
              <i className="ti ti-logout" style={{ fontSize: 16 }} aria-hidden="true" />
            </button>
          </div>
        </div>
      </aside>

      <main style={{ flex: 1, padding: "1.5rem", overflow: "auto" }}>
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 18, fontWeight: 500, margin: 0 }}>{pageTitle}</h1>
        </div>
        {pages[page]}
      </main>
    </div>
  );
}
