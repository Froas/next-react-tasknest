# TaskNest API contracts

Verified against the FastAPI OpenAPI schema on 2026-07-10.

Base URL in the frontend: `NEXT_PUBLIC_API_URL`, defaulting to
`http://localhost:8000`.

Except for registration and token creation, requests use:

```http
Authorization: Bearer <access_token>
Content-Type: application/json
```

Dates are ISO 8601 strings. IDs are UUID strings.

## Shared values

`status`:

- `outstanding`
- `started`
- `in progress`
- `finished`
- `closed`
- `aborted`
- `cancelled`

`priority`: `low`, `medium`, or `high`.

## Users and authentication

| Method | Path | Request | Response |
| --- | --- | --- | --- |
| POST | `/users/` | `{username, email, password_hash}` | `{id, username, email, preferred_theme}` |
| POST | `/users/token` | Form data: `username`, `password` | `{access_token, token_type}` |
| GET | `/users/me` | — | `{id, username, email, preferred_theme}` |
| PATCH | `/users/update` | `{id?, username?, email?, preferred_theme?}` | Current user profile |
| PATCH | `/users/me` | `{username?, email?, preferred_theme?}` | Current user profile |
| GET | `/users/` | — | Array containing the current user; authentication required |
| GET | `/users/{user_id}` | — | Own user profile |
| DELETE | `/users/{user_id}/delete` | — | `{message}`; only the current user can delete itself |

`password_hash` is the legacy registration field name. The client sends the
plain password through HTTPS and the backend hashes it before storage. Password
hashes are never included in API responses.

## Goals

Create body:

```json
{
  "title": "Ship TaskNest",
  "description": "Release the first stable version",
  "start_datetime": "2026-07-06T09:00:00+09:00",
  "end_datetime": null,
  "status": "outstanding",
  "priority": "high"
}
```

Only `title` is required. Create and update responses contain `id`, the fields
above, `status`, `priority`, and `position`.

| Method | Path | Request | Response |
| --- | --- | --- | --- |
| GET | `/user/goals` | — | Active goal array |
| POST | `/user/goals` | Goal create body | Created goal |
| PATCH | `/user/goals/update` | `{id, title?, description?, status?, priority?, start_datetime?, end_datetime?, position?}` | Updated goal |
| PUT | `/user/goals/reorder` | `{goal_ids: [uuid, ...]}` | `{message}` |
| GET | `/user/goals/{goal_id}` | Query flags below | Goal with requested nested collections |
| DELETE | `/user/goals/{goal_id}/delete` | — | `{message}`; moves goal to Trash |

Nested query flags are `include_milestones`, `include_tasks`,
`include_subtasks`, and `include_todos`. Soft-deleted nested records are never
returned.

Reorder accepts the complete active goal list for the current user. A stale list
is rejected.

## Milestones

Create body:

```json
{
  "title": "API stabilization",
  "description": "",
  "goal_id": "<goal-uuid>",
  "due_date": null,
  "start_datetime": "2026-07-06T09:00:00+09:00",
  "end_datetime": null,
  "status": "outstanding",
  "priority": "medium",
  "position": 0
}
```

`title` and `goal_id` are required by the endpoint. The goal must be active and
owned by the current user.

| Method | Path | Request | Response |
| --- | --- | --- | --- |
| GET | `/user/milestones` | — | Active milestone array |
| POST | `/user/milestones` | Milestone create body | Created milestone |
| PATCH | `/user/milestones/update` | `{id, title?, description?, status?, priority?, due_date?, start_datetime?, end_datetime?, goal_id?, position?}` | Updated milestone |
| PUT | `/user/milestones/reorder` | `{milestone_ids: [uuid, ...]}` | `{message}` |
| GET | `/user/milestones/{milestone_id}` | `include_tasks`, `include_subtasks`, `include_todos` | Milestone with requested nested data |
| DELETE | `/user/milestones/{milestone_id}/delete` | — | `{message}`; moves milestone to Trash |

