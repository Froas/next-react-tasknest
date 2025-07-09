# AI Assistant Prompt Instructions: Roadmap as a Service Project

## Project Context

You are an AI assistant helping with a **goal-based roadmap management system** built with:
- **Backend**: FastAPI (Python 3.11+) with JWT authentication
- **Frontend**: Next.js with TypeScript
- **Architecture**: REST API with hierarchical data structure

## Core Product Vision

This is a "Roadmap as a Service" application that helps users break down large goals into manageable, trackable components through a structured hierarchy:

```
Goal (main objective)
└── Milestones (key progress checkpoints)
    └── Tasks (specific actions to achieve milestones)
        ├── Subtasks (one-time actions)
        └── Todos (recurring/daily actions)
```

Additionally, the system manages **Events** (calendar items) separately from the roadmap structure.

## Data Model & Validation Rules

### Status Types (Global Enum)
- `outstanding`, `started`, `in progress`, `finished`, `closed`, `aborted`, `cancelled`

### Priority Types (Global Enum)
- `low`, `medium`, `high`

### Entity Hierarchy & Required Fields

**Goals**:
- Required: `title`, `end_datetime`
- Optional: `description`, `start_datetime` (defaults to now JST)
- Defaults: `status='outstanding'`, `priority='high'`

**Milestones**:
- Required: `title`, `description`
- Optional: `due_date`, `end_datetime`, `start_datetime`, `goal_id`, `position`
- Defaults: `status='outstanding'`, `priority='low'`, `position=0`

**Tasks**:
- Required: `title`, `description`
- Optional: `due_date`, `end_datetime`, `start_datetime`, `milestone_id`
- Defaults: `status='outstanding'`, `priority='low'`

**Subtasks**:
- Required: `title`, `description`
- Optional: `due_date`, `end_datetime`, `start_datetime`, `task_id`
- Defaults: `status='outstanding'`, `priority='low'`

**Todos**:
- Required: `title`, `description`
- Optional: `repeat_interval`, `due_date`, `next_due_date`, `end_datetime`, `task_id`
- Defaults: `status='outstanding'`, `priority='low'`

**Events**:
- Required: `title`
- Optional: `description`, `start_datetime`, `end_datetime`, `event_type`, `location`, `recurrence_rule`

**Tags**:
- Required: `name`
- Optional: `color`, and can be linked to any entity via `{entity}_id`

## API Endpoint Patterns

### Authentication
- `POST /users/token` - Get JWT access token
- Include `Authorization: Bearer {token}` header for protected routes

### CRUD Pattern for All Entities
- `GET /user/{entity}` - List all
- `POST /user/{entity}` - Create new
- `PATCH /user/{entity}/update` - Update existing (requires `id` field)
- `GET /user/{entity}/{id}` - Get by ID with nested data
- `DELETE /user/{entity}/{id}/delete` - Delete

### Special Endpoints
- `PUT /user/milestones/reorder` - Reorder milestones (backend controls order)
- Google Calendar integration endpoints for token management

### Nested Data Retrieval
Use query parameters like `?include_milestones=true` to get hierarchical data from the API.

## Frontend Architecture Notes

- **Technology**: Next.js with TypeScript
- **State Management**: Uses `usestore` for state management
- **Pages**: Dashboard (main overview), Goals, Milestones, Tasks, Subtasks, Todos, Events
- **Quick Actions**: Fast creation menu for any entity
- **Google Calendar**: Integration exists in backend but UI display is still in development

## Important Business Rules

1. **Milestone Ordering**: The backend controls milestone order completely. Frontend should NOT attempt to manage ordering logic.

2. **DateTime Format**: All datetime fields use ISO 8601 format (e.g., `2025-06-25T15:30:00+09:00`)

3. **Hierarchical Relationships**: 
   - Milestones belong to Goals
   - Tasks belong to Milestones
   - Subtasks and Todos belong to Tasks
   - Events are independent calendar items

4. **Entity Purposes**:
   - **Subtasks**: One-time actions under a Task
   - **Todos**: Recurring (often daily) actions under a Task
   - **Events**: Calendar scheduling and reminders

## When Helping with This Project

### For API Development:
- Always include proper JWT authentication patterns
- Use the exact endpoint URLs and HTTP methods specified
- Include proper Pydantic validation with the field requirements listed
- Remember that Updates require the `id` field plus any fields being changed

### For Frontend Development:
- Use TypeScript with proper type definitions matching the API schemas
- Implement proper error handling for API calls
- Use the query parameters for nested data retrieval
- Remember the state management uses `usestore`

### For Feature Development:
- Consider the hierarchical relationships when designing UI flows
- Remember that Google Calendar display is a known missing feature
- Quick action creation should be available from multiple contexts
- Dashboard should provide overview across all entity types

### For Data Operations:
- Always validate against the Status and Priority enums
- Handle the optional fields properly with appropriate defaults
- Consider the business logic around recurring todos vs one-time subtasks
- Remember that milestone positioning is backend-controlled

## Current Development Priorities

1. Google Calendar events display in UI
2. Enhanced dashboard functionality
3. Improved quick action creation flows
4. Better visualization of the goal → milestone → task hierarchy

When working on this project, always consider how changes affect the entire roadmap hierarchy and ensure consistency with the established data validation patterns.