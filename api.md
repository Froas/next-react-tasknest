# Project API Reference

## Project Overview

This backend REST API provides tracking and management for goals, tasks, subtasks, todos, events, and Google Calendar integration. Built with FastAPI (Python 3.11+), it features user authentication, complete CRUD operations for each entity, and supports advanced integrations and nested entity retrieval.

---

## Technology Stack

* **Programming Language:** Python 3.11+
* **Backend Framework:** FastAPI
* **Documentation:** OpenAPI/Swagger UI (`/docs`)
* **JWT Authentication:** OAuth2 (Password Flow)
* **ORM (optional):** SQLAlchemy
* **Integrations:** Google Calendar
* **Data Validation:** Pydantic

---

## Core Entities

* **User**
* **Goal**
* **Milestone**
* **Task**
* **Subtask**
* **Todo**
* **Tag**
* **Event**
* **Calendar Integrations (Google Calendar)**

---

## API Endpoints Overview

### Authentication & Users

| Method | Endpoint                  | Description                         |
| ------ | ------------------------- | ----------------------------------- |
| POST   | `/users/token`            | Authenticate (receive access token) |
| GET    | `/users/me`               | Get current user profile            |
| GET    | `/users/`                 | List all users                      |
| POST   | `/users/`                 | Create a new user                   |
| GET    | `/users/{user_id}`        | Get user by ID                      |
| PATCH  | `/users/update`           | Update user                         |
| DELETE | `/users/{user_id}/delete` | Delete user                         |

---

### Goals

| Method | Endpoint                       | Description                       |
| ------ | ------------------------------ | --------------------------------- |
| GET    | `/user/goals`                  | Get all goals                     |
| POST   | `/user/goals`                  | Create a new goal                 |
| PATCH  | `/user/goals/update`           | Update a goal                     |
| GET    | `/user/goals/{goal_id}`        | Get goal by ID (with nested data) |
| DELETE | `/user/goals/{goal_id}/delete` | Delete goal                       |

---

### Milestones

| Method | Endpoint                                 | Description                            |
| ------ | ---------------------------------------- | -------------------------------------- |
| GET    | `/user/milestones`                       | Get all milestones                     |
| POST   | `/user/milestones`                       | Create a milestone                     |
| PATCH  | `/user/milestones/update`                | Update a milestone                     |
| PUT    | `/user/milestones/reorder`               | Reorder milestones                     |
| GET    | `/user/milestones/{milestone_id}`        | Get milestone by ID (with nested data) |
| DELETE | `/user/milestones/{milestone_id}/delete` | Delete milestone                       |

---

### Tasks

| Method | Endpoint                       | Description                       |
| ------ | ------------------------------ | --------------------------------- |
| GET    | `/user/tasks`                  | Get all tasks                     |
| POST   | `/user/tasks`                  | Create a task                     |
| PATCH  | `/user/tasks/update`           | Update a task                     |
| GET    | `/user/tasks/{task_id}`        | Get task by ID (with nested data) |
| DELETE | `/user/tasks/{task_id}/delete` | Delete task                       |

---

### Subtasks

| Method | Endpoint                               | Description       |
| ------ | -------------------------------------- | ----------------- |
| GET    | `/user/task/subtasks`                  | Get all subtasks  |
| POST   | `/user/task/subtasks`                  | Create a subtask  |
| PATCH  | `/user/task/subtasks/update`           | Update a subtask  |
| GET    | `/user/task/subtasks/{task_id}`        | Get subtask by ID |
| DELETE | `/user/task/subtasks/{task_id}/delete` | Delete subtask    |

---

### Todos

| Method | Endpoint                       | Description    |
| ------ | ------------------------------ | -------------- |
| GET    | `/user/todos`                  | Get all todos  |
| POST   | `/user/todos`                  | Create a todo  |
| PATCH  | `/user/todos/update`           | Update a todo  |
| GET    | `/user/todos/{todo_id}`        | Get todo by ID |
| DELETE | `/user/todos/{todo_id}/delete` | Delete todo    |

