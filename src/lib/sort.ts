import { PriorityType, StatusType } from './types';

// User-facing statuses for forms and filters. The full StatusType enum has
// 7 values (including started/closed/aborted) which only confuse users —
// keep only the meaningful 4.
export const USER_FACING_STATUSES: StatusType[] = [
 StatusType.OUTSTANDING,
 StatusType.IN_PROGRESS,
 StatusType.FINISHED,
 StatusType.CANCELLED,
];

export const STATUS_LABELS: Record<StatusType, string> = {
 [StatusType.OUTSTANDING]: 'Outstanding',
 [StatusType.STARTED]: 'Started',
 [StatusType.IN_PROGRESS]: 'In Progress',
 [StatusType.FINISHED]: 'Finished',
 [StatusType.CLOSED]: 'Closed',
 [StatusType.ABORTED]: 'Aborted',
 [StatusType.CANCELLED]: 'Cancelled',
};

const PRIORITY_WEIGHT: Record<string, number> = {
 [PriorityType.LOW]: 0,
 [PriorityType.MEDIUM]: 1,
 [PriorityType.HIGH]: 2,
};

// Numeric weight for a priority value. Unknown / missing values sort below LOW
// so they end up at the bottom of "highest first" lists.
export const priorityWeight = (priority?: string): number => {
 if (!priority) return -1;
 const weight = PRIORITY_WEIGHT[priority];
 return weight ?? -1;
};
