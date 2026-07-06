import { GoalItem as Goal, MilestoneItem as Milestone, StatusType } from './types';

// Progress for a single milestone, expressed as 0-100. Counts the milestone's
// tasks plus their subtasks and todos as equal-weight units. A milestone with
// no tasks falls back to its own status (FINISHED → 100, otherwise 0).
export const calculateMilestoneProgress = (milestone: Milestone): number => {
 const tasks = milestone.tasks || [];
 if (tasks.length === 0) {
 return milestone.status === StatusType.FINISHED ? 100 : 0;
 }

 let totalItems = 0;
 let completedItems = 0;

 tasks.forEach((task) => {
 totalItems += 1;
 if (task.status === StatusType.FINISHED) completedItems += 1;

 if (task.subtasks) {
 totalItems += task.subtasks.length;
 completedItems += task.subtasks.filter((s) => s.status === StatusType.FINISHED).length;
 }

 if (task.todos) {
 totalItems += task.todos.length;
 completedItems += task.todos.filter((t) => t.status === StatusType.FINISHED).length;
 }
 });

 if (totalItems === 0) return 100;
 return (completedItems / totalItems) * 100;
};

// Goal progress is the average of its milestone progresses (0-100).
export const calculateGoalProgress = (goal: Goal): number => {
 const milestones = goal.milestones || [];
 if (milestones.length === 0) return 0;
 const total = milestones.reduce((acc, m) => acc + calculateMilestoneProgress(m), 0);
 return total / milestones.length;
};
