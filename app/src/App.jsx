import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CalendarRange,
  CalendarCheck2,
  Clock,
  Settings,
  RefreshCw,
  TrendingUp,
  Flame,
  X,
  AlertTriangle,
  Target,
  Sun,
  Moon,
  Trophy,
  Palmtree,
  Plus,
  CheckCircle2,
  Sparkles,
  Zap,
} from "lucide-react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import {
  loadSettings,
  saveSettings,
  fetchPerDay,
  fmt,
  fmtHours,
  startOfDay,
  addDays,
  dayKey,
  mondayIndex,
  workdaysInMonth,
  workdaysInWeek,
  isHoliday,
  isWorkday,
  computeStreak,
} from "./lib.js";

const longDate = (d, o = { day: "numeric", month: "short", year: "numeric" }) =>
  d.toLocaleDateString("id-ID", o);
const parseKey = (k) => {
  const [y, m, d] = k.split("-").map(Number);
  return new Date(y, m - 1, d);
};

function Dur({ secs, bigClass = "", unitClass = "" }) {
  const s = Math.max(0, Math.round(secs));
  const h = Math.floor(s / 3600);
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  return (
    <span className={`tabular-nums font-bold ${bigClass}`}>
      {h}
      <span
        className={`text-sm font-semibold opacity-60 ml-0.5 mr-1 ${unitClass}`}
      >
        j
      </span>
      {m}
      <span className={`text-sm font-semibold opacity-60 ml-0.5 ${unitClass}`}>
        m
      </span>
    </span>
  );
}

