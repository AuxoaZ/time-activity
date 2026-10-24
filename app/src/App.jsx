import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays, CalendarRange, CalendarCheck2, Clock, Settings, RefreshCw,
  TrendingUp, Flame, X, AlertTriangle, Target, Sun, Trophy, Palmtree, Plus,
} from "lucide-react";
import {
  loadSettings, saveSettings, fetchPerDay, fmt, startOfDay, addDays, dayKey,
  mondayIndex, workdaysInMonth, workdaysInWeek, isHoliday, isWorkday, computeStreak,
} from "./lib.js";

const longDate = (d, o = { day: "numeric", month: "short", year: "numeric" }) =>
  d.toLocaleDateString("id-ID", o);
const parseKey = (k) => { const [y, m, d] = k.split("-").map(Number); return new Date(y, m - 1, d); };

function Dur({ secs }) {
  const s = Math.max(0, Math.round(secs));
  return (
    <>
      {Math.floor(s / 3600)}<span className="unit">j</span>{" "}
      {String(Math.floor((s % 3600) / 60)).padStart(2, "0")}<span className="unit">m</span>
    </>
  );
}

function Ring({ pct, done, children }) {
  const r = 52, c = 2 * Math.PI * r;
  return (
    <div className="ring">
      <svg viewBox="0 0 120 120">
        <circle className="ring-bg" cx="60" cy="60" r={r} />
        <circle
          className={"ring-fg" + (done ? " done" : "")}
          cx="60" cy="60" r={r}
          strokeDasharray={c}
          strokeDashoffset={c * (1 - Math.min(1, pct / 100))}
        />
      </svg>
      <div className="ring-label">{children}</div>
    </div>
  );
}

function StatCard({ icon: Icon, title, secs, target, note, tone }) {
  const pct = target ? (secs / target) * 100 : 0;
  const done = target > 0 && secs >= target;
  return (
    <section className={`card stat ${tone}`}>
      <div className="card-head">
        <span className="chip"><Icon size={18} /></span>
        <h2>{title}</h2>
      </div>
      <div className="stat-body">
        <Ring pct={pct} done={done}>
          <b>{Math.round(pct)}%</b>
        </Ring>
        <div>
          <div className="big"><Dur secs={secs} /></div>
          <div className="sub">dari {fmt(target)}</div>
          <div className={"pill" + (done ? " ok" : "")}>
            {done ? `+${fmt(secs - target)} lebih` : `sisa ${fmt(target - secs)}`}
          </div>
        </div>
      </div>
      {note && <div className="note">{note}</div>}
    </section>
  );
}

