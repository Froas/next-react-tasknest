# Daily Log architecture shift

Source idea: Universal Mountain Tracker draft.

## Summary

The draft fits TaskNest philosophically, but it changes the center of gravity:

- Current app: goals, milestones, tasks, todos, and due dates drive Today.
- Target app: `DailyLog` becomes the daily source of truth, and Today becomes a dashboard assembled from active plans plus today's facts.

The key principle is:

> Goal builds the plan. Today shows today's actions. Daily Log stores what actually happened.

UX rule:

> `DailyLog` is a database record. `Today` is the user interface.

The main flow must not be “open Daily Log and fill a large form”. The main flow
is “open Today, check what matters, enter tiny facts, and let DailyLog update in
the background”.

## Locked architecture decisions

These are product rules, not implementation suggestions.

### Today-first, not DailyLog-first UI

`Today` is the main day dashboard. `DailyLog` is the persistent truth record underneath it.

The main user flow is not:

1. Open Daily Log.
2. Fill a large journal form.
3. Save.

The main user flow is:

1. Open Today.
2. Check recurring actions.
3. Enter tiny metrics.
4. Optionally add a signal/draft/reflection.
5. Let `DailyLog` update in the background.

### Todo model split

One-off work and recurring work must not be mixed in Today generation.

- `Subtask`: one-off checklist work.
- `Todo` during transition: recurring todo definition/template.
- `TodoOccurrence`: the dated fact for one recurring todo on one day.

`TodoOccurrence` is generated only for active recurring todos:

- todo is not deleted;
- todo status is active: outstanding, started, or in progress;
- todo has `repeat_interval`;
- parent task is active;
- parent goal is active;
- if the task belongs to a milestone, that milestone is active.

Do not generate occurrences for every legacy `Todo` blindly.

### Due/overdue tasks preserve goal context

Today can show a small global summary:

- overdue count;
- due today count.

But the main rendering should group actionable work inside goal cards:

- goal title;
- overdue/due tasks;
- recurring todo occurrences;
- metrics.

Avoid a global flat todo list as the primary Today UI.

### Metrics ownership

Metrics support both levels:

- goal-level metrics, such as weight, distance, study minutes;
- task-level metrics, such as calories for a food logging routine or manual coding minutes for a challenge.

Today shows only active `MetricDefinition` rows where `show_on_today = true`.
There must be no universal hardcoded quick metrics.

### Day status

Manual status options for Today:

- Good;
- Minimum;
- Bad logged.

Black/missed is automatic for past days without a `DailyLog` or meaningful
activity. Do not show Missed as a normal selectable button for the current day.

### Automatic day finalization

Users do not have to press End Day for the system to stay accurate.

End Day is an optional manual checkout. Past days must be finalized
automatically by a daily finalizer:

- run lazily when the app opens;
- optionally run from a cron job later;
- run before statistics that depend on finalized history.

Finalization closes past logical days, not necessarily UTC calendar days.

Default user settings:

- `timezone`: user timezone, for example `Asia/Tokyo`;
- `dayBoundaryHour`: `4`.

With `dayBoundaryHour = 4`, `2026-07-11 02:00` still belongs to logical day
`2026-07-10`. This matters for sleep, late checkout, and bad-day recovery.

### TodoOccurrence status lifecycle

Recurring todos do not become overdue backlog.

`TodoOccurrence.status` should support:

- `pending`: can still be completed for the active logical day;
- `done`: completed fully;
- `minimum`: completed minimum version;
- `skipped`: manually skipped;
- `missed`: day ended with no completion;
- `excused`: planned rest, illness, travel, or other valid exception.

The automatic transition is:

```text
past pending occurrence → missed
```

`missed` is historical data for statistics. It should not appear as an overdue
item the next day.

### Black day

`black` means the day disappeared from the system. It is not the same as missing
one todo.

A day can become black only when there is no meaningful activity:

- no done/minimum/skipped/excused `TodoOccurrence`;
- no metric entry;
- no note, draft, or signal;
- no completed task/subtask activity;
- no manual day status or note.

If the user logs a bad day manually, it is `bad_logged`, not `black`. A recorded
bad day is better than a missing day.

### Progress is split

Do not collapse all progress into one generic checkbox percentage.

Progress has separate lanes:

- Structural progress: milestones, tasks, and subtasks completed.
- Outcome progress: metric targets and completion rules.
- Consistency progress: todo occurrences over time.

Daily occurrence completion should not affect main goal progress unless a
specific `CompletionRule` says it should.

## Current architecture fit

