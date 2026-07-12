import { CompletionRule, PriorityType, StatusType, TaskKind, TaskScope } from './types';
import type { MetricInputType } from './api';

export interface TemplateMetric {
 name: string;
 unit?: string;
 input_type?: MetricInputType;
 show_on_today?: boolean;
}

export interface TemplateTodoDefinition {
 title: string;
 description?: string;
 repeat_interval?: string;
 recurrence?: string;
 priority?: PriorityType;
 status?: StatusType;
}

export interface TemplateSubtask {
 title: string;
 description?: string;
 priority?: PriorityType;
 status?: StatusType;
 due_date_offset_days?: number;
}

export interface TemplateTask {
 title: string;
 description?: string;
 kind?: TaskKind;
 scope?: TaskScope;
 priority?: PriorityType;
 status?: StatusType;
 due_date_offset_days?: number;
 scheduled_date_offset_days?: number;
 todos?: TemplateTodoDefinition[];
 subtasks?: TemplateSubtask[];
 metrics?: TemplateMetric[];
 completion_rule?: CompletionRule;
}

export interface MilestoneTemplate {
 title: string;
 description: string;
 status?: StatusType;
 priority?: PriorityType;
 due_date_offset_days?: number;
 tasks: TemplateTask[];
 completion_rule?: CompletionRule;
}

export interface GoalTemplateBlueprint {
 status?: StatusType;
 priority?: PriorityType;
 duration_days: number;
 completion_rule?: CompletionRule;
 metrics?: TemplateMetric[];
 goal_tasks?: TemplateTask[];
 milestones: MilestoneTemplate[];
}

export interface GoalTemplate {
 id: string;
 emoji: string;
 title: string;
 description: string;
 durationDays: number;
 priority: PriorityType;
 tags: string[];
 blueprint: GoalTemplateBlueprint;
}

const daily = 'daily';

const structuralRule: CompletionRule = { type: 'structural' };

const consistencyRule = (
 label: string,
 requiredDone: number,
 windowDays = 7,
): Extract<CompletionRule, { type: 'consistency' }> => ({
 type: 'consistency',
 label,
 current_done: 0,
 required_done: requiredDone,
 window_days: windowDays,
});

const metricTargetRule = (
 metricName: string,
 startValue: number,
 targetValue: number,
 direction: Extract<CompletionRule, { type: 'metric_target' }>['direction'],
): Extract<CompletionRule, { type: 'metric_target' }> => ({
 type: 'metric_target',
 metric_name: metricName,
 start_value: startValue,
 current_value: startValue,
 target_value: targetValue,
 direction,
});

const hybridRule = (
 outcomeWeight = 40,
 consistencyWeight = 40,
 structuralWeight = 20,
 outcome?: Extract<CompletionRule, { type: 'metric_target' }>,
 consistency?: Extract<CompletionRule, { type: 'consistency' }>,
): CompletionRule => ({
 type: 'hybrid',
 outcome_weight: outcomeWeight,
 consistency_weight: consistencyWeight,
 structural_weight: structuralWeight,
 ...(outcome ? { outcome } : {}),
 ...(consistency ? { consistency } : {}),
});

const numberMetric = (name: string, unit?: string, showOnToday = true): TemplateMetric => ({
 name,
 ...(unit ? { unit } : {}),
 input_type: 'number',
 show_on_today: showOnToday,
});

const booleanMetric = (name: string, showOnToday = true): TemplateMetric => ({
 name,
 input_type: 'boolean',
 show_on_today: showOnToday,
});

const recurringTodo = (title: string, priority: PriorityType = PriorityType.MEDIUM): TemplateTodoDefinition => ({
 title,
 repeat_interval: daily,
 priority,
});

const routineTask = (
 title: string,
 description: string,
 todoTitles: string[],
 metrics: TemplateMetric[] = [],
 priority: PriorityType = PriorityType.MEDIUM,
): TemplateTask => ({
 title,
 description,
 kind: 'routine',
 scope: 'goal',
 status: StatusType.STARTED,
 priority,
 todos: todoTitles.map((todoTitle, todoIndex) =>
 recurringTodo(todoTitle, todoIndex === 0 ? priority : PriorityType.MEDIUM),
 ),
 metrics,
});

const projectTask = (
 title: string,
 description: string,
 steps: string[],
 dueDateOffsetDays = 7,
 priority: PriorityType = PriorityType.MEDIUM,
): TemplateTask => ({
 title,
 description,
 kind: 'project',
 status: StatusType.OUTSTANDING,
 priority,
 scheduled_date_offset_days: 0,
 due_date_offset_days: dueDateOffsetDays,
 subtasks: steps.map((stepTitle) => ({ title: stepTitle, priority })),
});

const challengeTask = (
 title: string,
 description: string,
 todoTitles: string[],
 steps: string[],
 dueDateOffsetDays = 14,
 metrics: TemplateMetric[] = [],
 priority: PriorityType = PriorityType.MEDIUM,
): TemplateTask => ({
 title,
 description,
 kind: 'challenge',
 status: StatusType.STARTED,
 priority,
 due_date_offset_days: dueDateOffsetDays,
 todos: todoTitles.map((todoTitle, todoIndex) =>
 recurringTodo(todoTitle, todoIndex === 0 ? priority : PriorityType.MEDIUM),
 ),
 subtasks: steps.map((stepTitle) => ({ title: stepTitle, priority })),
 metrics,
});

const milestone = (
 title: string,
 description: string,
 dueDateOffsetDays: number,
 tasks: TemplateTask[],
 priority: PriorityType = PriorityType.MEDIUM,
 status: StatusType = StatusType.OUTSTANDING,
): MilestoneTemplate => ({
 title,
 description,
 due_date_offset_days: dueDateOffsetDays,
 priority,
 status,
 tasks,
});

