# TaskNest roadmap

This roadmap is a working checkpoint for features that should not be rushed into the web MVP before core persistence is stable.

## Architecture shift

### Daily Log first

Status: core architecture implemented. `DailyLog`, Today dashboard, goal-scope
tasks, `TodoOccurrence`, dynamic `MetricDefinition`/`MetricEntry`, daily
finalization, and split progress lanes are implemented. Remaining work is
browser-level stabilization and later product expansion.

The Universal Mountain Tracker draft changes the center of the app from due-date lists to a daily source of truth:

- `Goal` describes the mountain.
- `Milestone` describes the next checkpoint.
- `Task` describes work at goal or milestone scope.
- `TodoDefinition` describes repeatable actions.
- `TodoOccurrence` records what happened on a specific day.
- `DailyLog` stores the truth of the day: color, notes, reflection, metrics, and occurrences.
- Daily finalizer closes past logical days automatically, turning pending routine occurrences into missed history instead of overdue backlog.

Important boundary: `DailyLog` is a database record, not the main screen. The
main screen is `Today`, where actions and tiny facts update `DailyLog` in the
background.

Detailed plan: `docs/daily-log-architecture.md`.

New priority order:

1. Add `DailyLog`.
2. Add Today quick log UI.
3. Add goal-scope tasks. Done.
4. Split current todos into definitions and daily occurrences. Done as compatibility layer.
5. Add dynamic metric definitions and entries. Done.
6. Upgrade templates to create routines, subtasks, and metrics. Done.
7. Group due/overdue work inside Today goal cards. First pass done.
8. Split goal progress into structural/outcome/consistency lanes. First pass done.
9. Add automatic daily finalizer: timezone/day-boundary, missed occurrences, black days. Backend done.
10. Add missed/excused history UI for reviewing finalized routine outcomes. Done.
11. Add completion rules. Done for goals, milestones, and tasks: backend lifecycle, structural/outcome/consistency lanes, automatic completion/reopen, detail-page editors, and tested sequential milestone gating.
12. Revisit Radar and graph after the daily core is stable.

## Immediate usability

### Daily draft todos

Purpose: a lightweight scratch list for “what I still need to do today” outside goals, milestones, and recurring todos.

Status: MVP implemented on Today with API persistence.

MVP behavior:

- Add a short item from Today in one action.
- Show unfinished draft items on Today until completed or archived.
- Tap/click an item to mark it done with strikethrough.
- Keep it intentionally lightweight: title, done flag, optional created date.
- Decide later whether daily draft items should reset, archive, or roll over at midnight.

Implementation notes:

- Start with an API-backed model, not local-only state, so reload and mobile clients stay consistent.
- Keep it separate from goal tasks and recurring todos to avoid polluting long-term planning.
- Consider a small “Draft” section in Today above or below overdue items.

### Missed / excused history

Purpose: make the new daily lifecycle visible without turning missed routines
into an overdue backlog.

Status: implemented. The Activity screen shows finalized outcomes by date and
status, supports date/status filters, links rows to their parent context, and
allows missed ↔ excused correction.

MVP behavior:

- Show finalized routine outcomes by date: done, minimum, skipped, missed, excused.
- Filter by goal, task, routine status, and date range.
- Keep `missed` as history/statistics only, not as work to “catch up”.
- Allow manually marking a missed occurrence as `excused` from the history detail.
- Link each row back to its Daily Log and parent goal/task context.

## Feature candidates

### Mountain journey visualization

Purpose: turn goal progress into a generated expedition instead of another
static progress chart.

Status: first interactive prototype implemented on `/visualization`.

Current prototype:

- Each goal deterministically generates its own mountain silhouette, layered
  background ridges, route, snow line, stars, and camp positions.
- Goal is the natural summit marker; the prototype deliberately avoids an
  artificial castle on the peak.
- Milestones are clickable camps/checkpoints.
- Structural project/challenge tasks are clickable trail steps; recurring
  goal routines stay out of the structural trail.
- Distance to each milestone is allocated from structural effort: each project
  task contributes one unit and each one-off subtask contributes another unit;
  square-root softening keeps unusually large milestones readable.
- Character position follows live structural goal progress.
- Character movement and sprite animation are separate layers:
  `MovingCharacter` uses native SVG coordinates and `animateTransform` while
  `AnimalSprite` advances PNG-sprite frames through an SVG viewport. No
  `foreignObject` is used, so the static SVG transform is always present,
  including the first frame and reduced-motion mode.
- The first avatar is a reusable seven-frame PNG sprite sheet at
  `public/animals/bat.png`; no animal pixels or animation frames are stored as
  DOM nodes, data URIs, or `box-shadow` values. A semantic
  `--tn-viz-character-outline` supplies theme-aware contrast.
