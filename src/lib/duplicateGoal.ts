import { GoalItem as Goal, MilestoneItem as Milestone, TaskItem as Task, TodoItem as Todo, SubtaskItem as Subtask, StatusType } from './types';
import { goalsApi, milestonesApi, tasksApi, todosApi, subtasksApi } from './api';

interface DuplicationResult {
 goal: Goal;
 milestoneCount: number;
 taskCount: number;
 childCount: number;
}

// Walk a Goal tree and re-create the entire structure under a new Goal.
// Sequential API calls because milestones need their parent goal_id, tasks
// need their milestone_id, etc. Returns the materialised root for store
// integration.
export const duplicateGoal = async (source: Goal): Promise<DuplicationResult> => {
 const newGoal = await goalsApi.create({
 title: `${source.title} (copy)`,
 description: source.description,
 status: StatusType.OUTSTANDING,
 priority: source.priority,
 start_datetime: new Date().toISOString(),
 end_datetime: source.end_datetime ?? new Date(Date.now() + 30 * 86_400_000).toISOString(),
 });

 const newMilestones: Milestone[] = [];
 let taskCount = 0;
 let childCount = 0;

 for (let i = 0; i < (source.milestones ?? []).length; i++) {
 const sm = source.milestones![i];
 const m = await milestonesApi.create({
 title: sm.title,
 description: sm.description,
 status: StatusType.OUTSTANDING,
 priority: sm.priority,
 goal_id: newGoal.id,
 position: i + 1,
 due_date: sm.due_date,
 end_datetime: sm.end_datetime,
 });

 const newTasks: Task[] = [];
 for (const st of sm.tasks ?? []) {
 try {
 const t = await tasksApi.create({
 title: st.title,
 description: st.description,
 status: StatusType.OUTSTANDING,
 priority: st.priority,
 milestone_id: m.id,
 due_date: st.due_date,
 start_datetime: st.start_datetime,
 end_datetime: st.end_datetime,
 todos: [],
 subtasks: [],
 });
 taskCount += 1;

 // Subtasks (typed as TaskItem[] in schema; we only need the basic fields).
 const sourceSubtasks = (st.subtasks ?? []) as unknown as Array<{
 title: string;
 description: string;
 priority: typeof st.priority;
 due_date?: string;
 start_datetime?: string;
 end_datetime?: string;
 }>;
 for (const ss of sourceSubtasks) {
 try {
 await subtasksApi.create({
 title: ss.title,
 description: ss.description,
 status: StatusType.OUTSTANDING,
 priority: ss.priority,
 task_id: t.id,
 due_date: ss.due_date,
 start_datetime: ss.start_datetime,
 end_datetime: ss.end_datetime,
 created_at: new Date().toISOString(),
 updated_at: new Date().toISOString(),
 } as Omit<Subtask, 'id'>);
 childCount += 1;
 } catch (err) {
 console.error('Failed to duplicate subtask:', err);
 }
 }

 // Todos under this task.
 for (const tt of st.todos ?? []) {
 try {
 await todosApi.create({
 title: tt.title,
 description: tt.description,
 status: StatusType.OUTSTANDING,
 priority: tt.priority,
 task_id: t.id,
 due_date: tt.due_date,
 start_datetime: tt.start_datetime,
 end_datetime: tt.end_datetime,
 repeat_interval: tt.repeat_interval,
 next_due_date: tt.next_due_date,
 } as Omit<Todo, 'id'>);
 childCount += 1;
 } catch (err) {
 console.error('Failed to duplicate todo:', err);
 }
 }
 newTasks.push(t);
 } catch (err) {
 console.error('Failed to duplicate task:', err);
 }
 }

 newMilestones.push({ ...m, tasks: newTasks });
 }

 return {
 goal: { ...newGoal, milestones: newMilestones },
 milestoneCount: newMilestones.length,
 taskCount,
 childCount,
 };
};