const startedBlueprint = (
 durationDays: number,
 priority: PriorityType,
 completionRule: CompletionRule,
 metrics: TemplateMetric[],
 goalTasks: TemplateTask[],
 milestones: MilestoneTemplate[],
): GoalTemplateBlueprint => ({
 status: StatusType.STARTED,
 priority,
 duration_days: durationDays,
 completion_rule: completionRule,
 metrics,
 goal_tasks: goalTasks,
 milestones,
});

export const countTemplateTasks = (template: GoalTemplate) =>
 (template.blueprint.goal_tasks?.length ?? 0) +
 template.blueprint.milestones.reduce((sum, milestoneItem) => sum + milestoneItem.tasks.length, 0);

export const countTemplateTodos = (template: GoalTemplate) => {
 const goalTodos = template.blueprint.goal_tasks?.reduce((sum, task) => sum + (task.todos?.length ?? 0), 0) ?? 0;
 const milestoneTodos = template.blueprint.milestones.reduce(
 (sum, milestoneItem) => sum + milestoneItem.tasks.reduce((taskSum, task) => taskSum + (task.todos?.length ?? 0), 0),
 0,
 );
 return goalTodos + milestoneTodos;
};

export const countTemplateSubtasks = (template: GoalTemplate) =>
 template.blueprint.milestones.reduce(
 (sum, milestoneItem) => sum + milestoneItem.tasks.reduce((taskSum, task) => taskSum + (task.subtasks?.length ?? 0), 0),
 0,
 );

export const countTemplateMetrics = (template: GoalTemplate) => {
 const goalMetrics = template.blueprint.metrics?.length ?? 0;
 const taskMetrics = [
 ...(template.blueprint.goal_tasks ?? []),
 ...template.blueprint.milestones.flatMap((milestoneItem) => milestoneItem.tasks),
 ].reduce((sum, task) => sum + (task.metrics?.length ?? 0), 0);
 return goalMetrics + taskMetrics;
};

