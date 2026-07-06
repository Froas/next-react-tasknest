// TaskNest sample data — расширенная версия для всех экранов
window.TN_DATA = {
  user: {
    name: "Alex Carter",
    handle: "alex",
    email: "alex@tasknest.app",
    avatar: "AC",
    joined: "2025-08-12",
    streak: 13,
    level: 17,
    xp: 2340,
    xpToNext: 660,
    gold: 847,
  },

  // Active goals — used across Dashboard, Goals list/detail, Calendar
  goals: [
    {
      id: "g1",
      title: "Launch personal brand site",
      slug: "brand-site",
      description: "Ship a portfolio + blog at janedoe.dev with at least three case studies and a press kit. Brand system locked April 21 — Next.js build is the path forward; MDX pipeline is the critical lane.",
      icon: "globe",
      emoji: "🌐",
      color: "warm",
      status: "in progress",
      priority: "high",
      start: "2025-12-01",
      due: "2026-08-15",
      tags: ["brand", "portfolio", "side-project"],
      milestones: [
        {
          id: "m11", title: "Design system & brand",
          description: "Type, color, spacing, components, voice.",
          status: "finished", priority: "medium", due: "2026-04-21",
          tasks: [
            { id: "t111", title: "Pick typography", description: "Try 3 pairings", status: "finished", priority: "medium" },
            { id: "t112", title: "Define color tokens", description: "Light + dark", status: "finished", priority: "medium" },
            { id: "t113", title: "Document voice + tone", description: "1-page guideline", status: "finished", priority: "low" },
          ]
        },
        {
          id: "m12", title: "Build site with Next.js",
          description: "MDX blog, projects index, contact form, RSS.",
          status: "in progress", priority: "high", due: "2026-06-30",
          tasks: [
            { id: "t121", title: "Set up MDX pipeline", description: "Frontmatter, RSS, code highlighting via shiki", status: "in progress", priority: "high", due: "2026-05-08",
              subtasks: [
                { id: "s1211", title: "Frontmatter parser", status: "finished" },
                { id: "s1212", title: "RSS generation", status: "in progress" },
                { id: "s1213", title: "Shiki code highlighting", status: "outstanding" },
                { id: "s1214", title: "Reading-time calc", status: "outstanding" },
              ],
              todos: [
                { id: "td1211", title: "Daily writing — 30 min", status: "in progress", recurring: "daily" },
              ]
            },
            { id: "t122", title: "Write case study · Acme Corp redesign", description: "Three sections, draft only", status: "started", priority: "high", due: "2026-05-18" },
            { id: "t123", title: "Projects gallery template", description: "Three case studies w/ screenshots", status: "outstanding", priority: "medium", due: "2026-06-05" },
            { id: "t124", title: "Configure Vercel + custom domain", description: "DNS, SSL, edge config", status: "outstanding", priority: "medium", due: "2026-07-02" },
          ]
        },
        {
          id: "m13", title: "Launch & promote",
          description: "Press kit, social, friends-and-family list.",
          status: "outstanding", priority: "low", due: "2026-08-15",
          tasks: [
            { id: "t131", title: "Press kit assets", description: "Logo pack, screenshots, bio", status: "outstanding", priority: "low" },
            { id: "t132", title: "Launch announcements", description: "Twitter, LinkedIn, dev communities", status: "outstanding", priority: "low" },
          ]
        }
      ]
    },
    {
      id: "g2",
      title: "Run a half marathon",
      slug: "half-marathon",
      description: "Sub-2:00 in October. Build base mileage May–June, then 8 weeks of speed work.",
      icon: "run",
      emoji: "🏃",
      color: "moss",
      status: "started",
      priority: "medium",
      start: "2026-04-01",
      due: "2026-10-10",
      tags: ["health", "run"],
      milestones: [
        { id: "m21", title: "Build base mileage", description: "30 km / week through June",
          status: "in progress", priority: "medium", due: "2026-07-01",
          tasks: [
            { id: "t211", title: "Three runs per week", description: "Two easy, one long", status: "in progress", priority: "medium",
              todos: [
                { id: "td2111", title: "Mon — 5 km easy", status: "finished", recurring: "weekly" },
                { id: "td2112", title: "Wed — 8 km tempo", status: "in progress", recurring: "weekly" },
                { id: "td2113", title: "Sat — long run", status: "outstanding", recurring: "weekly" },
              ]
            },
            { id: "t212", title: "Strength × 2 / week", description: "Hip & glute focus", status: "started", priority: "low" },
          ]
        },
        { id: "m22", title: "Speed work block", description: "Intervals + tempo, 8 weeks",
          status: "outstanding", priority: "low", due: "2026-09-15", tasks: [] },
      ]
    },
    {
      id: "g3",
      title: "Read 24 books this year",
      slug: "reading-2026",
      description: "Two per month. Mix fiction and non-fiction; one technical and one literary.",
      icon: "book",
      emoji: "📚",
      color: "slate",
      status: "in progress",
      priority: "low",
      start: "2026-01-01",
      due: "2026-12-31",
      tags: ["learning"],
      milestones: [
        { id: "m31", title: "Q2 reading list", description: "6 books, balanced", status: "started", priority: "low", due: "2026-06-30",
          tasks: [
            { id: "t311", title: "Currently reading", description: "One tech, one lit at a time", status: "in progress", priority: "low",
              subtasks: [
                { id: "s3111", title: "The Pragmatic Programmer", status: "in progress" },
                { id: "s3112", title: "Designing Data-Intensive Apps", status: "outstanding" },
                { id: "s3113", title: "Pachinko (Min Jin Lee)", status: "outstanding" },
              ]
            }
          ]
        }
      ]
    },
    {
      id: "g4",
      title: "Ship Q3 product launch",
      slug: "q3-launch",
      description: "Beta to public launch with marketing push, partners, PR. The most ambitious of the four.",
      icon: "rocket",
      emoji: "🚀",
      color: "plum",
      status: "started",
      priority: "high",
      start: "2026-04-15",
      due: "2026-09-30",
      tags: ["work"],
      milestones: [
        { id: "m41", title: "Beta program", description: "50 users, two-week cycles",
          status: "in progress", priority: "high", due: "2026-06-15",
          tasks: [
            { id: "t411", title: "Recruit beta users", description: "Target 50 active", status: "in progress", priority: "high" },
            { id: "t412", title: "Beta feedback loop", description: "Weekly call + form", status: "started", priority: "medium" },
          ]
        },
        { id: "m42", title: "Marketing assets", description: "Landing, video, press kit",
          status: "outstanding", priority: "medium", due: "2026-08-01", tasks: [] },
        { id: "m43", title: "Public launch", description: "Sep 30, partner-coordinated",
          status: "outstanding", priority: "high", due: "2026-09-30", tasks: [] },
      ]
    }
  ],

  // Today's schedule (May 19, 2026 — Tuesday)
  today: [
    { id: "ev1", time: "08:30", end: "09:00", title: "Daily writing — 30 min",         goal: "g1", tag: "brand", status: "finished" },
    { id: "ev2", time: "09:30", end: "11:00", title: "MDX pipeline — RSS generation",  goal: "g1", tag: "brand", status: "in progress" },
    { id: "ev3", time: "11:30", end: "12:30", title: "Beta user call — Acme team",     goal: "g4", tag: "work",  status: "outstanding" },
    { id: "ev4", time: "14:00", end: "15:30", title: "Outline first case study",       goal: "g1", tag: "brand", status: "outstanding" },
    { id: "ev5", time: "17:00", end: "18:00", title: "Tempo run — 8 km",               goal: "g2", tag: "run",   status: "outstanding" },
    { id: "ev6", time: "21:00", end: "21:45", title: "Read — Pragmatic Programmer",    goal: "g3", tag: "read",  status: "outstanding" },
    { id: "ev7", time: "22:30", end: "22:50", title: "Plan Saturday's long run",       goal: "g2", tag: "life",  status: "outstanding" },
  ],

  // Calendar items (May 2026)
  calendar: [
    { date: "2026-05-04", title: "Tempo run — 8 km",          type: "Event",     status: "finished" },
    { date: "2026-05-08", title: "Set up MDX pipeline (due)", type: "Task",      status: "in progress" },
    { date: "2026-05-12", title: "Beta call — Acme",          type: "Event",     status: "finished" },
    { date: "2026-05-15", title: "Acme case study draft",     type: "Task",      status: "started" },
    { date: "2026-05-19", title: "Today",                     type: "Today",     status: "" },
    { date: "2026-05-21", title: "Long run — 14 km",          type: "Event",     status: "outstanding" },
    { date: "2026-05-25", title: "Beta cycle review",         type: "Milestone", status: "outstanding" },
    { date: "2026-05-28", title: "Mum's birthday",            type: "Life",      status: "outstanding" },
    { date: "2026-05-30", title: "Long run — 16 km",          type: "Event",     status: "outstanding" },
  ],

  // Standalone events (not tied to goals — Calendar items + scheduled appointments)
  events: [
    { id: "e1", title: "Beta user call — Acme team",     date: "2026-05-19", time: "11:30", end: "12:30", location: "Zoom",                 type: "Call",      status: "outstanding" },
    { id: "e2", title: "Design review with Maya",        date: "2026-05-20", time: "15:00", end: "16:00", location: "Figma",                type: "Review",    status: "outstanding" },
    { id: "e3", title: "Long run — 14 km",               date: "2026-05-21", time: "07:00", end: "08:30", location: "Hampstead Heath",      type: "Workout",   status: "outstanding" },
    { id: "e4", title: "Q3 launch sync with Devon",      date: "2026-05-22", time: "10:00", end: "11:00", location: "Office",               type: "Meeting",   status: "outstanding" },
    { id: "e5", title: "Mum's birthday dinner",          date: "2026-05-28", time: "19:00", end: "22:00", location: "Home",                 type: "Personal",  status: "outstanding" },
    { id: "e6", title: "Tempo run — 8 km",               date: "2026-05-04", time: "17:00", end: "18:00", location: "Local route",          type: "Workout",   status: "finished" },
    { id: "e7", title: "Brand review with Lia",          date: "2026-05-13", time: "14:00", end: "15:00", location: "Coffee shop",          type: "Review",    status: "finished" },
    { id: "e8", title: "London Half — race day",         date: "2026-10-10", time: "09:00", end: "12:00", location: "London",               type: "Race",      status: "outstanding" },
  ],

  notes: [
    { id: "n1", title: "MDX is the critical path", body: "Don't get sucked back into the colour palette again. Three case studies first, polish later.", date: "2026-05-15", tag: "brand", pinned: true },
    { id: "n2", title: "Sub-2:00 plan v3",         body: "Base build May–June, speed work July–Sep, taper last 2 weeks. Long run climbs +2km each Saturday until June 21.", date: "2026-05-12", tag: "run" },
    { id: "n3", title: "Reading rhythm",           body: "Try non-fiction in mornings, fiction at night. Track retention notes only when something is worth keeping.", date: "2026-05-10", tag: "read" },
    { id: "n4", title: "Mum's birthday — June 12", body: "Order present by end of May. Maybe the gardening tool set she pointed at last visit.", date: "2026-05-08", tag: "life" },
    { id: "n5", title: "Beta feedback patterns",   body: "Three users hit the same import bug. Prioritise fixing this before the next two-week cycle.", date: "2026-05-06", tag: "work", pinned: true },
  ],

  // Aggregate stats
  stats: {
    totalGoals: 4,
    activeGoals: 3,
    finishedGoals: 0,
    totalMilestones: 12,
    finishedMilestones: 1,
    totalTasks: 24,
    finishedTasks: 8,
    weekFocusHours: 42.5,
    weekTaskCloseRate: 0.65,
    streakDays: 13,
    weekMileage: 31,
    weekMileageTarget: 40,
    // last 14 days of focus hours
    focusHistory: [3.0, 5.0, 4.0, 6.5, 8.0, 5.5, 4.5, 6.0, 7.5, 5.0, 8.5, 7.0, 9.0, 6.2],
    // last 7 days streak status
    streakWeek: ["on","on","on","on","on","on","partial"],
  },
};
