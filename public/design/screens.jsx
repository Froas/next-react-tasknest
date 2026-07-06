/* TaskNest screens — written theme-agnostically.
   Each screen renders semantic markup; themes restyle via CSS. */

const { useState, useMemo, useEffect } = React;
const D = window.TN_DATA;

/* ============================================================
   SHARED ATOMS
   ============================================================ */
const Pill = ({ kind, value, children }) => (
  <span className={`pill ${kind}-${(value||"").replace(/\s+/g,"-")}`}>{children || value}</span>
);
const Bar = ({ value, color = "" }) => (
  <div className="gc-bar"><i className={color} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></div>
);

const goalProgress = (g) => {
  const t = (g.milestones || []).flatMap(m => m.tasks || []);
  if (!t.length) return 0;
  const done = t.filter(x => x.status === "finished").length;
  return Math.round((done / t.length) * 100);
};
const goalTaskCount = (g) => (g.milestones || []).reduce((a, m) => a + (m.tasks?.length || 0), 0);
const goalFinishedTasks = (g) => (g.milestones || []).flatMap(m => m.tasks || []).filter(t => t.status === "finished").length;

/* ============================================================
   APP SHELL — Sidebar, Topbar, Mobile Tabbar
   ============================================================ */
const Sidebar = ({ route, go, mobileOpen, setMobileOpen }) => {
  const items = window.TN_SCREENS.filter(s => !s.hidden);
  return (
    <>
      {mobileOpen && <div className="sidebar-backdrop" onClick={() => setMobileOpen(false)}></div>}
      <aside className={`sidebar ${mobileOpen ? "open" : ""}`}>
      <div className="sidebar-brand">
        <div className="logo">T</div>
        <b>TaskNest</b>
      </div>
      <div className="sidebar-search" onClick={() => go("search")}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3-3"/></svg>
        <span>Search</span>
        <kbd>⌘K</kbd>
      </div>
      <h4>Workspace</h4>
      <nav>
        {items.map(s => (
          <a key={s.id} className={route === s.id ? "active" : ""} onClick={() => { go(s.id); setMobileOpen(false); }}>
            <span className="ico">{s.icon}</span>
            <span>{s.name}</span>
            {s.id === "tasks" && <span className="count">9</span>}
            {s.id === "goals" && <span className="count">4</span>}
          </a>
        ))}
      </nav>
      <h4>Goals</h4>
      <nav>
        {D.goals.map(g => (
          <a key={g.id} onClick={() => { go("goal/" + g.id); setMobileOpen(false); }}>
            <span className="ico">{g.emoji}</span>
            <span>{g.title.length > 22 ? g.title.slice(0,20)+"…" : g.title}</span>
          </a>
        ))}
      </nav>
      <div className="filler"></div>
      <div className="sidebar-foot">
        <div className="av">{D.user.avatar}</div>
        <span>{D.user.name}</span>
      </div>
    </aside>
    </>
  );
};

const Topbar = ({ route, crumbs, setMobileOpen, go }) => (
  <div className="topbar">
    <button className="mobile-menu btn-icon" onClick={() => setMobileOpen(true)}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
    </button>
    <div className="crumbs">
      {crumbs.map((c, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span>/</span>}
          <span className={i === crumbs.length - 1 ? "current" : ""}>{c}</span>
        </React.Fragment>
      ))}
    </div>
    <div className="spacer"></div>
    <button className="btn-icon" onClick={() => go("search")} title="Search (⌘K)">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3-3"/></svg>
    </button>
    <button className="btn-icon" title="Notifications">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10 21a2 2 0 0 0 4 0"/></svg>
    </button>
    <button className="btn-icon" onClick={() => go("settings")} title="Settings">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
    </button>
  </div>
);

const MobileTabbar = ({ route, go }) => {
  const items = window.TN_SCREENS.filter(s => ["today","goals","tasks","calendar","settings"].includes(s.id));
  return (
    <nav className="mobile-tabbar">
      {items.map(s => (
        <a key={s.id} className={route === s.id ? "active" : ""} onClick={() => go(s.id)}>
          <span className="ico">{s.icon}</span>
          <span>{s.name}</span>
        </a>
      ))}
    </nav>
  );
};

/* ============================================================
   SCREEN: TODAY (Dashboard)
   ============================================================ */