export const GOAL_TEMPLATES: GoalTemplate[] = [
 {
 id: 'weight-loss-system',
 emoji: '⚖️',
 title: 'Weight Loss 105 → 90',
 description: 'Metric-based weight loss with nutrition routines, movement, and honest daily logging.',
 durationDays: 120,
 priority: PriorityType.HIGH,
 tags: ['health', 'daily', 'metrics'],
 blueprint: startedBlueprint(
 120,
 PriorityType.HIGH,
 metricTargetRule('Weight', 105, 90, 'decrease'),
 [numberMetric('Weight', 'kg'), numberMetric('Steps', 'steps')],
 [
 routineTask('Daily Nutrition', 'Food truth, protein, water, and simple adherence.', ['Track food', 'Hit protein target', 'Drink 2L water'], [
 numberMetric('Calories', 'kcal'),
 numberMetric('Protein', 'g'),
 ], PriorityType.HIGH),
 routineTask('Daily Movement', 'Low-friction movement that keeps the deficit honest.', ['10k steps', '20 minute walk']),
 ],
 [
 milestone('105 → 100 kg', 'Set the system and collect honest data.', 30, [
 projectTask('Setup nutrition system', 'Create the one-off scaffolding before judging progress.', [
 'Calculate calorie target',
 'Define protein target',
 'Create basic meals list',
 ], 3, PriorityType.HIGH),
 challengeTask('14 days honest tracking', 'A short adherence challenge before changing the plan.', ['Track food daily', 'Log morning weight'], [
 'Install/update food tracker',
 'Choose weigh-in place',
 ], 14, [numberMetric('Tracking days', 'days')], PriorityType.HIGH),
 ], PriorityType.HIGH, StatusType.STARTED),
 milestone('100 → 95 kg', 'Reduce variance and keep adherence high.', 75, [
 projectTask('Adjust by weekly average', 'Use data instead of panic.', ['Review 7-day weight average', 'Adjust calories only if needed'], 40),
 challengeTask('High-adherence week', 'Keep the basics visible for one clean week.', ['Hit calorie range', 'Walk after dinner'], ['Pick default dinner options'], 7),
 ]),
 ],
 ),
 },
 {
 id: 'recovery-os',
 emoji: '🌙',
 title: 'Recovery OS',
 description: 'Sleep, shutdown, and nervous-system recovery without turning evenings into homework.',
 durationDays: 90,
 priority: PriorityType.HIGH,
 tags: ['health', 'sleep', 'daily'],
 blueprint: startedBlueprint(
 90,
 PriorityType.HIGH,
 consistencyRule('Recovery routines', 5),
 [numberMetric('Sleep', 'hours'), numberMetric('Mood', '/10')],
 [
 routineTask('Evening Shutdown', 'A small close-the-day loop that protects sleep.', [
 'Phone outside bedroom',
 'Screen off 30 minutes before sleep',
 'Write shutdown note',
 ], [], PriorityType.HIGH),
 routineTask('Morning Recovery', 'Tiny morning signals that make the day less random.', ['Morning light', 'Drink water', 'Quick body scan']),
 ],
 [
 milestone('Stabilize sleep baseline', 'Get seven nights of decent recovery signal.', 21, [
 projectTask('Design sleep environment', 'Remove friction from doing the obvious thing.', [
 'Clear bedside clutter',
 'Prepare charger outside bedroom',
 'Set recurring wind-down alarm',
 ], 3),
 challengeTask('7 night shutdown challenge', 'Run the shutdown loop for one week.', ['Do shutdown checklist', 'Log sleep quality'], [
 'Write minimum viable shutdown',
 ], 7, [numberMetric('Sleep quality', '/10')], PriorityType.HIGH),
 ], PriorityType.HIGH, StatusType.STARTED),
 milestone('Reduce recovery debt', 'Make recovery stable under normal stress.', 60, [
 projectTask('Create bad-day protocol', 'Define what counts on low-energy days.', ['Write minimum evening action', 'Pick default low-stimulation activity'], 14),
 challengeTask('No-phone bedroom streak', 'Make the physical environment do the work.', ['Park phone outside bedroom', 'Charge watch/headphones outside'], ['Place backup alarm'], 14),
 ]),
 ],
 ),
 },
 {
 id: 'tracker-mvp',
 emoji: '🧭',
 title: 'Tracker MVP',
 description: 'Finish a reliable web MVP before mobile apps and integrations.',
 durationDays: 45,
 priority: PriorityType.HIGH,
 tags: ['work', 'product', 'daily'],
 blueprint: startedBlueprint(
 45,
 PriorityType.HIGH,
 structuralRule,
 [numberMetric('Coding minutes', 'min'), numberMetric('Bugs closed', 'bugs')],
 [
 routineTask('Build Loop', 'Keep the product moving every day without overthinking.', [
 'Ship one visible improvement',
 'Write tomorrow slice',
 'Update architecture notes',
 ], [], PriorityType.HIGH),
 routineTask('Stability Loop', 'Make refresh persistence boring and reliable.', ['Test one create/edit/delete flow', 'Write one regression note']),
 ],
 [
 milestone('Today foundation', 'Today is composition; DailyLog is truth underneath.', 10, [
 projectTask('Implement TodoOccurrence rules', 'Recurring definitions create daily facts.', [
 'Filter to repeat_interval definitions',
 'Exclude inactive milestone tasks',
 'Add regression test for occurrence scope',
 ], 3, PriorityType.HIGH),
 projectTask('Today dashboard UI cleanup', 'Keep the day screen fast and understandable.', [
 'Move overdue into goal cards',
 'Add compact global summary',
 'Keep End Day as modal',
 ], 7, PriorityType.HIGH),
 ], PriorityType.HIGH, StatusType.STARTED),
 milestone('Persistence audit', 'Every button must survive refresh.', 21, [
 projectTask('Audit create/update/delete flows', 'Button behavior should match database truth.', [
 'Milestone delete persists',
 'Todo toggle persists',
 'Inline date edit persists',
 ], 7, PriorityType.HIGH),
 challengeTask('Daily QA pass', 'Short daily product checks while building.', ['Run focused test', 'Check one page visually'], ['Write smoke checklist'], 10),
 ], PriorityType.HIGH),
 ],
 ),
 },
 {
 id: 'professional-radar',
 emoji: '📡',
 title: 'Professional Radar',
 description: 'Capture weak signals, connect patterns, and review opportunities intentionally.',
 durationDays: 120,
 priority: PriorityType.MEDIUM,
 tags: ['work', 'radar', 'notes'],
 blueprint: startedBlueprint(
 120,
 PriorityType.MEDIUM,
 consistencyRule('Signal capture', 5),
 [numberMetric('Signals captured', 'signals')],
 [
 routineTask('Signal Capture Loop', 'Lightweight daily capture until Signal becomes a first-class model.', [
 'Capture one professional signal',
 'Tag the signal source',
 ], [numberMetric('Signal quality', '/10')]),
 routineTask('Weekly Opportunity Scan', 'Small review loop for patterns and leverage.', ['Review saved signals', 'Pick one experiment']),
 ],
 [
 milestone('First weekly scan', 'Review weak signals and choose one experiment.', 14, [
 projectTask('Define Radar MVP', 'Make the signal model concrete.', ['Define Signal fields', 'Define review cadence', 'Pick first experiment'], 7),
 challengeTask('Capture 10 signals', 'Build signal fluency through repetition.', ['Capture a signal', 'Add source/context'], ['Create initial tags'], 10, [numberMetric('Signals this week', 'signals')]),
 ], PriorityType.MEDIUM, StatusType.STARTED),
 milestone('Pattern review', 'Turn signals into a professional bet.', 45, [
 projectTask('Cluster signals', 'Find repeated themes worth acting on.', ['Group by domain', 'Name top three patterns', 'Choose one next bet'], 30),
 ]),
 ],
 ),
 },
 {
 id: 'deep-work-system',
 emoji: '🧠',
 title: 'Deep Work System',
 description: 'Build a repeatable focus system with blocks, shutdown, and attention hygiene.',
 durationDays: 60,
 priority: PriorityType.HIGH,
 tags: ['focus', 'work', 'daily'],
 blueprint: startedBlueprint(
 60,
 PriorityType.HIGH,
 consistencyRule('Deep work blocks', 4),
 [numberMetric('Deep work minutes', 'min'), numberMetric('Distractions', 'count')],
 [
 routineTask('Focus Block Routine', 'One protected block before reactive work takes over.', ['Plan one deep block', 'Start block timer', 'Log result'], [
 numberMetric('Focus block length', 'min'),
 ], PriorityType.HIGH),
 routineTask('Attention Hygiene', 'Reduce avoidable context switching.', ['Close distracting tabs', 'Notifications off', 'Single next action written']),
 ],
 [
 milestone('Design focus environment', 'Make focus easier than drift.', 14, [
 projectTask('Remove obvious distractions', 'Clean the workspace and browser state.', ['Audit apps/sites', 'Block top distractions', 'Prepare focus playlist'], 5),
 challengeTask('5 focus blocks', 'Prove the loop works with small wins.', ['Complete one focus block', 'Log distraction count'], ['Choose default block time'], 10, [numberMetric('Blocks completed', 'blocks')], PriorityType.HIGH),
 ], PriorityType.HIGH, StatusType.STARTED),
 milestone('Scale focused output', 'Turn blocks into meaningful deliverables.', 45, [
 projectTask('Define output scoreboard', 'Measure shipped work instead of vibes.', ['Pick output metric', 'Create weekly review note'], 21),
 challengeTask('Four block week', 'Sustain attention across a normal week.', ['Protect deep work block', 'Write block result'], ['Choose protected calendar window'], 7),
 ]),
 ],
 ),
 },
 {
 id: 'japanese-n3-path',
 emoji: '🇯🇵',
 title: 'Japanese N3 Path',
 description: 'A balanced Japanese study plan for kanji, listening, grammar, and review.',
 durationDays: 180,
 priority: PriorityType.MEDIUM,
 tags: ['language', 'japanese', 'study'],
 blueprint: startedBlueprint(
 180,
 PriorityType.MEDIUM,
 hybridRule(
 40,
 40,
 20,
 metricTargetRule('Known kanji', 0, 650, 'increase'),
 consistencyRule('Japanese reps', 120, 180),
 ),
 [numberMetric('Study minutes', 'min'), numberMetric('Known kanji', 'kanji')],
 [
 routineTask('Daily Japanese Core', 'Keep contact with the language every day.', ['Review SRS', 'Listen for 10 minutes', 'Read one short item'], [
 numberMetric('SRS reviews', 'cards'),
 ]),
 routineTask('Output Practice', 'Move from passive study into recall.', ['Write 3 sentences', 'Shadow one audio clip']),
 ],
 [
 milestone('N4 refresh', 'Patch weak basics before adding harder grammar.', 30, [
 projectTask('Audit grammar gaps', 'Find weak points from the previous level.', ['Take short grammar diagnostic', 'List top 20 weak points', 'Choose review resource'], 7),
 challengeTask('30 day SRS streak', 'Make vocabulary review automatic.', ['Review SRS', 'Add 5 useful words'], ['Clean old deck backlog'], 30, [numberMetric('Vocabulary added', 'words')]),
 ], PriorityType.MEDIUM, StatusType.STARTED),
 milestone('N3 grammar sprint', 'Build usable grammar patterns.', 90, [
 projectTask('Create grammar map', 'Turn grammar into a visible checklist.', ['List target grammar points', 'Group by similarity', 'Pick example sentence source'], 21),
 challengeTask('Daily grammar reps', 'Practice patterns instead of only reading explanations.', ['Study one grammar point', 'Write one example'], ['Create sentence template'], 30),
 ]),
 ],
 ),
 },
 {
 id: 'english-fluency-maintenance',
 emoji: '🗣️',
 title: 'English Fluency Maintenance',
 description: 'Maintain speaking, vocabulary, and writing fluency through tiny daily loops.',
 durationDays: 90,
 priority: PriorityType.MEDIUM,
 tags: ['language', 'english', 'daily'],
 blueprint: startedBlueprint(
 90,
 PriorityType.MEDIUM,
 consistencyRule('English reps', 5),
 [numberMetric('Speaking minutes', 'min'), numberMetric('New phrases', 'phrases')],
 [
 routineTask('Daily English Contact', 'Keep English active with short input and output.', ['Listen/read in English', 'Capture one phrase', 'Say it aloud']),
 routineTask('Speaking Loop', 'Small speaking reps to avoid rust.', ['Record 2 minute monologue', 'Review one pronunciation note']),
 ],
 [
 milestone('Build phrase bank', 'Collect language that you actually want to use.', 21, [
 projectTask('Create phrase categories', 'Make retrieval easier than hoarding.', ['Create work category', 'Create casual category', 'Create emotion category'], 5),
 challengeTask('20 phrase capture', 'Collect phrases from real sources.', ['Capture one phrase', 'Use one phrase in a sentence'], ['Choose capture app'], 20, [numberMetric('Phrase bank size', 'phrases')]),
 ], PriorityType.MEDIUM, StatusType.STARTED),
 milestone('Conversation confidence', 'Practice smooth recall in short bursts.', 60, [
 projectTask('Prepare topic scripts', 'Reduce blank-page speaking friction.', ['Write intro script', 'Write work update script', 'Write opinion script'], 14),
 challengeTask('Seven speaking reps', 'Get reps without scheduling a huge lesson.', ['Record short answer', 'Listen once and note one fix'], ['Pick prompt list'], 7),
 ]),
 ],
 ),
 },
 {
 id: 'run-5k',
 emoji: '🏃',
 title: 'Run a 5K',
 description: 'Build from couch to running 5km without stopping.',
 durationDays: 56,
 priority: PriorityType.MEDIUM,
 tags: ['fitness', 'running', 'health'],
 blueprint: startedBlueprint(
 56,
 PriorityType.MEDIUM,
 metricTargetRule('Run distance', 0, 5, 'increase'),
 [numberMetric('Run distance', 'km'), numberMetric('Run time', 'min')],
 [
 routineTask('Runner Recovery', 'Protect consistency with simple recovery basics.', ['Stretch calves', 'Hydrate after session', 'Log run effort']),
 routineTask('Walk Support', 'Keep easy movement on non-run days.', ['10 minute walk', 'Check soreness']),
 ],
 [
 milestone('Get the gear', 'Prepare a kit you actually want to put on.', 7, [
 projectTask('Prepare running kit', 'Remove tiny excuses before week one.', ['Buy running shoes', 'Pick running playlist', 'Choose running route'], 3),
 challengeTask('First run-walk week', 'Start with tiny confidence-building sessions.', ['Complete run-walk session', 'Log effort'], ['Choose three run days'], 7, [numberMetric('Sessions completed', 'sessions')]),
 ], PriorityType.MEDIUM, StatusType.STARTED),
 milestone('Run 1km without stopping', 'Build the first continuous running milestone.', 28, [
 challengeTask('Three runs per week', 'Repeat moderate sessions with recovery.', ['Complete planned run', 'Do post-run stretch'], ['Schedule weekly run slots'], 21),
 projectTask('Plan first 5K attempt', 'Make the finish line concrete.', ['Pick 5K date', 'Choose route/event'], 28),
 ]),
 ],
 ),
 },
 {
 id: 'strength-foundation',
 emoji: '💪',
 title: 'Strength Foundation',
 description: 'Build a basic lifting habit around form, progressive overload, and recovery.',
 durationDays: 84,
 priority: PriorityType.MEDIUM,
 tags: ['fitness', 'strength', 'routine'],
 blueprint: startedBlueprint(
 84,
 PriorityType.MEDIUM,
 consistencyRule('Strength sessions', 3),
 [numberMetric('Workout minutes', 'min'), numberMetric('Top set weight', 'kg')],
 [
 routineTask('Training Day Basics', 'Make each workout repeatable and trackable.', ['Warm up', 'Log main lifts', 'Cooldown mobility'], [
 numberMetric('Sets completed', 'sets'),
 ]),
 routineTask('Recovery Basics', 'Strength grows between sessions.', ['Protein with meal', 'Sleep check', 'Walk 10 minutes']),
 ],
 [
 milestone('Learn the main lifts', 'Build safe form before chasing numbers.', 21, [
 projectTask('Choose program', 'Pick simple structure instead of improvising.', ['Choose 3-day split', 'List exercises', 'Set starting weights'], 5),
 challengeTask('Three clean sessions', 'Practice showing up and logging form notes.', ['Complete workout', 'Write form note'], ['Record one set for review'], 14),
 ], PriorityType.MEDIUM, StatusType.STARTED),
 milestone('Progressive overload block', 'Add weight slowly while keeping technique stable.', 63, [
 challengeTask('Four week training block', 'Repeat the program and track progression.', ['Complete planned workout', 'Update lift log'], ['Define deload rule'], 28, [numberMetric('Weekly volume', 'sets')]),
 projectTask('Review and adjust', 'Change the plan only with evidence.', ['Review lift trend', 'Review soreness', 'Choose next block focus'], 63),
 ]),
 ],
 ),
 },
 {
 id: 'personal-finance-reset',
 emoji: '💸',
 title: 'Personal Finance Reset',
 description: 'Make money visible, reduce leaks, and build a simple monthly operating system.',
 durationDays: 60,
 priority: PriorityType.HIGH,
 tags: ['finance', 'life', 'systems'],
 blueprint: startedBlueprint(
 60,
 PriorityType.HIGH,
 metricTargetRule('Emergency fund', 0, 1000, 'increase'),
 [numberMetric('Emergency fund', '$'), numberMetric('Spending tracked', '$')],
 [
 routineTask('Money Check', 'Keep daily money awareness lightweight.', ['Log spending', 'Check account balance', 'No impulse purchase review'], [
 numberMetric('Daily spend', '$'),
 ]),
 routineTask('Bill Hygiene', 'Avoid accidental stress from neglected admin.', ['Check upcoming bills', 'Clear one money notification']),
 ],
 [
 milestone('Map the money', 'Turn unknowns into a clear picture.', 14, [
 projectTask('Build account inventory', 'List every account and recurring charge.', ['List bank accounts', 'List cards', 'List subscriptions'], 3, PriorityType.HIGH),
 projectTask('Create simple budget', 'Choose limits that are easy to follow.', ['Define fixed costs', 'Define flexible categories', 'Choose weekly allowance'], 10),
 ], PriorityType.HIGH, StatusType.STARTED),
 milestone('Reduce leaks', 'Cancel or renegotiate low-value spending.', 45, [
 projectTask('Subscription cleanup', 'Stop silent leaks.', ['Cancel unused subscriptions', 'Renegotiate one bill', 'Set renewal reminders'], 21),
 challengeTask('Seven day spending log', 'Capture reality before optimizing.', ['Log every purchase', 'Flag unnecessary spend'], ['Create spending categories'], 7, [numberMetric('Logged purchases', 'items')]),
 ]),
 ],
 ),
 },
 {
 id: 'read-12-books',
 emoji: '📚',
 title: 'Read 12 Books This Year',
 description: 'A book-a-month system with notes, pacing, and a visible reading queue.',
 durationDays: 365,
 priority: PriorityType.MEDIUM,
 tags: ['reading', 'learning', 'notes'],
 blueprint: startedBlueprint(
 365,
 PriorityType.MEDIUM,
 metricTargetRule('Books finished', 0, 12, 'increase'),
 [numberMetric('Books finished', 'books'), numberMetric('Pages read', 'pages')],
 [
 routineTask('Daily Reading', 'Keep pages moving without turning reading into homework.', ['Read 10 pages', 'Capture one idea']),
 routineTask('Reading Queue Hygiene', 'Maintain an intentional next-book queue.', ['Review current book', 'Update next book list']),
 ],
 [
 milestone('Build the queue', 'Pick books before motivation fades.', 14, [
 projectTask('Create 12 book list', 'A balanced queue prevents decision fatigue.', ['Choose 4 fiction books', 'Choose 4 nonfiction books', 'Choose 4 wildcard books'], 7),
 challengeTask('First 100 pages', 'Start with a small momentum milestone.', ['Read daily', 'Write one note'], ['Pick first book'], 10, [numberMetric('Pages this week', 'pages')]),
 ], PriorityType.MEDIUM, StatusType.STARTED),
 milestone('Monthly review loop', 'Turn books into retained ideas.', 45, [
 projectTask('Create book note template', 'Make notes consistent and fast.', ['Define summary prompt', 'Define quote capture', 'Define action idea field'], 21),
 challengeTask('Finish first book', 'Close the first reading loop.', ['Read 10 pages', 'Update progress'], ['Schedule finish date'], 30),
 ]),
 ],
 ),
 },
 {
 id: 'side-project-launch',
 emoji: '🚀',
 title: 'Ship a Side Project',
 description: 'Move from idea to launched-and-used in 90 days.',
 durationDays: 90,
 priority: PriorityType.HIGH,
 tags: ['product', 'startup', 'build'],
 blueprint: startedBlueprint(
 90,
 PriorityType.HIGH,
 structuralRule,
 [numberMetric('Build minutes', 'min'), numberMetric('Users talked to', 'people')],
 [
 routineTask('Shipping Loop', 'Tiny daily progress toward a real launch.', ['Ship one small change', 'Write next action', 'Capture one risk'], [
 numberMetric('Commits shipped', 'commits'),
 ], PriorityType.HIGH),
 routineTask('User Signal Loop', 'Keep the project connected to real people.', ['Ask one user question', 'Capture one feedback note']),
 ],
 [
 milestone('Define MVP', 'Cut the idea until it is shippable.', 14, [
 projectTask('Pick problem and audience', 'Choose a specific user and pain.', ['Write target user', 'Write painful problem', 'Write success metric'], 5, PriorityType.HIGH),
 projectTask('Scope smallest version', 'Remove everything not needed for first use.', ['List must-have flows', 'Cut nice-to-haves', 'Draw first screen'], 10),
 ], PriorityType.HIGH, StatusType.STARTED),
 milestone('Launch beta', 'Get the first version into hands.', 60, [
 challengeTask('Build sprint', 'Ship the MVP through daily slices.', ['Ship one feature slice', 'Fix one friction point'], ['Create release checklist'], 30, [numberMetric('Feature slices', 'slices')], PriorityType.HIGH),
 projectTask('Recruit first users', 'Find usage before polishing.', ['List 20 candidate users', 'Message 5 people', 'Schedule feedback call'], 45),
 ]),
 ],
 ),
 },
 {
 id: 'home-reset',
 emoji: '🏠',
 title: 'Home Reset',
 description: 'Reset space, chores, and visual friction with a simple household system.',
 durationDays: 45,
 priority: PriorityType.MEDIUM,
 tags: ['home', 'life', 'systems'],
 blueprint: startedBlueprint(
 45,
 PriorityType.MEDIUM,
 consistencyRule('Home reset actions', 5),
 [numberMetric('Rooms reset', 'rooms'), numberMetric('Decluttered items', 'items')],
 [
 routineTask('Daily Surface Reset', 'Small resets that prevent chaos from compounding.', ['Clear desk/table', 'Wash dishes', 'Take out one item']),
 routineTask('Laundry / Trash Loop', 'Keep boring maintenance visible.', ['Check laundry', 'Check trash/recycling']),
 ],
 [
 milestone('Reset visible surfaces', 'Make the home feel lighter quickly.', 14, [
 projectTask('Desk and entry reset', 'Fix the places you see first.', ['Clear desk', 'Clear entryway', 'Create landing tray'], 5),
 challengeTask('10 item declutter', 'Remove small friction daily.', ['Declutter one item', 'Put one thing back'], ['Prepare donation bag'], 10, [numberMetric('Items removed', 'items')]),
 ], PriorityType.MEDIUM, StatusType.STARTED),
 milestone('Build maintenance rhythm', 'Make the clean state easier to keep.', 35, [
 projectTask('Create weekly chore map', 'Assign recurring maintenance instead of relying on mood.', ['List recurring chores', 'Choose weekly cadence', 'Put supplies where used'], 21),
 challengeTask('Seven day reset streak', 'Practice the minimum daily loop.', ['Do 10 minute reset', 'Log friction point'], ['Pick reset time'], 7),
 ]),
 ],
 ),
 },
 {
 id: 'meal-prep-system',
 emoji: '🥗',
 title: 'Meal Prep System',
 description: 'Create repeatable meals, shopping, and prep routines that support health goals.',
 durationDays: 60,
 priority: PriorityType.MEDIUM,
 tags: ['food', 'health', 'systems'],
 blueprint: startedBlueprint(
 60,
 PriorityType.MEDIUM,
 consistencyRule('Meal prep loops', 4),
 [numberMetric('Meals prepped', 'meals'), numberMetric('Protein servings', 'servings')],
 [
 routineTask('Food Prep Daily', 'Keep meals simple and visible.', ['Plan next meal', 'Prep one protein', 'Log what worked']),
 routineTask('Shopping Hygiene', 'Avoid random grocery drift.', ['Update grocery list', 'Check staple inventory']),
 ],
 [
 milestone('Build base meal list', 'Create default meals before optimizing.', 14, [
 projectTask('Choose default meals', 'Pick options you actually eat.', ['Choose 3 breakfasts', 'Choose 3 lunches', 'Choose 3 dinners'], 7),
 projectTask('Create grocery template', 'Make shopping repeatable.', ['List protein staples', 'List carb staples', 'List vegetables/snacks'], 10),
 ], PriorityType.MEDIUM, StatusType.STARTED),
 milestone('Run prep week', 'Test the system under real life.', 30, [
 challengeTask('Five planned meals', 'Practice using the meal map.', ['Eat planned meal', 'Track prep friction'], ['Block prep time'], 7, [numberMetric('Planned meals eaten', 'meals')]),
 projectTask('Refine based on friction', 'Keep what worked and simplify the rest.', ['Remove annoying recipe', 'Add emergency meal', 'Update grocery template'], 30),
 ]),
 ],
 ),
 },
 {
 id: 'mindfulness-calm',
 emoji: '🧘',
 title: 'Mindfulness Calm',
 description: 'Build emotional regulation through tiny practices, reflection, and low-pressure consistency.',
 durationDays: 60,
 priority: PriorityType.LOW,
 tags: ['mindfulness', 'mental-health', 'daily'],
 blueprint: startedBlueprint(
 60,
 PriorityType.LOW,
 consistencyRule('Calm practices', 5),
 [numberMetric('Meditation minutes', 'min'), numberMetric('Stress', '/10')],
 [
 routineTask('Tiny Calm Practice', 'Practice before you need it.', ['Sit for 3 minutes', 'Name current emotion', 'One slow exhale']),
 routineTask('Stress Debrief', 'Turn rough moments into signal, not shame.', ['Log one trigger', 'Write one helpful response']),
 ],
 [
 milestone('Find minimum practice', 'Make the smallest practice real.', 14, [
 projectTask('Design low-friction setup', 'Remove barriers to starting.', ['Pick practice spot', 'Choose timer/app', 'Write emergency one-breath version'], 5),
 challengeTask('10 calm reps', 'Build identity through tiny reps.', ['Do tiny practice', 'Log stress level'], ['Choose daily cue'], 10, [numberMetric('Practice reps', 'reps')]),
 ], PriorityType.LOW, StatusType.STARTED),
 milestone('Apply under stress', 'Use the practice in real moments.', 45, [
 projectTask('Create trigger map', 'Name the moments that knock you off center.', ['List common triggers', 'Write response menu', 'Choose one support action'], 21),
 challengeTask('Pause before reaction', 'Practice one pause in the wild.', ['Use one pause', 'Write what happened'], ['Choose reminder phrase'], 14),
 ]),
 ],
 ),
 },
 {
 id: 'portfolio-career-switch',
 emoji: '💼',
 title: 'Portfolio Career Switch',
 description: 'Build a portfolio, proof of work, and outreach loop for a role transition.',
 durationDays: 120,
 priority: PriorityType.HIGH,
 tags: ['career', 'portfolio', 'work'],
 blueprint: startedBlueprint(
 120,
 PriorityType.HIGH,
 hybridRule(
 30,
 30,
 40,
 metricTargetRule('Portfolio pieces', 0, 3, 'at_least'),
 consistencyRule('Career reps', 60, 120),
 ),
 [numberMetric('Portfolio pieces', 'pieces'), numberMetric('Outreach messages', 'messages')],
 [
 routineTask('Career Shipping Loop', 'Small daily proof-of-work motion.', ['Improve one portfolio artifact', 'Capture one career note', 'Send/check one outreach'], [
 numberMetric('Career minutes', 'min'),
 ], PriorityType.HIGH),
 routineTask('Market Learning Loop', 'Stay connected to real job requirements.', ['Read one job post', 'Extract one skill requirement']),
 ],
 [
 milestone('Define target role', 'Make the switch specific enough to act on.', 14, [
 projectTask('Role clarity', 'Choose target roles and evidence gaps.', ['List target roles', 'Collect 10 job descriptions', 'Map required skills'], 7, PriorityType.HIGH),
 projectTask('Portfolio plan', 'Select pieces that prove the role.', ['Choose 3 portfolio projects', 'Write proof statement for each', 'Define done criteria'], 14),
 ], PriorityType.HIGH, StatusType.STARTED),
 milestone('Ship portfolio proof', 'Turn plans into visible work.', 75, [
 challengeTask('Portfolio build sprint', 'Move one proof piece daily.', ['Ship portfolio improvement', 'Write change note'], ['Create project page template'], 30, [numberMetric('Portfolio updates', 'updates')], PriorityType.HIGH),
 projectTask('Outreach packet', 'Prepare materials for real conversations.', ['Update resume', 'Write intro message', 'Create case-study summary'], 60),
 ]),
 ],
 ),
 },
 {
 id: 'knowledge-base-obsidian',
 emoji: '🕸️',
 title: 'Obsidian Knowledge Base',
 description: 'Build a connected note system with capture, review, and graph-friendly structure.',
 durationDays: 75,
 priority: PriorityType.MEDIUM,
 tags: ['notes', 'obsidian', 'knowledge'],
 blueprint: startedBlueprint(
 75,
 PriorityType.MEDIUM,
 consistencyRule('Knowledge capture', 5),
 [numberMetric('Notes created', 'notes'), numberMetric('Links created', 'links')],
 [
 routineTask('Daily Capture', 'Capture ideas before they vanish.', ['Create one atomic note', 'Link it to one existing note', 'Tag context']),
 routineTask('Review Loop', 'Turn capture into a useful map.', ['Review inbox notes', 'Merge or link one note']),
 ],
 [
 milestone('Design note taxonomy', 'Create enough structure to prevent chaos.', 14, [
 projectTask('Set vault conventions', 'Define simple naming and linking rules.', ['Create folder map', 'Define note template', 'Define tag rules'], 7),
 challengeTask('20 atomic notes', 'Build graph mass through small notes.', ['Write one atomic note', 'Create one backlink'], ['Choose capture hotkey'], 20, [numberMetric('Backlinks made', 'links')]),
 ], PriorityType.MEDIUM, StatusType.STARTED),
 milestone('Build review habit', 'Make the graph useful instead of decorative.', 45, [
 projectTask('Weekly review template', 'Create a repeatable synthesis ritual.', ['Define review prompts', 'Define stale note cleanup', 'Define next-action extraction'], 21),
 challengeTask('Four weekly reviews', 'Practice maintaining the knowledge graph.', ['Run weekly review', 'Create one synthesis note'], ['Schedule review slot'], 28),
 ]),
 ],
 ),
 },
 {
 id: 'digital-declutter',
 emoji: '🧹',
 title: 'Digital Declutter',
 description: 'Clean files, inboxes, apps, and notification surfaces without making it a giant project.',
 durationDays: 45,
 priority: PriorityType.MEDIUM,
 tags: ['digital', 'declutter', 'systems'],
 blueprint: startedBlueprint(
 45,
 PriorityType.MEDIUM,
 consistencyRule('Declutter actions', 5),
 [numberMetric('Files cleared', 'files'), numberMetric('Inbox count', 'items')],
 [
 routineTask('Daily Digital Reset', 'One small cleanup pass each day.', ['Clear 10 files/messages', 'Unsubscribe/delete one thing', 'Empty temporary downloads']),
 routineTask('Notification Hygiene', 'Reduce future digital noise.', ['Disable one noisy notification', 'Close stale tabs']),
 ],
 [
 milestone('Inbox zero-ish', 'Reduce inbox stress to a manageable level.', 14, [
 projectTask('Email triage setup', 'Make email processing mechanical.', ['Create archive rule', 'Create action folder', 'Unsubscribe from 10 senders'], 7),
 challengeTask('Seven inbox passes', 'Chip away without binge-cleaning.', ['Process 20 inbox items', 'Archive/defer/delete'], ['Choose inbox timebox'], 7, [numberMetric('Inbox items processed', 'items')]),
 ], PriorityType.MEDIUM, StatusType.STARTED),
 milestone('File system reset', 'Make important files findable.', 35, [
 projectTask('Downloads and desktop cleanup', 'Clean the noisiest places first.', ['Sort downloads', 'Clear desktop', 'Create archive folder'], 14),
 projectTask('Cloud storage pass', 'Remove old clutter and define folders.', ['Audit top folders', 'Archive stale projects', 'Create current-work folder'], 30),
 ]),
 ],
 ),
 },
 {
 id: 'social-reconnection',
 emoji: '🤝',
 title: 'Social Reconnection',
 description: 'Rebuild social energy through tiny outreach, plans, and honest follow-through.',
 durationDays: 60,
 priority: PriorityType.MEDIUM,
 tags: ['social', 'life', 'relationships'],
 blueprint: startedBlueprint(
 60,
 PriorityType.MEDIUM,
 consistencyRule('Social touches', 3),
 [numberMetric('Messages sent', 'messages'), numberMetric('Meetups planned', 'plans')],
 [
 routineTask('Small Outreach', 'Keep connection lightweight and real.', ['Send one message', 'Reply to one pending person']),
 routineTask('Social Energy Check', 'Match plans to actual capacity.', ['Check energy level', 'Choose one low-friction connection']),
 ],
 [
 milestone('Reconnect with warm contacts', 'Start with people where the bridge already exists.', 21, [
 projectTask('Create contact map', 'Make the network visible without being transactional.', ['List 20 warm contacts', 'Tag by context', 'Pick first five'], 7),
 challengeTask('Five reach-outs', 'Practice low-pressure connection.', ['Send genuine message', 'Log response/follow-up'], ['Write two message templates'], 14, [numberMetric('Reach-outs', 'messages')]),
 ], PriorityType.MEDIUM, StatusType.STARTED),
 milestone('Plan easy meetups', 'Turn messages into actual time together.', 45, [
 projectTask('Design low-friction plans', 'Make invitations easy to say yes to.', ['Pick 3 coffee/walk options', 'Pick remote call option', 'Choose default times'], 21),
 challengeTask('Two plans scheduled', 'Move from intention to calendar.', ['Suggest one plan', 'Confirm details'], ['Choose first invitee'], 21),
 ]),
 ],
 ),
 },
 {
 id: 'writing-habit',
 emoji: '✍️',
 title: 'Writing Habit',
 description: 'Build a sustainable writing loop from raw notes to published pieces.',
 durationDays: 90,
 priority: PriorityType.MEDIUM,
 tags: ['writing', 'creative', 'daily'],
 blueprint: startedBlueprint(
 90,
 PriorityType.MEDIUM,
 metricTargetRule('Words published', 0, 12000, 'increase'),
 [numberMetric('Words written', 'words'), numberMetric('Words published', 'words')],
 [
 routineTask('Daily Drafting', 'Write small raw material before editing.', ['Write 200 words', 'Capture one idea', 'Mark next paragraph']),
 routineTask('Editing Loop', 'Turn drafts into something useful.', ['Edit one paragraph', 'Cut one weak sentence']),
 ],
 [
 milestone('Build idea pipeline', 'Stop relying on blank-page inspiration.', 14, [
 projectTask('Create idea bank', 'Make raw material easy to find.', ['List 30 topics', 'Tag by theme', 'Pick top five'], 7),
 challengeTask('10 writing reps', 'Build proof that starting is possible.', ['Write 200 words', 'Save draft note'], ['Create draft template'], 10, [numberMetric('Draft reps', 'reps')]),
 ], PriorityType.MEDIUM, StatusType.STARTED),
 milestone('Publish first pieces', 'Ship small finished writing.', 45, [
 projectTask('Choose publishing format', 'Decide where writing goes.', ['Pick platform', 'Define post length', 'Create publishing checklist'], 21),
 challengeTask('Publish two short pieces', 'Close the loop from draft to public.', ['Edit draft', 'Publish/share piece'], ['Choose first draft'], 30),
 ]),
 ],
 ),
 },
];