Reorder accepts the complete active milestone list for one goal. A stale or
cross-goal list is rejected.

## Tasks

Milestone-scoped create body:

```json
{
  "title": "Fix persistence",
  "description": "",
  "goal_id": "<goal-uuid>",
  "milestone_id": "<milestone-uuid>",
  "scope": "milestone",
  "kind": "project",
  "due_date": null,
  "scheduled_date": null,
  "start_datetime": "2026-07-06T09:00:00+09:00",
  "end_datetime": null,
  "status": "outstanding",
  "priority": "low",
  "position": 0
}
```

Goal-scoped tasks use `scope: "goal"`, a required `goal_id`, and no
`milestone_id`. They are intended for goal-level routines or tasks that should
continue across milestones.

`kind` accepts `project`, `routine`, or `challenge`. `scope` accepts `goal` or
`milestone`. `scheduled_date` means “show this on Today/calendar”; `due_date`
means deadline. For milestone-scoped tasks, `milestone_id` is required and
`goal_id` is validated against the milestone.

| Method | Path | Request | Response |
| --- | --- | --- | --- |
| GET | `/user/tasks` | Query: `include_subtasks`, `include_todos` | Active task array |
| POST | `/user/tasks` | Task create body | Created task |
| PATCH | `/user/tasks/update` | `{id, title?, description?, priority?, status?, due_date?, scheduled_date?, start_datetime?, end_datetime?, goal_id?, milestone_id?, kind?, scope?, position?}` | Updated task |
| PUT | `/user/tasks/reorder` | `{task_ids: [uuid, ...]}` | `{message}` |
| GET | `/user/tasks/{task_id}` | Query: `include_subtasks`, `include_todos` | Task with requested actions |
| DELETE | `/user/tasks/{task_id}/delete` | — | `{message}`; moves task to Trash |

Reorder accepts the complete active task list for one parent scope: either one
milestone or one goal. A stale or cross-parent list is rejected.

## Todos and subtasks

Todo create fields:

`title` plus optional `description`, `task_id`, `repeat_interval`, `due_date`,
`next_due_date`, `start_datetime`, `end_datetime`, `status`, `priority`, and
`position`.

Subtask create fields:

`title` plus optional `description`, `task_id`, `due_date`, `start_datetime`,
`end_datetime`, `status`, `priority`, and `position`.

`task_id` is required when creating a todo or subtask. The task must be active
and owned by the current user.

| Method | Path | Request | Response |
| --- | --- | --- | --- |
| GET | `/user/todos` | — | Active todo array |
| POST | `/user/todos` | Todo create fields | Created todo |
| PATCH | `/user/todos/update` | Todo fields plus required `id` | Updated todo |
| PUT | `/user/todos/reorder` | `{todo_ids: [uuid, ...]}` | `{message}` |
| GET | `/user/todos/{todo_id}` | — | Todo |
| DELETE | `/user/todos/{todo_id}/delete` | — | `{message}`; moves todo to Trash |
| GET | `/user/task/subtasks` | — | Subtask array |
| POST | `/user/task/subtasks` | Subtask create fields | Created subtask |
| PATCH | `/user/task/subtasks/update` | Subtask fields plus required `id` | Updated subtask |
| PUT | `/user/task/subtasks/reorder` | `{subtask_ids: [uuid, ...]}` | `{message}` |
| GET | `/user/task/subtasks/{subtask_id}` | — | Subtask |
| DELETE | `/user/task/subtasks/{subtask_id}/delete` | — | `{message}`; permanently deletes subtask |

Todo reorder accepts the complete active todo list for one task. A stale or
cross-task list is rejected.

Subtask reorder accepts the complete subtask list for one task. A stale or
cross-task list is rejected.

## Events

Event fields are `title`, optional `description`, `start_datetime`,
`end_datetime`, `event_type`, `location`, `recurrence_rule`, and `status`.
Only `title` is required. Event status is persisted in the database.