function Ring({ pct, done, tone = "indigo", children }) {
  const r = 50;
  const c = 2 * Math.PI * r;
  const strokeOffset = c * (1 - Math.min(1, pct / 100));

  const toneStrokes = {
    indigo: "stroke-indigo-500 dark:stroke-indigo-400",
    sky: "stroke-sky-500 dark:stroke-sky-400",
    emerald: "stroke-emerald-500 dark:stroke-emerald-400",
    amber: "stroke-amber-500 dark:stroke-amber-400",
  };

  return (
    <div className="relative w-24 h-24 sm:w-28 sm:h-28 flex-shrink-0">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
        <circle
          className="stroke-slate-200/80 dark:stroke-slate-800"
          cx="60"
          cy="60"
          r={r}
          fill="none"
          strokeWidth="11"
        />
        <circle
          className={`transition-all duration-1000 ease-out ${done ? "stroke-emerald-500 dark:stroke-emerald-400" : toneStrokes[tone] || toneStrokes.indigo}`}
          cx="60"
          cy="60"
          r={r}
          fill="none"
          strokeWidth="11"
          strokeDasharray={c}
          strokeDashoffset={strokeOffset}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center font-bold text-slate-800 dark:text-slate-100">
        {children}
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  title,
  secs,
  target,
  note,
  tone = "indigo",
  badgeText,
}) {
  const pct = target ? (secs / target) * 100 : 0;
  const done = target > 0 && secs >= target;

  const toneColors = {
    indigo: {
      chip: "text-indigo-600 bg-indigo-50 dark:text-indigo-400 dark:bg-indigo-950/60 border-indigo-200/60 dark:border-indigo-800/60",
      accent: "hover:border-indigo-400/50 dark:hover:border-indigo-500/50",
    },
    sky: {
      chip: "text-sky-600 bg-sky-50 dark:text-sky-400 dark:bg-sky-950/60 border-sky-200/60 dark:border-sky-800/60",
      accent: "hover:border-sky-400/50 dark:hover:border-sky-500/50",
    },
    emerald: {
      chip: "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/60 border-emerald-200/60 dark:border-emerald-800/60",
      accent: "hover:border-emerald-400/50 dark:hover:border-emerald-500/50",
    },
  };

  const currentTone = toneColors[tone] || toneColors.indigo;

  return (
    <div
      className={`group relative flex flex-col justify-between p-5 sm:p-6 rounded-3xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 ${currentTone.accent}`}
    >
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <span
              className={`p-2 rounded-xl border flex items-center justify-center ${currentTone.chip}`}
            >
              <Icon size={18} />
            </span>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {title}
            </h2>
          </div>
          {badgeText && (
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
              {badgeText}
            </span>
          )}
        </div>

        <div className="flex items-center gap-4 sm:gap-5 my-2">
          <Ring pct={pct} done={done} tone={tone}>
            <span className="text-xl font-bold tracking-tight">
              {Math.round(pct)}%
            </span>
            {done && (
              <CheckCircle2 size={13} className="text-emerald-500 -mt-0.5" />
            )}
          </Ring>
          <div className="min-w-0 flex-1">
            <div className="text-2xl sm:text-3xl">
              <Dur secs={secs} />
            </div>
            <div className="text-xs font-medium text-slate-400 dark:text-slate-500 mt-1 mb-2">
              dari {fmtHours(target)}
            </div>
            <div
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                done
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/80 dark:border-slate-700/80"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${done ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`}
              />
              {done
                ? `+${fmt(secs - target)} lebih`
                : `sisa ${fmt(target - secs)}`}
            </div>
          </div>
        </div>
      </div>

      {/* {note && (
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 text-[12px] font-medium text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
          <span className="w-1 h-1 rounded-full bg-slate-400" />
          {note}
        </div>
      )} */}
    </div>
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
  const removeHoliday = (k) =>
    setF({ ...f, holidays: f.holidays.filter((h) => h !== k) });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200"
      onMouseDown={onClose}
    >
      <form
        className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-7 flex flex-col gap-4 text-slate-800 dark:text-slate-100 max-h-[90vh] overflow-y-auto"
        onMouseDown={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          onSave({
            day: num(f.day, 8),
            week: num(f.week, 40),
            days: Math.min(7, Math.max(1, num(f.days, 5))),
            api: f.api.trim().replace(/\/$/, ""),
            holidays: f.holidays,
          });
        }}
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-white">
            <span className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Target size={18} />
            </span>
            Pengaturan Target
          </h3>
          <button
            type="button"
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            onClick={onClose}
            aria-label="Tutup"
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
            Target Harian (jam)
            <input
              type="number"
              min="0"
              step="0.5"
              value={f.day}
              onChange={set("day")}
              className="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 text-sm"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
            Target Mingguan (jam)
            <input
              type="number"
              min="0"
              step="0.5"
              value={f.week}
              onChange={set("week")}
              className="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 text-sm"
            />
          </label>
        </div>

        <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
          Hari Kerja per Minggu
          <input
            type="number"
            min="1"
            max="7"
            step="1"
            value={f.days}
            onChange={set("days")}
            className="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 text-sm"
          />
          <span className="text-[11px] font-normal text-slate-400">
            Target bulanan = target harian × jumlah hari kerja di bulan ini.
          </span>
        </label>

        <div className="flex flex-col gap-2 pt-1">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Palmtree size={14} className="text-emerald-500" /> Libur &amp; Cuti
            Khusus
          </span>
          <div className="flex gap-2">
            <input
              type="date"
              value={newHoliday}
              onChange={(e) => setNewHoliday(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addHoliday();
                }
              }}
              className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            />
            <button
              type="button"
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold flex items-center gap-1.5 transition"
              onClick={addHoliday}
            >
              <Plus size={14} /> Tambah
            </button>
          </div>
          {f.holidays.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-1">
              {f.holidays.map((k) => (
                <span
                  key={k}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20"
                >
                  {longDate(parseKey(k), {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                  })}
                  <button
                    type="button"
                    onClick={() => removeHoliday(k)}
                    className="hover:text-red-500 ml-0.5"
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <span className="text-[11px] text-slate-400">
              Belum ada hari libur kustom ditambahkan.
            </span>
          )}
        </div>

        <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
          Alamat API ActivityWatch
          <input
            type="text"
            value={f.api}
            onChange={set("api")}
            className="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 text-slate-900 dark:text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
          />
          <span className="text-[11px] font-normal text-slate-400">
            Default: /api/0 (via Vite proxy) atau http://localhost:5600/api/0
          </span>
        </label>

        <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            className="px-4 py-2.5 rounded-xl font-semibold text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            onClick={onClose}
          >
            Batal
          </button>
          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl font-semibold text-xs text-white bg-gradient-to-r from-indigo-500 to-violet-600 shadow-md shadow-indigo-500/20 hover:opacity-95 transition"
          >
            Simpan Pengaturan
          </button>
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

  // Dark / Light Mode State
  const [theme, setTheme] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("ta-theme");
      if (saved) return saved;
      return window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    }
    return "dark";
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("ta-theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  };

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
    const y = today.getFullYear(),
      m = today.getMonth();
    const weekStart = addDays(today, -mondayIndex(today));
    const sum = (a, b) => {
      let s = 0;
      for (let x = a; x < b; x = addDays(x, 1)) s += perDay[dayKey(x)] || 0;
      return s;
    };
    const dayT = settings.day * 3600;
    const wd = workdaysInMonth(y, m, settings);
    const monthPrefix = `${y}-${String(m + 1).padStart(2, "0")}`;
    const monthEntries = Object.entries(perDay).filter(([k]) =>
      k.startsWith(monthPrefix),
    );
    const monthSecs = sum(new Date(y, m, 1), addDays(today, 1));
    const activeDays = monthEntries.filter(([, v]) => v >= 60).length;
    const best = monthEntries.reduce((a, e) => (e[1] > a[1] ? e : a), ["", 0]);
    const weekWd = workdaysInWeek(weekStart, settings);
    return {
      y,
      m,
      today,
      dayT,
      wd,
      holidaysInMonth: settings.holidays.filter((k) =>
        k.startsWith(monthPrefix),
      ).length,
      daySecs: perDay[dayKey(today)] || 0,
      weekSecs: sum(weekStart, addDays(today, 1)),
      weekT: (settings.week * 3600 * weekWd) / settings.days,
      weekWd,
      monthSecs,
      activeDays,
      avg: activeDays ? monthSecs / activeDays : 0,
      bestDay: best[0] ? { date: parseKey(best[0]), secs: best[1] } : null,
      ...computeStreak(perDay, today, settings, dayT),
      daysInMonth: new Date(y, m + 1, 0).getDate(),
    };
  }, [perDay, now, settings]);

  const maxBar = Math.max(d.dayT, ...Object.values(perDay), 1);
  const dateLabel = now.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const timeLabel = now.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const avgDelta = d.avg - d.dayT;
  const avgPctOfTarget = d.dayT ? Math.round((d.avg / d.dayT) * 100) : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6">
      {/* Top Navigation Bar */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-xs uppercase tracking-widest">
            <span className="p-1 rounded-md bg-indigo-50 dark:bg-indigo-950/80">
              <Clock size={16} />
            </span>
            Time Activity Tracker
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight mt-1">
            {dateLabel}
          </h1>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="tabular-nums font-mono">{timeLabel}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Dark / Light Mode Toggle Button */}
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2.5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 shadow-sm hover:shadow transition-all"
            title={
              theme === "dark" ? "Ganti ke Mode Terang" : "Ganti ke Mode Gelap"
            }
            aria-label="Toggle Theme"
          >
            {theme === "dark" ? (
              <Sun size={18} className="text-amber-400" />
            ) : (
              <Moon size={18} className="text-indigo-600" />
            )}
          </button>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={load}
            className="p-2.5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 shadow-sm hover:shadow transition-all"
            title="Muat ulang data"
            aria-label="Muat ulang"
          >
            <RefreshCw
              size={18}
              className={loading ? "animate-spin text-indigo-500" : ""}
            />
          </button>

          {/* Settings Button */}
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl font-semibold text-xs text-white bg-gradient-to-r from-indigo-500 to-violet-600 shadow-md shadow-indigo-500/20 hover:shadow-lg hover:shadow-indigo-500/30 hover:opacity-95 transition-all"
          >
            <Settings size={15} />
            <span>Target</span>
          </button>
        </div>
      </header>

      {/* Error Banner */}
      {error && (
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-800 dark:text-rose-300 text-sm animate-in fade-in">
          <AlertTriangle size={20} className="text-rose-500 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold">Gagal mengambil data ActivityWatch</div>
            <div className="text-xs mt-0.5 opacity-90">{error}</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Pastikan ActivityWatch berjalan dan alamat API di pengaturan sudah
              sesuai.
            </div>
          </div>
        </div>
      )}

      {/* ===================== BENTO GRID ===================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* --- BENTO HERO CARD: RATA-RATA HARIAN (DIBUAT SANGAT MENONJOL) --- */}
        <section className="col-span-1 md:col-span-2 lg:col-span-2 relative overflow-hidden rounded-3xl p-6 sm:p-7 bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 text-white shadow-xl shadow-indigo-600/20 border border-indigo-400/30 grid grid-cols-1 sm:grid-cols-2 gap-4 items-stretch group">
          {/* Ambient decorative glowing backlights */}
          <div className="absolute -right-12 -top-12 w-48 h-48 bg-violet-400/25 rounded-full blur-3xl pointer-events-none group-hover:bg-violet-400/35 transition duration-700" />
          <div className="absolute -left-12 -bottom-12 w-48 h-48 bg-indigo-300/20 rounded-full blur-3xl pointer-events-none" />

          {/* Kolom kiri: teks */}
          <div className="relative z-10 flex flex-col justify-between min-w-0">
            <div className="flex flex-col flex-1">
              {/* Top Badge */}
              <div className="flex items-center justify-between mb-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-xs font-bold tracking-wide uppercase">
                  <TrendingUp size={14} className="text-indigo-200" />
                  <span>Rata-rata Harian</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
                </div>
                {/* <span className="text-xs font-semibold text-indigo-100/80 bg-white/10 px-2.5 py-1 rounded-full backdrop-blur-sm">
                Bulan Ini
              </span> */}
              </div>

              {/* Giant Metric Display */}
              <div className="my-2 flex-1 flex items-center">
                <div className="min-w-0">
                  <div className="text-4xl sm:text-5xl md:text-6xl tracking-tight text-white drop-shadow-sm font-black">
                    <Dur
                      secs={d.avg}
                      bigClass="text-4xl sm:text-5xl md:text-6xl font-black"
                      unitClass="text-xl sm:text-2xl font-bold text-indigo-200"
                    />
                  </div>
                  <p className="text-xs sm:text-sm font-medium text-indigo-100/85 mt-2">
                    Dihitung dari{" "}
                    <span className="font-bold text-white underline decoration-indigo-300/50 underline-offset-4">
                      {d.activeDays} hari aktif
                    </span>{" "}
                    bulan ini
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom Standout Progress & Insight */}
            <div className="pt-5 mt-4 border-t border-white/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Target Comparison Pill */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/20 backdrop-blur-md border border-white/25 text-xs font-bold shadow-sm">
                <Zap
                  size={13}
                  className={
                    avgDelta >= 0 ? "text-emerald-300" : "text-amber-300"
                  }
                />
                <span>
                  {avgDelta >= 0
                    ? `+${fmt(avgDelta)} di atas target`
                    : `-${fmt(-avgDelta)} dari target`}
                </span>
              </div>
            </div>
          </div>

          {/* Kolom kanan: animasi */}
          <div className="relative z-10 flex items-center justify-center max-h-[15rem]">
            <DotLottieReact
              src="https://lottie.host/87e01d10-3e6e-4fbd-bfc6-72a2cb7dd992/rWND0bp7sH.lottie"
              loop
              autoplay
              layout={{ fit: "contain", align: [0.5, 0.5] }}
              className="w-full h-full max-w-xs aspect-square"
            />
          </div>
        </section>

        {/* --- BENTO CARD: STREAK TARGET --- */}
        <section className="col-span-1 rounded-3xl p-5 sm:p-6 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 shadow-sm hover:shadow-xl hover:border-amber-400/50 dark:hover:border-amber-500/50 transition-all duration-300 flex flex-col justify-between group">
          <div className="flex items-center justify-between mb-3">
            <span className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <Flame
                size={20}
                className="group-hover:scale-110 transition duration-300 text-amber-500"
              />
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full">
              Streak
            </span>
          </div>

          <div className="my-2 text-center">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Streak Target
            </h2>
            <div className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white mt-1">
              {d.streak}{" "}
              <span className="text-sm font-bold text-slate-400">hari</span>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-[12px] font-medium text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>Rekor terbaik</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">
              {d.best} hari
            </span>
          </div>
        </section>

        {/* --- BENTO CARD: HARI TERBAIK BULAN INI --- */}
        <section className="col-span-1 rounded-3xl p-5 sm:p-6 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 shadow-sm hover:shadow-xl hover:border-yellow-400/50 dark:hover:border-yellow-500/50 transition-all duration-300 flex flex-col justify-between group">
          <div className="flex items-center justify-between mb-3">
            <span className="p-2.5 rounded-2xl bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/20">
              <Trophy
                size={20}
                className="group-hover:scale-110 transition duration-300 text-yellow-500"
              />
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-yellow-600 dark:text-yellow-400 bg-yellow-500/10 px-2.5 py-0.5 rounded-full">
              Puncak
            </span>
          </div>

          <div className="my-2 text-center">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Hari Terbaik
            </h2>
            {d.bestDay ? (
              <div className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white mt-1">
                <Dur secs={d.bestDay.secs} />
              </div>
            ) : (
              <div className="text-sm font-semibold text-slate-400 mt-2">
                Belum ada aktivitas
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-[12px] font-medium text-slate-500 dark:text-slate-400 truncate">
            {d.bestDay
              ? longDate(d.bestDay.date, {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                })
              : "Data belum tersedia"}
          </div>
        </section>

        {/* --- BENTO CARD 4: HARI INI --- */}
        <div className="col-span-1 md:col-span-1 lg:col-span-1">
          <StatCard
            icon={CalendarCheck2}
            title="Hari Ini"
            tone="indigo"
            secs={d.daySecs}
            target={d.dayT}
            badgeText="Target Harian"
          />
        </div>

        {/* --- BENTO CARD 5: MINGGU INI --- */}
        <div className="col-span-1 md:col-span-1 lg:col-span-1">
          <StatCard
            icon={CalendarRange}
            title="Minggu Ini"
            tone="sky"
            secs={d.weekSecs}
            target={d.weekT}
            badgeText="Mingguan"
            note={
              d.weekWd < settings.days
                ? `${d.weekWd} hari kerja minggu ini`
                : null
            }
          />
        </div>

        {/* --- BENTO CARD 6: BULAN INI --- */}
        <div className="col-span-1 md:col-span-2 lg:col-span-2">
          <StatCard
            icon={CalendarDays}
            title="Bulan Ini"
            tone="emerald"
            secs={d.monthSecs}
            target={d.wd * d.dayT}
            badgeText={`${d.wd} hari kerja bulan ini${d.holidaysInMonth ? ` · ${d.holidaysInMonth} cuti/libur` : ""}`}
          />
        </div>

        {/* --- BENTO CARD 7: AKTIVITAS BULANAN & KALENDER BAR CHART (SPAN FULL) --- */}
        <section className="col-span-1 md:col-span-2 lg:col-span-4 rounded-3xl p-5 sm:p-7 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 shadow-sm hover:shadow-lg transition-all duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                <CalendarDays size={18} />
              </span>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  {new Date(d.y, d.m, 1).toLocaleDateString("id-ID", {
                    month: "long",
                    year: "numeric",
                  })}
                </h2>
                <p className="text-xs text-slate-400">
                  Visualisasi jam aktif harian
                </p>
              </div>
            </div>

            {/* Target legend indicator */}
            <div className="flex items-center gap-4 text-xs font-semibold text-slate-500 dark:text-slate-400">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-4 border-t-2 border-dashed border-indigo-400" />
                Target harian ({fmtHours(d.dayT)})
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
                Tercapai
              </span>
            </div>
          </div>

          {/* Bar Chart Container */}
          <div className="relative pt-4 pb-2">
            {/* Target line */}
            {/* <div
              className="absolute left-0 right-0 border-t-2 border-dashed border-indigo-400/60 dark:border-indigo-500/50 pointer-events-none z-10 transition-all duration-500"
              style={{ bottom: `calc(24px + (160px * ${Math.min(1, d.dayT / maxBar)}))` }}
            /> */}

            {/* Bars Grid */}
            <div className="grid grid-flow-col auto-cols-fr gap-1 sm:gap-1.5 h-48 sm:h-52 items-end">
              {Array.from({ length: d.daysInMonth }, (_, i) => {
                const dt = new Date(d.y, d.m, i + 1);
                const s = perDay[dayKey(dt)] || 0;
                const future = dt > d.today;
                const holiday = isHoliday(dt, settings);
                const off = !isWorkday(dt, settings);
                const isToday = dayKey(dt) === dayKey(d.today);
                const heightPct = Math.min(100, (s / maxBar) * 100);
                const targetMet = s >= d.dayT && d.dayT > 0;

                return (
                  <div
                    key={i}
                    className={`group relative flex flex-col items-center h-full justify-end cursor-pointer ${
                      future ? "opacity-35" : ""
                    }`}
                    title={`${longDate(dt, { weekday: "long", day: "numeric", month: "long" })}: ${fmt(s)}${holiday ? " (Libur)" : ""}`}
                  >
                    {/* Floating Tooltip on Hover */}
                    <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 px-2 py-1 rounded-md bg-slate-900 text-white text-[10px] whitespace-nowrap shadow-md">
                      {i + 1}{" "}
                      {new Date(d.y, d.m).toLocaleDateString("id-ID", {
                        month: "short",
                      })}
                      : {fmt(s)}
                    </div>

                    {/* Bar Track */}
                    <div
                      className={`w-full flex-1 max-h-[160px] flex items-end rounded-lg p-0.5 transition-all ${
                        isToday
                          ? "bg-indigo-50 dark:bg-indigo-950/40 ring-2 ring-indigo-500 ring-offset-1 dark:ring-offset-slate-900"
                          : holiday
                            ? "bg-emerald-500/10"
                            : off
                              ? "bg-slate-100/60 dark:bg-slate-800/40"
                              : "bg-slate-100 dark:bg-slate-800/70"
                      }`}
                    >
                      {/* Bar Fill */}
                      <div
                        className={`w-full rounded-md transition-all duration-500 ${
                          targetMet
                            ? "bg-gradient-to-t from-emerald-500 to-teal-400 shadow-sm shadow-emerald-500/20"
                            : isToday
                              ? "bg-gradient-to-t from-indigo-500 to-violet-400"
                              : "bg-gradient-to-t from-indigo-500/80 to-indigo-400/80"
                        }`}
                        style={{
                          height: `${heightPct}%`,
                          minHeight: s > 0 ? "4px" : "0px",
                        }}
                      />
                    </div>

                    {/* Day Number Label */}
                    <span
                      className={`text-[10px] sm:text-xs font-semibold mt-2 ${
                        isToday
                          ? "text-indigo-600 dark:text-indigo-400 font-bold scale-110"
                          : holiday
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-slate-400 dark:text-slate-500"
                      }`}
                    >
                      {i + 1}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="text-center text-xs text-slate-400 dark:text-slate-500 pt-4 pb-6 flex items-center justify-center gap-2">
        <Sparkles size={14} className="text-indigo-400" />
        <span>
          {updated
            ? `Diperbarui ${updated.toLocaleTimeString("id-ID")}`
            : "Memuat…"}
        </span>
        <span>·</span>
        <span>Waktu dihitung saat tidak AFK</span>
      </footer>

      {/* Settings Modal */}
      {open && (
        <SettingsModal
          settings={settings}
          onClose={() => setOpen(false)}
          onSave={(s) => {
            setSettings(s);
            saveSettings(s);
            setOpen(false);
          }}
        />
      )}
    </div>
  );
}
