import { MilestoneItem, StatusType } from '@/lib/types';

export const isMilestoneEffectivelyFinished = (milestone: MilestoneItem): boolean =>
 milestone.status === StatusType.FINISHED || milestone.status === StatusType.CLOSED;

export const isMilestoneLocked = (
 milestones: MilestoneItem[],
 index: number,
 enforceSequential: boolean,
): boolean => {
 if (!enforceSequential) return false;
 const milestone = milestones[index];
 if (!milestone || isMilestoneEffectivelyFinished(milestone)) return false;
 return !milestones.slice(0, index).every(isMilestoneEffectivelyFinished);
};
