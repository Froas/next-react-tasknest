# Аудит архитектуры и новый flow создания roadmap

## Короткий вывод

Техническая иерархия в целом жизнеспособна, но пользовательская модель сейчас повторяет таблицы backend почти один в один. Поэтому создание ощущается как заполнение базы данных: отдельные модальные формы, обязательные поля до появления контекста и слишком много равноправных сущностей на экране.

Новый flow должен начинаться с минимального commit — только название goal — и постепенно раскрывать структуру. Пустой goal является допустимым состоянием, а не ошибкой.

## Что есть сейчас

```text
Goal
├── Milestone
│   └── Task (kind: project | routine | challenge)
│       ├── Subtask — разовое действие
│       └── Todo — повторяемое действие
└── Task со scope=goal
```

- FastAPI/SQLModel хранит корректные связи и проверяет принадлежность сущностей пользователю.
- Goal, milestone и task уже поддерживают необязательные даты.
- `completion_rule` позволяет считать структурный, outcome- и consistency-прогресс.
- Routine не является отдельной сущностью: это `Task.kind = routine`.
- Frontend одновременно хранит нормализованные коллекции и вложенные копии тех же сущностей внутри goals. Для синхронизации существует много специализированных updater-методов.

## Главные проблемы

1. **Форма раньше смысла.** `GoalForm` требовал deadline, хотя backend разрешает создать goal без него. Пользователь вынужден принимать решение о сроке до декомпозиции.
2. **Технические названия стали продуктовой моделью.** Subtask, todo и routine отражают устройство базы, но плохо объясняют пользователю разницу «сделать один раз» и «повторять».
3. **Routine находится не там, где его ожидают.** В данных это разновидность task, а в интерфейсе он выглядит то как goal-level task, то как recurring todo.
4. **Слишком много центров управления.** `GoalDetailView`, `MilestoneCard`, отдельные страницы и quick actions создают одни сущности разными путями и с разными defaults.
5. **Server state дублируется.** Goal tree, массивы milestones/tasks/todos и optimistic updates могут расходиться. Это видно по количеству методов вида `update...InGoals` и `add...To...InGoal`.
6. **Критерий успеха не имел простого поля.** Между `description` и сложным `completion_rule` отсутствовало отдельное человеческое «готово, когда…». Это закрыто полем `success_criteria` во втором срезе.
7. **Нет явной orchestration-границы.** Компоненты сами вызывают REST API, нормализуют ответы и изменяют несколько срезов store.

## Целевая продуктовая модель

```text
Goal — желаемый результат
├── Plan
│   └── Milestone — проверяемый переход
│       └── Task — конечный кусок работы
│           └── Step — разовое следующее действие
└── System
    └── Routine — повторяемая практика
        └── Recurring action → occurrence/log
```

На первом этапе это можно отобразить на текущую БД без миграции:

| Продуктовый термин | Текущая модель |
| --- | --- |
| Step | Subtask |
| Routine | Task с `kind=routine`, `scope=goal` |
| Recurring action | Todo с `repeat_interval` |

Routine — параллельная ветка goal, а не пятый уровень после todo. Внутри обычного task можно оставить переключатель «разово / повторять», но основной routine-builder должен жить рядом с roadmap.

## Новый сценарий

1. Отдельный route `/goal/new` с одним центральным input.
2. Enter немедленно создаёт минимальный goal.
3. Созданный goal поднимается вверх и становится корнем вертикальной линии.
4. В фокусе появляется inline-input первого milestone.
5. Каждый созданный milestone сразу показывает inline-input task.
6. Каждый task позволяет добавить разовый step или повторяемое действие.
7. Deadline и «готово, когда…» находятся в раскрываемых деталях конкретной сущности.
8. Отдельная нижняя ветка создаёт goal-level routines.
9. Ветка Measure предлагает необязательную completion policy: Plan complete, Target reached, Consistency или Hybrid.
10. Пользователь в любой момент может уйти: всё уже сохранено, незавершённого wizard-state на сервере нет.

## Архитектурное направление после первого среза

### 1. Ввести use-case слой — реализовано для builder

UI вызывает команды уровня продукта из `useGoalFlow`, а не собирает REST payload внутри визуального компонента. Hook задаёт defaults, нормализует ответы и обновляет store. Остальные create-пути ещё предстоит перевести на тот же подход.

### 2. Разделить server state и UI state

- Server state: одна каноническая нормализованная копия сущности или query-cache.
- UI state: раскрытые панели, drafts, фильтры, выбранный режим.
- Не хранить полное дерево и те же записи отдельными массивами без строгой identity-map.

### 3. Зафиксировать словарь продукта

В интерфейсе: Goal, Milestone, Task, Step, Routine. Названия таблиц `subtask` и `todo` можно временно оставить только в API adapter.

### 4. Добавить success criteria — реализовано

Добавлено отдельное `success_criteria: string | null` для goal/milestone/task. `description` отвечает на «зачем/контекст», `success_criteria` — на «как понять, что готово», а `completion_rule` — на автоматический расчёт.

### 5. Разгрузить Goal Detail

Разделить текущий большой экран на:

- компактный header результата;
- roadmap plan;
- routines/system;
- metrics and completion rules в отдельной drawer/вкладке;
- integrations (calendar/export) в overflow-actions.

## Что реализовано в первом срезе

- Новый progressive builder на `/goal/new`.
- Минимальное создание goal без даты и описания.
- Анимированный dot field и переход от идеи к вертикальному roadmap.
- Inline-создание milestones и tasks.
- Drag-and-drop сортировка milestones в builder с optimistic save, rollback и keyboard fallback.
- Разовые steps и повторяемые actions внутри task.
- Отдельная ветка goal-level routines.
- Необязательные deadline и definition of done после создания.
- Старый список goals ведёт в новый сценарий вместо модального окна.
- Поле `success_criteria` проведено через SQLite migration, FastAPI, frontend types и формы.
- REST orchestration builder вынесена в отдельный `useGoalFlow`.
- Goal Detail разделён на Plan, System и Measure.
- В progressive builder добавлен Measure setup: он создаёт числовую metric definition и сохраняет машинно исполняемый completion rule.
- Тот же completion editor доступен на Goal, Milestone и Task; каждый scope имеет отдельное правило и structural default.
- Metric definition поддерживает прямую принадлежность Milestone, поэтому milestone outcome-rule не зависит от технической привязки к дочернему Task.
- Consistency rule теперь может быть привязан к конкретному recurring action; отметки других routines не искажают прогресс.
- Hybrid использует понятные defaults прогресса: 20% plan, 50% outcome, 30% consistency, при этом для завершения каждая настроенная ветка должна дойти до 100%.
- Английский copy согласован с остальным приложением.
- Добавлен theme-adapter на стандартных `--tn-*` tokens с необязательными `--goal-flow-*` overrides.

## Следующий безопасный этап

1. Перевести оставшиеся старые create-модалки на общие product commands.
2. Перейти от дублированного nested/flat server state к одной identity-map или query cache.
3. Добавить полноценное редактирование success criteria на Task Detail и в массовых сценариях.
4. Унифицировать quick actions со словарём Goal / Milestone / Task / Step / Routine.
