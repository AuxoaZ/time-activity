export const AFK_PREFIX = "aw-watcher-afk_";

export const DEFAULTS = {
  day: 8,
  week: 40,
  days: 5,
  holidays: [], // "YYYY-MM-DD" dates excluded from work days
  // dev: proxied by Vite. Production build: talk to ActivityWatch directly.
  api: import.meta.env.DEV ? "/api/0" : "http://localhost:5600/api/0",
};

export const loadSettings = () => {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem("ta-settings")) };
  } catch {
    return DEFAULTS;
  }
};
export const saveSettings = (s) => {
  try {
    localStorage.setItem("ta-settings", JSON.stringify(s));
  } catch {}
};

export const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
export const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
export const dayKey = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const mondayIndex = (d) => (d.getDay() + 6) % 7;

export const fmt = (s) => {
  s = Math.max(0, Math.round(s));
  return `${Math.floor(s / 3600)}j ${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}m`;
};

function addEvent(perDay, ts, dur) {
  let t = ts;
  const end = ts + dur * 1000;
  while (t < end) {
    const d = new Date(t);
    const next = addDays(startOfDay(d), 1).getTime();
    const seg = Math.min(end, next) - t;
    const k = dayKey(d);
    perDay[k] = (perDay[k] || 0) + seg / 1000;
    t += seg;
  }
}

export const HISTORY_DAYS = 180;

/** Seconds of not-AFK time per day for the last HISTORY_DAYS days (enough for month, week and streak). */
export async function fetchPerDay(api) {
  const now = new Date();
  const from = addDays(startOfDay(now), -HISTORY_DAYS);
  const to = addDays(startOfDay(now), 1);

  const res = await fetch(`${api}/query/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: [
        `afk = flood(query_bucket(find_bucket("${AFK_PREFIX}")));`,
        `RETURN = filter_keyvals(afk, "status", ["not-afk"]);`,
      ],
      timeperiods: [`${from.toISOString()}/${to.toISOString()}`],
    }),
  });
  if (!res.ok) throw new Error((await res.text()) || `HTTP ${res.status}`);
  const events = (await res.json())[0];
  const perDay = {};
  for (const e of events) addEvent(perDay, Date.parse(e.timestamp), e.duration);
  return perDay;
}

export const isHoliday = (d, s) => s.holidays.includes(dayKey(d));
export const isWorkday = (d, s) => mondayIndex(d) < s.days && !isHoliday(d, s);

export function workdaysInMonth(y, m, s) {
  const n = new Date(y, m + 1, 0).getDate();
  let c = 0;
  for (let d = 1; d <= n; d++) if (isWorkday(new Date(y, m, d), s)) c++;
  return c;
}

export function workdaysInWeek(weekStart, s) {
  let c = 0;
  for (let i = 0; i < 7; i++) if (isWorkday(addDays(weekStart, i), s)) c++;
  return c;
}

/**
 * Streak = consecutive work days (holidays and days off are skipped) that hit the daily target,
 * counted back from today. Today only counts once it is met; it never breaks the streak while pending.
 * best = longest such run within the fetched history.
 */
export function computeStreak(perDay, today, s, dayT) {
  const met = (d) => (perDay[dayKey(d)] || 0) >= dayT;
  let streak = 0;
  for (let i = 0; i <= HISTORY_DAYS; i++) {
    const d = addDays(today, -i);
    if (!isWorkday(d, s)) continue;
    if (met(d)) streak++;
    else if (i === 0) continue;
    else break;
  }
  let best = 0, run = 0;
  for (let i = HISTORY_DAYS; i >= 0; i--) {
    const d = addDays(today, -i);
    if (!isWorkday(d, s)) continue;
    run = met(d) ? run + 1 : 0;
    best = Math.max(best, run);
  }
  return { streak, best };
}