### Already close

- `Goal` maps to mountain / long-term objective.
- `Milestone` maps to checkpoint / pass.
- `Task` already sits below milestone.
- `Subtask` already represents one-off work inside a task.
- `TodayWidget` already aggregates due items across goals, tasks, todos, subtasks, milestones, and events.
- `DailyDraftTodo` now covers the first lightweight version of “Today's Draft”.

### Main mismatch

The current `Todo` model mixes two concepts:

- a repeatable definition, like “record food every day”;
- today's occurrence/fact, like “2026-07-10 — done”.

The draft splits this into:

- `TodoDefinition`: what repeats.
- `TodoOccurrence`: what happened on a specific date, linked to `DailyLog`.

This split is the biggest architecture shift and should happen before advanced progress rules, metrics, Radar, or mobile clients.

Implementation note: the transitional model keeps the table name `Todo`, but
only rows with `repeat_interval` are treated as recurring definitions for
occurrence generation. One-off task breakdowns should be represented as
`Subtask`.

## Target entity changes

### DailyLog

Central day record, not owned by one goal.

Suggested fields:

- `id`
- `user_id`
- `date`
- `color`: green, yellow, red, black
- `note`
- `trigger`
- `what_helped`
- `tomorrow_minimum`
- `created_at`
- `updated_at`

### Task scope

Implemented transition fields:

- `goal_id`
- optional `milestone_id`
- `kind`: project, routine, challenge
- `scope`: goal, milestone
- `scheduled_date`

Goal-level routine tasks continue across milestones. Milestone-level tasks only
appear while their milestone is active.

### TodoDefinition

Rename/evolve current `Todo` into the repeatable template:

- `task_id`
- `title`
- `description`
- `recurrence`
- `active`
- `full_version`
- `minimum_version`

### TodoOccurrence

New fact table:

- `todo_definition_id`
- `daily_log_id`
- `date`
- `status`: pending, done, minimum, skipped, missed, excused
- `value`
- `note`

This is what Today toggles.

Generation rule: create/fetch occurrences for active recurring todo definitions
only. Do not create occurrences for one-off todos/subtasks or inactive/finished
parents.

Expected occurrences should be generated on demand:

- Today open creates/fetches today's occurrences.
- The daily finalizer creates missing past occurrences before closing old days.
- Do not pre-generate a month of occurrences.

For habits/routines, the default miss policy is `expire`: if the logical day
passes, pending occurrences become `missed` and do not roll into tomorrow.

### Metrics

Metrics should be separate from notes and todos:

- `MetricDefinition`: user-defined metrics such as weight, calories, sleep, protein, coding minutes, Anki cards, etc.
- `MetricEntry`: value for a date, optionally linked to `DailyLog`.

Important rule: Today must not hardcode metrics. `Weight`, `Calories`, `Sleep`,
and `Steps` appear only if active goals/tasks define those metrics with
`show_on_today = true`.

### CompletionRule

Keep this after `DailyLog`, `TodoOccurrence`, and metrics exist.

Rules are useful only after the app can answer:

- which routines happened on which date;
- which metrics changed;
- what counts as minimum vs full completion.

## New Today composition

Today should eventually assemble:

1. Todos from active goal-scope routine tasks.
2. Todos from tasks in current active milestones.
3. Project tasks with `due_date` or `scheduled_date` today.
4. Dynamic metric inputs from active `MetricDefinition` rows.
5. Day status.
6. Daily Draft items.
7. Radar signals, when enabled.

Suggested grouping:

- Goal section: Weight Loss, Recovery OS, Tracker MVP.
- Each section: today's routine occurrences, due/overdue project tasks, and metrics.
- Metrics: only the fields required by active goals/tasks.
- End Day: green, yellow, red. Black/missed is an automatic state for days with no log.
- Reflection fields live in an End Day modal/sidebar, not as the primary Today UI.

### Daily Draft / Scratch Todos

Scratch todos are standalone daily todos for things that should not become a
goal task, milestone task, routine, or note.

Examples:

- pay internet bill;
- send a quick email;
- pick up a package;
- call support.

Implementation boundary:

- stored as `DailyDraftTodo`;
- owned by the user and a `day`;
- not linked to a goal, milestone, task, todo definition, or note;
- shown on Today as `Scratch Todos`;
- unfinished older items carry over until completed or deleted;
- completed old items stay in history/soft-delete archive behavior and do not
  become overdue backlog.

Scratch todos are for disposable day-level capture. If an item becomes
strategic or repeated, promote it into a goal task or recurring todo definition
later.

