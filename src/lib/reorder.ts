export type DropPlacement = 'before' | 'after';

export const moveIdRelative = (
 orderedIds: string[],
 movingId: string | null | undefined,
 targetId: string | null | undefined,
 placement: DropPlacement = 'before'
): string[] => {
 if (!movingId || !targetId || movingId === targetId) return orderedIds;
 if (!orderedIds.includes(movingId) || !orderedIds.includes(targetId)) return orderedIds;
 const withoutMoving = orderedIds.filter((id) => id !== movingId);
 const targetIndex = withoutMoving.indexOf(targetId);
 if (targetIndex < 0) return orderedIds;
 const insertIndex = placement === 'after' ? targetIndex + 1 : targetIndex;
 return [
 ...withoutMoving.slice(0, insertIndex),
 movingId,
 ...withoutMoving.slice(insertIndex),
 ];
};
