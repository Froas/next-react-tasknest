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

### Journey visualization

Purpose: turn goal progress into a visual journey without coupling goal data
to one environment.

Status: shared Journey Theme architecture implemented on `/visualization`.

Current implementation:

- `Goal.journey_theme_id` persists the selected visual theme independently of
  title, milestones, completion rules, and progress.
- One shared `ProgressMap` renders every theme. Milestone markers, labels,
  structural task steps, states, and `MovingCharacter` are not duplicated.
- Initial registry: Mountain Ascent, World Tree, Cosmic Journey, Volcanic Peak,
  Ocean Dive, and Castle Ascent. Ocean descends; the other initial routes rise.
- Environment-only WebP assets remain selector previews/fallbacks and contain
  no character, route, marker, label, or dynamic value. Runtime maps now use
  procedural SVG environments, while React/SVG renders all live state above
  those environment primitives.
- Milestone distance is effort-weighted: project/challenge tasks and their
  one-off subtasks allocate more route distance, while routines stay out of
  structural progress.
- Theme selection is available during Goal creation, quick creation, Goal
  editing, Goal Details, and Visualization. Changing it does not reset data or
  the currently selected character.
- Character movement uses Framer Motion and remains separate from sprite-frame
  animation. Sprite frames run through CSS `steps()` over PNG sheets, while
  Framer Motion only changes map coordinates. No character or map is encoded
  as CSS `box-shadow` pixels.
- The original seven-frame Bat remains unchanged. Separate 8-frame PNG sheets
  are selectable for Bat v2, Eagle, Snow Leopard, Owl, Mountain Goat, Fox,
  Salamander, Baby Dragon, Manta Ray, and Sea Turtle.
- Theme art is an environment layer, not a pre-rendered progress map. Route
  control points, effort-weighted checkpoint positions, and atmospheric
  decorations are generated deterministically from Goal/theme/structure, so
  switching themes changes the route while reloads remain stable.
- Mountain now uses a deterministic procedural SVG environment instead of its
  runtime background image. Its silhouette, ridges, snow cap, distant peaks,
  clouds, and warm sky vary by Goal seed without network or AI generation;
  the geometry lives in platform-neutral TypeScript for a later Expo/Skia
  adapter. The static Mountain WebP remains only as a selector preview/fallback.
- World Tree, Cosmic, Volcano, Ocean, and Castle now use the same lightweight
  procedural environment contract. Each produces a small set of large,
  deterministic polygons/circles/rectangles so 32px characters and route
  states stay readable without runtime image generation.
- Journey registry, route sampling, effort distribution, progress location,
  and animal configuration are platform-neutral TypeScript modules suitable
  for a later Expo/Reanimated adapter.
- Selected character is persisted per Goal as presentation metadata. Reloading,
  switching goals, or changing Journey Theme keeps the chosen animal without
  coupling it to milestone or progress data.
- Movement adapters now consume the generated route: walking characters follow
  terrain samples, jumping characters add small route-relative hops, swimming
  characters undulate around the route, and flying characters use a separate
  aerial arc. Sprite-frame animation remains independent from map movement.
- Completed milestones receive small read-only reward tokens. Rewards are
  derived from persisted milestone state, theme-aware, and never become a
  second task-editing surface.

Next iterations:

- Connect validated custom static images and sprite-sheet uploads after an
  object-storage provider and retention policy are selected. The portable
  metadata/validation contract is documented in `docs/journey-custom-assets.md`;
  local writes to the deployed `public/` directory are explicitly rejected.

### Custom dashboard widgets

Purpose: let users decide what the main dashboard shows and in what order.

Status: responsive account-synced MVP implemented.

MVP behavior:

- Dashboard blocks are registered as widgets: Today, Calendar, Scratch Todos,
  Activity, Quick Actions, Recently Finished, Active Goals, Metrics.
- User can show/hide widgets.
- User can reorder widgets with simple controls first.
- Store layout locally for instant/offline behavior and sync the normalized
  layout through user preferences for cross-device use.

Current implementation:

- A typed `dashboardWidgetRegistry` covers Today, Activity, Inbox, Recently
  Finished, Overall Progress, Active Goals, Calendar, and Quick Actions.
- Users can show/hide widgets and reorder them with accessible up/down controls.
- Main-column and sidebar areas remain fixed for predictable responsive layout.
- Preferences are normalized, version-tolerant, persisted in `localStorage`,
  synchronized between tabs on the same device, and mirrored to the user
  profile for cross-device/mobile clients.
- Desktop and mobile now have independent account-synced presets. The matching
  layout activates automatically at the responsive breakpoint.
- Settings support native drag-and-drop reordering on desktop while retaining
  accessible up/down controls for keyboard and touch users.
- Each widget exposes only compatible size choices. Compact widgets can share
  a row on wide main layouts, while Today and Active Goals remain readable as
  wide/full widgets. Sidebar widgets can share rows when they move below the
  main column on intermediate/mobile layouts.

Later behavior:

- Optional tablet-specific preset if desktop/mobile proves insufficient.
- Moving arbitrary main widgets into the narrow desktop sidebar. This remains
  disabled until each widget has an explicit sidebar renderer.

Implementation notes:

- Avoid Notion-level freeform layout until persistence audit passes.

### Radar / Signals

Tagline: “Catch signals before they become regrets.”

Purpose: an inbox for incoming signals — news, emails, updates, ideas, opportunities, risks, or messages that feel easy to dismiss but may matter later.

Status: workflow MVP implemented.

Current implementation:

- Existing `Note(kind="signal")` records were extended instead of adding a
  competing signal table. Old captures remain valid inbox items.
- Radar fields persist domain, stake, decision, next action, review date,
  deadline, outcome, and resolution time.
- `/radar` provides Inbox, Watch, Test, Act, Ignored, and Done views with due
  sorting, search, processing, completion, and reopening.
- Watch/Test enforce a review date. Ignore closes immediately, and high-stake
  ignore asks for explicit confirmation in the UI.
- Today shows due/inbox signal prompts, while Review keeps general system
  statistics and adds Radar workflow counts instead of becoming signal-only.

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

Status: deterministic read-only MVP implemented on `/graph`.

Current implementation:

- Builds nodes and edges from persisted goal → milestone → task →
  todo/subtask hierarchy, note/signal relations, and tags.
- Provides entity-type, status, tag, and text filters.
- Provides a recent-date filter while preserving undated hierarchy context.
- Uses a deterministic lane layout rather than inferred or AI-generated links.
- Every node opens its source page; the graph remains a visualization rather
  than a second editing surface.
- Notes can add deterministic manual edges with `[[Title]]`, typed
  `[[goal: Title]]` / `[[task: Title]]` links, and `[[#tag]]`. Ambiguous
  untyped titles are intentionally ignored instead of guessing.

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
