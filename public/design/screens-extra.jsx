/* TaskNest — extra screens (Category A: create modals, manage screens, bulk/filter UI) */

const D2 = window.TN_DATA;

/* ============================================================
   PRIMITIVES
   ============================================================ */
const Modal = ({ title, eyebrow, onClose, children, footer, width = 520 }) => (
  <div className="search-overlay" onClick={onClose}>
    <div className="card" style={{ maxWidth: width, width: "100%", padding: 0, overflow: "hidden", maxHeight: "85vh", display: "flex", flexDirection: "column", boxShadow: "0 24px 60px rgba(0,0,0,.2)" }} onClick={e => e.stopPropagation()}>
      <div style={{ padding: "20px 26px 14px", borderBottom: "var(--tn-line)", display: "flex", alignItems: "flex-start", gap: 14 }}>
        <div style={{ flex: 1 }}>
          {eyebrow && <div className="page-eyebrow" style={{ marginBottom: 4 }}>{eyebrow}</div>}
          <h2 style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.015em" }}>{title}</h2>
        </div>
        <button className="btn btn-ghost" style={{ padding: "4px 10px", fontSize: 16 }} onClick={onClose}>×</button>
      </div>
      <div style={{ padding: "18px 26px", overflowY: "auto", flex: 1 }}>{children}</div>
      {footer && <div style={{ padding: "14px 26px", borderTop: "var(--tn-line)", display: "flex", gap: 8, justifyContent: "flex-end" }}>{footer}</div>}
    </div>
  </div>
);

const Field = ({ label, hint, children }) => (
  <div style={{ marginBottom: 16 }}>
    <label style={{ display: "block", fontSize: 12, color: "var(--tn-fg-muted)", letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 6, fontWeight: 500 }}>{label}</label>
    {children}
    {hint && <div style={{ fontSize: 12, color: "var(--tn-fg-dim)", marginTop: 4 }}>{hint}</div>}
  </div>
);

const TextIn = ({ value, onChange, placeholder, ...p }) => (
  <input value={value || ""} onChange={e => onChange?.(e.target.value)} placeholder={placeholder} {...p}
    style={{ width: "100%", padding: "9px 13px", fontSize: 14, borderRadius: "var(--tn-r-md)", border: "var(--tn-card-border)", background: "var(--tn-surface)", color: "var(--tn-fg)", ...p.style }} />
);

const Select = ({ value, onChange, options }) => (
  <select value={value} onChange={e => onChange?.(e.target.value)}
    style={{ width: "100%", padding: "9px 13px", fontSize: 14, borderRadius: "var(--tn-r-md)", border: "var(--tn-card-border)", background: "var(--tn-surface)", color: "var(--tn-fg)" }}>
    {options.map(o => <option key={o.value || o} value={o.value || o}>{o.label || o}</option>)}
  </select>
);

const Textarea = ({ value, onChange, placeholder, rows = 3 }) => (
  <textarea value={value || ""} onChange={e => onChange?.(e.target.value)} placeholder={placeholder} rows={rows}
    style={{ width: "100%", padding: "10px 13px", fontSize: 14, borderRadius: "var(--tn-r-md)", border: "var(--tn-card-border)", background: "var(--tn-surface)", color: "var(--tn-fg)", resize: "vertical", lineHeight: 1.5, fontFamily: "inherit" }} />
);

const STATUSES = ["outstanding", "started", "in progress", "finished", "closed", "aborted", "cancelled"];
const PRIORITIES = ["low", "medium", "high"];
const GOALS = () => D2.goals.map(g => ({ value: g.id, label: g.title }));
const MILESTONES_FOR = goalId => {
  const g = D2.goals.find(x => x.id === goalId);
  return (g?.milestones || []).map(m => ({ value: m.id, label: m.title }));
};

/* ============================================================
   CREATE MODALS
   ============================================================ */
