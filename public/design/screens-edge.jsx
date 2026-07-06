/* TaskNest — edge states, auth flow, and Settings sub-pages
   Categories B + C + D from the master plan. */

const D3 = window.TN_DATA;

/* ============================================================
   B — SETTINGS SUB-PAGES
   ============================================================ */
const SettingsCalendar = () => (
  <div>
    <div className="page-eyebrow">Workspace · Calendar</div>
    <h2 className="page-title" style={{ fontSize: 28, marginTop: 8, marginBottom: 28 }}>Calendar &amp; sync</h2>

    <div className="card" style={{ marginBottom: 16 }}>
      <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--tn-fg-muted)" }}>Default view</h3>
      <div style={{ display: "flex", gap: 8 }}>
        {["Week","Month","Agenda"].map((v, i) => (
          <button key={v} className={`btn ${i === 1 ? "btn-primary" : "btn-secondary"}`}>{v}</button>
        ))}
      </div>
      <p style={{ fontSize: 12.5, color: "var(--tn-fg-muted)", marginTop: 10 }}>The view used when you open Calendar — you can switch any time from the toolbar.</p>
    </div>

    <div className="card" style={{ marginBottom: 16 }}>
      <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--tn-fg-muted)" }}>Week starts on</h3>
      <div style={{ display: "flex", gap: 4 }}>
        {["Mon","Sun"].map((d, i) => (
          <button key={d} className={`btn ${i === 0 ? "btn-primary" : "btn-secondary"}`}>{d}day</button>
        ))}
      </div>
    </div>

    <div className="card" style={{ marginBottom: 16 }}>
      <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--tn-fg-muted)" }}>Show on calendar</h3>
      {[
        ["Goal due dates",     "Pin each goal's deadline on its day", true],
        ["Milestone due dates","Show milestone deadlines",            true],
        ["Tasks with due date","Pin tasks on their due day",           true],
        ["Recurring todos",    "Show every occurrence",                false],
        ["Standalone events",  "Calls, meetings, workouts",            true],
        ["Time-blocked focus", "Show scheduled focus blocks",          true],
      ].map(([n,d,v]) => (
        <div key={n} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 0", borderBottom: "var(--tn-line)" }}>
          <div>
            <b style={{ fontSize: 14, fontWeight: 500 }}>{n}</b>
            <div style={{ fontSize: 12.5, color: "var(--tn-fg-muted)" }}>{d}</div>
          </div>
          <Toggle on={v} />
        </div>
      ))}
    </div>

    <div className="card">
      <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--tn-fg-muted)" }}>Sync</h3>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "var(--tn-line)" }}>
        <div><b style={{ fontSize: 14, fontWeight: 500 }}>Google Calendar</b><div style={{ fontSize: 12.5, color: "var(--tn-fg-muted)" }}>Two-way sync, last synced 2 min ago</div></div>
        <Pill kind="status" value="finished">Connected</Pill>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0" }}>
        <div><b style={{ fontSize: 14, fontWeight: 500 }}>Apple Calendar</b><div style={{ fontSize: 12.5, color: "var(--tn-fg-muted)" }}>iCloud — coming soon</div></div>
        <button className="btn btn-secondary">Connect</button>
      </div>
    </div>
  </div>
);