| Method | Path | Request | Response |
| --- | --- | --- | --- |
| GET | `/user/events` | — | Active event array |
| POST | `/user/events` | Event fields | Created event |
| PATCH | `/user/events/update` | Event fields plus required `id` | Updated event |
| GET | `/user/events/{event_id}` | — | Event |
| DELETE | `/user/events/{event_id}/delete` | — | `{message}`; moves event to Trash |

## Tags

Tag fields are `name`, optional `color`, and optional links: `goal_id`,
`milestone_id`, `task_id`, `subtask_id`, `todo_id`, `event_id`.

| Method | Path | Request | Response |
| --- | --- | --- | --- |
| GET | `/tags` | — | User tag array |
| POST | `/tags` | Tag fields | Created tag |
| PATCH | `/tags/update` | `{id, name?, color?}` | Updated tag |
| GET | `/tags/{tag_id}` | — | Tag |
| DELETE | `/tags/delete/{tag_id}` | — | `{message}` |

## Notes

Note fields are `title`, optional `body`, optional `tag`, and optional `pinned`.
Responses also contain `id`, `created_at`, and `updated_at`.

| Method | Path | Request | Response |
| --- | --- | --- | --- |
| GET | `/user/notes` | — | Active note array |
| POST | `/user/notes` | Note fields | Created note |
| PATCH | `/user/notes/update` | Note fields plus required `id` | Updated note |
| GET | `/user/notes/{note_id}` | — | Note |
| DELETE | `/user/notes/{note_id}/delete` | — | `{message}`; moves note to Trash |

## Daily draft todos

Daily draft todos are quick scratch todos for Today. Fields are `title`,
`day`, and `done`. Responses also contain `id`, `created_at`, `updated_at`,
and optional `completed_at`.

| Method | Path | Request | Response |
| --- | --- | --- | --- |
| GET | `/user/daily-draft-todos` | Query: `day?`, `include_done?` | Draft todo array for the selected day |
| POST | `/user/daily-draft-todos` | `{title, day?}` | Created draft todo |
| PATCH | `/user/daily-draft-todos/update` | `{id, title?, day?, done?}` | Updated draft todo |
| DELETE | `/user/daily-draft-todos/{todo_id}/delete` | — | `{message}`; hides the draft todo |

## Daily logs

Daily logs are the daily source of truth for Today, but they are not the
primary UI. Today writes to this record as the user checks actions, enters quick
metrics, logs a bad day, or closes the day.

Fields are `date`, optional `color`, `note`, `trigger`, `what_helped`,
and `tomorrow_minimum`.

Allowed colors are `green`, `yellow`, `red`, and `black`.

| Method | Path | Request | Response |
| --- | --- | --- | --- |
| GET | `/user/daily-logs` | Query: `start_date?`, `end_date?` | Daily log array |
| GET | `/user/daily-logs/today` | — | Today's log, created if missing |
| GET | `/user/daily-logs/{selected_date}` | — | Log for that date, created if missing |
| POST | `/user/daily-logs` | `{date?, color?, note?, trigger?, what_helped?, tomorrow_minimum?}` | Created or updated log for date |
| PATCH | `/user/daily-logs/update` | Same fields plus required `id` | Updated daily log |

## Todo occurrences

Todo occurrences are daily facts generated from active `Todo` definitions.
Today toggles occurrences; it does not mutate the recurring definition row.

| Method | Path | Request | Response |
| --- | --- | --- | --- |
| GET | `/user/todo-occurrences` | Query: `selected_date?` | Existing occurrences for date |
| GET | `/user/todo-occurrences/today` | Query: `selected_date?` | Active todo occurrences, created if missing |
| PATCH | `/user/todo-occurrences/update` | `{id, status?, value?, note?}` | Updated occurrence |

Allowed occurrence statuses are `open`, `done`, `minimum`, and `skipped`.

## Dynamic metrics

Metrics are not hardcoded in Today. A metric appears in Today only when it has
a `MetricDefinition` linked to an active goal/task and `show_on_today=true`.