const ScreenToday = ({ go }) => {
  window.useTnStore();
  const todayDate = "Tuesday, May 19, 2026";
  return (
    <div className="page">
      <div className="page-head">
        <div className="page-eyebrow">{todayDate} · Week 21</div>
        <h1 className="page-title">Good morning, {D.user.name.split(" ")[0]}.</h1>
        <p className="page-lede">The MDX pipeline is the only thing standing between you and the brand site shipping in August. Tempo run at five — eat by three.</p>
      </div>

      <div className="section">
        <div className="stats">
          <div className="stat"><div className="s-label">Active goals</div><div className="s-value">4</div><div className="s-delta">3 in motion</div></div>
          <div className="stat"><div className="s-label">Done this week</div><div className="s-value">12<small>/18</small></div><div className="s-delta up">↑ 2 ahead of pace</div></div>
          <div className="stat"><div className="s-label">Streak</div><div className="s-value">{D.stats.streakDays}<small>d</small></div><div className="s-delta">writing, daily</div></div>
          <div className="stat"><div className="s-label">Focus, last 7d</div><div className="s-value">{D.stats.weekFocusHours}<small>h</small></div><div className="s-delta up">+18%</div></div>
        </div>
      </div>

      <div className="section" style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 24 }}>
        <div>
          <div className="section-head">
            <h2>Today's schedule</h2>
            <span className="count">7 events · 1 done</span>
            <div className="spacer"></div>
            <span className="more" onClick={() => go("calendar")}>View week →</span>
          </div>
          <div className="card" style={{ padding: 0 }}>
            <div style={{ padding: "8px 20px" }}>
              {D.today.map(t => (
                <div key={t.id} className={`task-row ${t.status === "finished" ? "done" : ""}`}>
                  <span className="cb" onClick={() => { window.tnStore.toggleTask(t.id); }}></span>
                  <span className="t-time">{t.time}</span>
                  <div className="t-body">
                    <span className="t-title">{t.title}</span>
                    <div className="t-meta">{t.end} · {D.goals.find(g => g.id === t.goal)?.title}</div>
                  </div>
                  <Pill kind="tag" value={t.tag} />
                  <span className="t-meta">{t.status === "finished" ? "✓" : (t.status === "in progress" ? "•" : "")}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div>
          <div className="section-head"><h2>This week</h2></div>
          <div className="card">
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: "var(--tn-fg-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Tasks complete</div>
              <div style={{ fontSize: 32, fontWeight: 600, letterSpacing: "-0.02em", lineHeight: 1 }}>{D.stats.finishedTasks}<small style={{fontSize:16,color:"var(--tn-fg-muted)",fontWeight:400}}>/{D.stats.totalTasks}</small></div>
              <Bar value={D.stats.weekTaskCloseRate * 100} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: "var(--tn-fg-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Mileage</div>
              <div style={{ fontSize: 32, fontWeight: 600, letterSpacing: "-0.02em", lineHeight: 1 }}>{D.stats.weekMileage}<small style={{fontSize:16,color:"var(--tn-fg-muted)",fontWeight:400}}>/{D.stats.weekMileageTarget} km</small></div>
              <Bar value={(D.stats.weekMileage / D.stats.weekMileageTarget) * 100} color="moss" />
            </div>
            <div>
              <div style={{ fontSize: 11, color: "var(--tn-fg-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Focus history · 14d</div>
              <div className="spark">
                {D.stats.focusHistory.map((h, i) => (
                  <i key={i} className={i === D.stats.focusHistory.length - 1 ? "now" : ""} style={{ height: `${h * 8}px` }} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="section">
        <div className="section-head">
          <h2>Goals in motion</h2>
          <span className="count">4 active</span>
          <div className="spacer"></div>
          <span className="more" onClick={() => go("goals")}>View all →</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {D.goals.map(g => (
            <div key={g.id} className="goal-card" onClick={() => go("goal/" + g.id)}>
              <div className="gc-head">
                <div className={`gc-ico ${g.color}`}>{g.emoji}</div>
                <h3>{g.title}</h3>
              </div>
              <p>{g.description.split(".")[0]}.</p>
              <div className="gc-progress">
                <span className="gc-pct">{goalProgress(g)}<small>%</small></span>
                <Bar value={goalProgress(g)} color={g.color} />
              </div>
              <div className="gc-meta">
                <span>Due <b>{new Date(g.due).toLocaleDateString("en-US",{month:"short",day:"numeric"})}</b></span>
                <span>{g.milestones.length} milestones</span>
                <Pill kind="priority" value={g.priority} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ============================================================
   SCREEN: GOALS LIST
   ============================================================ */
const ScreenGoals = ({ go }) => {
  const [filter, setFilter] = useState("all");
  const filtered = D.goals.filter(g =>
    filter === "all" ? true :
    filter === "active" ? g.status !== "finished" :
    filter === "high" ? g.priority === "high" : true
  );
  return (
    <div className="page">
      <div className="page-head">
        <div className="page-eyebrow">4 goals · 3 active</div>
        <h1 className="page-title">Goals</h1>
        <p className="page-lede">Each goal breaks down into milestones, then tasks, then daily todos. Click a goal to drill in.</p>
      </div>
      <div className="section">
        <div style={{ display: "flex", gap: 8, marginBottom: 20, alignItems: "center" }}>
          {["all","active","high"].map(f => (
            <button key={f} className={`btn ${filter === f ? "btn-primary" : "btn-secondary"}`} onClick={() => setFilter(f)}>
              {f === "all" ? "All goals" : f === "active" ? "Active" : "High priority"}
            </button>
          ))}
          <div style={{ flex: 1 }}></div>
          <button className="btn btn-primary">+ New goal</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {filtered.map(g => (
            <div key={g.id} className="goal-card" onClick={() => go("goal/" + g.id)}>
              <div className="gc-head">
                <div className={`gc-ico ${g.color}`}>{g.emoji}</div>
                <h3>{g.title}</h3>
              </div>
              <p>{g.description}</p>
              <div className="gc-progress">
                <span className="gc-pct">{goalProgress(g)}<small>%</small></span>
                <Bar value={goalProgress(g)} color={g.color} />
              </div>
              <div className="gc-meta">
                <span>Due <b>{new Date(g.due).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}</b></span>
                <span>{goalFinishedTasks(g)}/{goalTaskCount(g)} tasks</span>
                <Pill kind="status" value={g.status} />
                <Pill kind="priority" value={g.priority} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ============================================================
   SCREEN: GOAL DETAIL
   ============================================================ */
const ScreenGoalDetail = ({ id, go }) => {
  const g = D.goals.find(x => x.id === id);
  if (!g) return <div className="page"><h1 className="page-title">Goal not found</h1></div>;
  const [openMs, setOpenMs] = useState(new Set(g.milestones.map(m => m.id)));
  const toggle = id => setOpenMs(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  return (
    <div className="page">
      <div className="page-head">
        <div className="page-eyebrow"><a onClick={() => go("goals")} style={{cursor:"pointer"}}>← Goals</a></div>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
          <div className={`gc-ico ${g.color}`} style={{ width: 56, height: 56, fontSize: 30, borderRadius: 12 }}>{g.emoji}</div>
          <div style={{ flex: 1 }}>
            <h1 className="page-title">{g.title}</h1>
            <p className="page-lede" style={{ marginTop: 8 }}>{g.description}</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <Pill kind="status" value={g.status} />
          <Pill kind="priority" value={g.priority} />
          {g.tags.map(t => <Pill key={t} kind="tag" value={t} />)}
        </div>
      </div>

      <div className="section">
        <div className="stats">
          <div className="stat"><div className="s-label">Progress</div><div className="s-value">{goalProgress(g)}<small>%</small></div></div>
          <div className="stat"><div className="s-label">Tasks</div><div className="s-value">{goalFinishedTasks(g)}<small>/{goalTaskCount(g)}</small></div></div>
          <div className="stat"><div className="s-label">Milestones</div><div className="s-value">{g.milestones.filter(m=>m.status==="finished").length}<small>/{g.milestones.length}</small></div></div>
          <div className="stat"><div className="s-label">Due</div><div className="s-value" style={{fontSize:20}}>{new Date(g.due).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}</div></div>
        </div>
      </div>

      <div className="section">
        <div className="section-head"><h2>Milestones</h2><span className="count">{g.milestones.length}</span><div className="spacer"></div><button className="btn btn-secondary">+ Add milestone</button></div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {g.milestones.map(m => (
            <div key={m.id} className="card" style={{ padding: 0 }}>
              <div onClick={() => toggle(m.id)} style={{ padding: "18px 20px", cursor: "pointer", display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 12, color: "var(--tn-fg-muted)" }}>{openMs.has(m.id) ? "▾" : "▸"}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 4 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 600 }}>{m.title}</h3>
                    <Pill kind="status" value={m.status} />
                  </div>
                  <p style={{ fontSize: 13, color: "var(--tn-fg-muted)" }}>{m.description}</p>
                </div>
                <div style={{ minWidth: 80, textAlign: "right" }}>
                  <div style={{ fontSize: 12, color: "var(--tn-fg-muted)" }}>Due</div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{new Date(m.due).toLocaleDateString("en-US",{month:"short",day:"numeric"})}</div>
                </div>
              </div>
              {openMs.has(m.id) && (
                <div style={{ borderTop: "var(--tn-line)", padding: "8px 20px 14px" }}>
                  {m.tasks.length === 0 && <p style={{ fontSize: 13, color: "var(--tn-fg-muted)", padding: "10px 0" }}>No tasks yet.</p>}
                  {m.tasks.map(t => (
                    <div key={t.id} className={`task-row ${t.status === "finished" ? "done" : ""}`}>
                      <span className="cb"></span>
                      <span></span>
                      <div className="t-body">
                        <span className="t-title">{t.title}</span>
                        <div className="t-meta">{t.description}{t.due ? ` · due ${new Date(t.due).toLocaleDateString("en-US",{month:"short",day:"numeric"})}` : ""}</div>
                      </div>
                      <Pill kind="status" value={t.status} />
                      <Pill kind="priority" value={t.priority} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ============================================================
   SCREEN: TASKS LIST
   ============================================================ */
const ScreenTasks = ({ go }) => {
  window.useTnStore();
  const [tab, setTab] = useState("today");
  const all = D.goals.flatMap(g => (g.milestones||[]).flatMap(m => (m.tasks||[]).map(t => ({ ...t, goalId: g.id, goalTitle: g.title, goalColor: g.color }))));
  const today = D.today.map(e => ({ id: e.id, title: e.title, status: e.status, time: e.time, tag: e.tag, goalId: e.goal, goalTitle: D.goals.find(g => g.id === e.goal)?.title || "" }));
  const inbox = all.filter(t => t.status === "outstanding");
  const upcoming = all.filter(t => t.due && t.status !== "finished").sort((a,b) => a.due > b.due ? 1 : -1);
  const done = all.filter(t => t.status === "finished");
  const list = tab === "today" ? today : tab === "inbox" ? inbox : tab === "upcoming" ? upcoming : done;
  return (
    <div className="page">
      <div className="page-head">
        <div className="page-eyebrow">{all.length} tasks · {done.length} done</div>
        <h1 className="page-title">Tasks</h1>
        <p className="page-lede">Filter by today, inbox, upcoming, or done. Quick-add at the top.</p>
      </div>
      <div className="section">
        <input placeholder="+ Add task — type and press Enter…" style={{ width: "100%", padding: "12px 16px", borderRadius: 8, border: "var(--tn-line)", background: "var(--tn-card)", color: "var(--tn-fg)", marginBottom: 18, fontSize: 14 }} />
        <div style={{ display: "flex", gap: 4, marginBottom: 16, borderBottom: "var(--tn-line)" }}>
          {[["today","Today",today.length],["inbox","Inbox",inbox.length],["upcoming","Upcoming",upcoming.length],["done","Done",done.length]].map(([k,n,c]) => (
            <button key={k} onClick={() => setTab(k)} style={{ padding: "10px 16px", fontSize: 14, fontWeight: 500, color: tab === k ? "var(--tn-fg)" : "var(--tn-fg-muted)", borderBottom: tab === k ? "2px solid var(--tn-accent)" : "2px solid transparent", marginBottom: -1 }}>
              {n} <span style={{ color: "var(--tn-fg-muted)", fontWeight: 400, marginLeft: 4 }}>{c}</span>
            </button>
          ))}
        </div>
        <div className="card" style={{ padding: 0 }}>
          {list.length === 0 ? (
            <EmptyState
              icon={tab === "done" ? "✓" : "✦"}
              title={tab === "done" ? "Nothing closed yet" : tab === "inbox" ? "Inbox is clear" : tab === "upcoming" ? "Nothing scheduled ahead" : "Nothing left for today"}
              body={tab === "done" ? "Finished tasks show up here. Close one to see it appear." : tab === "inbox" ? "Tasks without a due date land here. Add one to start." : tab === "upcoming" ? "Schedule tasks with a due date and they'll appear here." : "All your day's tasks are done. Take a breath, or schedule tomorrow."}
              ctaText={tab === "today" ? null : "+ Add a task"}
              onCta={() => {}}
            />
          ) : (
            <div style={{ padding: "8px 20px" }}>
              {list.map(t => (
                <div key={t.id} className={`task-row ${t.status === "finished" ? "done" : ""}`} style={{ cursor: t.goalId ? "pointer" : "default" }} onClick={() => t.goalId && go("task/" + t.id)}>
                  <span className="cb" onClick={e => { e.stopPropagation(); window.tnStore.toggleTask(t.id); }}></span>
                  {t.time && <span className="t-time">{t.time}</span>}
                  <div className="t-body">
                    <span className="t-title">{t.title}</span>
                    <div className="t-meta">{t.goalTitle}{t.due ? ` · due ${new Date(t.due).toLocaleDateString("en-US",{month:"short",day:"numeric"})}` : ""}</div>
                  </div>
                  {t.tag && <Pill kind="tag" value={t.tag} />}
                  {t.priority && <Pill kind="priority" value={t.priority} />}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ============================================================
   SCREEN: CALENDAR
   ============================================================ */
const ScreenCalendar = ({ go }) => {
  const [view, setView] = useState("month"); // month | week
  const [d, setD] = useState(new Date(2026, 4, 19));
  const monthName = d.toLocaleString("en-US", { month: "long", year: "numeric" });
  const first = new Date(d.getFullYear(), d.getMonth(), 1);
  const startOffset = (first.getDay() + 6) % 7; // Monday-first
  const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let i = 1; i <= daysInMonth; i++) cells.push(new Date(d.getFullYear(), d.getMonth(), i));
  while (cells.length % 7) cells.push(null);
  const itemsFor = (day) => D.calendar.filter(it => {
    const x = new Date(it.date);
    return x.getFullYear() === day.getFullYear() && x.getMonth() === day.getMonth() && x.getDate() === day.getDate();
  });
  const todayCal = new Date(2026, 4, 19);
  return (
    <div className="page">
      <div className="page-head">
        <div className="page-eyebrow">{D.calendar.length} items this month</div>
        <h1 className="page-title">Calendar</h1>
        <p className="page-lede">Tasks, milestones and events together. Click a day to focus.</p>
      </div>
      <div className="section">
        <div style={{ display: "flex", alignItems: "center", marginBottom: 18, gap: 10 }}>
          <button className="btn btn-secondary" onClick={() => setD(new Date(d.getFullYear(), d.getMonth() - 1, 1))}>←</button>
          <h2 style={{ fontSize: 20, fontWeight: 600, minWidth: 200 }}>{monthName}</h2>
          <button className="btn btn-secondary" onClick={() => setD(new Date(d.getFullYear(), d.getMonth() + 1, 1))}>→</button>
          <div style={{ flex: 1 }}></div>
          <button className={`btn ${view === "month" ? "btn-primary" : "btn-secondary"}`} onClick={() => setView("month")}>Month</button>
          <button className={`btn ${view === "week" ? "btn-primary" : "btn-secondary"}`} onClick={() => setView("week")}>Week</button>
          <button className="btn btn-primary">+ Event</button>
        </div>
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)" }}>
            {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(w => (
              <div key={w} style={{ padding: "10px 12px", fontSize: 11, fontWeight: 500, color: "var(--tn-fg-muted)", letterSpacing: "0.06em", textTransform: "uppercase", borderBottom: "var(--tn-line)", borderRight: "var(--tn-line)" }}>{w}</div>
            ))}
            {cells.map((c, i) => {
              const items = c ? itemsFor(c) : [];
              const isToday = c && c.toDateString() === todayCal.toDateString();
              return (
                <div key={i} style={{ minHeight: 96, padding: "8px 10px", borderBottom: "var(--tn-line)", borderRight: "var(--tn-line)", background: isToday ? "var(--tn-hover)" : "transparent" }}>
                  {c && (
                    <>
                      <div style={{ fontSize: 12, fontWeight: isToday ? 700 : 500, color: isToday ? "var(--tn-accent)" : "var(--tn-fg-muted)", marginBottom: 4 }}>{c.getDate()}</div>
                      {items.map((it, j) => (
                        <div key={j} style={{ fontSize: 11, padding: "2px 6px", borderRadius: 3, background: "var(--tn-chip)", marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.title}</div>
                      ))}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ============================================================
   SCREEN: NOTES
   ============================================================ */
const ScreenNotes = ({ go }) => {
  const [sel, setSel] = useState(D.notes[0]);
  return (
    <div className="page" style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 24, maxWidth: 1400 }}>
      <div>
        <div className="page-eyebrow" style={{ marginBottom: 14 }}>{D.notes.length} notes</div>
        <h1 className="page-title" style={{ fontSize: 24, marginBottom: 16 }}>Notes</h1>
        <button className="btn btn-primary" style={{ marginBottom: 18, width: "100%" }}>+ New note</button>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {D.notes.map(n => (
            <div key={n.id} onClick={() => setSel(n)} style={{ padding: "12px 14px", borderRadius: 8, cursor: "pointer", background: sel?.id === n.id ? "var(--tn-active)" : "transparent" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                {n.pinned && <span style={{ fontSize: 11, color: "var(--tn-accent)" }}>★</span>}
                <b style={{ fontSize: 14, fontWeight: 600 }}>{n.title}</b>
              </div>
              <p style={{ fontSize: 12, color: "var(--tn-fg-muted)", marginTop: 4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{n.body}</p>
              <div style={{ display: "flex", gap: 8, marginTop: 6, alignItems: "center" }}>
                <Pill kind="tag" value={n.tag} />
                <span style={{ fontSize: 11, color: "var(--tn-fg-muted)" }}>{new Date(n.date).toLocaleDateString("en-US",{month:"short",day:"numeric"})}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div>
        {sel && (
          <div className="card">
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <Pill kind="tag" value={sel.tag} />
              <span style={{ fontSize: 12, color: "var(--tn-fg-muted)" }}>Edited {new Date(sel.date).toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"})}</span>
              {sel.pinned && <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--tn-accent)" }}>★ pinned</span>}
            </div>
            <h2 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 14 }}>{sel.title}</h2>
            <p style={{ fontSize: 15, lineHeight: 1.7, color: "var(--tn-fg)" }}>{sel.body}</p>
          </div>
        )}
      </div>
    </div>
  );
};

/* ============================================================
   SCREEN: REVIEW / STATS
   ============================================================ */
const ScreenReview = ({ go }) => (
  <div className="page">
    <div className="page-head">
      <div className="page-eyebrow">Week 21 · 14 — 20 May</div>
      <h1 className="page-title">Review</h1>
      <p className="page-lede">A weekly look at where you spent attention, and where the work moved.</p>
    </div>
    <div className="section">
      <div className="stats">
        <div className="stat"><div className="s-label">Tasks closed</div><div className="s-value">12</div><div className="s-delta up">+3 vs last week</div></div>
        <div className="stat"><div className="s-label">Focus hours</div><div className="s-value">42.5</div><div className="s-delta up">+18% vs avg</div></div>
        <div className="stat"><div className="s-label">Streak</div><div className="s-value">13<small>d</small></div><div className="s-delta">writing unbroken</div></div>
        <div className="stat"><div className="s-label">Overdue</div><div className="s-value">1</div><div className="s-delta down">deploy-to-vercel</div></div>
      </div>
    </div>
    <div className="section">
      <div className="section-head"><h2>Time, by goal</h2></div>
      <div className="card">
        <div style={{ display: "flex", gap: 0, height: 12, borderRadius: 6, overflow: "hidden", marginBottom: 14 }}>
          <div style={{ flex: 38, background: "var(--tn-warm)" }}></div>
          <div style={{ flex: 24, background: "var(--tn-moss)" }}></div>
          <div style={{ flex: 22, background: "var(--tn-slate)" }}></div>
          <div style={{ flex: 16, background: "var(--tn-plum)" }}></div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
          <div><div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: "var(--tn-warm)" }}></span><b style={{ fontSize: 13 }}>Brand</b></div><div style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em" }}>16.2<small style={{ fontSize: 12, color: "var(--tn-fg-muted)", fontWeight: 400 }}>h</small></div></div>
          <div><div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: "var(--tn-moss)" }}></span><b style={{ fontSize: 13 }}>Run</b></div><div style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em" }}>10.0<small style={{ fontSize: 12, color: "var(--tn-fg-muted)", fontWeight: 400 }}>h</small></div></div>
          <div><div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: "var(--tn-slate)" }}></span><b style={{ fontSize: 13 }}>Read</b></div><div style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em" }}>9.3<small style={{ fontSize: 12, color: "var(--tn-fg-muted)", fontWeight: 400 }}>h</small></div></div>
          <div><div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: "var(--tn-plum)" }}></span><b style={{ fontSize: 13 }}>Work</b></div><div style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em" }}>7.0<small style={{ fontSize: 12, color: "var(--tn-fg-muted)", fontWeight: 400 }}>h</small></div></div>
        </div>
      </div>
    </div>
    <div className="section">
      <div className="section-head"><h2>Wins &amp; misses</h2></div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div className="card">
          <h3 style={{ fontSize: 14, color: "var(--tn-good)", marginBottom: 12, letterSpacing: "0.04em", textTransform: "uppercase" }}>★ Wins</h3>
          <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
            <li style={{ fontSize: 14 }}>✓ Locked the MDX frontmatter parser ahead of schedule.</li>
            <li style={{ fontSize: 14 }}>✓ 13-day writing streak — longest this year.</li>
            <li style={{ fontSize: 14 }}>✓ Beta call patterns confirmed import bug priority.</li>
          </ul>
        </div>
        <div className="card">
          <h3 style={{ fontSize: 14, color: "var(--tn-bad)", marginBottom: 12, letterSpacing: "0.04em", textTransform: "uppercase" }}>○ Misses</h3>
          <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
            <li style={{ fontSize: 14 }}>○ Vercel deploy slipped past May 8.</li>
            <li style={{ fontSize: 14 }}>○ Missed Saturday's long run — recovered Sunday.</li>
            <li style={{ fontSize: 14 }}>○ Acme case study draft still at 0%.</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
);

/* ============================================================
   SCREEN: SEARCH (overlay-only — rendered separately)
   ============================================================ */
const SearchOverlay = ({ close, go }) => {
  const [q, setQ] = useState("");
  const results = useMemo(() => {
    if (!q) return [
      { kind: "Goal", title: "Launch personal brand site", to: "goal/g1" },
      { kind: "Task", title: "Set up MDX pipeline", to: "tasks" },
      { kind: "Note", title: "MDX is the critical path", to: "notes" },
      { kind: "Goal", title: "Run a half marathon", to: "goal/g2" },
    ];
    const ql = q.toLowerCase();
    const matches = [];
    D.goals.forEach(g => {
      if (g.title.toLowerCase().includes(ql)) matches.push({ kind: "Goal", title: g.title, to: "goal/" + g.id });
    });
    D.goals.flatMap(g => g.milestones).forEach(m => {
      if (m.title.toLowerCase().includes(ql)) matches.push({ kind: "Milestone", title: m.title, to: "goals" });
    });
    D.goals.flatMap(g => g.milestones.flatMap(m => m.tasks)).forEach(t => {
      if (t.title.toLowerCase().includes(ql)) matches.push({ kind: "Task", title: t.title, to: "tasks" });
    });
    D.notes.forEach(n => {
      if (n.title.toLowerCase().includes(ql) || n.body.toLowerCase().includes(ql)) matches.push({ kind: "Note", title: n.title, to: "notes" });
    });
    return matches.slice(0, 10);
  }, [q]);
  return (
    <div className="search-overlay" onClick={close}>
      <div className="panel" onClick={e => e.stopPropagation()}>
        <input autoFocus placeholder="Search goals, tasks, notes — or jump to a screen…" value={q} onChange={e => setQ(e.target.value)} />
        <div className="results">
          {results.map((r, i) => (
            <div key={i} className="result" onClick={() => { go(r.to); close(); }}>
              <span>{r.title}</span>
              <span className="kind">{r.kind}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ============================================================
   SCREEN: SETTINGS (with theme picker)
   ============================================================ */
const ScreenSettings = ({ go, theme, setTheme, sub }) => {
  const subPages = [
    { id: "account",       label: "Account",       group: "Account" },
    { id: "notifications", label: "Notifications", group: "Account" },
    { id: "privacy",       label: "Privacy",       group: "Account" },
    { id: "workspace",     label: "Workspace",     group: "Workspace" },
    { id: "calendar",      label: "Calendar",      group: "Workspace" },
    { id: "integrations",  label: "Integrations",  group: "Workspace" },
    { id: "data",          label: "Data & export", group: "Workspace" },
    { id: "themes",        label: "Themes",        group: "Appearance" },
    { id: "shortcuts",     label: "Keyboard",      group: "Appearance" },
    { id: "billing",       label: "Billing",       group: "Other" },
    { id: "about",         label: "About",         group: "Other" },
  ];
  const cur = sub || "themes";
  const grouped = subPages.reduce((a, s) => { (a[s.group] = a[s.group] || []).push(s); return a; }, {});
  return (
    <div className="page" style={{ display: "grid", gridTemplateColumns: "210px 1fr", gap: 36, maxWidth: 1200 }}>
      <div>
        <h1 className="page-title" style={{ fontSize: 22, marginBottom: 14 }}>Settings</h1>
        <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {Object.entries(grouped).map(([group, items]) => (
            <React.Fragment key={group}>
              <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--tn-fg-muted)", padding: "12px 12px 4px" }}>{group}</div>
              {items.map(s => (
                <a key={s.id} onClick={() => go("settings/" + s.id)} style={{ padding: "7px 12px", borderRadius: 6, cursor: "pointer", fontSize: 13.5, background: cur === s.id ? "var(--tn-active)" : "transparent", fontWeight: cur === s.id ? 500 : 400 }}>
                  {s.label}
                </a>
              ))}
            </React.Fragment>
          ))}
        </nav>
      </div>
      <div>
        {cur === "themes" ? <SettingsThemes theme={theme} setTheme={setTheme} /> :
         cur === "account" ? <SettingsAccount /> :
         cur === "notifications" ? <SettingsNotifications /> :
         cur === "integrations" ? <SettingsIntegrations /> :
         cur === "billing" ? <SettingsBilling /> :
         cur === "telegram" ? <window.SettingsIntegrationDetail kind="telegram" /> :
         cur === "google" ? <window.SettingsIntegrationDetail kind="google" /> :
         cur === "calendar" ? <window.SettingsCalendar /> :
         cur === "shortcuts" ? <window.SettingsShortcuts /> :
         cur === "data" ? <window.SettingsData /> :
         cur === "workspace" ? <window.SettingsWorkspace /> :
         cur === "privacy" ? <SettingsPrivacy /> :
         <SettingsAbout />}
      </div>
    </div>
  );
};

const SettingsPrivacy = () => (
  <div>
    <div className="page-eyebrow">Account · Privacy</div>
    <h2 className="page-title" style={{ fontSize: 28, marginTop: 8, marginBottom: 28 }}>Privacy</h2>
    <div className="card" style={{ marginBottom: 16 }}>
      <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Public profile</h3>
      {[
        ["Show name on shared links",     "When you share a goal or note, your name appears",      true],
        ["Allow indexing by search engines","Pages you make public appear in Google results",       false],
        ["Show activity status",          "Let collaborators see when you're active",                 true],
      ].map(([n,d,v]) => (
        <div key={n} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 0", borderTop: "var(--tn-line)" }}>
          <div><b style={{ fontSize: 14, fontWeight: 500 }}>{n}</b><div style={{ fontSize: 12.5, color: "var(--tn-fg-muted)" }}>{d}</div></div>
          <Toggle on={v} />
        </div>
      ))}
    </div>
    <div className="card" style={{ marginBottom: 16 }}>
      <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Analytics &amp; telemetry</h3>
      {[
        ["Product analytics", "Anonymous usage to help us improve",                                   true],
        ["Crash reports",     "Send error logs when something breaks",                                 true],
        ["Marketing emails",  "Tips, what's new, occasional surveys",                                  false],
      ].map(([n,d,v]) => (
        <div key={n} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 0", borderTop: "var(--tn-line)" }}>
          <div><b style={{ fontSize: 14, fontWeight: 500 }}>{n}</b><div style={{ fontSize: 12.5, color: "var(--tn-fg-muted)" }}>{d}</div></div>
          <Toggle on={v} />
        </div>
      ))}
    </div>
    <div className="card">
      <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Active sessions</h3>
      {[
        ["MacBook Pro · Safari",  "London, UK · This device",        true],
        ["iPhone 14 · TaskNest",  "London, UK · 2 hours ago",        false],
        ["Chrome · Linux",        "Berlin, DE · 3 days ago",         false],
      ].map(([d,w,active]) => (
        <div key={d} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderTop: "var(--tn-line)" }}>
          <div><b style={{ fontSize: 14, fontWeight: 500 }}>{d}</b><div style={{ fontSize: 12.5, color: "var(--tn-fg-muted)" }}>{w}</div></div>
          {active ? <Pill kind="status" value="finished">This device</Pill> : <button className="btn btn-ghost" style={{ padding: "4px 10px", fontSize: 12, color: "var(--tn-bad)" }}>Sign out</button>}
        </div>
      ))}
    </div>
  </div>
);

const SettingsThemes = ({ theme, setTheme }) => {
  const cur = window.TN_THEMES.find(t => t.id === theme);
  return (
    <div>
      <div className="page-eyebrow">Appearance · Themes</div>
      <h2 className="page-title" style={{ fontSize: 28, marginTop: 8 }}>Pick a theme</h2>
      <p className="page-lede" style={{ marginTop: 8, marginBottom: 28 }}>TaskNest changes its whole personality with one click. Your data stays the same; the look adapts to your mood, the time of day, or the kind of work ahead.</p>

      <div className="card" style={{ display: "flex", alignItems: "center", gap: 18, padding: 20, marginBottom: 28 }}>
        <div style={{ width: 56, height: 56, borderRadius: 12, display: "flex", flexWrap: "wrap", overflow: "hidden", border: "var(--tn-line)", flexShrink: 0 }}>
          {cur.swatches.map((c, i) => <i key={i} style={{ width: "50%", height: "50%", background: c }} />)}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: "var(--tn-fg-muted)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Currently applied</div>
          <b style={{ fontSize: 17, fontWeight: 600 }}>{cur.name}</b>
          <p style={{ fontSize: 13, color: "var(--tn-fg-muted)" }}>{cur.tagline}</p>
        </div>
        <button className="btn btn-secondary">Reset</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
        {window.TN_THEMES.map(t => (
          <div key={t.id} onClick={() => setTheme(t.id)} style={{ background: "var(--tn-card)", border: theme === t.id ? "2px solid var(--tn-accent)" : "var(--tn-card-border)", borderRadius: 12, overflow: "hidden", cursor: "pointer", position: "relative" }}>
            {theme === t.id && <span style={{ position: "absolute", top: 10, right: 10, background: "var(--tn-accent)", color: "var(--tn-on-accent)", fontSize: 10, padding: "3px 8px", borderRadius: 999, fontWeight: 600, letterSpacing: "0.04em", zIndex: 1 }}>✓ APPLIED</span>}
            <div style={{ aspectRatio: "14/9", display: "flex", flexWrap: "wrap", overflow: "hidden" }}>
              {t.swatches.map((c, i) => <i key={i} style={{ width: "50%", height: "50%", background: c }} />)}
            </div>
            <div style={{ padding: "14px 16px 16px", borderTop: "var(--tn-line)" }}>
              <b style={{ fontSize: 14, fontWeight: 600 }}>{t.name}</b>
              <p style={{ fontSize: 12, color: "var(--tn-fg-muted)", marginTop: 4, lineHeight: 1.45 }}>{t.tagline}</p>
              <div style={{ fontSize: 11, color: "var(--tn-fg-muted)", marginTop: 8, letterSpacing: "0.04em" }}>{t.family}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const SettingsAccount = () => (
  <div>
    <div className="page-eyebrow">Account</div>
    <h2 className="page-title" style={{ fontSize: 28, marginTop: 8, marginBottom: 28 }}>Account</h2>
    <div className="card" style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--tn-accent-2)", color: "white", display: "grid", placeItems: "center", fontSize: 22, fontWeight: 700 }}>{D.user.avatar}</div>
        <div>
          <b style={{ fontSize: 18 }}>{D.user.name}</b>
          <div style={{ fontSize: 13, color: "var(--tn-fg-muted)" }}>@{D.user.handle} · joined Aug 2025</div>
        </div>
        <div style={{ marginLeft: "auto" }}><button className="btn btn-secondary">Change avatar</button></div>
      </div>
      <Field label="Full name" value={D.user.name} />
      <Field label="Email" value={D.user.email} />
      <Field label="Handle" value={"@" + D.user.handle} />
    </div>
    <div className="card">
      <h3 style={{ fontSize: 14, marginBottom: 14, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--tn-fg-muted)" }}>Danger zone</h3>
      <button className="btn btn-secondary" style={{ color: "var(--tn-bad)" }}>Delete account</button>
    </div>
  </div>
);
const Field = ({ label, value }) => (
  <div style={{ display: "grid", gridTemplateColumns: "140px 1fr auto", gap: 12, alignItems: "center", padding: "10px 0", borderBottom: "var(--tn-line)" }}>
    <span style={{ fontSize: 13, color: "var(--tn-fg-muted)" }}>{label}</span>
    <span style={{ fontSize: 14 }}>{value}</span>
    <button className="btn btn-ghost" style={{ padding: "4px 10px" }}>Edit</button>
  </div>
);
const SettingsNotifications = () => (
  <div>
    <div className="page-eyebrow">Notifications</div>
    <h2 className="page-title" style={{ fontSize: 28, marginTop: 8, marginBottom: 28 }}>Notifications</h2>
    <div className="card">
      {["Daily digest at 9am","Tasks due today","Goal milestones reached","Streak nudge","Weekly review reminder"].map(n => (
        <div key={n} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 0", borderBottom: "var(--tn-line)" }}>
          <span style={{ fontSize: 14 }}>{n}</span>
          <Toggle on />
        </div>
      ))}
    </div>
  </div>
);
const Toggle = ({ on = true }) => (
  <span style={{ width: 36, height: 20, borderRadius: 999, background: on ? "var(--tn-accent)" : "var(--tn-chip)", position: "relative", cursor: "pointer", display: "inline-block" }}>
    <i style={{ position: "absolute", top: 2, left: on ? 18 : 2, width: 16, height: 16, borderRadius: "50%", background: "white", transition: "left .15s" }} />
  </span>
);
const SettingsIntegrations = () => (
  <div>
    <div className="page-eyebrow">Integrations</div>
    <h2 className="page-title" style={{ fontSize: 28, marginTop: 8, marginBottom: 28 }}>Integrations</h2>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
      {[["Google Calendar","Sync events both ways","Connected"],["Telegram","Daily nudges + quick add","Connected"],["Slack","Mention to add a task",""],["Apple Calendar","Two-way sync",""],["Linear","Pull issues as tasks",""],["GitHub","Commits as task progress",""]].map(([n,d,s]) => (
        <div key={n} className="card" style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: "var(--tn-chip)", display: "grid", placeItems: "center", fontWeight: 700 }}>{n[0]}</div>
          <div style={{ flex: 1 }}><b style={{ fontSize: 14 }}>{n}</b><div style={{ fontSize: 12, color: "var(--tn-fg-muted)" }}>{d}</div></div>
          {s ? <Pill kind="status" value="finished">✓ {s}</Pill> : <button className="btn btn-secondary">Connect</button>}
        </div>
      ))}
    </div>
  </div>
);
const SettingsBilling = () => (
  <div>
    <div className="page-eyebrow">Billing</div>
    <h2 className="page-title" style={{ fontSize: 28, marginTop: 8, marginBottom: 28 }}>Billing</h2>
    <div className="card" style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
        <b style={{ fontSize: 18 }}>Pro · monthly</b>
        <span style={{ fontSize: 22, fontWeight: 600 }}>$9<small style={{ color: "var(--tn-fg-muted)", fontSize: 13, fontWeight: 400 }}>/mo</small></span>
      </div>
      <p style={{ fontSize: 13, color: "var(--tn-fg-muted)" }}>Renews on June 12, 2026 · billed to **** 4242</p>
      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        <button className="btn btn-secondary">Change plan</button>
        <button className="btn btn-ghost">Cancel subscription</button>
      </div>
    </div>
    <div className="card">
      <h3 style={{ fontSize: 14, marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--tn-fg-muted)" }}>Invoices</h3>
      {["May 12, 2026","Apr 12, 2026","Mar 12, 2026"].map(d => (
        <div key={d} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "var(--tn-line)", fontSize: 13 }}>
          <span>{d}</span><span style={{ color: "var(--tn-fg-muted)" }}>Pro monthly · $9.00</span><a style={{ color: "var(--tn-accent)" }}>Download</a>
        </div>
      ))}
    </div>
  </div>
);
const SettingsAbout = () => (
  <div>
    <div className="page-eyebrow">About</div>
    <h2 className="page-title" style={{ fontSize: 28, marginTop: 8, marginBottom: 28 }}>About TaskNest</h2>
    <div className="card">
      <p style={{ fontSize: 15, lineHeight: 1.6 }}>TaskNest is a Roadmap as a Service app — turn big goals into milestones, tasks, and daily todos.</p>
      <p style={{ fontSize: 13, color: "var(--tn-fg-muted)", marginTop: 14 }}>Version 4.0.1 · Build 20260519 · © 2026 TaskNest, Inc.</p>
      <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
        <button className="btn btn-secondary">What's new</button>
        <button className="btn btn-secondary">Privacy</button>
        <button className="btn btn-secondary">Terms</button>
      </div>
    </div>
  </div>
);

/* ============================================================
   SCREEN: TASK DETAIL
   ============================================================ */
const ScreenTaskDetail = ({ id, go }) => {
  // Find the task across all goals/milestones
  let task, goal, milestone;
  outer: for (const g of D.goals) {
    for (const m of g.milestones || []) {
      for (const t of m.tasks || []) {
        if (t.id === id) { task = t; goal = g; milestone = m; break outer; }
      }
    }
  }
  if (!task) return (
    <div className="page">
      <div className="page-head">
        <div className="page-eyebrow"><a onClick={() => go("tasks")} style={{cursor:"pointer"}}>← Tasks</a></div>
        <h1 className="page-title">Task not found</h1>
      </div>
    </div>
  );
  const subs = task.subtasks || [];
  const todos = task.todos || [];
  return (
    <div className="page">
      <div className="page-head">
        <div className="page-eyebrow"><a onClick={() => go("tasks")} style={{cursor:"pointer"}}>← Tasks</a></div>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
          <button className="cb" style={{ width: 28, height: 28, marginTop: 8, flexShrink: 0, borderRadius: "50%", border: "2px solid var(--tn-fg-muted)" }}></button>
          <div style={{ flex: 1 }}>
            <h1 className="page-title">{task.title}</h1>
            {task.description && <p className="page-lede" style={{ marginTop: 10 }}>{task.description}</p>}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
          <Pill kind="status" value={task.status} />
          <Pill kind="priority" value={task.priority || "medium"} />
        </div>
      </div>

      <div className="section">
        <div className="card" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, padding: 20 }}>
          <div>
            <div style={{ fontSize: 11, color: "var(--tn-fg-muted)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 4 }}>Goal</div>
            <a onClick={() => go("goal/" + goal.id)} style={{ fontSize: 14, fontWeight: 500, cursor: "pointer" }}>{goal.emoji} {goal.title}</a>
          </div>
          <div>
            <div style={{ fontSize: 11, color: "var(--tn-fg-muted)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 4 }}>Milestone</div>
            <div style={{ fontSize: 14, fontWeight: 500 }}>{milestone.title}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: "var(--tn-fg-muted)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 4 }}>Due</div>
            <div style={{ fontSize: 14, fontWeight: 500 }}>{task.due ? new Date(task.due).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}) : "—"}</div>
          </div>
        </div>
      </div>

      {(subs.length > 0 || todos.length > 0) && (
        <div className="section">
          <div className="section-head"><h2>Breakdown</h2><span className="count">{subs.length + todos.length}</span><div className="spacer"></div><button className="btn btn-secondary">+ Add subtask</button></div>
          <div className="card" style={{ padding: "10px 20px" }}>
            {subs.map(s => (
              <div key={s.id} className={`task-row ${s.status === "finished" ? "done" : ""}`}>
                <span className="cb"></span>
                <span style={{ fontSize: 10, color: "var(--tn-fg-muted)", letterSpacing: "0.04em", textTransform: "uppercase" }}>SUB</span>
                <div className="t-body">
                  <span className="t-title">{s.title}</span>
                  {s.description && <div className="t-meta">{s.description}</div>}
                </div>
                <Pill kind="status" value={s.status} />
                <span></span>
              </div>
            ))}
            {todos.map(t => (
              <div key={t.id} className={`task-row ${t.status === "finished" ? "done" : ""}`}>
                <span className="cb"></span>
                <span style={{ fontSize: 10, color: "var(--tn-fg-muted)", letterSpacing: "0.04em", textTransform: "uppercase" }}>{t.recurring || "TODO"}</span>
                <div className="t-body">
                  <span className="t-title">{t.title}</span>
                  <div className="t-meta">Recurring · {t.recurring || "daily"}</div>
                </div>
                <Pill kind="status" value={t.status} />
                <span></span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="section" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div className="card">
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Activity</h3>
          <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 10, fontSize: 13, color: "var(--tn-fg-muted)" }}>
            <li><b style={{ color: "var(--tn-fg)" }}>Today, 09:30 ·</b> Status changed to "in progress"</li>
            <li><b style={{ color: "var(--tn-fg)" }}>Yesterday ·</b> Subtask "Frontmatter parser" closed</li>
            <li><b style={{ color: "var(--tn-fg)" }}>May 12 ·</b> Task created from MDX pipeline milestone</li>
          </ul>
        </div>
        <div className="card">
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Notes</h3>
          <p style={{ fontSize: 13.5, color: "var(--tn-fg-muted)", lineHeight: 1.6 }}>RSS generation needs the build to emit feed.xml at root. Use a static export plugin, not runtime — keeps deploy footprint smaller.</p>
        </div>
      </div>
    </div>
  );
};

/* ============================================================
   SCREEN: ONBOARDING (3 steps)
   ============================================================ */
const ScreenOnboarding = ({ go, sub }) => {
  const step = parseInt(sub || "1", 10);
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--tn-bg)" }}>
      <div style={{ padding: "20px 32px", borderBottom: "var(--tn-line)", display: "flex", alignItems: "center", gap: 14 }}>
        <div className="logo" style={{ width: 28, height: 28, borderRadius: "var(--tn-r-md)", background: "var(--tn-accent)", color: "var(--tn-on-accent)", display: "grid", placeItems: "center", fontWeight: 700, fontSize: 13 }}>T</div>
        <b style={{ fontSize: 14, fontWeight: 600 }}>TaskNest</b>
        <div style={{ flex: 1 }}></div>
        <div style={{ display: "flex", gap: 6 }}>
          {[1,2,3].map(n => (
            <div key={n} style={{ width: 32, height: 4, borderRadius: 2, background: n <= step ? "var(--tn-accent)" : "var(--tn-chip)" }} />
          ))}
        </div>
        <span style={{ fontSize: 13, color: "var(--tn-fg-muted)" }}>Step {step} of 3</span>
      </div>
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 40 }}>
        <div style={{ maxWidth: 560, width: "100%" }}>
          {step === 1 && <OnboardingStep1 go={go} />}
          {step === 2 && <OnboardingStep2 go={go} />}
          {step === 3 && <OnboardingStep3 go={go} />}
        </div>
      </div>
      <div style={{ padding: "20px 32px", borderTop: "var(--tn-line)", display: "flex", gap: 12, justifyContent: "space-between" }}>
        {step > 1
          ? <button className="btn btn-ghost" onClick={() => go("onboarding/" + (step - 1))}>← Back</button>
          : <button className="btn btn-ghost" onClick={() => go("today")}>Skip</button>}
        {step < 3
          ? <button className="btn btn-primary" onClick={() => go("onboarding/" + (step + 1))}>Continue →</button>
          : <button className="btn btn-primary" onClick={() => go("today")}>Get started →</button>}
      </div>
    </div>
  );
};
const OnboardingStep1 = ({ go }) => (
  <>
    <div className="page-eyebrow">Welcome to TaskNest</div>
    <h1 className="page-title" style={{ fontSize: 40, marginTop: 8, marginBottom: 16 }}>Big goals,<br/>broken down.</h1>
    <p style={{ fontSize: 17, color: "var(--tn-fg-muted)", lineHeight: 1.5, marginBottom: 32 }}>
      Every goal in TaskNest fits a simple shape: <b style={{ color: "var(--tn-fg)" }}>Goal → Milestones → Tasks → Daily todos.</b>
      It's the same shape whether you're shipping a product, training for a marathon, or learning a language.
    </p>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
      {[
        { e: "🎯", l: "Goal", d: "One big outcome" },
        { e: "🚩", l: "Milestone", d: "Major checkpoint" },
        { e: "✓",  l: "Task",      d: "Specific action" },
        { e: "⏱",  l: "Daily",     d: "Recurring todo" },
      ].map(x => (
        <div key={x.l} className="card" style={{ textAlign: "center", padding: "18px 12px" }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>{x.e}</div>
          <b style={{ fontSize: 13, display: "block" }}>{x.l}</b>
          <div style={{ fontSize: 11, color: "var(--tn-fg-muted)" }}>{x.d}</div>
        </div>
      ))}
    </div>
  </>
);
const OnboardingStep2 = ({ go }) => {
  const [pick, setPick] = useState(null);
  const examples = [
    { id: "career", e: "🎯", t: "Career", g: "Get promoted to senior engineer this year" },
    { id: "health", e: "🏃", t: "Health", g: "Run a half marathon under 2 hours" },
    { id: "skill",  e: "📚", t: "Learning", g: "Read 24 books and write notes" },
    { id: "side",   e: "🌐", t: "Side project", g: "Launch personal brand site" },
    { id: "habit",  e: "✨", t: "Habit", g: "Daily writing — 30 minutes a day" },
    { id: "blank",  e: "✎",  t: "Blank", g: "I'll add my own" },
  ];
  return (
    <>
      <div className="page-eyebrow">Pick a starting goal</div>
      <h1 className="page-title" style={{ fontSize: 32, marginTop: 8, marginBottom: 8 }}>What do you want to make happen?</h1>
      <p style={{ fontSize: 15, color: "var(--tn-fg-muted)", marginBottom: 28 }}>Pick a template or start blank. You can edit anything later.</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {examples.map(e => (
          <div key={e.id} onClick={() => setPick(e.id)} style={{ padding: 18, borderRadius: "var(--tn-r-lg)", border: pick === e.id ? "2px solid var(--tn-accent)" : "var(--tn-card-border)", background: "var(--tn-card)", cursor: "pointer", display: "flex", gap: 12, alignItems: "flex-start" }}>
            <div style={{ fontSize: 26 }}>{e.e}</div>
            <div>
              <b style={{ fontSize: 14, fontWeight: 600, display: "block", marginBottom: 4 }}>{e.t}</b>
              <p style={{ fontSize: 12.5, color: "var(--tn-fg-muted)", lineHeight: 1.4 }}>{e.g}</p>
            </div>
          </div>
        ))}
      </div>
    </>
  );
};
const OnboardingStep3 = ({ go }) => (
  <>
    <div className="page-eyebrow">Last step</div>
    <h1 className="page-title" style={{ fontSize: 32, marginTop: 8, marginBottom: 8 }}>Pick a look.</h1>
    <p style={{ fontSize: 15, color: "var(--tn-fg-muted)", marginBottom: 28 }}>TaskNest comes in ten flavours. You can switch any time from Settings → Themes.</p>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }}>
      {window.TN_THEMES.slice(0, 10).map(t => (
        <div key={t.id} style={{ padding: 10, border: "var(--tn-card-border)", borderRadius: "var(--tn-r-md)", background: "var(--tn-card)", cursor: "pointer", textAlign: "center" }}>
          <div style={{ display: "flex", flexWrap: "wrap", aspectRatio: "1/1", borderRadius: 6, overflow: "hidden", marginBottom: 6 }}>
            {t.swatches.map((c, i) => <i key={i} style={{ width: "50%", height: "50%", background: c }} />)}
          </div>
          <b style={{ fontSize: 10.5, fontWeight: 600, lineHeight: 1.2 }}>{t.name}</b>
        </div>
      ))}
    </div>
  </>
);

/* ============================================================
   SCREEN: NOT FOUND (404)
   ============================================================ */
const ScreenNotFound = ({ go }) => (
  <div className="page" style={{ textAlign: "center", paddingTop: 80, paddingBottom: 80 }}>
    <div style={{ fontSize: 96, fontWeight: 700, letterSpacing: "-0.04em", color: "var(--tn-fg-muted)", marginBottom: 16, fontFamily: "var(--tn-font-display)", lineHeight: 1 }}>404</div>
    <h1 className="page-title" style={{ fontSize: 32, marginBottom: 12 }}>This goal is still outstanding.</h1>
    <p className="page-lede" style={{ margin: "0 auto 28px" }}>The page you're looking for doesn't exist — or it was archived. The work, though, is probably still on your list somewhere.</p>
    <div style={{ display: "flex", justifyContent: "center", gap: 10 }}>
      <button className="btn btn-primary" onClick={() => go("today")}>← Back to today</button>
      <button className="btn btn-secondary" onClick={() => go("search")}>Search</button>
    </div>
  </div>
);

/* ============================================================
   EMPTY STATES (rendered conditionally inside screens — exported as helpers)
   ============================================================ */
const EmptyState = ({ icon = "✦", title, body, ctaText, onCta }) => (
  <div className="card" style={{ textAlign: "center", padding: "60px 40px", border: "2px dashed var(--tn-fg-dim)", background: "transparent", boxShadow: "none" }}>
    <div style={{ fontSize: 56, marginBottom: 14, opacity: 0.5 }}>{icon}</div>
    <h3 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>{title}</h3>
    <p style={{ fontSize: 14, color: "var(--tn-fg-muted)", maxWidth: 360, margin: "0 auto 22px", lineHeight: 1.5 }}>{body}</p>
    {ctaText && <button className="btn btn-primary" onClick={onCta}>{ctaText}</button>}
  </div>
);

/* ============================================================
   SCREEN: EVENTS LIST (standalone calendar events, outside the goal hierarchy)
   ============================================================ */
const ScreenEvents = ({ go }) => {
  const [filter, setFilter] = useState("upcoming");
  const today = new Date(2026, 4, 19); // May 19
  const events = D.events || [];
  const grouped = useMemo(() => {
    const list = events.filter(e => {
      const d = new Date(e.date);
      if (filter === "upcoming") return d >= today;
      if (filter === "past") return d < today;
      return true;
    });
    list.sort((a, b) => new Date(a.date) - new Date(b.date));
    const by = {};
    list.forEach(e => {
      const d = new Date(e.date);
      const key = d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
      (by[key] = by[key] || []).push(e);
    });
    return by;
  }, [filter]);
  const upcoming = events.filter(e => new Date(e.date) >= today).length;
  const past = events.length - upcoming;
  return (
    <div className="page">
      <div className="page-head">
        <div className="page-eyebrow">{events.length} events · {upcoming} upcoming</div>
        <h1 className="page-title">Events</h1>
        <p className="page-lede">Calls, meetings, workouts, personal time. Things that live on the calendar but aren't tasks.</p>
      </div>
      <div className="section">
        <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: "var(--tn-line)" }}>
          {[["upcoming","Upcoming",upcoming],["past","Past",past],["all","All",events.length]].map(([k,n,c]) => (
            <button key={k} onClick={() => setFilter(k)} style={{ padding: "10px 16px", fontSize: 14, fontWeight: 500, color: filter === k ? "var(--tn-fg)" : "var(--tn-fg-muted)", borderBottom: filter === k ? "2px solid var(--tn-accent)" : "2px solid transparent", marginBottom: -1 }}>
              {n} <span style={{ color: "var(--tn-fg-muted)", fontWeight: 400, marginLeft: 4 }}>{c}</span>
            </button>
          ))}
          <div style={{ flex: 1 }}></div>
          <button className="btn btn-primary">+ New event</button>
        </div>
        {Object.entries(grouped).length === 0 ? (
          <EmptyState icon="◷" title="No events here" body="Schedule a call, meeting, workout — anything with a time and place." />
        ) : (
          Object.entries(grouped).map(([day, list]) => (
            <div key={day} style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: 12, color: "var(--tn-fg-muted)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10, fontWeight: 500 }}>{day}</h3>
              <div className="card" style={{ padding: "8px 20px" }}>
                {list.map(e => (
                  <div key={e.id} className={`task-row ${e.status === "finished" ? "done" : ""}`} style={{ gridTemplateColumns: "auto 80px 1fr auto auto", gap: 14 }}>
                    <span className="cb"></span>
                    <span className="t-time">{e.time}<br/><span style={{ opacity: 0.5, fontSize: 10 }}>– {e.end}</span></span>
                    <div className="t-body">
                      <span className="t-title">{e.title}</span>
                      <div className="t-meta">{e.location} · {e.type}</div>
                    </div>
                    <Pill kind="status" value={e.status} />
                    <span></span>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

/* ============================================================
   SCREEN: MILESTONES LIST (across all goals)
   ============================================================ */
const ScreenMilestones = ({ go }) => {
  const [filter, setFilter] = useState("active");
  const all = D.goals.flatMap(g => (g.milestones || []).map(m => ({ ...m, goalId: g.id, goalTitle: g.title, goalColor: g.color, goalEmoji: g.emoji })));
  const list = all.filter(m =>
    filter === "all" ? true :
    filter === "active" ? m.status !== "finished" :
    filter === "finished" ? m.status === "finished" :
    filter === "this-quarter" ? m.due && new Date(m.due) <= new Date(2026, 6, 1) : true
  );
  const finished = all.filter(m => m.status === "finished").length;
  return (
    <div className="page">
      <div className="page-head">
        <div className="page-eyebrow">{all.length} milestones · {finished} finished</div>
        <h1 className="page-title">Milestones</h1>
        <p className="page-lede">Major checkpoints across every goal. Each one is two-to-eight weeks of work.</p>
      </div>
      <div className="section">
        <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: "var(--tn-line)" }}>
          {[["active","Active",all.length - finished],["this-quarter","This quarter",0],["finished","Finished",finished],["all","All",all.length]].map(([k,n,c]) => (
            <button key={k} onClick={() => setFilter(k)} style={{ padding: "10px 16px", fontSize: 14, fontWeight: 500, color: filter === k ? "var(--tn-fg)" : "var(--tn-fg-muted)", borderBottom: filter === k ? "2px solid var(--tn-accent)" : "2px solid transparent", marginBottom: -1 }}>
              {n} <span style={{ color: "var(--tn-fg-muted)", fontWeight: 400, marginLeft: 4 }}>{c}</span>
            </button>
          ))}
          <div style={{ flex: 1 }}></div>
          <button className="btn btn-primary">+ New milestone</button>
        </div>
        {list.length === 0 ? (
          <EmptyState icon="🚩" title="No milestones here" body="Milestones are the major checkpoints between you and a finished goal. Add one to a goal to start." />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {list.map(m => {
              const total = (m.tasks||[]).length;
              const done = (m.tasks||[]).filter(t => t.status === "finished").length;
              const pct = total === 0 ? (m.status === "finished" ? 100 : 0) : Math.round((done / total) * 100);
              return (
                <div key={m.id} className="card" style={{ padding: 18, display: "grid", gridTemplateColumns: "44px 1fr 180px auto", gap: 16, alignItems: "center", cursor: "pointer" }} onClick={() => go("goal/" + m.goalId)}>
                  <div className={`gc-ico ${m.goalColor}`} style={{ width: 44, height: 44 }}>{m.goalEmoji}</div>
                  <div>
                    <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 3 }}>{m.title}</h3>
                    <div style={{ fontSize: 12.5, color: "var(--tn-fg-muted)" }}>{m.description}</div>
                    <div style={{ fontSize: 11, color: "var(--tn-fg-muted)", marginTop: 6 }}>From <b style={{ color: "var(--tn-fg)" }}>{m.goalTitle}</b>{m.due ? ` · due ${new Date(m.due).toLocaleDateString("en-US",{month:"short",day:"numeric"})}` : ""}</div>
                  </div>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--tn-fg-muted)", marginBottom: 4 }}><span>{done}/{total} tasks</span><b style={{ color: "var(--tn-fg)" }}>{pct}%</b></div>
                    <Bar value={pct} color={m.goalColor} />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
                    <Pill kind="status" value={m.status} />
                    <Pill kind="priority" value={m.priority} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

/* ============================================================
   SCREEN: TODOS LIST (all recurring todos across the hierarchy)
   ============================================================ */
const ScreenTodos = ({ go }) => {
  const all = D.goals.flatMap(g =>
    (g.milestones || []).flatMap(m =>
      (m.tasks || []).flatMap(t =>
        (t.todos || []).map(td => ({ ...td, goalId: g.id, goalTitle: g.title, taskTitle: t.title, recurring: td.recurring || "daily" })))));
  // sample-fill: also bring in todos defined directly on milestones in earlier data (none for now)
  const [filter, setFilter] = useState("all");
  const list = filter === "all" ? all : all.filter(t => t.recurring === filter);
  return (
    <div className="page">
      <div className="page-head">
        <div className="page-eyebrow">{all.length} recurring todos</div>
        <h1 className="page-title">Todos</h1>
        <p className="page-lede">Habits and recurring actions. The work that doesn't end — daily writing, weekly runs, monthly reviews.</p>
      </div>
      <div className="section">
        <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: "var(--tn-line)" }}>
          {[["all","All",all.length],["daily","Daily",all.filter(t=>t.recurring==="daily").length],["weekly","Weekly",all.filter(t=>t.recurring==="weekly").length]].map(([k,n,c]) => (
            <button key={k} onClick={() => setFilter(k)} style={{ padding: "10px 16px", fontSize: 14, fontWeight: 500, color: filter === k ? "var(--tn-fg)" : "var(--tn-fg-muted)", borderBottom: filter === k ? "2px solid var(--tn-accent)" : "2px solid transparent", marginBottom: -1 }}>
              {n} <span style={{ color: "var(--tn-fg-muted)", fontWeight: 400, marginLeft: 4 }}>{c}</span>
            </button>
          ))}
          <div style={{ flex: 1 }}></div>
          <button className="btn btn-primary">+ New todo</button>
        </div>
        {list.length === 0 ? (
          <EmptyState icon="⏱" title="No recurring todos" body="Daily writing, weekly runs, monthly reviews — set up recurring actions that build over time." />
        ) : (
          <div className="card" style={{ padding: "8px 20px" }}>
            {list.map(t => (
              <div key={t.id} className={`task-row ${t.status === "finished" ? "done" : ""}`}>
                <span className="cb"></span>
                <span style={{ fontSize: 10, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--tn-fg-muted)", minWidth: 56 }}>{t.recurring}</span>
                <div className="t-body">
                  <span className="t-title">{t.title}</span>
                  <div className="t-meta">In <b style={{ color: "var(--tn-fg)" }}>{t.taskTitle}</b> · {t.goalTitle}</div>
                </div>
                <Pill kind="status" value={t.status} />
                <span></span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

/* ============================================================
   SCREEN: VISUALIZATION (charts + dependency graph)
   ============================================================ */
const ScreenVisualization = ({ go }) => {
  const allTasks = D.goals.flatMap(g => (g.milestones||[]).flatMap(m => (m.tasks||[]).map(t => ({ ...t, goalColor: g.color, goalTitle: g.title }))));
  const byGoal = D.goals.map(g => {
    const t = (g.milestones||[]).flatMap(m => m.tasks||[]);
    return { goal: g, total: t.length, done: t.filter(x => x.status === "finished").length };
  });
  return (
    <div className="page">
      <div className="page-head">
        <div className="page-eyebrow">Visualisation</div>
        <h1 className="page-title">Roadmap at a glance</h1>
        <p className="page-lede">All four goals on one timeline. See where dependencies cluster, where the work piles up, and what's coming next.</p>
      </div>

      {/* Timeline */}
      <div className="section">
        <div className="section-head"><h2>Timeline</h2><span className="count">May → Dec 2026</span></div>
        <div className="card" style={{ padding: "24px 22px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: 14 }}>
            {/* months header */}
            <div></div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 1, marginBottom: 8 }}>
              {["May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].map(m => (
                <div key={m} style={{ fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--tn-fg-muted)", textAlign: "center", paddingBottom: 6, borderBottom: "var(--tn-line)" }}>{m}</div>
              ))}
            </div>
            {D.goals.map(g => {
              const startMonth = new Date(g.start).getMonth();
              const endMonth = new Date(g.due).getMonth();
              const startCol = Math.max(0, startMonth - 4); // anchored to May
              const endCol = endMonth - 4;
              const span = Math.max(1, endCol - startCol + 1);
              const colors = { warm: "var(--tn-warm)", moss: "var(--tn-moss)", slate: "var(--tn-slate)", plum: "var(--tn-plum)" };
              return (
                <React.Fragment key={g.id}>
                  <div style={{ fontSize: 13, padding: "12px 0", display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontSize: 18 }}>{g.emoji}</span><span>{g.title.length > 22 ? g.title.slice(0,20)+"…" : g.title}</span></div>
                  <div style={{ position: "relative", display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 1, alignItems: "center", padding: "8px 0" }}>
                    <div style={{ gridColumn: `${startCol+1} / span ${span}`, height: 24, background: colors[g.color], borderRadius: 4, padding: "0 10px", display: "flex", alignItems: "center", color: "white", fontSize: 11, fontWeight: 600, overflow: "hidden", whiteSpace: "nowrap" }}>
                      {goalProgress(g)}%
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: "var(--tn-line)", display: "flex", gap: 18, fontSize: 11, color: "var(--tn-fg-muted)" }}>
            <span>Bar length = goal duration</span><span>Fill colour matches goal</span><span>Number = current progress</span>
          </div>
        </div>
      </div>

      {/* Two charts side by side */}
      <div className="section" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div className="card">
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Tasks by goal</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {byGoal.map(({ goal, total, done }) => (
              <div key={goal.id}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 4 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}>{goal.emoji} {goal.title}</span>
                  <span style={{ color: "var(--tn-fg-muted)" }}>{done}/{total}</span>
                </div>
                <div style={{ height: 8, background: "var(--tn-bar-bg)", borderRadius: 4, overflow: "hidden", display: "flex" }}>
                  <div style={{ width: total === 0 ? "0%" : `${(done/total)*100}%`, background: `var(--tn-${goal.color})`, borderRadius: 4 }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Status distribution</h3>
          {(() => {
            const counts = { "finished": 0, "in progress": 0, "started": 0, "outstanding": 0 };
            allTasks.forEach(t => counts[t.status] = (counts[t.status] || 0) + 1);
            const total = Math.max(1, allTasks.length);
            return (
              <>
                <div style={{ height: 12, borderRadius: 6, overflow: "hidden", display: "flex", marginBottom: 14 }}>
                  <div style={{ flex: counts.finished, background: "var(--tn-good)" }}></div>
                  <div style={{ flex: counts["in progress"], background: "var(--tn-accent)" }}></div>
                  <div style={{ flex: counts.started, background: "var(--tn-slate)" }}></div>
                  <div style={{ flex: counts.outstanding, background: "var(--tn-fg-dim)" }}></div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 13 }}>
                  <div><span style={{display:"inline-block",width:8,height:8,borderRadius:2,background:"var(--tn-good)",marginRight:6}}></span>Finished <b>{counts.finished}</b></div>
                  <div><span style={{display:"inline-block",width:8,height:8,borderRadius:2,background:"var(--tn-accent)",marginRight:6}}></span>In progress <b>{counts["in progress"]}</b></div>
                  <div><span style={{display:"inline-block",width:8,height:8,borderRadius:2,background:"var(--tn-slate)",marginRight:6}}></span>Started <b>{counts.started}</b></div>
                  <div><span style={{display:"inline-block",width:8,height:8,borderRadius:2,background:"var(--tn-fg-dim)",marginRight:6}}></span>Outstanding <b>{counts.outstanding}</b></div>
                </div>
              </>
            );
          })()}
        </div>
      </div>

      {/* Velocity sparkline */}
      <div className="section">
        <div className="section-head"><h2>Focus, last 14 days</h2></div>
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, fontSize: 13 }}>
            <span style={{ color: "var(--tn-fg-muted)" }}>Hours per day</span>
            <span><b>{D.stats.weekFocusHours}h</b> this week</span>
          </div>
          <div className="spark" style={{ height: 80, gap: 4 }}>
            {D.stats.focusHistory.map((h, i) => (
              <i key={i} className={i === D.stats.focusHistory.length - 1 ? "now" : ""} style={{ height: `${h * 8}px` }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ============================================================
   SCREEN: LOGIN (standalone, no sidebar)
   ============================================================ */
const ScreenLogin = ({ go }) => (
  <div style={{ minHeight: "100vh", background: "var(--tn-bg)", color: "var(--tn-fg)", display: "flex", flexDirection: "column", padding: 0 }}>
    <div style={{ padding: "24px 32px", display: "flex", alignItems: "center", gap: 12 }}>
      <div className="logo" style={{ width: 28, height: 28, borderRadius: "var(--tn-r-md)", background: "var(--tn-accent)", color: "var(--tn-on-accent)", display: "grid", placeItems: "center", fontWeight: 700, fontSize: 13 }}>T</div>
      <b style={{ fontSize: 14, fontWeight: 600 }}>TaskNest</b>
      <div style={{ flex: 1 }}></div>
      <span style={{ fontSize: 13, color: "var(--tn-fg-muted)" }}>Don't have an account? <a onClick={() => go("signup")} style={{ color: "var(--tn-accent)", cursor: "pointer", fontWeight: 500 }}>Sign up</a></span>
    </div>
    <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", alignItems: "stretch" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 40 }}>
        <div style={{ width: "100%", maxWidth: 380 }}>
          <h1 className="page-title" style={{ fontSize: 36, marginBottom: 10 }}>Welcome back.</h1>
          <p style={{ fontSize: 15, color: "var(--tn-fg-muted)", marginBottom: 32 }}>Sign in to your roadmap.</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, color: "var(--tn-fg-muted)", marginBottom: 6, letterSpacing: "0.04em" }}>EMAIL</label>
              <input type="email" defaultValue="alex@tasknest.app" style={{ width: "100%", padding: "10px 14px", fontSize: 14, borderRadius: "var(--tn-r-md)", border: "var(--tn-card-border)", background: "var(--tn-surface)", color: "var(--tn-fg)" }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, color: "var(--tn-fg-muted)", marginBottom: 6, letterSpacing: "0.04em" }}>PASSWORD</label>
              <input type="password" defaultValue="••••••••" style={{ width: "100%", padding: "10px 14px", fontSize: 14, borderRadius: "var(--tn-r-md)", border: "var(--tn-card-border)", background: "var(--tn-surface)", color: "var(--tn-fg)" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "6px 0 12px" }}>
              <label style={{ fontSize: 13, color: "var(--tn-fg-muted)", display: "flex", alignItems: "center", gap: 6 }}><input type="checkbox" defaultChecked /> Keep me signed in</label>
              <a style={{ fontSize: 13, color: "var(--tn-accent)", cursor: "pointer" }}>Forgot?</a>
            </div>
            <button className="btn btn-primary" style={{ padding: "11px 22px", fontSize: 14, justifyContent: "center" }} onClick={() => go("today")}>Sign in →</button>
            <div style={{ position: "relative", margin: "18px 0", textAlign: "center" }}>
              <div style={{ position: "absolute", inset: "50% 0 0", borderTop: "var(--tn-line)" }}></div>
              <span style={{ position: "relative", background: "var(--tn-bg)", padding: "0 12px", fontSize: 12, color: "var(--tn-fg-muted)" }}>or continue with</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <button className="btn btn-secondary" style={{ justifyContent: "center" }}>Google</button>
              <button className="btn btn-secondary" style={{ justifyContent: "center" }}>Telegram</button>
            </div>
          </div>
        </div>
      </div>
      <div style={{ background: "var(--tn-surface-2)", borderLeft: "var(--tn-line)", padding: 56, display: "flex", flexDirection: "column", justifyContent: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "relative", zIndex: 1, maxWidth: 460 }}>
          <div className="page-eyebrow">Roadmap, quietly.</div>
          <h2 className="page-title" style={{ fontSize: 32, marginTop: 10, marginBottom: 16, fontFamily: "var(--tn-font-display)" }}>Big goals, broken down — and somehow still moving forward.</h2>
          <p style={{ fontSize: 15, color: "var(--tn-fg-muted)", lineHeight: 1.6, marginBottom: 28 }}>One product, ten visual languages. Pick the look that fits the day; your goals, milestones and tasks stay the same.</p>
          <div style={{ display: "flex", gap: 6 }}>
            {(window.TN_THEMES || []).slice(0, 10).map(t => (
              <div key={t.id} title={t.name} style={{ width: 22, height: 22, borderRadius: 5, display: "flex", flexWrap: "wrap", overflow: "hidden", border: "var(--tn-line)" }}>
                {t.swatches.map((c, i) => <i key={i} style={{ width: "50%", height: "50%", background: c }} />)}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
    <div style={{ padding: "16px 32px", fontSize: 12, color: "var(--tn-fg-muted)", display: "flex", justifyContent: "space-between", borderTop: "var(--tn-line)" }}>
      <span>© 2026 TaskNest</span>
      <span><a style={{ color: "inherit", marginRight: 16 }}>Privacy</a><a style={{ color: "inherit" }}>Terms</a></span>
    </div>
  </div>
);

/* ============================================================
   SCREEN: SIGNUP
   ============================================================ */
const ScreenSignup = ({ go }) => (
  <div style={{ minHeight: "100vh", background: "var(--tn-bg)", color: "var(--tn-fg)" }}>
    <div style={{ padding: "24px 32px", display: "flex", alignItems: "center", gap: 12 }}>
      <div className="logo" style={{ width: 28, height: 28, borderRadius: "var(--tn-r-md)", background: "var(--tn-accent)", color: "var(--tn-on-accent)", display: "grid", placeItems: "center", fontWeight: 700, fontSize: 13 }}>T</div>
      <b style={{ fontSize: 14, fontWeight: 600 }}>TaskNest</b>
      <div style={{ flex: 1 }}></div>
      <span style={{ fontSize: 13, color: "var(--tn-fg-muted)" }}>Already have an account? <a onClick={() => go("login")} style={{ color: "var(--tn-accent)", cursor: "pointer", fontWeight: 500 }}>Sign in</a></span>
    </div>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 24px", minHeight: "calc(100vh - 80px)" }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        <h1 className="page-title" style={{ fontSize: 32, marginBottom: 8 }}>Start a roadmap.</h1>
        <p style={{ fontSize: 15, color: "var(--tn-fg-muted)", marginBottom: 28 }}>Free forever for personal use. No card required.</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, color: "var(--tn-fg-muted)", marginBottom: 6, letterSpacing: "0.04em" }}>NAME</label>
            <input type="text" placeholder="Your name" style={{ width: "100%", padding: "10px 14px", fontSize: 14, borderRadius: "var(--tn-r-md)", border: "var(--tn-card-border)", background: "var(--tn-surface)", color: "var(--tn-fg)" }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, color: "var(--tn-fg-muted)", marginBottom: 6, letterSpacing: "0.04em" }}>EMAIL</label>
            <input type="email" placeholder="you@example.com" style={{ width: "100%", padding: "10px 14px", fontSize: 14, borderRadius: "var(--tn-r-md)", border: "var(--tn-card-border)", background: "var(--tn-surface)", color: "var(--tn-fg)" }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, color: "var(--tn-fg-muted)", marginBottom: 6, letterSpacing: "0.04em" }}>PASSWORD</label>
            <input type="password" placeholder="At least 8 characters" style={{ width: "100%", padding: "10px 14px", fontSize: 14, borderRadius: "var(--tn-r-md)", border: "var(--tn-card-border)", background: "var(--tn-surface)", color: "var(--tn-fg)" }} />
          </div>
          <label style={{ fontSize: 13, color: "var(--tn-fg-muted)", display: "flex", alignItems: "flex-start", gap: 8, marginTop: 6 }}>
            <input type="checkbox" defaultChecked style={{ marginTop: 3 }} />
            <span>I agree to the <a style={{ color: "var(--tn-accent)", cursor: "pointer" }}>Terms</a> and <a style={{ color: "var(--tn-accent)", cursor: "pointer" }}>Privacy Policy</a>.</span>
          </label>
          <button className="btn btn-primary" style={{ padding: "11px 22px", fontSize: 14, justifyContent: "center", marginTop: 6 }} onClick={() => go("onboarding/1")}>Create account →</button>
          <div style={{ textAlign: "center", margin: "12px 0", fontSize: 12, color: "var(--tn-fg-muted)" }}>or</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <button className="btn btn-secondary" style={{ justifyContent: "center" }}>Google</button>
            <button className="btn btn-secondary" style={{ justifyContent: "center" }}>Telegram</button>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// Expose everything
Object.assign(window, {
  Sidebar, Topbar, MobileTabbar, SearchOverlay,
  ScreenToday, ScreenGoals, ScreenGoalDetail, ScreenTasks, ScreenTaskDetail,
  ScreenCalendar, ScreenNotes, ScreenReview, ScreenSettings,
  ScreenOnboarding, ScreenNotFound, EmptyState,
  ScreenEvents, ScreenMilestones, ScreenTodos, ScreenVisualization,
  ScreenLogin, ScreenSignup,
});