const SettingsIntegrationDetail = ({ kind }) => {
  const specs = {
    telegram: { name: "Telegram", icon: "✈", color: "#0088cc", desc: "Daily nudges, quick capture by chat, completion notifications." },
    google:   { name: "Google Calendar", icon: "G", color: "#4285f4", desc: "Two-way sync of events. Goal & milestone deadlines appear as all-day events." },
  };
  const s = specs[kind] || specs.telegram;
  return (
    <div>
      <div className="page-eyebrow">Integrations · {s.name}</div>
      <h2 className="page-title" style={{ fontSize: 28, marginTop: 8, marginBottom: 28 }}>{s.name}</h2>

      <div className="card" style={{ marginBottom: 16, display: "flex", gap: 16, alignItems: "center" }}>
        <div style={{ width: 56, height: 56, borderRadius: 14, background: s.color, color: "white", display: "grid", placeItems: "center", fontSize: 24, fontWeight: 700 }}>{s.icon}</div>
        <div style={{ flex: 1 }}>
          <b style={{ fontSize: 17, fontWeight: 600 }}>{s.name}</b>
          <p style={{ fontSize: 13.5, color: "var(--tn-fg-muted)", marginTop: 4 }}>{s.desc}</p>
        </div>
        <Pill kind="status" value="finished">Connected since Apr 14</Pill>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--tn-fg-muted)" }}>What syncs</h3>
        {[
          ["Daily digest",      "9:00 every day with today's plan", true],
          ["Task reminders",    "Ping 15 min before due time",      true],
          ["Streak nudges",     "Don't break the chain",             false],
          ["Quick capture",     "Send /add to log a task",          true],
        ].map(([n,d,v]) => (
          <div key={n} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 0", borderBottom: "var(--tn-line)" }}>
            <div><b style={{ fontSize: 14, fontWeight: 500 }}>{n}</b><div style={{ fontSize: 12.5, color: "var(--tn-fg-muted)" }}>{d}</div></div>
            <Toggle on={v} />
          </div>
        ))}
      </div>

      <div className="card">
        <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--tn-fg-muted)" }}>Connection</h3>
        <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: 10, fontSize: 13.5 }}>
          <span style={{ color: "var(--tn-fg-muted)" }}>Connected account</span><span><b>@alex_carter</b></span>
          <span style={{ color: "var(--tn-fg-muted)" }}>Chat ID</span><span style={{ fontFamily: "var(--tn-font-mono)" }}>184729103</span>
          <span style={{ color: "var(--tn-fg-muted)" }}>Last sync</span><span>2 min ago</span>
        </div>
        <div style={{ marginTop: 18, display: "flex", gap: 8 }}>
          <button className="btn btn-secondary">Reconnect</button>
          <button className="btn btn-ghost" style={{ color: "var(--tn-bad)" }}>Disconnect</button>
        </div>
      </div>
    </div>
  );
};