- Platform-neutral animal configs and route waypoints live under `src/lib`, so
  a future Expo adapter can reuse the same assets and movement rules with
  React Native Reanimated.
- Core geometry is theme-agnostic. The web renderer consumes semantic
  `--tn-viz-*` tokens with automatic fallbacks to the active TaskNest theme;
  themes can override the environment palette without changing routes,
  milestones, progress, or animal assets. The same tokens choose a daytime
  sun or a night crescent, so the scene follows the selected theme rather than
  the operating system colour scheme.
- Responsive checkpoint cards keep the route usable when SVG labels are too
  small on mobile.

Next iterations:

- Add a sprite-avatar registry: raven, wolf, cat, dragon, and other movement
  types without changing route logic.
- Persist the selected avatar in user preferences.
- Support custom static images and validated sprite sheets.
- Give walking/jumping characters a ground-following route while flying
  characters keep the arc route.
- Add biome/castle variants and optional visual rewards without turning the
  map into a second task editor.

### Custom dashboard widgets

Purpose: let users decide what the main dashboard shows and in what order.

MVP behavior:

- Dashboard blocks are registered as widgets: Today, Calendar, Scratch Todos,
  Activity, Quick Actions, Recently Finished, Active Goals, Metrics.
- User can show/hide widgets.
- User can reorder widgets with simple controls first.
- Store layout locally at first, then sync through user preferences later.

Later behavior:

- Drag-and-drop widget reorder.
- Widget size/layout options: compact, side, wide, full.
- Per-device layout presets for desktop/tablet/mobile.

Implementation notes:

- Start with a `dashboardWidgetRegistry`.
- Render dashboard from preferences instead of hardcoded JSX order.
- Avoid Notion-level freeform layout until persistence audit passes.

### Radar / Signals

Tagline: “Catch signals before they become regrets.”

Purpose: an inbox for incoming signals — news, emails, updates, ideas, opportunities, risks, or messages that feel easy to dismiss but may matter later.

Core flow:

1. Capture a signal quickly.
2. Decide whether it is noise or a stake.
3. Choose one decision: ignore, watch, test, or act.
4. Review active signals later.

MVP fields:

- `title` — required.
- `source` — optional.
- `domain` — required: work, money, account, health, relationship, game, opportunity, learning, or other.
- `stake` — none, low, medium, or high.
- `decision` — required: ignore, watch, test, or act.
- `nextAction` — optional, but recommended for test/act.
- `reviewDate` — required for watch/test.
- `deadline` — optional, recommended for act.
- `note` — optional.
- `outcome` — optional after resolution.

Simple rules:

- `ignore` can close immediately.
- `watch` requires a review date.
- `test` requires a review date and should have a next action.
- `act` should have a next action and ideally a deadline.
- High-stake `ignore` should show a confirmation prompt, not a hard block.

Views:

- Today: due signals and a small “process 1–3 signals” prompt.
- Radar: inbox, watch, test, act, ignored, done.
- Review: daily/weekly review prompts and signals needing follow-up.

Not in v0:

- AI scoring.
- Complex gamification.
- Risk formulas.
- Email parsing.
- Calendar sync.
- Full RPG/progression system.

### Graph view / Knowledge map

Purpose: an Obsidian-style graph that shows how goals, milestones, tasks, todos, notes, tags, and future radar signals connect to each other.

Why it matters:

- Helps see which goals are actually connected instead of living as isolated lists.
- Makes notes useful as context around tasks and goals.
- Helps spot overloaded areas, neglected domains, and repeated patterns.

MVP behavior:

- Show nodes for goals, milestones, tasks, notes, tags, and later radar signals.
- Draw edges from existing relationships: goal → milestone → task → todo/subtask.
- Draw note/tag edges when a note references a goal, task, tag, or signal.
- Click a node to open the related page or side preview.
- Filter by entity type, status, tag, and date range.

Implementation notes:

- Start with deterministic relationships from backend data; do not infer too much automatically in v0.
- Later, allow manual links like `[[Goal name]]` or `[[note-title]]` inside notes.
- Keep it as a visualization feature first, not a task-management surface.

Not in first version:

- AI auto-linking.
- Huge graph analytics.
- Complex force-layout customization.
- Editing entities directly inside the graph.

## Stability before expansion

Before mobile apps or integrations, the web MVP should pass a persistence audit for create/update/delete/reorder/reload behavior across goals, milestones, tasks, todos, subtasks, events, notes, and templates.

Current automated completion-rule checkpoint:

- frontend progress/gating tests cover Goal, Milestone, and Task lanes;
- backend audit verifies structural Task → Milestone → Goal propagation;
- metric and consistency rules auto-complete and reopen from persisted facts;
- hybrid rules wait for every configured weighted lane;
- sequential UI gating unlocks from persisted `finished`/`closed` status rather
  than bypassing outcome or consistency rules from structural progress alone.
