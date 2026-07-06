/* TaskNest — additional screens (Notifications, Activity, Help, etc) */

const D4 = window.TN_DATA;

/* ============================================================
   NOTIFICATIONS INBOX (panel — opens from bell icon)
   ============================================================ */
const ScreenNotifications = ({ go }) => {
  const notes = [
    { id: "n1", type: "task",     who: "system", verb: "Task due in 30 min",      what: "Set up MDX pipeline",         when: "just now", unread: true, link: "task/t121" },
    { id: "n2", type: "comment",  who: "Maya R.",   verb: "commented on",          what: "Acme case study draft",       when: "12 min ago", unread: true,  link: "task/t121" },
    { id: "n3", type: "share",    who: "Devon P.",  verb: "shared a goal",         what: "Ship Q3 product launch",      when: "1 hr ago",   unread: true,  link: "goal/g4" },
    { id: "n4", type: "milestone",who: "system",    verb: "Milestone completed",   what: "Design system & brand",       when: "yesterday",  unread: false, link: "goal/g1" },
    { id: "n5", type: "streak",   who: "system",    verb: "Streak milestone hit",  what: "10 days of daily writing",    when: "yesterday",  unread: false, link: "today" },
    { id: "n6", type: "mention",  who: "Lia B.",    verb: "mentioned you in",      what: "Sub-2:00 plan v3 note",       when: "2 days ago", unread: false, link: "notes" },
    { id: "n7", type: "system",   who: "TaskNest",  verb: "New version",           what: "v4.0 with 10 themes",          when: "3 days ago", unread: false, link: "whats-new" },
    { id: "n8", type: "calendar", who: "system",    verb: "Event tomorrow",         what: "Tempo run — 8 km",            when: "3 days ago", unread: false, link: "events" },
  ];
  const colors = { task: "#5a6f8c", comment: "#8a6594", share: "#d8855a", milestone: "#6a8a5a", streak: "#c8932a", mention: "#c25d63", system: "#888", calendar: "#5a6f8c" };
  const icons = { task: "✓", comment: "💬", share: "↗", milestone: "🚩", streak: "🔥", mention: "@", system: "✦", calendar: "◷" };
  const [tab, setTab] = useState("all");
  const list = tab === "unread" ? notes.filter(n => n.unread) : notes;
  return (
    <div className="page" style={{ maxWidth: 760 }}>
      <div className="page-head">
        <div className="page-eyebrow">{notes.filter(n => n.unread).length} unread</div>
        <h1 className="page-title">Inbox</h1>
        <p className="page-lede">Notifications, mentions, shared updates. Like email — but for your roadmap.</p>
      </div>
      <div className="section">
        <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: "var(--tn-line)", alignItems: "baseline" }}>
          {[["all","All",notes.length],["unread","Unread",notes.filter(n=>n.unread).length],["mentions","Mentions",notes.filter(n=>n.type==="mention").length]].map(([k,n,c]) => (
            <button key={k} onClick={() => setTab(k)} style={{ padding: "10px 14px", fontSize: 14, fontWeight: 500, color: tab === k ? "var(--tn-fg)" : "var(--tn-fg-muted)", borderBottom: tab === k ? "2px solid var(--tn-accent)" : "2px solid transparent", marginBottom: -1 }}>
              {n} <span style={{ color: "var(--tn-fg-muted)", fontWeight: 400, marginLeft: 4 }}>{c}</span>
            </button>
          ))}
          <div style={{ flex: 1 }}></div>
          <button className="btn btn-ghost" style={{ fontSize: 13 }}>Mark all read</button>
          <button className="btn btn-ghost" style={{ fontSize: 13 }}>⚙ Settings</button>
        </div>
        <div className="card" style={{ padding: 0 }}>
          {list.map((n, i) => (
            <div key={n.id} onClick={() => go(n.link)} style={{ display: "grid", gridTemplateColumns: "auto 36px 1fr auto", gap: 14, alignItems: "center", padding: "14px 20px", borderTop: i > 0 ? "var(--tn-line)" : "none", cursor: "pointer", background: n.unread ? "var(--tn-hover)" : "transparent", position: "relative" }}>
              {n.unread && <span style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", width: 6, height: 6, borderRadius: "50%", background: "var(--tn-accent)" }}></span>}
              <span style={{ width: 32, height: 32, borderRadius: "50%", background: colors[n.type], color: "white", display: "grid", placeItems: "center", fontSize: 14, marginLeft: 8 }}>{icons[n.type]}</span>
              <div></div>
              <div>
                <div style={{ fontSize: 14, lineHeight: 1.4 }}>
                  <b style={{ fontWeight: 600 }}>{n.who}</b> <span style={{ color: "var(--tn-fg-muted)" }}>{n.verb}</span> <b style={{ fontWeight: 500 }}>{n.what}</b>
                </div>
                <div style={{ fontSize: 12, color: "var(--tn-fg-muted)", marginTop: 2 }}>{n.when}</div>
              </div>
              <button className="btn btn-ghost" style={{ padding: "4px 8px", fontSize: 14 }} onClick={e => e.stopPropagation()}>···</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ============================================================
   ACTIVITY FEED — workspace-wide log
   ============================================================ */
const ScreenActivity = ({ go }) => {
  const groups = [
    { label: "Today · Sunday, May 24", items: [
      { time: "09:14", who: "You",      verb: "completed",       what: "Daily writing — 30 min",       where: "Brand site",          icon: "✓", color: "#6a8a5a" },
      { time: "08:52", who: "Maya R.",  verb: "commented on",     what: "Acme case study draft",        where: "Brand site",          icon: "💬", color: "#8a6594" },
      { time: "08:30", who: "You",      verb: "started",          what: "RSS generation",               where: "MDX pipeline",         icon: "▶", color: "#5a6f8c" },
    ]},
    { label: "Yesterday · Saturday, May 23", items: [
      { time: "21:14", who: "Devon P.", verb: "moved",            what: "Vercel deploy",                 where: "Brand site → Q3 launch", icon: "→", color: "#d8855a" },
      { time: "17:30", who: "You",      verb: "finished",         what: "Tempo run — 8 km",              where: "Half marathon",       icon: "✓", color: "#6a8a5a" },
      { time: "14:00", who: "You",      verb: "added milestone",  what: "Speed work block",              where: "Half marathon",       icon: "🚩", color: "#c8932a" },
      { time: "10:00", who: "Lia B.",   verb: "shared",           what: "Q2 reading list note",          where: "Reading 2026",        icon: "↗", color: "#c25d63" },
    ]},
    { label: "Thursday, May 22", items: [
      { time: "18:21", who: "You",      verb: "archived",         what: "Old portfolio v1 cleanup",       where: "Brand site",          icon: "🗃", color: "#888" },
      { time: "15:00", who: "Maya R.",  verb: "added tag",        what: "#side-project",                 where: "Brand site goal",     icon: "#", color: "#8a6594" },
      { time: "11:42", who: "You",      verb: "created",          what: "Pragmatic Programmer note",     where: "Notes",               icon: "✎", color: "#5a6f8c" },
    ]},
  ];
  return (
    <div className="page">
      <div className="page-head">
        <div className="page-eyebrow">Activity · workspace-wide</div>
        <h1 className="page-title">Activity</h1>
        <p className="page-lede">Everything that's happened — your moves, your team's moves, automated updates. Read it like a journal.</p>
      </div>
      <div className="section">
        <div style={{ display: "flex", marginBottom: 20, gap: 8, alignItems: "center" }}>
          <select style={{ padding: "7px 12px", borderRadius: "var(--tn-r-md)", border: "var(--tn-line)", background: "var(--tn-surface)", color: "var(--tn-fg)", fontSize: 13 }}>
            <option>All activity</option><option>My activity</option><option>Team</option><option>System</option>
          </select>
          <select style={{ padding: "7px 12px", borderRadius: "var(--tn-r-md)", border: "var(--tn-line)", background: "var(--tn-surface)", color: "var(--tn-fg)", fontSize: 13 }}>
            <option>All goals</option>{D4.goals.map(g => <option key={g.id}>{g.title}</option>)}
          </select>
          <div style={{ flex: 1 }}></div>
          <button className="btn btn-ghost" style={{ fontSize: 13 }}>Export log</button>
        </div>
        {groups.map(g => (
          <div key={g.label} style={{ marginBottom: 26 }}>
            <h3 style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--tn-fg-muted)", marginBottom: 12 }}>{g.label}</h3>
            <div className="card" style={{ padding: 0 }}>
              {g.items.map((it, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "60px 32px 1fr auto", gap: 14, alignItems: "center", padding: "14px 20px", borderTop: i > 0 ? "var(--tn-line)" : "none" }}>
                  <span style={{ fontSize: 12, color: "var(--tn-fg-muted)", fontVariantNumeric: "tabular-nums" }}>{it.time}</span>
                  <span style={{ width: 28, height: 28, borderRadius: "50%", background: it.color, color: "white", display: "grid", placeItems: "center", fontSize: 12 }}>{it.icon}</span>
                  <div style={{ fontSize: 14 }}>
                    <b style={{ fontWeight: 600 }}>{it.who}</b>{" "}
                    <span style={{ color: "var(--tn-fg-muted)" }}>{it.verb}</span>{" "}
                    <b style={{ fontWeight: 500 }}>{it.what}</b>{" "}
                    <span style={{ color: "var(--tn-fg-muted)", fontSize: 12.5 }}>· in {it.where}</span>
                  </div>
                  <button className="btn btn-ghost" style={{ padding: "4px 10px", fontSize: 12 }}>View</button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ============================================================
   HELP / DOCS
   ============================================================ */
const ScreenHelp = ({ go }) => {
  const sections = [
    { title: "Getting started", icon: "◐", items: ["Create your first goal", "Break a goal into milestones", "Add tasks and daily todos", "Use Quick Add (⌘N)", "Customise your workspace"] },
    { title: "Working with tasks", icon: "✓", items: ["Task statuses explained", "Priorities and how to use them", "Recurring todos", "Bulk actions on multiple tasks", "Templates"] },
    { title: "Calendar & events", icon: "▦", items: ["Add a one-off event", "Sync with Google Calendar", "Time-block focus sessions", "Repeating events"] },
    { title: "Themes & appearance", icon: "◆", items: ["Switch themes", "Adjust density", "Keyboard shortcuts", "Mobile vs desktop"] },
    { title: "Sharing & teamwork", icon: "↗", items: ["Invite collaborators", "Share a goal publicly", "Permissions: Owner / Editor / Viewer", "Comments and mentions"] },
    { title: "Integrations", icon: "⌘", items: ["Telegram bot setup", "Google Calendar two-way sync", "Slack (coming soon)", "Apple Calendar (coming soon)"] },
  ];
  return (
    <div className="page" style={{ maxWidth: 1000 }}>
      <div className="page-head">
        <div className="page-eyebrow">Help &amp; docs</div>
        <h1 className="page-title">How can we help?</h1>
        <input placeholder="Search — keyboard shortcuts, integrations, billing…" style={{ width: "100%", maxWidth: 560, padding: "12px 16px", fontSize: 15, borderRadius: "var(--tn-r-md)", border: "var(--tn-card-border)", background: "var(--tn-surface)", color: "var(--tn-fg)", marginTop: 16 }} />
      </div>
      <div className="section">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
          {sections.map(s => (
            <div key={s.title} className="card" style={{ padding: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <span style={{ width: 32, height: 32, borderRadius: "var(--tn-r-md)", background: "var(--tn-chip)", color: "var(--tn-fg)", display: "grid", placeItems: "center", fontSize: 16 }}>{s.icon}</span>
                <h3 style={{ fontSize: 15, fontWeight: 600 }}>{s.title}</h3>
              </div>
              <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 4 }}>
                {s.items.map(i => (
                  <li key={i}><a style={{ fontSize: 13.5, color: "var(--tn-fg-muted)", cursor: "pointer", padding: "4px 0", display: "block" }}>{i} →</a></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="section">
        <div className="section-head"><h2>Still stuck?</h2></div>
        <div className="card" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, padding: 20 }}>
          <div><div style={{ fontSize: 22, marginBottom: 6 }}>✉</div><b style={{ fontSize: 14, fontWeight: 600 }}>Email us</b><div style={{ fontSize: 12.5, color: "var(--tn-fg-muted)" }}>hello@tasknest.app · reply within 24h</div></div>
          <div><div style={{ fontSize: 22, marginBottom: 6 }}>💬</div><b style={{ fontSize: 14, fontWeight: 600 }}>Community</b><div style={{ fontSize: 12.5, color: "var(--tn-fg-muted)" }}>Discord — 4,200 members</div></div>
          <div><div style={{ fontSize: 22, marginBottom: 6 }}>𝕏</div><b style={{ fontSize: 14, fontWeight: 600 }}>Status</b><div style={{ fontSize: 12.5, color: "var(--tn-fg-muted)" }}>All systems operational</div></div>
        </div>
      </div>
    </div>
  );
};

/* ============================================================
   WHAT'S NEW
   ============================================================ */
const ScreenWhatsNew = ({ go }) => {
  const releases = [
    { v: "4.0", date: "May 19, 2026", title: "Ten themes, one app", body: "TaskNest now ships with ten visual themes — pick from Notion, Glass, Bento, Brutalist, Pixel, Memphis, Sketchbook, Adventure, Terminal, and Liquid Glass. Switch any time from Settings → Themes.", tag: "MAJOR" },
    { v: "3.8", date: "Apr 28, 2026", title: "Quick add & ⌘K everywhere", body: "Capture anything in two keystrokes — ⌘N opens Quick Add, with slash syntax for goals, priorities, dates and tags. ⌘K now works from any screen, not just the dashboard.", tag: "FEATURE" },
    { v: "3.7", date: "Apr 12, 2026", title: "Bulk actions for tasks", body: "Hold ⇧ to multi-select, then change status, priority, due date or tags for everything at once. Move tasks between milestones in bulk.", tag: "FEATURE" },
    { v: "3.6", date: "Mar 22, 2026", title: "Goal templates gallery", body: "Eight starter plans — half marathon, brand site, reading habit and more. Start from a template, edit anything, ship faster.", tag: "FEATURE" },
    { v: "3.5", date: "Mar 03, 2026", title: "Mobile gestures", body: "Swipe right to complete, left to snooze. New iOS and Android tab bar matches your platform.", tag: "FEATURE" },
    { v: "3.4", date: "Feb 14, 2026", title: "Telegram bot 2.0", body: "Quick capture via /add. Daily digest at your chosen time. Streak nudges. Recovery commands for missed days.", tag: "INTEGRATION" },
  ];
  const tagColor = { MAJOR: "#c25d63", FEATURE: "#5a6f8c", INTEGRATION: "#6a8a5a", FIX: "#888" };
  return (
    <div className="page" style={{ maxWidth: 760 }}>
      <div className="page-head">
        <div className="page-eyebrow">What's new</div>
        <h1 className="page-title">Recently shipped</h1>
        <p className="page-lede">Everything we've added in the last few months. Subscribe to the changelog by email for the next ones.</p>
      </div>
      <div className="section" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {releases.map((r, i) => (
          <div key={r.v} className="card" style={{ padding: 24, display: "grid", gridTemplateColumns: "100px 1fr", gap: 24 }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", fontFamily: "var(--tn-font-display)" }}>v{r.v}</div>
              <div style={{ fontSize: 12, color: "var(--tn-fg-muted)", marginTop: 2 }}>{r.date}</div>
              <span style={{ display: "inline-block", marginTop: 8, padding: "2px 8px", borderRadius: 3, background: tagColor[r.tag], color: "white", fontSize: 10, fontWeight: 700, letterSpacing: "0.06em" }}>{r.tag}</span>
            </div>
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, letterSpacing: "-0.015em" }}>{r.title}</h3>
              <p style={{ fontSize: 14, color: "var(--tn-fg-muted)", lineHeight: 1.6 }}>{r.body}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ============================================================
   PUBLIC SHARING (Share modal — anyone with link)
   ============================================================ */
const ShareModal = ({ onClose }) => {
  const [perm, setPerm] = useState("anyone-view");
  const url = "https://tasknest.app/p/launch-brand-site-x9k2";
  return (
    <div className="search-overlay" onClick={onClose}>
      <div className="card" style={{ maxWidth: 560, width: "100%", padding: 0, overflow: "hidden" }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: "20px 26px 16px", borderBottom: "var(--tn-line)", display: "flex", alignItems: "center", gap: 10 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, flex: 1 }}>Share goal — Launch personal brand site</h2>
          <button className="btn btn-ghost" onClick={onClose}>×</button>
        </div>
        <div style={{ padding: 22 }}>
          {/* Access section */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 12, color: "var(--tn-fg-muted)", letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 8, fontWeight: 500 }}>General access</div>
            {[
              { id: "restricted",  l: "Restricted",     d: "Only invited people can open this goal." },
              { id: "anyone-view", l: "Anyone with link · Viewer",   d: "Read-only. Comments allowed." },
              { id: "anyone-edit", l: "Anyone with link · Editor",   d: "Can add and edit tasks." },
              { id: "public",      l: "Public",         d: "Listed on your public profile and indexable." },
            ].map(o => (
              <label key={o.id} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "10px 12px", borderRadius: "var(--tn-r-md)", cursor: "pointer", background: perm === o.id ? "var(--tn-active)" : "transparent" }}>
                <input type="radio" name="perm" checked={perm === o.id} onChange={() => setPerm(o.id)} style={{ marginTop: 3 }} />
                <div><b style={{ fontSize: 14, fontWeight: 500 }}>{o.l}</b><div style={{ fontSize: 12.5, color: "var(--tn-fg-muted)" }}>{o.d}</div></div>
              </label>
            ))}
          </div>

          {/* Link */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 12, color: "var(--tn-fg-muted)", letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 8, fontWeight: 500 }}>Link</div>
            <div style={{ display: "flex", gap: 8 }}>
              <input readOnly value={url} style={{ flex: 1, padding: "10px 13px", fontSize: 13.5, fontFamily: "var(--tn-font-mono)", borderRadius: "var(--tn-r-md)", border: "var(--tn-line)", background: "var(--tn-surface-2)", color: "var(--tn-fg)" }} />
              <button className="btn btn-primary">Copy link</button>
            </div>
            <div style={{ marginTop: 8, fontSize: 12, color: "var(--tn-fg-muted)", display: "flex", gap: 12 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 6 }}><input type="checkbox" /> Expire in 30 days</label>
              <label style={{ display: "flex", alignItems: "center", gap: 6 }}><input type="checkbox" /> Require password</label>
            </div>
          </div>

          {/* People */}
          <div>
            <div style={{ fontSize: 12, color: "var(--tn-fg-muted)", letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 8, fontWeight: 500 }}>People with access</div>
            {[
              { n: "Alex Carter", e: "alex@tasknest.app",  r: "Owner",  av: "AC", c: "#c25d63" },
              { n: "Maya Reyes",  e: "maya@example.com",   r: "Editor", av: "MR", c: "#6a8a5a" },
              { n: "Devon Park",  e: "devon@example.com",  r: "Viewer", av: "DP", c: "#5a6f8c" },
            ].map(p => (
              <div key={p.e} style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 12, alignItems: "center", padding: "8px 0" }}>
                <div style={{ width: 30, height: 30, borderRadius: "50%", background: p.c, color: "white", display: "grid", placeItems: "center", fontSize: 11, fontWeight: 600 }}>{p.av}</div>
                <div><b style={{ fontSize: 13.5, fontWeight: 500 }}>{p.n}</b><div style={{ fontSize: 11.5, color: "var(--tn-fg-muted)" }}>{p.e}</div></div>
                <select defaultValue={p.r} style={{ padding: "4px 8px", borderRadius: 5, border: "var(--tn-line)", background: "var(--tn-surface)", color: "var(--tn-fg)", fontSize: 12.5 }}>
                  {["Owner","Editor","Viewer","Remove"].map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
            ))}
          </div>
        </div>
        <div style={{ padding: "12px 22px", borderTop: "var(--tn-line)", display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button className="btn btn-ghost" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
};

/* ============================================================
   COMMENTS (drawer — opens from a task or goal)
   ============================================================ */
const CommentsDrawer = ({ onClose }) => (
  <div className="search-overlay" onClick={onClose} style={{ justifyContent: "flex-end", alignItems: "stretch", padding: 0 }}>
    <div onClick={e => e.stopPropagation()} style={{ background: "var(--tn-card)", borderLeft: "var(--tn-line)", width: 420, height: "100vh", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "20px 24px", borderBottom: "var(--tn-line)", display: "flex", alignItems: "center", gap: 10 }}>
        <h2 style={{ fontSize: 17, fontWeight: 600, flex: 1 }}>Comments</h2>
        <span style={{ fontSize: 12, color: "var(--tn-fg-muted)" }}>4 messages · 2 unread</span>
        <button className="btn btn-ghost" onClick={onClose}>×</button>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 18 }}>
        {[
          { n: "Maya R.",  av: "MR", c: "#6a8a5a", t: "5 min ago", body: "Just looked at the MDX setup — frontmatter parser looks clean. One thought: can we add a fallback if the RSS feed is empty? Right now build crashes.", unread: true },
          { n: "You",      av: "AC", c: "#c25d63", t: "2 min ago", body: "Good catch. I'll wrap it in a try / default to a stub feed. Pushing now.", unread: false },
          { n: "Devon P.", av: "DP", c: "#5a6f8c", t: "Just now",  body: "Heads up — Vercel deploy slot moved to Wednesday. Will affect the gallery template task downstream.", unread: true },
        ].map((m, i) => (
          <div key={i} style={{ display: "flex", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: m.c, color: "white", display: "grid", placeItems: "center", fontSize: 11, fontWeight: 600, flexShrink: 0 }}>{m.av}</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 4 }}>
                <b style={{ fontSize: 13.5, fontWeight: 600 }}>{m.n}</b>
                <span style={{ fontSize: 11, color: "var(--tn-fg-muted)" }}>{m.t}</span>
                {m.unread && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--tn-accent)" }}></span>}
              </div>
              <p style={{ fontSize: 13.5, lineHeight: 1.5 }}>{m.body}</p>
              <div style={{ display: "flex", gap: 10, marginTop: 6, fontSize: 11.5, color: "var(--tn-fg-muted)" }}>
                <a style={{ cursor: "pointer" }}>Reply</a><a style={{ cursor: "pointer" }}>Resolve</a><a style={{ cursor: "pointer" }}>···</a>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ padding: 16, borderTop: "var(--tn-line)" }}>
        <textarea placeholder="Write a comment — @mention to notify…" rows={2} style={{ width: "100%", padding: "10px 13px", fontSize: 13.5, borderRadius: "var(--tn-r-md)", border: "var(--tn-line)", background: "var(--tn-surface)", color: "var(--tn-fg)", resize: "none", fontFamily: "inherit", marginBottom: 8 }}></textarea>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <button className="btn btn-ghost" style={{ padding: "4px 8px" }}>@</button>
          <button className="btn btn-ghost" style={{ padding: "4px 8px" }}>📎</button>
          <button className="btn btn-ghost" style={{ padding: "4px 8px" }}>😀</button>
          <div style={{ flex: 1 }}></div>
          <button className="btn btn-primary">Send</button>
        </div>
      </div>
    </div>
  </div>
);

/* ============================================================
   GOAL DETAIL — TABBED VARIANT (Overview / Tasks / Activity / Notes / Files)
   ============================================================ */
const ScreenGoalDetailTabbed = ({ id, go }) => {
  const g = D4.goals.find(x => x.id === id) || D4.goals[0];
  const [tab, setTab] = useState("overview");
  return (
    <div className="page">
      <div className="page-head" style={{ marginBottom: 0 }}>
        <div className="page-eyebrow"><a onClick={() => go("goals")} style={{cursor:"pointer"}}>← Goals</a></div>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
          <div className={`gc-ico ${g.color}`} style={{ width: 56, height: 56, fontSize: 30, borderRadius: 12 }}>{g.emoji}</div>
          <div style={{ flex: 1 }}>
            <h1 className="page-title">{g.title}</h1>
            <p className="page-lede" style={{ marginTop: 8 }}>{g.description}</p>
          </div>
          <button className="btn btn-secondary">⊕ Share</button>
        </div>
      </div>
      <div style={{ display: "flex", gap: 4, marginBottom: 24, borderBottom: "var(--tn-line)" }}>
        {[["overview","Overview"],["tasks","Tasks",24],["activity","Activity"],["notes","Notes",3],["files","Files",7],["settings","Settings"]].map(([k,l,c]) => (
          <button key={k} onClick={() => setTab(k)} style={{ padding: "12px 18px", fontSize: 14, fontWeight: 500, color: tab === k ? "var(--tn-fg)" : "var(--tn-fg-muted)", borderBottom: tab === k ? "2px solid var(--tn-accent)" : "2px solid transparent", marginBottom: -1 }}>
            {l}{c ? <span style={{ marginLeft: 6, color: "var(--tn-fg-muted)", fontWeight: 400, fontSize: 12 }}>{c}</span> : null}
          </button>
        ))}
      </div>
      <div className="section">
        {tab === "overview" && (
          <>
            <div className="stats" style={{ marginBottom: 24 }}>
              <div className="stat"><div className="s-label">Progress</div><div className="s-value">33<small>%</small></div></div>
              <div className="stat"><div className="s-label">Tasks</div><div className="s-value">3<small>/9</small></div></div>
              <div className="stat"><div className="s-label">Milestones</div><div className="s-value">1<small>/3</small></div></div>
              <div className="stat"><div className="s-label">Days to due</div><div className="s-value">83</div></div>
            </div>
            <div className="card" style={{ marginBottom: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Description</h3>
              <p style={{ fontSize: 14, lineHeight: 1.7, color: "var(--tn-fg-muted)" }}>{g.description}</p>
            </div>
          </>
        )}
        {tab === "tasks" && (
          <div className="card" style={{ padding: "8px 20px" }}>
            {g.milestones.flatMap(m => m.tasks || []).slice(0, 6).map(t => (
              <div key={t.id} className={`task-row ${t.status === "finished" ? "done" : ""}`}>
                <span className="cb"></span><span></span>
                <div className="t-body"><span className="t-title">{t.title}</span><div className="t-meta">{t.description}</div></div>
                <span style={{ fontSize: 11, color: "var(--tn-fg-muted)" }}>{t.status}</span>
                <span></span>
              </div>
            ))}
          </div>
        )}
        {tab === "activity" && (
          <div className="card" style={{ padding: "8px 20px" }}>
            {[
              ["Today 09:14", "You finished 'Daily writing'"],
              ["Yesterday",  "Maya commented on 'Acme case study draft'"],
              ["May 22",     "You added milestone 'Build site with Next.js'"],
              ["May 18",     "Devon shared this goal with the team"],
              ["May 10",     "Goal created from template 'Launch a personal site'"],
            ].map(([w, t], i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "120px 1fr", padding: "10px 0", borderTop: i > 0 ? "var(--tn-line)" : "none", fontSize: 13.5 }}>
                <span style={{ color: "var(--tn-fg-muted)" }}>{w}</span><span>{t}</span>
              </div>
            ))}
          </div>
        )}
        {tab === "notes" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              { t: "MDX is the critical path", b: "Don't get sucked back into the colour palette again. Three case studies first, polish later.", d: "May 15" },
              { t: "Three case studies",       b: "Pick three projects: Acme redesign, Personal blog, Open-source contributor profile.", d: "May 02" },
              { t: "Press kit checklist",      b: "Logo pack, screenshots, bio, headshot, two interview questions answered.", d: "Apr 22" },
            ].map((n, i) => (
              <div key={i} className="card"><b style={{ fontSize: 15, fontWeight: 600 }}>{n.t}</b><p style={{ fontSize: 13.5, color: "var(--tn-fg-muted)", marginTop: 6, lineHeight: 1.6 }}>{n.b}</p><div style={{ fontSize: 11, color: "var(--tn-fg-dim)", marginTop: 8 }}>{n.d}</div></div>
            ))}
          </div>
        )}
        {tab === "files" && (
          <div className="card" style={{ padding: "8px 20px" }}>
            {[
              ["brand-tokens.json",         "12 KB · Apr 21"],
              ["typography-options.fig",    "1.4 MB · Apr 18"],
              ["acme-redesign-screens.zip", "8.7 MB · Apr 12"],
              ["press-kit-v0.pdf",          "2.1 MB · Apr 05"],
              ["color-palette.png",         "320 KB · Mar 28"],
              ["logo-pack.zip",             "4.2 MB · Mar 22"],
              ["hero-shot.psd",             "18 MB · Mar 14"],
            ].map(([n, m], i) => (
              <div key={n} style={{ display: "grid", gridTemplateColumns: "32px 1fr auto", gap: 12, padding: "10px 0", borderTop: i > 0 ? "var(--tn-line)" : "none", alignItems: "center" }}>
                <span style={{ width: 30, height: 30, borderRadius: 4, background: "var(--tn-chip)", display: "grid", placeItems: "center", fontSize: 11, fontFamily: "var(--tn-font-mono)" }}>{n.split(".").pop()}</span>
                <div><b style={{ fontSize: 13.5, fontWeight: 500 }}>{n}</b><div style={{ fontSize: 11.5, color: "var(--tn-fg-muted)" }}>{m}</div></div>
                <button className="btn btn-ghost" style={{ padding: "4px 10px", fontSize: 12 }}>Download</button>
              </div>
            ))}
          </div>
        )}
        {tab === "settings" && (
          <div className="card">
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Goal settings</h3>
            <p style={{ fontSize: 13.5, color: "var(--tn-fg-muted)" }}>Rename, change icon and color, archive, or delete this goal. Permission and sharing settings.</p>
          </div>
        )}
      </div>
    </div>
  );
};

/* ============================================================
   PUBLIC PROFILE PAGE
   ============================================================ */
const ScreenPublicProfile = ({ go }) => (
  <div style={{ minHeight: "100vh", background: "var(--tn-bg)" }}>
    <div style={{ padding: "20px 32px", display: "flex", alignItems: "center", gap: 12, borderBottom: "var(--tn-line)" }}>
      <div className="logo" style={{ width: 28, height: 28, borderRadius: "var(--tn-r-md)", background: "var(--tn-accent)", color: "var(--tn-on-accent)", display: "grid", placeItems: "center", fontWeight: 700, fontSize: 13 }}>T</div>
      <b style={{ fontSize: 14, fontWeight: 600 }}>TaskNest</b>
      <div style={{ flex: 1 }}></div>
      <a onClick={() => go("login")} style={{ fontSize: 13, color: "var(--tn-fg-muted)", cursor: "pointer", marginRight: 14 }}>Sign in</a>
      <button className="btn btn-primary" onClick={() => go("signup")}>Sign up</button>
    </div>

    <div style={{ maxWidth: 760, margin: "0 auto", padding: "56px 32px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 24, marginBottom: 36, paddingBottom: 36, borderBottom: "var(--tn-line)" }}>
        <div style={{ width: 96, height: 96, borderRadius: "50%", background: "#c25d63", color: "white", display: "grid", placeItems: "center", fontSize: 36, fontWeight: 700, flexShrink: 0 }}>AC</div>
        <div style={{ flex: 1 }}>
          <h1 className="page-title" style={{ marginBottom: 4 }}>Alex Carter</h1>
          <div style={{ fontSize: 14, color: "var(--tn-fg-muted)", marginBottom: 12 }}>@alex · London, UK · Joined Aug 2025</div>
          <p style={{ fontSize: 15, color: "var(--tn-fg-muted)", lineHeight: 1.55, maxWidth: 540 }}>Designer & engineer. Currently shipping a personal brand site, training for the London Half, and reading my way through 24 books in 2026.</p>
          <div style={{ marginTop: 16, display: "flex", gap: 18, fontSize: 13, color: "var(--tn-fg-muted)" }}>
            <span><b style={{ color: "var(--tn-fg)" }}>4</b> public goals</span>
            <span><b style={{ color: "var(--tn-fg)" }}>342</b> tasks completed</span>
            <span><b style={{ color: "var(--tn-fg)" }}>13</b> day streak</span>
          </div>
        </div>
        <button className="btn btn-secondary">Follow</button>
      </div>

      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 14 }}>Public goals</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 36 }}>
        {D4.goals.map(g => (
          <div key={g.id} className="card" style={{ padding: 20, display: "grid", gridTemplateColumns: "44px 1fr 160px", gap: 16, alignItems: "center" }}>
            <div className={`gc-ico ${g.color}`} style={{ width: 44, height: 44 }}>{g.emoji}</div>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{g.title}</h3>
              <p style={{ fontSize: 13, color: "var(--tn-fg-muted)" }}>{g.description.split(".")[0]}.</p>
            </div>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--tn-fg-muted)", marginBottom: 4 }}><span>Due {new Date(g.due).toLocaleDateString("en-US",{month:"short",day:"numeric"})}</span><b style={{ color: "var(--tn-fg)" }}>33%</b></div>
              <div style={{ height: 4, background: "var(--tn-bar-bg)", borderRadius: 2, overflow: "hidden" }}>
                <div style={{ width: "33%", height: "100%", background: `var(--tn-${g.color})` }}></div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 14 }}>Recent activity</h2>
      <div className="card" style={{ padding: "8px 20px", marginBottom: 36 }}>
        {[
          ["May 24", "Finished 'Daily writing — 30 min' in Brand site"],
          ["May 23", "Completed 'Tempo run — 8 km' in Half marathon"],
          ["May 22", "Added milestone 'Speed work block' to Half marathon"],
        ].map(([w, t], i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "100px 1fr", padding: "10px 0", borderTop: i > 0 ? "var(--tn-line)" : "none", fontSize: 13.5 }}>
            <span style={{ color: "var(--tn-fg-muted)" }}>{w}</span><span>{t}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

/* ============================================================
   PRICING — public, signed-out
   ============================================================ */
const ScreenPricing = ({ go }) => {
  const plans = [
    { name: "Free",        price: "$0", per: "forever",  cta: "Sign up free",  features: ["3 active goals", "Unlimited tasks","Mobile + desktop","Basic themes (3)","Community support"], highlight: false },
    { name: "Pro",         price: "$9", per: "per month", cta: "Start 14-day trial", features: ["Unlimited goals", "All 10 themes", "Telegram + Google Calendar","Templates gallery","Priority support","Activity history (1 year)"], highlight: true },
    { name: "Team",        price: "$18", per: "per user/month", cta: "Contact sales", features: ["Everything in Pro","Shared workspaces","Permissions: Owner/Admin/Editor","SSO + SAML","Audit log","Dedicated support"], highlight: false },
  ];
  return (
    <div style={{ minHeight: "100vh", background: "var(--tn-bg)" }}>
      <div style={{ padding: "20px 32px", display: "flex", alignItems: "center", gap: 12, borderBottom: "var(--tn-line)" }}>
        <div className="logo" style={{ width: 28, height: 28, borderRadius: "var(--tn-r-md)", background: "var(--tn-accent)", color: "var(--tn-on-accent)", display: "grid", placeItems: "center", fontWeight: 700, fontSize: 13 }}>T</div>
        <b style={{ fontSize: 14, fontWeight: 600 }}>TaskNest</b>
        <nav style={{ marginLeft: 36, display: "flex", gap: 18 }}>
          <a onClick={() => go("landing")} style={{ fontSize: 14, color: "var(--tn-fg-muted)", cursor: "pointer" }}>Product</a>
          <a style={{ fontSize: 14, color: "var(--tn-fg)", cursor: "pointer", fontWeight: 500 }}>Pricing</a>
          <a onClick={() => go("whats-new")} style={{ fontSize: 14, color: "var(--tn-fg-muted)", cursor: "pointer" }}>Changelog</a>
        </nav>
        <div style={{ flex: 1 }}></div>
        <a onClick={() => go("login")} style={{ fontSize: 13, color: "var(--tn-fg-muted)", cursor: "pointer", marginRight: 14 }}>Sign in</a>
        <button className="btn btn-primary" onClick={() => go("signup")}>Sign up</button>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "64px 32px" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <h1 className="page-title" style={{ fontSize: 48, marginBottom: 14, letterSpacing: "-0.02em" }}>One product. Three prices.</h1>
          <p style={{ fontSize: 17, color: "var(--tn-fg-muted)", maxWidth: 540, margin: "0 auto" }}>Free for personal use, forever. Pro unlocks the full theme system and integrations. Team adds shared workspaces.</p>
          <div style={{ display: "inline-flex", marginTop: 24, padding: 4, background: "var(--tn-chip)", borderRadius: 999, fontSize: 13 }}>
            <button style={{ padding: "6px 16px", borderRadius: 999, background: "var(--tn-card)", boxShadow: "0 1px 2px rgba(0,0,0,.06)" }}>Monthly</button>
            <button style={{ padding: "6px 16px", borderRadius: 999, color: "var(--tn-fg-muted)" }}>Yearly · save 20%</button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          {plans.map(p => (
            <div key={p.name} className="card" style={{ padding: 28, display: "flex", flexDirection: "column", gap: 16, position: "relative", border: p.highlight ? "2px solid var(--tn-accent)" : undefined }}>
              {p.highlight && <span style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: "var(--tn-accent)", color: "var(--tn-on-accent)", fontSize: 10, padding: "4px 12px", borderRadius: 999, fontWeight: 700, letterSpacing: "0.06em" }}>MOST POPULAR</span>}
              <h3 style={{ fontSize: 18, fontWeight: 600 }}>{p.name}</h3>
              <div><span style={{ fontSize: 40, fontWeight: 700, letterSpacing: "-0.025em", fontFamily: "var(--tn-font-display)" }}>{p.price}</span><span style={{ fontSize: 14, color: "var(--tn-fg-muted)", marginLeft: 6 }}>{p.per}</span></div>
              <button className={p.highlight ? "btn btn-primary" : "btn btn-secondary"} style={{ justifyContent: "center" }} onClick={() => p.cta.includes("Contact") ? null : go("signup")}>{p.cta}</button>
              <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 8, marginTop: 6 }}>
                {p.features.map(f => (
                  <li key={f} style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 13.5 }}><span style={{ color: "var(--tn-good)", marginTop: 1 }}>✓</span><span>{f}</span></li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 64, textAlign: "center" }}>
          <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 24 }}>Common questions</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, maxWidth: 880, margin: "0 auto", textAlign: "left" }}>
            {[
              ["Can I cancel anytime?",          "Yes. Cancel from Settings → Billing — you keep Pro features until the end of your billing period, then drop to Free."],
              ["Is there a student discount?",   "Yes — 50% off Pro with a valid .edu email. Email us with your address."],
              ["What payment methods?",          "All major credit cards, plus Apple Pay, Google Pay, and SEPA for European customers."],
              ["Is my data private?",            "Always. We don't sell it, share it, or train on it. Export it any time as JSON or Markdown."],
            ].map(([q, a]) => (
              <div key={q} className="card" style={{ padding: 18 }}>
                <b style={{ fontSize: 14, fontWeight: 600, display: "block", marginBottom: 6 }}>{q}</b>
                <p style={{ fontSize: 13.5, color: "var(--tn-fg-muted)", lineHeight: 1.55 }}>{a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ============================================================
   LANDING PAGE — public, marketing
   ============================================================ */
const ScreenLanding = ({ go }) => (
  <div style={{ minHeight: "100vh", background: "var(--tn-bg)" }}>
    <div style={{ padding: "20px 32px", display: "flex", alignItems: "center", gap: 12, position: "sticky", top: 0, background: "var(--tn-bg)", borderBottom: "var(--tn-line)", zIndex: 10 }}>
      <div className="logo" style={{ width: 28, height: 28, borderRadius: "var(--tn-r-md)", background: "var(--tn-accent)", color: "var(--tn-on-accent)", display: "grid", placeItems: "center", fontWeight: 700, fontSize: 13 }}>T</div>
      <b style={{ fontSize: 14, fontWeight: 600 }}>TaskNest</b>
      <nav style={{ marginLeft: 36, display: "flex", gap: 18 }}>
        <a style={{ fontSize: 14, color: "var(--tn-fg)", cursor: "pointer", fontWeight: 500 }}>Product</a>
        <a onClick={() => go("pricing")} style={{ fontSize: 14, color: "var(--tn-fg-muted)", cursor: "pointer" }}>Pricing</a>
        <a onClick={() => go("whats-new")} style={{ fontSize: 14, color: "var(--tn-fg-muted)", cursor: "pointer" }}>Changelog</a>
        <a onClick={() => go("help")} style={{ fontSize: 14, color: "var(--tn-fg-muted)", cursor: "pointer" }}>Help</a>
      </nav>
      <div style={{ flex: 1 }}></div>
      <a onClick={() => go("login")} style={{ fontSize: 13, color: "var(--tn-fg-muted)", cursor: "pointer", marginRight: 14 }}>Sign in</a>
      <button className="btn btn-primary" onClick={() => go("signup")}>Start free</button>
    </div>

    {/* Hero */}
    <section style={{ maxWidth: 1100, margin: "0 auto", padding: "80px 32px 56px", textAlign: "center" }}>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "5px 12px", background: "var(--tn-chip)", borderRadius: 999, fontSize: 12, color: "var(--tn-fg-muted)", marginBottom: 24 }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--tn-good)" }}></span>
        v4.0 — ten themes, one app. <b style={{ color: "var(--tn-fg)" }}>What's new →</b>
      </div>
      <h1 style={{ fontSize: 64, fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1.02, marginBottom: 20, maxWidth: 880, margin: "0 auto 20px", fontFamily: "var(--tn-font-display)" }}>Big goals,<br/>broken down.</h1>
      <p style={{ fontSize: 19, color: "var(--tn-fg-muted)", maxWidth: 580, margin: "0 auto 36px", lineHeight: 1.55 }}>TaskNest turns vague ambitions into a roadmap of milestones, tasks and daily todos — in whatever visual style suits the day.</p>
      <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
        <button className="btn btn-primary" style={{ padding: "13px 24px", fontSize: 15 }} onClick={() => go("signup")}>Start free →</button>
        <button className="btn btn-secondary" style={{ padding: "13px 24px", fontSize: 15 }} onClick={() => go("today")}>See it in action</button>
      </div>
      <div style={{ marginTop: 14, fontSize: 12, color: "var(--tn-fg-muted)" }}>Free forever for personal use · No credit card</div>
    </section>

    {/* Hero image — mock dashboard */}
    <section style={{ maxWidth: 1100, margin: "0 auto", padding: "0 32px 80px" }}>
      <div className="card" style={{ padding: 0, overflow: "hidden", aspectRatio: "16/9", display: "grid", gridTemplateColumns: "200px 1fr", border: "var(--tn-card-border)" }}>
        <div style={{ background: "var(--tn-surface-2)", borderRight: "var(--tn-line)", padding: 16, display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <div style={{ width: 18, height: 18, borderRadius: 4, background: "var(--tn-accent)" }}></div>
            <b style={{ fontSize: 12 }}>TaskNest</b>
          </div>
          {["Today","Goals","Milestones","Tasks","Calendar","Notes"].map((l, i) => (
            <div key={l} style={{ padding: "5px 8px", fontSize: 12, borderRadius: 4, background: i === 0 ? "var(--tn-active)" : "transparent" }}>{l}</div>
          ))}
        </div>
        <div style={{ padding: 24 }}>
          <div style={{ height: 22, width: 180, background: "var(--tn-chip)", borderRadius: 4, marginBottom: 10 }}></div>
          <div style={{ height: 36, width: 380, background: "var(--tn-fg)", opacity: 0.85, borderRadius: 4, marginBottom: 22 }}></div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 24 }}>
            {[1,2,3,4].map(i => (
              <div key={i} className="card" style={{ height: 72, padding: 12 }}>
                <div style={{ height: 8, width: "50%", background: "var(--tn-chip)", borderRadius: 2, marginBottom: 8 }}></div>
                <div style={{ height: 18, width: "30%", background: "var(--tn-fg)", opacity: 0.85, borderRadius: 2 }}></div>
              </div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[1,2,3,4].map(i => (
              <div key={i} className="card" style={{ height: 110, padding: 14 }}>
                <div style={{ width: 28, height: 28, borderRadius: 6, background: ["#d8855a","#6a8a5a","#5a6f8c","#8a6594"][i-1], marginBottom: 8 }}></div>
                <div style={{ height: 10, width: "70%", background: "var(--tn-chip)", borderRadius: 2, marginBottom: 6 }}></div>
                <div style={{ height: 6, width: "100%", background: "var(--tn-bar-bg)", borderRadius: 3, marginTop: 12, overflow: "hidden" }}><div style={{ width: ["35%","60%","20%","85%"][i-1], height: "100%", background: ["#d8855a","#6a8a5a","#5a6f8c","#8a6594"][i-1] }}></div></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>

    {/* Features */}
    <section style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 32px 80px" }}>
      <div style={{ textAlign: "center", marginBottom: 48 }}>
        <h2 style={{ fontSize: 36, fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 12, fontFamily: "var(--tn-font-display)" }}>One shape for any goal.</h2>
        <p style={{ fontSize: 16, color: "var(--tn-fg-muted)", maxWidth: 540, margin: "0 auto" }}>Whether you're shipping a product, training for a race, or learning a language — the hierarchy fits.</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
        {[
          { ic: "🎯", t: "Goals",      d: "The big outcome. Has a due date and a why." },
          { ic: "🚩", t: "Milestones", d: "Major checkpoints. Two to eight weeks each." },
          { ic: "✓",  t: "Tasks",       d: "Specific actions. The work you actually do." },
          { ic: "⏱",  t: "Daily todos", d: "Recurring habits. Streaks build over time." },
        ].map(f => (
          <div key={f.t} className="card" style={{ padding: 22 }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>{f.ic}</div>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>{f.t}</h3>
            <p style={{ fontSize: 13, color: "var(--tn-fg-muted)", lineHeight: 1.5 }}>{f.d}</p>
          </div>
        ))}
      </div>
    </section>

    {/* Theme showcase */}
    <section style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 32px 80px" }}>
      <div style={{ textAlign: "center", marginBottom: 36 }}>
        <h2 style={{ fontSize: 36, fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 12, fontFamily: "var(--tn-font-display)" }}>Ten visual languages.</h2>
        <p style={{ fontSize: 16, color: "var(--tn-fg-muted)", maxWidth: 580, margin: "0 auto" }}>Same product, ten personalities. Switch any time — from the sober Notion-style doc, to retro Pixel, to Liquid Glass.</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 14 }}>
        {(window.TN_THEMES || []).map(t => (
          <div key={t.id} className="card" style={{ padding: 14, textAlign: "center", cursor: "pointer" }} onClick={() => { localStorage.setItem("tn-theme", t.id); go("today"); }}>
            <div style={{ aspectRatio: "1/1", borderRadius: 8, overflow: "hidden", display: "flex", flexWrap: "wrap", marginBottom: 10 }}>
              {t.swatches.map((c, i) => <i key={i} style={{ width: "50%", height: "50%", background: c }} />)}
            </div>
            <b style={{ fontSize: 13, fontWeight: 600 }}>{t.name}</b>
          </div>
        ))}
      </div>
    </section>

    {/* Social proof */}
    <section style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 32px 80px", textAlign: "center" }}>
      <div style={{ fontSize: 12, color: "var(--tn-fg-muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 20 }}>Trusted by makers at</div>
      <div style={{ display: "flex", justifyContent: "center", gap: 36, opacity: 0.5, fontSize: 18, fontWeight: 700, letterSpacing: "-0.01em", flexWrap: "wrap" }}>
        <span>Acme Corp</span><span>Stripe</span><span>Loom</span><span>Linear</span><span>Vercel</span><span>Notion</span>
      </div>

      <div style={{ marginTop: 56, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        {[
          { q: "TaskNest finally made me stop juggling apps. One place for the work I actually want to do.", n: "Maya R.", r: "Designer, Stripe" },
          { q: "I switch themes by mood. Brutalist for deep work, Sketchbook on the weekend. Sounds silly — it works.", n: "Devon P.", r: "Founder, Acme" },
          { q: "The clearest mental model for goals I've used. Goal → milestone → task → todo. Clean, predictable, fast.", n: "Lia B.", r: "PM, Loom" },
        ].map((t, i) => (
          <div key={i} className="card" style={{ padding: 22, textAlign: "left" }}>
            <p style={{ fontSize: 14.5, lineHeight: 1.55, marginBottom: 14, fontFamily: "var(--tn-font-display)", fontStyle: "italic" }}>"{t.q}"</p>
            <div style={{ fontSize: 12.5 }}><b style={{ fontWeight: 600 }}>{t.n}</b> · <span style={{ color: "var(--tn-fg-muted)" }}>{t.r}</span></div>
          </div>
        ))}
      </div>
    </section>

    {/* CTA */}
    <section style={{ background: "var(--tn-fg)", color: "var(--tn-bg)", padding: "80px 32px", textAlign: "center" }}>
      <h2 style={{ fontSize: 40, fontWeight: 700, letterSpacing: "-0.025em", marginBottom: 14, fontFamily: "var(--tn-font-display)" }}>Start your roadmap.</h2>
      <p style={{ fontSize: 17, opacity: 0.7, maxWidth: 480, margin: "0 auto 28px" }}>Free for personal use. No credit card. Pro is $9 a month if you want it.</p>
      <button className="btn" style={{ background: "var(--tn-bg)", color: "var(--tn-fg)", padding: "13px 28px", fontSize: 15, fontWeight: 600 }} onClick={() => go("signup")}>Sign up free →</button>
    </section>

    <footer style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 32px 64px", display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 32, fontSize: 13, color: "var(--tn-fg-muted)" }}>
      <div><b style={{ color: "var(--tn-fg)", fontSize: 14 }}>TaskNest</b><p style={{ marginTop: 8, lineHeight: 1.5 }}>Roadmap as a Service.<br/>Made with too many themes.</p></div>
      <div><b style={{ color: "var(--tn-fg)" }}>Product</b><ul style={{ listStyle: "none", marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}><li>Features</li><li><a onClick={() => go("pricing")} style={{ cursor: "pointer" }}>Pricing</a></li><li><a onClick={() => go("whats-new")} style={{ cursor: "pointer" }}>Changelog</a></li><li>Roadmap</li></ul></div>
      <div><b style={{ color: "var(--tn-fg)" }}>Company</b><ul style={{ listStyle: "none", marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}><li>About</li><li>Blog</li><li>Careers</li><li>Press</li></ul></div>
      <div><b style={{ color: "var(--tn-fg)" }}>Legal</b><ul style={{ listStyle: "none", marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}><li>Privacy</li><li>Terms</li><li>Security</li><li>Status</li></ul></div>
    </footer>
  </div>
);

// Expose
Object.assign(window, {
  ScreenNotifications, ScreenActivity, ScreenHelp, ScreenWhatsNew,
  ShareModal, CommentsDrawer,
  ScreenGoalDetailTabbed, ScreenPublicProfile, ScreenPricing, ScreenLanding,
});