const SettingsShortcuts = () => {
  const groups = [
    { name: "Global", shortcuts: [
      ["⌘ K",    "Open search"],
      ["⌘ N",    "Quick add"],
      ["⌘ /",    "Open command palette"],
      ["Esc",    "Close any overlay"],
      ["G then T","Go to Today"],
      ["G then G","Go to Goals"],
      ["G then C","Go to Calendar"],
    ]},
    { name: "Tasks", shortcuts: [
      ["⌘ Enter", "Mark task complete"],
      ["E",       "Edit selected task"],
      ["#",       "Add tag"],
      ["!",       "Set priority"],
      ["S",       "Change status"],
      ["X",       "Toggle selection"],
      ["⌫",       "Delete (move to Trash)"],
    ]},
    { name: "Editing", shortcuts: [
      ["⌘ B", "Bold"],
      ["⌘ I", "Italic"],
      ["⌘ Z", "Undo"],
      ["⌘ ⇧ Z", "Redo"],
      ["@",   "Mention a goal or task"],
      ["[ [", "Link to another item"],
    ]},
  ];
  return (
    <div>
      <div className="page-eyebrow">Appearance · Keyboard</div>
      <h2 className="page-title" style={{ fontSize: 28, marginTop: 8, marginBottom: 28 }}>Keyboard shortcuts</h2>
      <p style={{ fontSize: 14, color: "var(--tn-fg-muted)", marginBottom: 28, maxWidth: 560 }}>TaskNest is mostly used from the keyboard. These are the shortcuts worth memorising.</p>
      {groups.map(g => (
        <div key={g.name} className="card" style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>{g.name}</h3>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              {g.shortcuts.map(([k,v]) => (
                <tr key={k}><td style={{ padding: "8px 0", borderTop: "var(--tn-line)", fontSize: 13.5 }}>{v}</td>
                  <td style={{ padding: "8px 0", borderTop: "var(--tn-line)", textAlign: "right" }}>
                    <kbd style={{ background: "var(--tn-chip)", padding: "3px 10px", borderRadius: 5, fontFamily: "var(--tn-font-mono)", fontSize: 12 }}>{k}</kbd>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
};

const SettingsData = () => (
  <div>
    <div className="page-eyebrow">Workspace · Data</div>
    <h2 className="page-title" style={{ fontSize: 28, marginTop: 8, marginBottom: 28 }}>Data &amp; export</h2>

    <div className="card" style={{ marginBottom: 16 }}>
      <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Storage</h3>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8, fontSize: 13.5 }}>
        <span>4 goals · 12 milestones · 24 tasks · 8 todos · 5 notes</span>
        <b>2.4 MB</b>
      </div>
      <div style={{ height: 6, background: "var(--tn-bar-bg)", borderRadius: 3, overflow: "hidden", marginBottom: 6 }}>
        <div style={{ width: "12%", height: "100%", background: "var(--tn-accent)" }}></div>
      </div>
      <div style={{ fontSize: 12, color: "var(--tn-fg-muted)" }}>Using 12% of your 20 MB free plan</div>
    </div>

    <div className="card" style={{ marginBottom: 16 }}>
      <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Export</h3>
      {[
        ["JSON",    "Everything as one file — re-importable",      ".json"],
        ["Markdown","Goals and notes as a folder of .md files",    ".zip"],
        ["CSV",     "Tasks and events as separate spreadsheets",   ".zip"],
        ["iCal",    "Calendar items in standard .ics format",      ".ics"],
      ].map(([n, d, ext]) => (
        <div key={n} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "var(--tn-line)" }}>
          <div><b style={{ fontSize: 14, fontWeight: 500 }}>{n} <span style={{ fontSize: 11, fontFamily: "var(--tn-font-mono)", color: "var(--tn-fg-muted)", marginLeft: 4 }}>{ext}</span></b><div style={{ fontSize: 12.5, color: "var(--tn-fg-muted)" }}>{d}</div></div>
          <button className="btn btn-secondary">Download</button>
        </div>
      ))}
    </div>

    <div className="card" style={{ marginBottom: 16 }}>
      <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Import</h3>
      <div style={{ padding: 22, border: "2px dashed var(--tn-fg-dim)", borderRadius: "var(--tn-r-md)", textAlign: "center" }}>
        <div style={{ fontSize: 32, marginBottom: 8, opacity: 0.4 }}>⇪</div>
        <p style={{ fontSize: 13.5, marginBottom: 10 }}>Drop a JSON export here, or pick a file</p>
        <button className="btn btn-primary">Choose file</button>
      </div>
      <p style={{ fontSize: 12, color: "var(--tn-fg-muted)", marginTop: 10 }}>We support imports from Notion, Todoist, Things, and TaskNest exports.</p>
    </div>

    <div className="card">
      <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 14, color: "var(--tn-bad)" }}>Reset workspace</h3>
      <p style={{ fontSize: 13.5, color: "var(--tn-fg-muted)", marginBottom: 14 }}>Permanently delete all goals, milestones, tasks, todos and notes. Your account stays — only the data is wiped.</p>
      <button className="btn btn-secondary" style={{ color: "var(--tn-bad)" }}>Reset workspace…</button>
    </div>
  </div>
);

const SettingsWorkspace = () => (
  <div>
    <div className="page-eyebrow">Workspace</div>
    <h2 className="page-title" style={{ fontSize: 28, marginTop: 8, marginBottom: 28 }}>Workspace</h2>

    <div className="card" style={{ marginBottom: 16 }}>
      <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Workspace details</h3>
      <div style={{ display: "grid", gridTemplateColumns: "180px 1fr auto", gap: 14, alignItems: "center", padding: "10px 0", borderTop: "var(--tn-line)" }}>
        <span style={{ fontSize: 13, color: "var(--tn-fg-muted)" }}>Name</span>
        <span style={{ fontSize: 14 }}>Alex's TaskNest</span>
        <button className="btn btn-ghost" style={{ padding: "4px 10px", fontSize: 12 }}>Edit</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "180px 1fr auto", gap: 14, alignItems: "center", padding: "10px 0", borderTop: "var(--tn-line)" }}>
        <span style={{ fontSize: 13, color: "var(--tn-fg-muted)" }}>URL</span>
        <span style={{ fontSize: 14, fontFamily: "var(--tn-font-mono)" }}>tasknest.app/alex</span>
        <button className="btn btn-ghost" style={{ padding: "4px 10px", fontSize: 12 }}>Edit</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "180px 1fr auto", gap: 14, alignItems: "center", padding: "10px 0", borderTop: "var(--tn-line)" }}>
        <span style={{ fontSize: 13, color: "var(--tn-fg-muted)" }}>Plan</span>
        <span style={{ fontSize: 14 }}>Pro · monthly</span>
        <button className="btn btn-ghost" style={{ padding: "4px 10px", fontSize: 12 }}>Manage</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "180px 1fr auto", gap: 14, alignItems: "center", padding: "10px 0", borderTop: "var(--tn-line)" }}>
        <span style={{ fontSize: 13, color: "var(--tn-fg-muted)" }}>Created</span>
        <span style={{ fontSize: 14 }}>August 12, 2025</span>
        <span></span>
      </div>
    </div>

    <div className="card" style={{ marginBottom: 16 }}>
      <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Members</h3>
      {[
        { n: "Alex Carter",  e: "alex@tasknest.app",   role: "Owner", av: "AC", c: "#c25d63" },
        { n: "Maya Reyes",   e: "maya@example.com",    role: "Editor", av: "MR", c: "#6a8a5a" },
        { n: "Devon Park",   e: "devon@example.com",   role: "Editor", av: "DP", c: "#5a6f8c" },
        { n: "Lia Bennett",  e: "lia@example.com",     role: "Viewer", av: "LB", c: "#8a6594" },
      ].map(m => (
        <div key={m.e} style={{ display: "grid", gridTemplateColumns: "auto 1fr 100px auto", gap: 14, alignItems: "center", padding: "12px 0", borderTop: "var(--tn-line)" }}>
          <div style={{ width: 34, height: 34, borderRadius: "50%", background: m.c, color: "white", display: "grid", placeItems: "center", fontSize: 12, fontWeight: 600 }}>{m.av}</div>
          <div><b style={{ fontSize: 14, fontWeight: 500 }}>{m.n}</b><div style={{ fontSize: 12.5, color: "var(--tn-fg-muted)" }}>{m.e}</div></div>
          <select style={{ padding: "5px 10px", fontSize: 13, borderRadius: "var(--tn-r-md)", border: "var(--tn-line)", background: "var(--tn-surface)", color: "var(--tn-fg)" }} defaultValue={m.role}>
            {["Owner","Admin","Editor","Viewer"].map(r => <option key={r}>{r}</option>)}
          </select>
          <button className="btn btn-ghost" style={{ padding: "4px 10px", fontSize: 12, color: "var(--tn-bad)" }}>Remove</button>
        </div>
      ))}
      <div style={{ marginTop: 14, paddingTop: 14, borderTop: "var(--tn-line)", display: "flex", gap: 8 }}>
        <input placeholder="email@example.com" style={{ flex: 1, padding: "9px 13px", fontSize: 14, borderRadius: "var(--tn-r-md)", border: "var(--tn-line)", background: "var(--tn-surface)", color: "var(--tn-fg)" }} />
        <button className="btn btn-primary">Invite</button>
      </div>
    </div>

    <div className="card">
      <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 14, color: "var(--tn-bad)" }}>Delete workspace</h3>
      <p style={{ fontSize: 13.5, color: "var(--tn-fg-muted)", marginBottom: 14 }}>Permanently delete this workspace and all its data. This action cannot be undone.</p>
      <button className="btn btn-secondary" style={{ color: "var(--tn-bad)" }}>Delete workspace…</button>
    </div>
  </div>
);