const NewGoalModal = ({ onClose }) => {
  const [t, setT] = useState(""), [d, setD] = useState(""), [pri, setPri] = useState("medium"), [due, setDue] = useState(""), [emoji, setEmoji] = useState("🎯");
  const emojis = ["🎯","🌐","🏃","📚","🚀","✨","🛠","💼","🎨","🧠"];
  return (
    <Modal eyebrow="New" title="Add a goal" onClose={onClose}
      footer={<><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-primary">Create goal</button></>}>
      <Field label="Icon">
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {emojis.map(e => (
            <button key={e} onClick={() => setEmoji(e)} style={{ width: 38, height: 38, borderRadius: 8, fontSize: 18, border: emoji === e ? "2px solid var(--tn-accent)" : "var(--tn-line)", background: emoji === e ? "var(--tn-active)" : "var(--tn-surface)" }}>{e}</button>
          ))}
        </div>
      </Field>
      <Field label="Title"><TextIn value={t} onChange={setT} placeholder="e.g. Launch personal brand site" autoFocus /></Field>
      <Field label="Description" hint="A sentence or two — what does done look like?"><Textarea value={d} onChange={setD} placeholder="Ship a portfolio + blog with three case studies." /></Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Priority"><Select value={pri} onChange={setPri} options={PRIORITIES} /></Field>
        <Field label="Due date"><TextIn type="date" value={due} onChange={setDue} /></Field>
      </div>
      <Field label="Tags" hint="Comma-separated. Used for filtering across views."><TextIn placeholder="brand, side-project" /></Field>
    </Modal>
  );
};

const NewTaskModal = ({ onClose, defaultGoal, defaultMilestone }) => {
  const [t, setT] = useState(""), [d, setD] = useState(""), [g, setG] = useState(defaultGoal || D2.goals[0].id), [m, setM] = useState(defaultMilestone || ""), [st, setSt] = useState("outstanding"), [pri, setPri] = useState("medium"), [due, setDue] = useState("");
  useEffect(() => { const opts = MILESTONES_FOR(g); if (opts.length && !opts.find(o => o.value === m)) setM(opts[0].value); }, [g]);
  return (
    <Modal eyebrow="New" title="Add a task" onClose={onClose}
      footer={<><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-primary">Create task</button></>}>
      <Field label="Title"><TextIn value={t} onChange={setT} placeholder="What needs doing?" autoFocus /></Field>
      <Field label="Description"><Textarea value={d} onChange={setD} placeholder="Optional — context, links, references." rows={2} /></Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Goal"><Select value={g} onChange={setG} options={GOALS()} /></Field>
        <Field label="Milestone"><Select value={m} onChange={setM} options={MILESTONES_FOR(g)} /></Field>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        <Field label="Status"><Select value={st} onChange={setSt} options={STATUSES} /></Field>
        <Field label="Priority"><Select value={pri} onChange={setPri} options={PRIORITIES} /></Field>
        <Field label="Due"><TextIn type="date" value={due} onChange={setDue} /></Field>
      </div>
    </Modal>
  );
};

const NewMilestoneModal = ({ onClose, defaultGoal }) => {
  const [t, setT] = useState(""), [d, setD] = useState(""), [g, setG] = useState(defaultGoal || D2.goals[0].id), [pri, setPri] = useState("medium"), [due, setDue] = useState("");
  return (
    <Modal eyebrow="New" title="Add a milestone" onClose={onClose}
      footer={<><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-primary">Create milestone</button></>}>
      <Field label="Title"><TextIn value={t} onChange={setT} placeholder="e.g. Build site with Next.js" autoFocus /></Field>
      <Field label="Description"><Textarea value={d} onChange={setD} placeholder="What does this milestone deliver?" rows={2} /></Field>
      <Field label="Goal"><Select value={g} onChange={setG} options={GOALS()} /></Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Priority"><Select value={pri} onChange={setPri} options={PRIORITIES} /></Field>
        <Field label="Due"><TextIn type="date" value={due} onChange={setDue} /></Field>
      </div>
    </Modal>
  );
};

const NewEventModal = ({ onClose }) => {
  const [t, setT] = useState(""), [date, setDate] = useState(""), [time, setTime] = useState("09:00"), [end, setEnd] = useState("10:00"), [loc, setLoc] = useState(""), [type, setType] = useState("Meeting");
  return (
    <Modal eyebrow="New" title="Add an event" onClose={onClose}
      footer={<><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-primary">Create event</button></>}>
      <Field label="Title"><TextIn value={t} onChange={setT} placeholder="Call with…" autoFocus /></Field>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 12 }}>
        <Field label="Date"><TextIn type="date" value={date} onChange={setDate} /></Field>
        <Field label="Start"><TextIn type="time" value={time} onChange={setTime} /></Field>
        <Field label="End"><TextIn type="time" value={end} onChange={setEnd} /></Field>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Type"><Select value={type} onChange={setType} options={["Meeting","Call","Workout","Review","Personal","Race"]} /></Field>
        <Field label="Location"><TextIn value={loc} onChange={setLoc} placeholder="Zoom · Office · Home" /></Field>
      </div>
      <Field label="Notes"><Textarea placeholder="Optional agenda, links, prep." rows={2} /></Field>
    </Modal>
  );
};

const SubtaskDetailModal = ({ task, subtask, onClose }) => {
  if (!subtask) return null;
  return (
    <Modal eyebrow={task ? `In task — ${task.title}` : "Subtask"} title={subtask.title} onClose={onClose}
      footer={<><button className="btn btn-ghost" onClick={onClose}>Close</button><button className="btn btn-primary">Mark complete</button></>}>
      <Field label="Description"><Textarea defaultValue={subtask.description || ""} rows={3} /></Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Status"><Select value={subtask.status} onChange={() => {}} options={STATUSES} /></Field>
        <Field label="Due"><TextIn type="date" /></Field>
      </div>
      <div style={{ marginTop: 12, paddingTop: 14, borderTop: "var(--tn-line)" }}>
        <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: "var(--tn-fg-muted)", letterSpacing: "0.04em", textTransform: "uppercase" }}>Activity</h3>
        <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 6, fontSize: 13 }}>
          <li><b>Today</b> · created from MDX pipeline</li>
          <li><b>Yesterday</b> · status set to "in progress"</li>
        </ul>
      </div>
    </Modal>
  );
};