---

### Events

| Method | Endpoint                         | Description     |
| ------ | -------------------------------- | --------------- |
| GET    | `/user/events`                   | Get all events  |
| POST   | `/user/events`                   | Create an event |
| PATCH  | `/user/events/update`            | Update an event |
| GET    | `/user/events/{event_id}`        | Get event by ID |
| DELETE | `/user/events/{event_id}/delete` | Delete event    |

---

### Tags

| Method | Endpoint                | Description   |
| ------ | ----------------------- | ------------- |
| GET    | `/tags`                 | Get all tags  |
| POST   | `/tags`                 | Create a tag  |
| PATCH  | `/tags/update`          | Update a tag  |
| GET    | `/tags/{tag_id}`        | Get tag by ID |
| DELETE | `/tags/delete/{tag_id}` | Delete tag    |

---

### Calendar Integrations (Google Calendar)

| Method | Endpoint                             | Description                            |
| ------ | ------------------------------------ | -------------------------------------- |
| POST   | `/calendars/google-calendar/token`   | Obtain or update Google Calendar token |
| GET    | `/calendars/google-calendar/token/2` | Save Google Calendar token             |

---

## Data Formats

* All request and response bodies are defined by Pydantic schemas (e.g., `GoalCreate`, `TaskUpdate`, `EventBase`, etc.).
* Refer to OpenAPI docs at `/docs` for detailed schema definitions and example payloads.

---

## Authentication

* Most endpoints require JWT-based authentication (OAuth2 password flow).
* Obtain an access token via `/users/token`.
* Pass the token as a Bearer token in the `Authorization` header for protected routes.

# Data Validation Reference

This section describes **data validation rules** for all core entities in the API, based on your SQLModel and Pydantic schemas. This information helps AI clients (or any API integrator) to generate, validate, and submit correct payloads.

---

## Global Types

### StatusType (enum)

* `outstanding`
* `started`
* `in progress`
* `finished`
* `closed`
* `aborted`
* `cancelled`

### PriorityType (enum)

* `low`
* `medium`
* `high`

---

## User

### UserBase

| Field          | Type     | Required | Description     |
| -------------- | -------- | -------- | --------------- |
| username       | string   | yes      | Unique username |
| email          | EmailStr | yes      | Valid email     |
| password\_hash | string   | yes      | Hashed password |

**Note:** Password is always hashed via bcrypt. Use `/users/token` for authentication (with username & password).

---

## Goal

### GoalBase

| Field           | Type     | Required | Default  |
| --------------- | -------- | -------- | -------- |
| title           | string   | yes      |          |
| description     | string   | no       |          |
| start\_datetime | datetime | no       | now(JST) |
| end\_datetime   | datetime | yes      |          |

### GoalCreate

| Field           | Type         | Required | Default       |
| --------------- | ------------ | -------- | ------------- |
| title           | string       | yes      |               |
| description     | string       | no       |               |
| start\_datetime | datetime     | yes      |               |
| end\_datetime   | datetime     | yes      |               |
| status          | StatusType   | no       | 'outstanding' |
| priority        | PriorityType | no       | 'high'        |

### GoalUpdate

| Field           | Type         | Required | Description     |
| --------------- | ------------ | -------- | --------------- |
| id              | UUID         | yes      | Goal identifier |
| title           | string       | no       |                 |
| description     | string       | no       |                 |
| status          | StatusType   | no       |                 |
| priority        | PriorityType | no       |                 |
| start\_datetime | datetime     | no       |                 |
| end\_datetime   | datetime     | no       |                 |

---

## Milestone

### MilestoneBase