/* Reusable Toggle */
const Toggle = ({ on }) => (
  <span style={{ width: 36, height: 20, borderRadius: 999, background: on ? "var(--tn-accent)" : "var(--tn-chip)", position: "relative", display: "inline-block", cursor: "pointer", flexShrink: 0 }}>
    <i style={{ position: "absolute", top: 2, left: on ? 18 : 2, width: 16, height: 16, borderRadius: "50%", background: "white", transition: "left .15s" }} />
  </span>
);

/* Reusable Pill (matches base.css convention) — already exported by screens.jsx; redeclared locally just in case */
const Pill = ({ kind, value, children }) => (
  <span className={`pill ${kind}-${(value||"").replace(/\s+/g,"-")}`}>{children || value}</span>
);

/* ============================================================
   C — EDGE STATES
   ============================================================ */

/* Loading skeleton — drop-in stand-in for Today/Goals while data loads */
const ScreenLoading = () => (
  <div className="page">
    <div className="page-head">
      <div style={{ height: 12, width: 180, background: "var(--tn-chip)", borderRadius: 4, marginBottom: 14, animation: "tn-pulse 1.4s ease-in-out infinite" }}></div>
      <div style={{ height: 36, width: 420, background: "var(--tn-chip)", borderRadius: 6, marginBottom: 12, animation: "tn-pulse 1.4s ease-in-out infinite" }}></div>
      <div style={{ height: 14, width: 560, background: "var(--tn-chip)", borderRadius: 4, animation: "tn-pulse 1.4s ease-in-out infinite" }}></div>
    </div>
    <div className="section">
      <div className="stats" style={{ marginBottom: 28 }}>
        {[1,2,3,4].map(i => (
          <div key={i} className="card" style={{ height: 96, animation: "tn-pulse 1.4s ease-in-out infinite", animationDelay: `${i * 0.1}s` }}></div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 28 }}>
        {[1,2,3,4].map(i => (
          <div key={i} className="card" style={{ height: 180, animation: "tn-pulse 1.4s ease-in-out infinite", animationDelay: `${0.2 + i * 0.1}s` }}></div>
        ))}
      </div>
    </div>
    <style>{`@keyframes tn-pulse { 0%, 100% { opacity: 1 } 50% { opacity: 0.5 } }`}</style>
  </div>
);

/* Offline banner — fixed at top */
const ScreenOffline = ({ go }) => (
  <div className="page" style={{ textAlign: "center", paddingTop: 80 }}>
    <div style={{ fontSize: 56, marginBottom: 16, opacity: 0.4 }}>⌬</div>
    <h1 className="page-title" style={{ fontSize: 32, marginBottom: 12 }}>You're offline.</h1>
    <p className="page-lede" style={{ margin: "0 auto 28px" }}>TaskNest can show what's cached, but changes won't sync until you're back. Anything you edit will queue up here.</p>

    <div style={{ display: "flex", justifyContent: "center", gap: 10, marginBottom: 40 }}>
      <button className="btn btn-primary">Retry</button>
      <button className="btn btn-secondary" onClick={() => go("today")}>Continue offline →</button>
    </div>

    <div className="card" style={{ maxWidth: 560, margin: "0 auto", textAlign: "left" }}>
      <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--tn-fg-muted)" }}>Queued — will sync when online</h3>
      {[
        ["task.created",   "MDX shiki integration",       "2 min ago"],
        ["task.toggled",   "Daily writing — 30 min",      "5 min ago"],
        ["note.edited",    "MDX is the critical path",    "12 min ago"],
        ["event.created",  "Tempo run — 8 km",            "18 min ago"],
      ].map(([t, n, w], i) => (
        <div key={i} style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 12, padding: "10px 0", borderTop: i > 0 ? "var(--tn-line)" : "none", alignItems: "center" }}>
          <span style={{ fontSize: 10, fontFamily: "var(--tn-font-mono)", padding: "2px 8px", background: "var(--tn-chip)", borderRadius: 3 }}>{t}</span>
          <span style={{ fontSize: 13.5 }}>{n}</span>
          <span style={{ fontSize: 12, color: "var(--tn-fg-muted)" }}>{w}</span>
        </div>
      ))}
    </div>
  </div>
);