const QuickAddModal = ({ onClose, go }) => {
  const [kind, setKind] = useState("task");
  const [val, setVal] = useState("");
  const kinds = [
    { id: "task", label: "Task", icon: "✓", hint: "Type a task — Enter to save" },
    { id: "goal", label: "Goal", icon: "★", hint: "Type a goal — Enter to save" },
    { id: "milestone", label: "Milestone", icon: "🚩", hint: "Type a milestone title" },
    { id: "event", label: "Event", icon: "◷", hint: "Type, then add time" },
    { id: "todo", label: "Todo", icon: "⏱", hint: "Daily habit — Enter to save" },
    { id: "note", label: "Note", icon: "✎", hint: "Type a note — Enter to save" },
  ];
  return (
    <Modal eyebrow="Quick capture" title="Add anything, fast" onClose={onClose} width={620}
      footer={<><span style={{ fontSize: 12, color: "var(--tn-fg-muted)", marginRight: "auto" }}>Press <kbd style={{ background: "var(--tn-chip)", padding: "1px 6px", borderRadius: 4, fontFamily: "inherit" }}>Enter</kbd> to save or <kbd style={{ background: "var(--tn-chip)", padding: "1px 6px", borderRadius: 4, fontFamily: "inherit" }}>Esc</kbd> to close</span><button className="btn btn-primary">Save & open</button></>}>
      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {kinds.map(k => (
          <button key={k.id} onClick={() => setKind(k.id)} style={{ padding: "8px 12px", borderRadius: "var(--tn-r-md)", border: kind === k.id ? "2px solid var(--tn-accent)" : "var(--tn-line)", background: kind === k.id ? "var(--tn-active)" : "transparent", fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 14 }}>{k.icon}</span><span>{k.label}</span>
          </button>
        ))}
      </div>
      <TextIn autoFocus value={val} onChange={setVal} placeholder={kinds.find(k => k.id === kind).hint} style={{ padding: "14px 16px", fontSize: 16 }} />
      <div style={{ marginTop: 14, padding: 14, background: "var(--tn-surface-2)", borderRadius: "var(--tn-r-md)", display: "flex", gap: 14, fontSize: 12, color: "var(--tn-fg-muted)", flexWrap: "wrap" }}>
        <span><kbd style={{ background: "var(--tn-chip)", padding: "1px 6px", borderRadius: 4, fontFamily: "inherit" }}>@goal</kbd> assign</span>
        <span><kbd style={{ background: "var(--tn-chip)", padding: "1px 6px", borderRadius: 4, fontFamily: "inherit" }}>!high</kbd> priority</span>
        <span><kbd style={{ background: "var(--tn-chip)", padding: "1px 6px", borderRadius: 4, fontFamily: "inherit" }}>~tomorrow</kbd> due</span>
        <span><kbd style={{ background: "var(--tn-chip)", padding: "1px 6px", borderRadius: 4, fontFamily: "inherit" }}>#tag</kbd> tag</span>
      </div>
    </Modal>
  );
};