| Field           | Type         | Required | Default       |
| --------------- | ------------ | -------- | ------------- |
| title           | string       | yes      |               |
| description     | string       | yes      |               |
| due\_date       | datetime     | no       |               |
| end\_datetime   | datetime     | no       |               |
| start\_datetime | datetime     | no       | now(JST)      |
| status          | StatusType   | no       | 'outstanding' |
| priority        | PriorityType | no       | 'low'         |
| goal\_id        | UUID         | no       |               |
| position        | int          | no       | 0             |

### MilestoneUpdate

| Field           | Type         | Required | Description  |
| --------------- | ------------ | -------- | ------------ |
| id              | UUID         | yes      | Milestone ID |
| title           | string       | no       |              |
| description     | string       | no       |              |
| status          | StatusType   | no       |              |
| priority        | PriorityType | no       |              |
| due\_date       | datetime     | no       |              |
| start\_datetime | datetime     | no       |              |
| end\_datetime   | datetime     | no       |              |
| goal\_id        | UUID         | no       |              |
| position        | int          | no       |              |

---

## Task

### TaskBase

| Field           | Type         | Required | Default       |
| --------------- | ------------ | -------- | ------------- |
| title           | string       | yes      |               |
| description     | string       | yes      |               |
| due\_date       | datetime     | no       |               |
| end\_datetime   | datetime     | no       |               |
| start\_datetime | datetime     | no       | now(JST)      |
| status          | StatusType   | no       | 'outstanding' |
| priority        | PriorityType | no       | 'low'         |
| milestone\_id   | UUID         | no       |               |

### TaskUpdate

| Field           | Type         | Required | Description |
| --------------- | ------------ | -------- | ----------- |
| id              | UUID         | yes      | Task ID     |
| title           | string       | no       |             |
| description     | string       | no       |             |
| priority        | PriorityType | no       |             |
| start\_datetime | datetime     | no       |             |
| end\_datetime   | datetime     | no       |             |
| status          | StatusType   | no       |             |
| due\_date       | datetime     | no       |             |
| milestone\_id   | UUID         | no       |             |

---

## Subtask

### SubtaskBase

| Field           | Type         | Required | Default       |
| --------------- | ------------ | -------- | ------------- |
| title           | string       | yes      |               |
| description     | string       | yes      |               |
| due\_date       | datetime     | no       |               |
| end\_datetime   | datetime     | no       |               |
| start\_datetime | datetime     | no       | now(JST)      |
| status          | StatusType   | no       | 'outstanding' |
| priority        | PriorityType | no       | 'low'         |
| task\_id        | UUID         | no       |               |

### SubtaskUpdate

| Field           | Type         | Required | Description |
| --------------- | ------------ | -------- | ----------- |
| id              | UUID         | yes      | Subtask ID  |
| title           | string       | no       |             |
| description     | string       | no       |             |
| priority        | PriorityType | no       |             |
| start\_datetime | datetime     | no       |             |
| end\_datetime   | datetime     | no       |             |
| status          | StatusType   | no       |             |
| due\_date       | datetime     | no       |             |
| task\_id        | UUID         | no       |             |

---

## Todo

### TodoBase

| Field            | Type         | Required | Default       |
| ---------------- | ------------ | -------- | ------------- |
| title            | string       | yes      |               |
| description      | string       | yes      |               |
| repeat\_interval | string       | no       |               |
| due\_date        | datetime     | no       |               |
| next\_due\_date  | datetime     | no       |               |
| end\_datetime    | datetime     | no       |               |
| priority         | PriorityType | no       | 'low'         |
| status           | StatusType   | no       | 'outstanding' |
| start\_datetime  | datetime     | no       | now(JST)      |
| task\_id         | UUID         | no       |               |

### TodoUpdate

| Field            | Type         | Required | Description |
| ---------------- | ------------ | -------- | ----------- |
| id               | UUID         | yes      | Todo ID     |
| title            | string       | no       |             |
| description      | string       | no       |             |
| priority         | PriorityType | no       |             |
| status           | StatusType   | no       |             |
| repeat\_interval | string       | no       |             |
| next\_due\_date  | datetime     | no       |             |
| start\_datetime  | datetime     | no       |             |
| end\_datetime    | datetime     | no       |             |
| due\_date        | datetime     | no       |             |
| task\_id         | UUID         | no       |             |