/* Session expired screen */
const ScreenSessionExpired = ({ go }) => (
  <div style={{ minHeight: "100vh", background: "var(--tn-bg)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
    <div style={{ maxWidth: 420, width: "100%", textAlign: "center" }}>
      <div style={{ fontSize: 48, marginBottom: 18, opacity: 0.4 }}>⌛</div>
      <h1 className="page-title" style={{ fontSize: 28, marginBottom: 10 }}>Session expired.</h1>
      <p style={{ fontSize: 15, color: "var(--tn-fg-muted)", marginBottom: 28 }}>You've been signed out for security. Sign back in to keep going where you left off.</p>
      <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
        <button className="btn btn-primary" onClick={() => go("login")}>Sign in again</button>
      </div>
      <div style={{ marginTop: 32, padding: 14, background: "var(--tn-surface-2)", borderRadius: "var(--tn-r-md)", fontSize: 12.5, color: "var(--tn-fg-muted)" }}>
        Your changes were saved. Nothing was lost — you'll land back on Today.
      </div>
    </div>
  </div>
);

/* Forgot password */
const ScreenForgot = ({ go }) => (
  <AuthShell go={go}>
    <a onClick={() => go("login")} style={{ fontSize: 13, color: "var(--tn-fg-muted)", cursor: "pointer", marginBottom: 14, display: "inline-block" }}>← Sign in</a>
    <h1 className="page-title" style={{ fontSize: 32, marginBottom: 8 }}>Forgot password?</h1>
    <p style={{ fontSize: 15, color: "var(--tn-fg-muted)", marginBottom: 26 }}>Enter the email on your account. We'll send a reset link that expires in one hour.</p>
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div>
        <label style={{ display: "block", fontSize: 12, color: "var(--tn-fg-muted)", marginBottom: 6, letterSpacing: "0.04em" }}>EMAIL</label>
        <input type="email" placeholder="you@example.com" style={authInput} />
      </div>
      <button className="btn btn-primary" style={{ padding: "11px 22px", fontSize: 14, justifyContent: "center" }} onClick={() => go("magic-sent")}>Send reset link →</button>
    </div>
  </AuthShell>
);

/* Reset password */
const ScreenReset = ({ go }) => (
  <AuthShell go={go}>
    <h1 className="page-title" style={{ fontSize: 32, marginBottom: 8 }}>Reset password</h1>
    <p style={{ fontSize: 15, color: "var(--tn-fg-muted)", marginBottom: 26 }}>Pick a new password. At least 8 characters; we'll grade it as you type.</p>
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div>
        <label style={{ display: "block", fontSize: 12, color: "var(--tn-fg-muted)", marginBottom: 6, letterSpacing: "0.04em" }}>NEW PASSWORD</label>
        <input type="password" placeholder="At least 8 characters" style={authInput} />
        <div style={{ marginTop: 8, display: "flex", gap: 4 }}>
          <i style={{ flex: 1, height: 4, borderRadius: 2, background: "var(--tn-accent)" }}></i>
          <i style={{ flex: 1, height: 4, borderRadius: 2, background: "var(--tn-accent)" }}></i>
          <i style={{ flex: 1, height: 4, borderRadius: 2, background: "var(--tn-accent)" }}></i>
          <i style={{ flex: 1, height: 4, borderRadius: 2, background: "var(--tn-chip)" }}></i>
        </div>
        <div style={{ fontSize: 11, color: "var(--tn-fg-muted)", marginTop: 4 }}>Strong · 14 chars · upper + lower + number</div>
      </div>
      <div>
        <label style={{ display: "block", fontSize: 12, color: "var(--tn-fg-muted)", marginBottom: 6, letterSpacing: "0.04em" }}>CONFIRM</label>
        <input type="password" placeholder="Repeat password" style={authInput} />
      </div>
      <button className="btn btn-primary" style={{ padding: "11px 22px", fontSize: 14, justifyContent: "center" }} onClick={() => go("today")}>Update &amp; sign in →</button>
    </div>
  </AuthShell>
);

/* Email verification */
const ScreenVerify = ({ go }) => (
  <AuthShell go={go}>
    <div style={{ fontSize: 40, marginBottom: 16 }}>✉</div>
    <h1 className="page-title" style={{ fontSize: 28, marginBottom: 8 }}>Check your email</h1>
    <p style={{ fontSize: 15, color: "var(--tn-fg-muted)", marginBottom: 26 }}>We sent a verification link to <b style={{ color: "var(--tn-fg)" }}>alex@tasknest.app</b>. Click it within 24 hours to confirm your address.</p>
    <div style={{ padding: 18, background: "var(--tn-surface-2)", borderRadius: "var(--tn-r-md)", marginBottom: 22 }}>
      <div style={{ fontSize: 12, color: "var(--tn-fg-muted)", marginBottom: 8, letterSpacing: "0.04em", textTransform: "uppercase" }}>Didn't get it?</div>
      <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 6, fontSize: 13.5 }}>
        <li>· Check spam, promotions or junk folders</li>
        <li>· Wait a minute — sometimes delivery takes a while</li>
        <li>· Make sure the address is spelled correctly</li>
      </ul>
    </div>
    <div style={{ display: "flex", gap: 8 }}>
      <button className="btn btn-secondary">Resend email</button>
      <button className="btn btn-ghost" onClick={() => go("login")}>Use a different email</button>
    </div>
  </AuthShell>
);

