export type TodayScopeGroup = {
 key: string;
 goalId?: string;
};

export const pickDefaultTodayGoalId = (
 groups: TodayScopeGroup[],
 pinnedGoalIds: string[],
) => [...pinnedGoalIds]
 .reverse()
 .find((goalId) => groups.some((group) => group.goalId === goalId));

export const pickDefaultTodayScope = (
 groups: TodayScopeGroup[],
 pinnedGoalIds: string[],
 focusedCount: number,
) => {
 const pinnedGoalId = pickDefaultTodayGoalId(groups, pinnedGoalIds);
 const pinnedGroup = pinnedGoalId
 ? groups.find((group) => group.goalId === pinnedGoalId)
 : undefined;

 if (pinnedGroup) return pinnedGroup.key;
 if (focusedCount > 0) return 'focus';
 return groups.length > 0 ? 'all' : 'focus';
};