/* ============================================================
   BULK ACTIONS BAR (floating, when 2+ selected)
   ============================================================ */
const BulkActionsBar = ({ count, onClose }) => (
  <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", zIndex: 60, background: "var(--tn-fg)", color: "var(--tn-bg)", borderRadius: 999, padding: "10px 12px 10px 18px", display: "flex", alignItems: "center", gap: 4, boxShadow: "0 12px 32px rgba(0,0,0,.3)" }}>
    <span style={{ fontSize: 13, fontWeight: 600, marginRight: 14 }}>{count} selected</span>
    {[
      { lbl: "Status", ic: "●" },
      { lbl: "Priority", ic: "🚩" },
      { lbl: "Due", ic: "📅" },
      { lbl: "Tag", ic: "#" },
      { lbl: "Move", ic: "→" },
      { lbl: "Archive", ic: "🗃" },
      { lbl: "Delete", ic: "🗑", danger: true },
    ].map(b => (
      <button key={b.lbl} style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 10px", borderRadius: 999, fontSize: 12.5, color: b.danger ? "#ff8a80" : "rgba(255,255,255,.9)" }}
        onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,.1)"}
        onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
        <span>{b.ic}</span><span>{b.lbl}</span>
      </button>
    ))}
    <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: "50%", display: "grid", placeItems: "center", color: "rgba(255,255,255,.6)", marginLeft: 6 }}>×</button>
  </div>
);

/* ============================================================
   FILTER SIDEBAR (slide-in panel for advanced filters)
   ============================================================ */