/* ============================================================
   D — AUTH FLOW
   ============================================================ */

/* Magic link sent */
const ScreenMagicSent = ({ go }) => (
  <AuthShell go={go}>
    <div style={{ fontSize: 48, marginBottom: 18 }}>✨</div>
    <h1 className="page-title" style={{ fontSize: 28, marginBottom: 8 }}>Magic link sent.</h1>
    <p style={{ fontSize: 15, color: "var(--tn-fg-muted)", marginBottom: 22 }}>Open the email we just sent and click the link to sign in. The link expires in 15 minutes.</p>
    <div style={{ padding: 16, border: "var(--tn-line)", borderRadius: "var(--tn-r-md)", marginBottom: 22, display: "flex", alignItems: "center", gap: 12 }}>
      <span style={{ fontSize: 22 }}>✉</span>
      <div style={{ flex: 1 }}>
        <b style={{ fontSize: 13.5, fontWeight: 500 }}>alex@tasknest.app</b>
        <div style={{ fontSize: 12, color: "var(--tn-fg-muted)" }}>Sent 8 seconds ago</div>
      </div>
      <button className="btn btn-ghost" style={{ padding: "4px 10px", fontSize: 12 }}>Resend</button>
    </div>
    <div style={{ display: "flex", gap: 8 }}>
      <button className="btn btn-secondary" onClick={() => go("login")}>← Back to sign in</button>
      <button className="btn btn-ghost" style={{ fontSize: 13 }}>Try a different email</button>
    </div>
  </AuthShell>
);