function SettingsModal({ settings, onSave, onClose }) {
  const [f, setF] = useState(settings);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const num = (v, d) => (v === "" || isNaN(+v) ? d : +v);
  const [newHoliday, setNewHoliday] = useState("");
  const addHoliday = () => {
    if (!newHoliday || f.holidays.includes(newHoliday)) return;
    setF({ ...f, holidays: [...f.holidays, newHoliday].sort() });
    setNewHoliday("");
  };
  const removeHoliday = (k) => setF({ ...f, holidays: f.holidays.filter((h) => h !== k) });
  return (
    <div className="backdrop" onMouseDown={onClose}>
      <form
        className="modal"
        onMouseDown={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          onSave({
            day: num(f.day, 8), week: num(f.week, 40),
            days: Math.min(7, Math.max(1, num(f.days, 5))), api: f.api.trim().replace(/\/$/, ""),
            holidays: f.holidays,
          });
        }}
      >
        <div className="modal-head">
          <h3><Target size={20} /> Pengaturan target</h3>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Tutup"><X size={18} /></button>
        </div>
        <label>Target harian (jam)
          <input type="number" min="0" step="0.5" value={f.day} onChange={set("day")} />
        </label>
        <label>Target mingguan (jam)
          <input type="number" min="0" step="0.5" value={f.week} onChange={set("week")} />
        </label>
        <label>Hari kerja per minggu
          <input type="number" min="1" max="7" step="1" value={f.days} onChange={set("days")} />
          <small>Target bulanan = target harian × jumlah hari kerja di bulan ini.</small>
        </label>
        <div className="field">
          <span className="field-label"><Palmtree size={14} /> Libur &amp; cuti</span>
          <div className="holiday-add">
            <input
              type="date" value={newHoliday} onChange={(e) => setNewHoliday(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addHoliday(); } }}
            />
            <button type="button" className="btn ghost" onClick={addHoliday}><Plus size={16} /> Tambah</button>
          </div>
          {f.holidays.length > 0 ? (
            <div className="chips">
              {f.holidays.map((k) => (
                <span key={k} className="tag">
                  {longDate(parseKey(k), { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
                  <button type="button" onClick={() => removeHoliday(k)} aria-label="Hapus"><X size={12} /></button>
                </span>
              ))}
            </div>
          ) : (
            <small>Belum ada. Tanggal libur tidak dihitung di target dan tidak memutus streak.</small>
          )}
        </div>
        <label>Alamat API ActivityWatch
          <input type="text" value={f.api} onChange={set("api")} />
          <small>Untuk versi online, isi alamat server AW yang bisa dijangkau browser.</small>
        </label>
        <div className="modal-actions">
          <button type="button" className="btn ghost" onClick={onClose}>Batal</button>
          <button type="submit" className="btn">Simpan</button>
        </div>
      </form>
    </div>
  );
}

export default function App() {
  const [settings, setSettings] = useState(loadSettings);
  const [perDay, setPerDay] = useState({});
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updated, setUpdated] = useState(null);
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState(new Date());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setPerDay(await fetchPerDay(settings.api));
      setError(null);
      setUpdated(new Date());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [settings.api]);

  useEffect(() => {
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const d = useMemo(() => {
    const today = startOfDay(now);
    const y = today.getFullYear(), m = today.getMonth();
    const weekStart = addDays(today, -mondayIndex(today));
    const sum = (a, b) => {
      let s = 0;
      for (let x = a; x < b; x = addDays(x, 1)) s += perDay[dayKey(x)] || 0;
      return s;
    };
    const dayT = settings.day * 3600;
    const wd = workdaysInMonth(y, m, settings);
    const monthPrefix = `${y}-${String(m + 1).padStart(2, "0")}`;
    const monthEntries = Object.entries(perDay).filter(([k]) => k.startsWith(monthPrefix));
    const monthSecs = sum(new Date(y, m, 1), addDays(today, 1));
    const activeDays = monthEntries.filter(([, v]) => v >= 60).length;
    const best = monthEntries.reduce((a, e) => (e[1] > a[1] ? e : a), ["", 0]);
    const weekWd = workdaysInWeek(weekStart, settings);
    return {
      y, m, today, dayT, wd,
      holidaysInMonth: settings.holidays.filter((k) => k.startsWith(monthPrefix)).length,
      daySecs: perDay[dayKey(today)] || 0,
      weekSecs: sum(weekStart, addDays(today, 1)),
      weekT: (settings.week * 3600 * weekWd) / settings.days,
      weekWd,
      monthSecs, activeDays,
      avg: activeDays ? monthSecs / activeDays : 0,
      bestDay: best[0] ? { date: parseKey(best[0]), secs: best[1] } : null,
      ...computeStreak(perDay, today, settings, dayT),
      daysInMonth: new Date(y, m + 1, 0).getDate(),
    };
  }, [perDay, now, settings]);

  const maxBar = Math.max(d.dayT, ...Object.values(perDay), 1);
  const dateLabel = now.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const timeLabel = now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const avgDelta = d.avg - d.dayT;

  return (
    <div className="page">
      <header className="top">
        <div>
          <div className="brand"><Clock size={20} /> Time Activity</div>
          <h1>{dateLabel}</h1>
          <div className="clock"><Sun size={14} /> {timeLabel}</div>
        </div>
        <div className="actions">
          <button className="icon-btn" onClick={load} title="Muat ulang" aria-label="Muat ulang">
            <RefreshCw size={18} className={loading ? "spin" : ""} />
          </button>
          <button className="btn" onClick={() => setOpen(true)}>
            <Settings size={16} /> Target
          </button>
        </div>
      </header>

      {error && (
        <div className="error">
          <AlertTriangle size={18} />
          <div>
            <b>Gagal mengambil data</b>
            <div>{error}</div>
            <small>Pastikan ActivityWatch berjalan dan alamat API di pengaturan benar.</small>
          </div>
        </div>
      )}

      <div className="grid">
        <StatCard icon={CalendarCheck2} title="Hari ini" tone="t1" secs={d.daySecs} target={d.dayT} />
        <StatCard icon={CalendarRange} title="Minggu ini" tone="t2" secs={d.weekSecs} target={d.weekT}
          note={d.weekWd < settings.days ? `${d.weekWd} hari kerja minggu ini` : null} />
        <StatCard icon={CalendarDays} title="Bulan ini" tone="t3" secs={d.monthSecs} target={d.wd * d.dayT}
          note={`${d.wd} hari kerja bulan ini` + (d.holidaysInMonth ? ` · ${d.holidaysInMonth} libur` : "")} />
      </div>

      <section className="card avg">
        <div className="avg-main">
          <span className="chip big-chip"><TrendingUp size={22} /></span>
          <div>
            <h2>Rata-rata harian</h2>
            <div className="big"><Dur secs={d.avg} /></div>
            <div className="sub">dari {d.activeDays} hari aktif bulan ini</div>
          </div>
        </div>
        <div className="avg-side">
          <div className={"pill" + (avgDelta >= 0 ? " ok" : "")}>
            {avgDelta >= 0 ? `+${fmt(avgDelta)}` : `-${fmt(-avgDelta)}`} vs target harian
          </div>
        </div>
      </section>

      <div className="duo">
        <section className="card mini">
          <span className="chip fire"><Flame size={22} /></span>
          <div>
            <h2>Streak target</h2>
            <div className="big">{d.streak}<span className="unit">hari</span></div>
            <div className="sub">Rekor {d.best} hari berturut-turut</div>
          </div>
        </section>
        <section className="card mini">
          <span className="chip gold"><Trophy size={22} /></span>
          <div>
            <h2>Hari terbaik bulan ini</h2>
            {d.bestDay ? (
              <>
                <div className="big"><Dur secs={d.bestDay.secs} /></div>
                <div className="sub">{longDate(d.bestDay.date, { weekday: "long", day: "numeric", month: "long" })}</div>
              </>
            ) : (
              <div className="sub">Belum ada data</div>
            )}
          </div>
        </section>
      </div>

      <section className="card">
        <div className="card-head">
          <span className="chip"><CalendarDays size={18} /></span>
          <h2>{new Date(d.y, d.m, 1).toLocaleDateString("id-ID", { month: "long", year: "numeric" })}</h2>
          <span className="legend"><i /> target {fmt(d.dayT)}</span>
        </div>
        <div className="bars">
          <div className="tline" style={{ "--r": d.dayT / maxBar }} />
          {Array.from({ length: d.daysInMonth }, (_, i) => {
            const dt = new Date(d.y, d.m, i + 1);
            const s = perDay[dayKey(dt)] || 0;
            const future = dt > d.today;
            const holiday = isHoliday(dt, settings);
            const off = !isWorkday(dt, settings);
            const isToday = dayKey(dt) === dayKey(d.today);
            return (
              <div key={i} className={"col" + (isToday ? " today" : "") + (off ? " off" : "") + (holiday ? " holiday" : "") + (future ? " future" : "")}
                title={`${longDate(dt, { weekday: "long", day: "numeric", month: "long" })}: ${fmt(s)}${holiday ? " (libur)" : ""}`}>
                <div className="track">
                  <div className={"fill" + (s >= d.dayT ? " done" : "")} style={{ height: `${(s / maxBar) * 100}%` }} />
                </div>
                <span>{i + 1}</span>
              </div>
            );
          })}
        </div>
      </section>

      <footer>
        {updated ? `Diperbarui ${updated.toLocaleTimeString("id-ID")}` : "Memuat…"} · waktu dihitung saat tidak AFK
      </footer>

      {open && (
        <SettingsModal
          settings={settings}
          onClose={() => setOpen(false)}
          onSave={(s) => { setSettings(s); saveSettings(s); setOpen(false); }}
        />
      )}
    </div>
  );
}