| Method | Path | Request | Response |
| --- | --- | --- | --- |
| GET | `/user/metric-definitions` | — | Metric definition array |
| POST | `/user/metric-definitions` | `{name, unit?, input_type?, show_on_today?, goal_id?, task_id?, position?}` | Created metric definition |
| PATCH | `/user/metric-definitions/update` | Same fields plus required `id` | Updated metric definition |
| DELETE | `/user/metric-definitions/{metric_id}/delete` | — | `{message}`; hides the metric definition |
| GET | `/user/metrics/today` | Query: `selected_date?` | Today metric definitions with today's entries |
| POST | `/user/metric-entries/upsert` | `{metric_definition_id, date?, value?, numeric_value?, note?}` | Created or updated metric entry |

## Templates

Template fields are `title`, optional `description`, `emoji`, `tags`, and
`blueprint`. A blueprint contains milestone objects with nested task objects.

| Method | Path | Request | Response |
| --- | --- | --- | --- |
| GET | `/user/templates` | — | System and user template array |
| POST | `/user/templates` | Template fields | Created template |
| PATCH | `/user/templates/update` | Template fields plus required `id` | Updated template |
| GET | `/user/templates/{template_id}` | — | Template |
| DELETE | `/user/templates/{template_id}/delete` | — | `{message}` |
| POST | `/user/templates/{template_id}/instantiate` | `{title_override?, start_datetime?, end_datetime?}` | Created goal |

## Trash

Supported kinds: `goal`, `milestone`, `task`, `todo`, `event`, and `note`.

| Method | Path | Request | Response |
| --- | --- | --- | --- |
| GET | `/user/trash` | — | `[{id, kind, title, deleted_at}]` |
| POST | `/user/trash/{kind}/{id}/restore` | — | `{message}` |
| DELETE | `/user/trash/{kind}/{id}` | — | `{message}`; permanent deletion |
| DELETE | `/user/trash` | — | `{message, removed}` |

## Backup JSON

Export returns active goals, milestones, tasks, subtasks, todos, events, daily
logs, todo occurrences, metric definitions, and metric entries. Nested goal
trees are included for portability, and the same entities are also included as
top-level arrays for simple import tooling.

Import appends a backup into the current account. It creates new UUIDs and
remaps `goal_id`, `milestone_id`, `task_id`, `todo_id`, `daily_log_id`, and
`metric_definition_id` relationships. Daily logs are upserted by date so one
day keeps one source-of-truth row.
Goal-level tasks are nested under `goals[].tasks`; milestone tasks remain under
`goals[].milestones[].tasks`.

```json
{
  "version": 1,
  "exportedAt": "2026-07-07T00:00:00.000Z",
  "goals": [],
  "milestones": [],
  "tasks": [],
  "todos": [],
  "subtasks": [],
  "events": [],
  "daily_logs": [],
  "todo_occurrences": [],
  "metric_definitions": [],
  "metric_entries": []
}
```

| Method | Path | Request | Response |
| --- | --- | --- | --- |
| GET | `/user/backup/export` | — | Backup JSON payload |
| POST | `/user/backup/import` | Backup JSON payload | `{message, imported, skipped}` |

## Google Calendar authorization

| Method | Path | Request | Response |
| --- | --- | --- | --- |
| POST | `/calendars/google-calendar/token` | `{code}` | `{message}` |
| GET | `/calendars/google-calendar/token/2` | — | `{access_token}` |

The POST exchanges an authorization code and stores or updates the user's
access and refresh tokens. The GET returns a valid token and refreshes it when
it is close to expiration.

## Error responses

- `400`: invalid payload relationship or Google authorization response.
- `401`: missing/expired application or Google authorization.
- `403`: attempting to change another user.
- `404`: record is missing, deleted, or belongs to another user.
- `409`: duplicate user fields or stale reorder data.
- `422`: request does not match the schema.
- `502`/`503`: Google or network integration failure.

Interactive schemas remain available from FastAPI at `/docs` and
`/openapi.json`.
