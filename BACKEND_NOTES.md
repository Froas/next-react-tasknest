# Backend coordination notes

The frontend has grown a lot of features that the FastAPI backend hasn't
caught up with yet. Frontend papers over the gaps where it can, but a few
of these need real server-side work.

Ordered by user-visible impact.

## 1. PATCH responses must echo `end_datetime`

**Why**: Activity heatmap, daily streak, "Recently finished" widget, and
goal/milestone completion sparklines all key off `end_datetime`. When the
frontend toggles `status: FINISHED`, it sends `end_datetime: <now>`. If the
API response omits or nulls that field, every progress chart loses the
event.

**Frontend mitigation in place**: each toggle handler now stores the
client-side timestamp into the local store regardless of what the response
returns (`updateTaskInGoals({ ...response, end_datetime: response.end_datetime ?? localStamp })`).
This works for a single tab/session but won't survive a full reload that
goes back to the server source-of-truth.

**Backend fix**: on `PATCH /user/tasks/update` (and milestones, todos,
subtasks, goals), if `end_datetime` was sent in the body, persist it.
On any response that includes the entity, return all fields including
`end_datetime` and `updated_at`.

## 2. `goalsApi.getAll` does N+1

**Why**: `useStore.fetchGoals()` calls `goalsApi.getAll()` then
`Promise.all(goals.map(g => goalsApi.getById(g.id, { include_milestones })))`.
For a user with 30 goals, that's 31 round-trips on every dashboard load.

**Backend fix**: support `GET /user/goals?include_milestones=true&include_tasks=true&include_todos=true&include_subtasks=true`
returning the full nested structure in one call. Frontend will switch to
that immediately.

## 3. Cookie-based auth instead of `localStorage` JWT

**Why**: Tokens stored in `localStorage` are readable by any XSS payload.
The current login → NextAuth → token in localStorage flow is the standard
"how to leak everything" path.

**Backend fix**: issue an `httpOnly; SameSite=Lax; Secure` cookie on
`/users/token`. The browser sends it automatically on subsequent requests
to the same origin. Frontend stops touching the token at all — `apiRequest`
just calls `fetch(url, { credentials: 'include' })`.

This is the highest-impact security change. Pair with CSRF tokens for
state-mutating endpoints.

## 4. `BaseEntity` needs `created_at`

**Why**: We can show "what got finished today" via `end_datetime`, but
have no way to show "what got created this week" — useful for activity
log and templates ("look how fast you set this up").

**Backend fix**: add `created_at: ISO datetime` to all entities that
extend `BaseEntity` on the schema (Goals, Milestones, Tasks, Todos already
get it via SQLAlchemy timestamps; just expose it).

## 5. Tag model: many-to-many, not entity_id on the tag

**Why**: The `Tag` schema has `goal_id`/`milestone_id`/etc. as direct
fields. That means one tag instance is bound to exactly one entity. So
"#health" applied to two goals creates two separate tag rows with the same
name — no cross-cutting categorisation. Frontend has `tagsApi` but no UI
because the model doesn't support what the UI would want.

**Backend fix**: `Tag(id, name, color)` plus `TagAssignment(tag_id,
entity_type, entity_id)` join table. Endpoints to add/remove a tag from
any entity, and `GET /tags/{id}/entities` to list everything tagged.

## 6. Subtask schema parity with Task

**Why**: `TaskItem.subtasks` was originally typed `TaskItem[]` on the
frontend (now correctly `SubtaskItem[]`), but `SubtaskItem` only has
`task_id`/`due_date`/`created_at`/`updated_at` extras. There's no
`subtask.subtasks` or `subtask.todos`, so subtasks are leaf nodes only.

**Decision**: this is fine if leaf-only is intentional. Otherwise unify
with TaskItem and let the same row handle both depths. Either way, document
the intent so we can stop guessing.

## 7. Soft-delete grace window (optional)

**Why**: The frontend has a 5-second "Undo" toast on delete. If the
backend supports a `deleted_at` column instead of hard-DELETE, we could
extend that window to days/weeks and offer a real Trash page.

**Backend fix**: change `DELETE /user/goals/{id}/delete` to set
`deleted_at = now()`. Add a `?include_deleted=true` query param on list
endpoints, and a separate `POST /user/goals/{id}/restore`. Old behavior
(true delete) becomes a periodic cleanup job for `deleted_at` older than
30 days.