/* 2FA setup */
const Screen2FA = ({ go }) => (
  <AuthShell go={go}>
    <h1 className="page-title" style={{ fontSize: 28, marginBottom: 8 }}>Add 2-step verification</h1>
    <p style={{ fontSize: 15, color: "var(--tn-fg-muted)", marginBottom: 22 }}>Scan the QR with an authenticator app (1Password, Authy, Google Authenticator), then enter the 6-digit code below.</p>

    <div className="card" style={{ marginBottom: 18, display: "flex", gap: 18, alignItems: "center" }}>
      <div style={{ width: 120, height: 120, background: "white", padding: 8, borderRadius: 8, border: "var(--tn-line)", display: "grid", placeItems: "center", color: "#0a0a0a", fontFamily: "var(--tn-font-mono)", fontSize: 9, lineHeight: 1 }}>
        {/* Pixelated QR — pure CSS approximation */}
        <div style={{ width: 100, height: 100, background:
          "linear-gradient(#000 6px, transparent 6px) 0 0/12px 12px, " +
          "linear-gradient(#000 6px, transparent 6px) 6px 6px/12px 12px, " +
          "linear-gradient(90deg,#000 6px, transparent 6px) 0 0/12px 12px," +
          "linear-gradient(90deg,#000 6px, transparent 6px) 6px 6px/12px 12px",
          backgroundColor: "#fff" }}></div>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, color: "var(--tn-fg-muted)", marginBottom: 6, letterSpacing: "0.04em", textTransform: "uppercase" }}>or enter manually</div>
        <div style={{ fontFamily: "var(--tn-font-mono)", fontSize: 14, background: "var(--tn-surface-2)", padding: "8px 12px", borderRadius: 4, marginBottom: 10, letterSpacing: "0.1em" }}>RXFV PH3D 7JK2 9LMQ</div>
        <button className="btn btn-ghost" style={{ padding: "4px 10px", fontSize: 12 }}>Copy code</button>
      </div>
    </div>

    <div>
      <label style={{ display: "block", fontSize: 12, color: "var(--tn-fg-muted)", marginBottom: 6, letterSpacing: "0.04em" }}>VERIFICATION CODE</label>
      <div style={{ display: "flex", gap: 6 }}>
        {[...Array(6)].map((_, i) => (
          <input key={i} maxLength={1} style={{ width: 44, height: 52, fontSize: 22, textAlign: "center", borderRadius: "var(--tn-r-md)", border: "var(--tn-card-border)", background: "var(--tn-surface)", color: "var(--tn-fg)", fontFamily: "var(--tn-font-mono)", fontWeight: 600 }} defaultValue={["8","4","2","6","1","9"][i]} />
        ))}
      </div>
    </div>

    <div style={{ marginTop: 18, padding: 14, background: "var(--tn-surface-2)", borderRadius: "var(--tn-r-md)", fontSize: 12.5, color: "var(--tn-fg-muted)" }}>
      <b style={{ color: "var(--tn-fg)" }}>Save these recovery codes</b> in a safe place — use any one if you lose access to your authenticator.
      <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 4, fontFamily: "var(--tn-font-mono)", fontSize: 12, color: "var(--tn-fg)" }}>
        <span>3hwt-9k2p</span><span>nm84-rxc1</span>
        <span>v7gq-2leh</span><span>jpdz-8ufy</span>
        <span>k1mx-5atn</span><span>q6vw-9rce</span>
      </div>
    </div>

    <div style={{ marginTop: 20, display: "flex", gap: 8 }}>
      <button className="btn btn-primary" onClick={() => go("today")}>Verify &amp; finish</button>
      <button className="btn btn-ghost" onClick={() => go("settings/account")}>Skip for now</button>
    </div>
  </AuthShell>
);