## Migration plan

### Phase 0 — freeze current behavior

Do not start by deleting current `Todo`.

First add the new tables and keep existing Today working.

### Phase 1 — add DailyLog

Status: implemented — backend model/API and compact Today dashboard panel are in
place.

- Add `DailyLog` model and CRUD endpoints.
- Auto-create or fetch today's log.
- Add Today dashboard section for day color and End Day reflection.
- Keep reflection fields in optional End Day UI.
- Keep existing task/todo due-date logic unchanged.

### Phase 2 — add Task scope

Status: implemented as a compatibility layer.

- Add `goal_id`, `kind`, `scope`, and `scheduled_date` to `Task`.
- Backfill existing tasks:
  - `scope = milestone`
  - `kind = project`
  - `goal_id` from parent milestone.
- Add support for goal-level tasks.
- Goal detail can create goal-level tasks/routines.
- Today/calendar read `scheduled_date` first and then fall back to `due_date`.

### Phase 3 — introduce TodoOccurrence

Status: implemented as a first pass with recurring-only generation.

- Add `TodoOccurrence`.
- Treat current `Todo` rows with `repeat_interval` as definitions.
- Today toggles occurrences for the selected date, not the definition row.
- Keep legacy status fields during transition.

### Phase 4 — metrics

Status: implemented as dynamic metrics.

- Add `MetricDefinition` and `MetricEntry`.
- Add metric inputs to Today only from active definitions with `show_on_today=true`.
- Link entries to `DailyLog`.

### Phase 5 — automatic daily finalizer

Status: implemented.

- Add `finalized_at` and `finalized_by` to `DailyLog`.
- Use user timezone and `dayBoundaryHour`, default `04:00`.
- Add `finalizePastDays(userId, upToDate)` service.
- For every unfinalized past logical day:
  - create `DailyLog` if missing;
  - generate expected recurring `TodoOccurrence` rows;
  - convert pending occurrences to `missed`;
  - detect meaningful activity;
  - set `black` when there is no meaningful activity and no manual status;
  - set `minimum` for MVP when activity exists but no manual status exists;
  - set `finalized_by = auto`.
- Keep manual End Day as an optional checkout with `finalized_by = manual`.

### Phase 6 — Template v2

Status: implemented for backend materialisation and frontend starter templates.

- Template blueprints can now create:
  - goal-level routine/challenge/project tasks;
  - milestone-level project/challenge tasks;
  - one-off `Subtask` rows;
  - recurring `Todo` definitions with `repeat_interval`;
  - goal-level and task-level `MetricDefinition` rows.
- Legacy templates that only contain milestones/tasks still work, but they do
  not create Today routines or metrics.
- Starter templates use the backend materializer instead of manually creating a
  legacy `Goal → Milestone → Task` tree from the frontend.

### Phase 7 — Today due grouping

Status: implemented as a first pass.

- Due/overdue work is grouped inside goal cards on Today.
- A small global summary remains at the top.
- Flat due lists should not become the primary Today UI again.

### Phase 8 — split progress lanes

Status: implemented as a UI/logic boundary.

- Structural progress counts milestones, project/challenge tasks, and subtasks.
- Recurring `Todo` definitions are excluded from structural progress.
- Outcome and consistency lanes are shown separately and stay uncomputed until
  metric target rules and occurrence-based rules exist.

### Phase 9 — completion rules

Status: implemented for goals, milestones, and tasks.

- Store `completion_rule` JSON on goals, milestones, and tasks.
- Compute outcome and consistency progress from tasks, occurrences, and metrics.
- Show structural, outcome, and consistency lanes separately on entity detail pages.
- Automatically complete and reopen entities when persisted rule facts change.

### Phase 10 — Radar integration

Status: workflow MVP implemented.

- Reuse `Note(kind="signal")` as the capture record instead of maintaining a
  competing Signal table.
- Persist domain, stake, decision, next action, review date, deadline, outcome,
  and resolution time.
- Show due/review and undecided inbox signals on Today.
- Keep DailyLog linkage as a later optional relationship; Goal/Task links are
  already supported.

## What to pause

Until the Daily Log shift is stable, pause:

- Obsidian-style graph.
- Complex Radar workflow.
- Advanced mobile work.
- AI scoring.
- Complex gamification.

## Decision

The roadmap should move from “feature cleanup” to “DailyLog-first architecture”.

The safest next implementation is:

1. Add `DailyLog`.
2. Add Today quick log UI.
3. Add task `scope`.
4. Split todo definition from daily occurrence.