const FilterPanel = ({ onClose }) => (
  <div className="search-overlay" onClick={onClose} style={{ justifyContent: "flex-end", alignItems: "stretch", padding: 0, paddingTop: 0 }}>
    <div onClick={e => e.stopPropagation()} style={{ background: "var(--tn-card)", borderLeft: "var(--tn-line)", width: 380, height: "100vh", display: "flex", flexDirection: "column", animation: "slidein .2s ease" }}>
      <div style={{ padding: "20px 24px", borderBottom: "var(--tn-line)", display: "flex", alignItems: "center" }}>
        <h2 style={{ fontSize: 18, fontWeight: 600 }}>Filters</h2>
        <div style={{ flex: 1 }}></div>
        <button className="btn btn-ghost" onClick={onClose}>×</button>
      </div>
      <div style={{ padding: 24, overflowY: "auto", flex: 1 }}>
        <FilterBlock label="Status">{STATUSES.map(s => <FilterChip key={s} label={s} />)}</FilterBlock>
        <FilterBlock label="Priority">{PRIORITIES.map(p => <FilterChip key={p} label={p} />)}</FilterBlock>
        <FilterBlock label="Goal">{D2.goals.map(g => <FilterChip key={g.id} label={`${g.emoji} ${g.title.slice(0, 20)}`} />)}</FilterBlock>
        <FilterBlock label="Tags">{["brand","run","read","work","life","portfolio","health"].map(t => <FilterChip key={t} label={"#" + t} />)}</FilterBlock>
        <FilterBlock label="Due date">
          {["Today","This week","This month","Overdue","No date"].map(t => <FilterChip key={t} label={t} />)}
        </FilterBlock>
        <FilterBlock label="Created">
          <Select value="any" options={[{value:"any",label:"Any time"},{value:"7d",label:"Last 7 days"},{value:"30d",label:"Last 30 days"},{value:"y",label:"This year"}]} />
        </FilterBlock>
      </div>
      <div style={{ padding: "14px 24px", borderTop: "var(--tn-line)", display: "flex", gap: 8 }}>
        <button className="btn btn-ghost" style={{ flex: 1 }}>Clear all</button>
        <button className="btn btn-primary" style={{ flex: 2 }} onClick={onClose}>Apply filters</button>
      </div>
    </div>
  </div>
);
const FilterBlock = ({ label, children }) => (
  <div style={{ marginBottom: 22 }}>
    <h3 style={{ fontSize: 12, fontWeight: 500, color: "var(--tn-fg-muted)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 10 }}>{label}</h3>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{children}</div>
  </div>
);
const FilterChip = ({ label }) => {
  const [on, setOn] = useState(false);
  return <button onClick={() => setOn(!on)} style={{ padding: "5px 12px", borderRadius: 999, fontSize: 12.5, background: on ? "var(--tn-accent)" : "var(--tn-chip)", color: on ? "var(--tn-on-accent)" : "var(--tn-fg)", border: "var(--tn-line)" }}>{label}</button>;
};

/* ============================================================
   SCREEN: TAGS (management)
   ============================================================ */
const ScreenTags = ({ go }) => {
  const tags = [
    { name: "brand",   color: "#d8855a", count: 12 },
    { name: "run",     color: "#6a8a5a", count: 6 },
    { name: "read",    color: "#5a6f8c", count: 4 },
    { name: "work",    color: "#8a6594", count: 8 },
    { name: "life",    color: "#c25d63", count: 5 },
    { name: "portfolio", color: "#c8932a", count: 7 },
    { name: "health",  color: "#4d6b3a", count: 3 },
    { name: "learning", color: "#2f4858", count: 9 },
    { name: "side-project", color: "#a14424", count: 11 },
  ];
  return (
    <div className="page">
      <div className="page-head">
        <div className="page-eyebrow">{tags.length} tags · {tags.reduce((a,t) => a + t.count, 0)} items</div>
        <h1 className="page-title">Tags</h1>
        <p className="page-lede">Tags cut across the goal hierarchy — group things by theme, not structure.</p>
      </div>
      <div className="section">
        <div style={{ display: "flex", marginBottom: 18, gap: 10 }}>
          <TextIn placeholder="Filter tags…" style={{ maxWidth: 320 }} />
          <div style={{ flex: 1 }}></div>
          <button className="btn btn-primary">+ New tag</button>
        </div>
        <div className="card" style={{ padding: 0 }}>
          {tags.map((t, i) => (
            <div key={t.name} style={{ display: "grid", gridTemplateColumns: "auto 1fr auto auto auto", gap: 14, alignItems: "center", padding: "14px 20px", borderBottom: i < tags.length - 1 ? "var(--tn-line)" : "none" }}>
              <span style={{ width: 14, height: 14, borderRadius: 4, background: t.color }}></span>
              <b style={{ fontSize: 14, fontWeight: 500 }}>#{t.name}</b>
              <span style={{ fontSize: 12.5, color: "var(--tn-fg-muted)" }}>{t.count} items</span>
              <button className="btn btn-ghost" style={{ padding: "4px 10px", fontSize: 12 }}>Edit</button>
              <button className="btn btn-ghost" style={{ padding: "4px 10px", fontSize: 12, color: "var(--tn-bad)" }}>Delete</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ============================================================
   SCREEN: ARCHIVE (finished/closed goals + tasks)
   ============================================================ */
const ScreenArchive = ({ go }) => {
  const archivedGoals = [
    { id: "ag1", title: "Master TypeScript fundamentals", emoji: "📚", closed: "2026-03-12", milestones: 4, tasks: 24, status: "finished" },
    { id: "ag2", title: "Launch newsletter — first 100 subs", emoji: "✉️", closed: "2026-02-04", milestones: 3, tasks: 18, status: "finished" },
    { id: "ag3", title: "Apartment search Q4", emoji: "🏠", closed: "2025-12-20", milestones: 2, tasks: 14, status: "cancelled" },
    { id: "ag4", title: "Side income from prints", emoji: "🎨", closed: "2025-11-05", milestones: 5, tasks: 31, status: "aborted" },
  ];
  return (
    <div className="page">
      <div className="page-head">
        <div className="page-eyebrow">{archivedGoals.length} archived · {archivedGoals.reduce((a,g) => a + g.tasks, 0)} tasks total</div>
        <h1 className="page-title">Archive</h1>
        <p className="page-lede">Finished, closed and cancelled goals. Read-only — restore one to keep working on it.</p>
      </div>
      <div className="section">
        <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: "var(--tn-line)" }}>
          {["All","Finished","Cancelled","Aborted"].map((k, i) => (
            <button key={k} style={{ padding: "10px 16px", fontSize: 14, fontWeight: 500, color: i === 0 ? "var(--tn-fg)" : "var(--tn-fg-muted)", borderBottom: i === 0 ? "2px solid var(--tn-accent)" : "2px solid transparent", marginBottom: -1 }}>{k}</button>
          ))}
          <div style={{ flex: 1 }}></div>
          <TextIn placeholder="Search archive…" style={{ maxWidth: 240 }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {archivedGoals.map(g => (
            <div key={g.id} className="card" style={{ padding: 18, display: "grid", gridTemplateColumns: "44px 1fr 160px auto", gap: 16, alignItems: "center" }}>
              <div className="gc-ico" style={{ width: 44, height: 44 }}>{g.emoji}</div>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{g.title}</h3>
                <div style={{ fontSize: 12, color: "var(--tn-fg-muted)" }}>{g.milestones} milestones · {g.tasks} tasks · closed {new Date(g.closed).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}</div>
              </div>
              <Pill kind="status" value={g.status} />
              <div style={{ display: "flex", gap: 4 }}>
                <button className="btn btn-secondary" style={{ padding: "5px 12px", fontSize: 12 }}>Restore</button>
                <button className="btn btn-ghost" style={{ padding: "5px 12px", fontSize: 12, color: "var(--tn-bad)" }}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ============================================================
   SCREEN: TRASH (deleted, with restore)
   ============================================================ */
const ScreenTrash = ({ go }) => {
  const items = [
    { id: "t1", kind: "Task",      title: "Old portfolio v1 cleanup", deletedAt: "2026-05-22", goal: "Brand site" },
    { id: "t2", kind: "Note",      title: "Notes from April brainstorm", deletedAt: "2026-05-20" },
    { id: "t3", kind: "Event",     title: "Cancelled team offsite",      deletedAt: "2026-05-19" },
    { id: "t4", kind: "Goal",      title: "Learn Rust (postponed)",      deletedAt: "2026-05-15" },
    { id: "t5", kind: "Task",      title: "Set up old Vercel project",   deletedAt: "2026-05-12", goal: "Brand site" },
    { id: "t6", kind: "Milestone", title: "v0 launch (replaced)",        deletedAt: "2026-05-10", goal: "Brand site" },
  ];
  const kindColor = { Task: "#5a6f8c", Goal: "#d8855a", Milestone: "#8a6594", Note: "#6a8a5a", Event: "#c25d63" };
  return (
    <div className="page">
      <div className="page-head">
        <div className="page-eyebrow">{items.length} items · auto-deleted after 30 days</div>
        <h1 className="page-title">Trash</h1>
        <p className="page-lede">Recently deleted items. Restore in one click, or empty to free your mind.</p>
      </div>
      <div className="section">
        <div style={{ display: "flex", marginBottom: 18, gap: 10, alignItems: "center" }}>
          <span style={{ fontSize: 13, color: "var(--tn-fg-muted)" }}>Items deleted in the last 30 days appear here.</span>
          <div style={{ flex: 1 }}></div>
          <button className="btn btn-secondary">Restore all</button>
          <button className="btn btn-ghost" style={{ color: "var(--tn-bad)" }}>Empty trash</button>
        </div>
        <div className="card" style={{ padding: 0 }}>
          {items.map((it, i) => (
            <div key={it.id} style={{ display: "grid", gridTemplateColumns: "auto 60px 1fr 140px auto auto", gap: 12, alignItems: "center", padding: "14px 20px", borderBottom: i < items.length - 1 ? "var(--tn-line)" : "none" }}>
              <input type="checkbox" />
              <span style={{ fontSize: 10, padding: "3px 8px", background: kindColor[it.kind], color: "white", borderRadius: 4, fontWeight: 600, letterSpacing: "0.04em", textAlign: "center" }}>{it.kind}</span>
              <div>
                <b style={{ fontSize: 14, fontWeight: 500 }}>{it.title}</b>
                {it.goal && <div style={{ fontSize: 12, color: "var(--tn-fg-muted)" }}>From {it.goal}</div>}
              </div>
              <span style={{ fontSize: 12.5, color: "var(--tn-fg-muted)" }}>Deleted {new Date(it.deletedAt).toLocaleDateString("en-US",{month:"short",day:"numeric"})}</span>
              <button className="btn btn-secondary" style={{ padding: "4px 10px", fontSize: 12 }}>Restore</button>
              <button className="btn btn-ghost" style={{ padding: "4px 10px", fontSize: 12, color: "var(--tn-bad)" }}>Delete forever</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ============================================================
   SCREEN: GOAL TEMPLATES — gallery
   ============================================================ */
const ScreenTemplates = ({ go }) => {
  const templates = [
    { id: "marathon", e: "🏃", t: "Run a half marathon", d: "16-week plan: base mileage, speed work, taper.", m: 4, tasks: 24, tags: ["health","run"] },
    { id: "brand", e: "🌐", t: "Launch a personal site", d: "Portfolio + blog with three case studies.", m: 3, tasks: 18, tags: ["brand","portfolio"] },
    { id: "book", e: "📚", t: "Read 24 books", d: "Two per month, balanced fiction/non-fiction.", m: 4, tasks: 24, tags: ["learning"] },
    { id: "course", e: "🎓", t: "Ship an online course", d: "From outline to first paying students.", m: 6, tasks: 42, tags: ["work","creator"] },
    { id: "language", e: "🗣", t: "Learn a language to B1", d: "12-month plan with weekly milestones.", m: 12, tasks: 96, tags: ["learning"] },
    { id: "habit", e: "✨", t: "Daily writing habit", d: "30 minutes a day for 90 days.", m: 3, tasks: 90, tags: ["habit"] },
    { id: "launch", e: "🚀", t: "Product launch playbook", d: "Beta → public launch + marketing.", m: 5, tasks: 38, tags: ["work","product"] },
    { id: "move", e: "🏠", t: "Move apartment", d: "Search, lease, move, settle.", m: 4, tasks: 28, tags: ["life"] },
  ];
  return (
    <div className="page">
      <div className="page-head">
        <div className="page-eyebrow">Templates · {templates.length} starter plans</div>
        <h1 className="page-title">Start from a template</h1>
        <p className="page-lede">Each template is a complete goal with milestones and tasks. Pick one, edit anything — you can change everything later.</p>
      </div>
      <div className="section">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
          {templates.map(t => (
            <div key={t.id} className="card" style={{ padding: 18, cursor: "pointer", display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div className="gc-ico" style={{ width: 40, height: 40, fontSize: 20 }}>{t.e}</div>
                <h3 style={{ fontSize: 15, fontWeight: 600 }}>{t.t}</h3>
              </div>
              <p style={{ fontSize: 13, color: "var(--tn-fg-muted)", lineHeight: 1.5, flex: 1 }}>{t.d}</p>
              <div style={{ fontSize: 12, color: "var(--tn-fg-muted)" }}>{t.m} milestones · {t.tasks} tasks</div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>{t.tags.map(tg => <Pill key={tg} kind="tag" value={tg} />)}</div>
              <button className="btn btn-primary" style={{ marginTop: 4 }}>Use this template</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Expose
Object.assign(window, {
  Modal, Field, TextIn, Select, Textarea,
  NewGoalModal, NewTaskModal, NewMilestoneModal, NewEventModal,
  SubtaskDetailModal, QuickAddModal,
  BulkActionsBar, FilterPanel,
  ScreenTags, ScreenArchive, ScreenTrash, ScreenTemplates,
});