---

## Event

### EventBase

| Field            | Type     | Required | Default |
| ---------------- | -------- | -------- | ------- |
| title            | string   | yes      |         |
| description      | string   | no       |         |
| start\_datetime  | datetime | no       |         |
| end\_datetime    | datetime | no       |         |
| event\_type      | string   | no       |         |
| location         | string   | no       |         |
| recurrence\_rule | string   | no       |         |

### EventUpdate

| Field            | Type     | Required | Description |
| ---------------- | -------- | -------- | ----------- |
| id               | UUID     | yes      | Event ID    |
| title            | string   | no       |             |
| description      | string   | no       |             |
| start\_datetime  | datetime | no       |             |
| end\_datetime    | datetime | no       |             |
| event\_type      | string   | no       |             |
| location         | string   | no       |             |
| recurrence\_rule | string   | no       |             |

---

## Tag

### TagBase

| Field         | Type   | Required | Default |
| ------------- | ------ | -------- | ------- |
| name          | string | yes      |         |
| color         | string | no       |         |
| goal\_id      | UUID   | no       |         |
| milestone\_id | UUID   | no       |         |
| task\_id      | UUID   | no       |         |
| subtask\_id   | UUID   | no       |         |
| todo\_id      | UUID   | no       |         |
| event\_id     | UUID   | no       |         |

### TagUpdate

| Field | Type   | Required | Description |
| ----- | ------ | -------- | ----------- |
| id    | UUID   | yes      | Tag ID      |
| name  | string | no       |             |
| color | string | no       |             |

---

**All datetime fields are expected in ISO 8601 format (e.g., `2025-06-25T15:30:00+09:00`).**

If you need request/response JSON examples for any entity, let me know!



# Frontend Overview & Product Vision

## Frontend Technology

* **Framework:** Next.js
* **Language:** TypeScript
* **API Communication:** REST (consumes the FastAPI backend described in previous docs)

---

## Product Idea: Roadmap as a Service

The application implements a **goal-based roadmap system**:

* **Goal** — The user's main target or final objective.
* **Milestones** — Key progress points on the way to a Goal. These serve as “safe zones” or checkpoints.
* **Tasks** — Specific actions that, when completed, allow the user to achieve a Milestone.
* **Subtasks** — One-time actions under a Task.
* **Todos** — Recurring (often daily) actions required to maintain progress within a Task.
* **Events** — Calendar events, handled separately from the roadmap (for scheduling, reminders, etc.).

### Data Hierarchy

```
Goal
└── Milestone[]
    └── Task[]
        ├── Subtask[]    # one-off tasks
        └── Todo[]       # recurring (daily) tasks
```

---

## Integrations

* **Google Calendar Integration:**

  * API-level integration is implemented (token exchange, backend sync).
  * **UI display and synchronization of Google Calendar events are still under development and not yet visible on the frontend.**

---

## Backend-Frontend Interaction Notes

* **Milestone Ordering:**

  * Milestone order is fully controlled by the backend; the frontend should NOT attempt to manage or change the order.

* **Nested Data Retrieval:**

  * To fetch nested data (e.g., milestones inside a goal, tasks inside a milestone, etc.), the API uses **query parameters** such as `?include_milestones=true`.
  * The frontend must use these query params to receive hierarchical/expanded data from the backend.

---

## Current Status & To Do

* Google Calendar events are not displayed in the UI yet — this is a key upcoming task.
* All roadmap logic (goal → milestone → task → subtask/todo) is functional, with full data retrieval via API.

---

## Dashboard: the main overview page.

Quick Action Creation: fast creation menu for any entity.

Goals page: list/all goals view.

Milestones page: overview of all milestones.

Notes that there are individual views for tasks, subtasks, todos, and events as wel

in frontend also uses usestore