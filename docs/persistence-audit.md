# Persistence audit checkpoint

Scope: web MVP persistence / reload safety. This file is intentionally incremental so work can stop safely mid-audit.

## Audit rules

- UI action must call backend before being considered persisted.
- Optimistic UI changes must rollback or refetch on failure.
- List reorder must persist position and reload in same order.
- Counters must not depend on a detail page being expanded first.
- Soft delete/restore must not leave stale nested store data.

## Current pass

### Checked OK

- Goals: create, soft delete, undo restore, bulk complete, bulk delete, custom reorder.
- Milestones: create, soft delete, undo restore, bulk complete, bulk delete, custom reorder.
- Tasks: bulk complete, single toggle, task detail toggle/delete.
- Todos/Subtasks board: status toggle, column move, same-task reorder.
- Today widget: snooze/update for task/todo/milestone/event, rows link to entity pages.
- Goal detail: goal inline title/description/status/priority/dates persist through API.
- Goal detail: milestone inline title/description/status/priority/due date persists through API.
- Isolated API audit script covers hierarchy CRUD, reorder, nested reload, occurrences, events, notes, daily drafts, daily logs, metrics, templates, Trash restore, JSON backup/import, and subtask hard delete.
- JSON backup/import preserves `completion_rule` for goals, milestones, and tasks.
- Automatic completion refreshes frontend goal state after Today occurrence/metric changes and milestone-card status changes.
- Goal, Milestone, and Task detail pages expose completion-rule editors and separate structural/outcome/consistency lanes.
- Sequential milestone gating uses persisted completion status, so metric/consistency rules cannot be bypassed by structural progress alone.
- Today routine/metric mutations notify the dashboard CalendarWidget, so its open-routine summary updates without reload.
- Review Due Work now uses the shared CalendarItem builder used by Today and Calendar instead of a separate partial counter.
- Cross-tab and tab-focus goal refreshes are silent and no longer replace the dashboard with a full-screen loading state.

### Fixed in this pass

- Milestones list card drag now starts from the whole card, not only the tiny grip.
- Goals list card drag now starts from the whole card, not only the tiny grip.
- Milestones list task count now uses flat tasks as fallback, so it does not show `0 tasks` before opening details.
- JSON export/import no longer drops completion rules.
- Completion rules are persisted on goals, milestones, and tasks.
- Structural completion now propagates task → milestone → goal; metric and consistency rules are evaluated from persisted facts.
- Hybrid completion waits for every configured weighted lane instead of completing from structural progress alone.

### Needs deeper manual/browser audit

- Template creation path: verify created goal + milestones + tasks stay visible after reload.
- Dashboard quick actions: verify each modal target is prefilled and saved correctly.
- Trash restore: verify restored nested trees appear without requiring full reload.
- Google calendar sync: verify event creation failures are surfaced item-by-item.
- Browser file-picker smoke test for JSON download/upload remains; isolated API round-trip and frontend tree collection are automated.
- Trash restore: already force-refreshes affected store slices, so restored items should reappear without cache-staleness.
- Delete model: goals/milestones/tasks/todos/events/notes use soft-delete + Trash; subtasks are hard-deleted and do not appear in Trash by current design.
- JSON backup/import: backend exports ordered trees and import remaps ids; profile import force-refreshes store after import.
- Fixed: subtasks with `due_date` now appear in Today/Calendar and can be snoozed from Today.
- Verified: Dashboard CalendarWidget and OverdueBadge both use shared `buildCalendarItems`, so the Subtask calendar fix propagates there too.
- Verified: store mutation hotspots were scanned; no new obvious store-only persistence writes found in app/dashboard mutation paths.
- Verified: Dashboard Quick Actions route through API-backed GoalForm/MilestoneForm/TaskForm/ActionForm and then update store; single-goal fast path relies on the already-full `fetchGoals` tree.
- Verified again: isolated template instantiation, Trash restore/reload, and hierarchy persistence pass the API audit; authenticated browser smoke remains a manual checkpoint.
- Fixed: Goal calendar sync now uses partial-success handling; successfully created events are stored even if one item fails, and failed counts are surfaced.
- Fixed: Starter template creation now reports partial failures and still updates/routes to the created goal when only some milestones/tasks fail.
- Improved: Notes page now has search/tag filtering, markdown editor preview, dirty-state guard, and local sort matching backend pinned/newest ordering.

### Automated audit commands

- `pipenv run python scripts/persistence_audit.py` — currently 6/6 passing.
- `pipenv run python scripts/completion_rules_audit.py` — currently 4/4 passing.
- `npm test -- --run` — currently 103/103 frontend store, reorder, progress, completion gating, refresh races, templates, calendar, activity, and utility tests.