/* Reusable shell for auth-style centered screens */
const AuthShell = ({ children, go }) => (
  <div style={{ minHeight: "100vh", background: "var(--tn-bg)", color: "var(--tn-fg)" }}>
    <div style={{ padding: "24px 32px", display: "flex", alignItems: "center", gap: 12 }}>
      <div className="logo" style={{ width: 28, height: 28, borderRadius: "var(--tn-r-md)", background: "var(--tn-accent)", color: "var(--tn-on-accent)", display: "grid", placeItems: "center", fontWeight: 700, fontSize: 13 }}>T</div>
      <b style={{ fontSize: 14, fontWeight: 600 }}>TaskNest</b>
    </div>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "32px 24px", minHeight: "calc(100vh - 80px)" }}>
      <div style={{ width: "100%", maxWidth: 460 }}>{children}</div>
    </div>
  </div>
);

const authInput = { width: "100%", padding: "10px 14px", fontSize: 14, borderRadius: "var(--tn-r-md)", border: "var(--tn-card-border)", background: "var(--tn-surface)", color: "var(--tn-fg)" };

// Expose
Object.assign(window, {
  SettingsCalendar, SettingsIntegrationDetail, SettingsShortcuts, SettingsData, SettingsWorkspace,
  ScreenLoading, ScreenOffline, ScreenSessionExpired,
  ScreenForgot, ScreenReset, ScreenVerify,
  ScreenMagicSent, Screen2FA,
});
