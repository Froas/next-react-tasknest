import { describe, expect, it } from 'vitest';
import { JourneyCheckpoint } from './journeyMap';
import { buildJourneyRewards } from './journeyRewards';

const checkpoints: JourneyCheckpoint[] = [
  { id: 'start', title: 'Start', kind: 'start', x: 10, y: 90, routeRatio: 0, completed: true, taskCount: 0, completedTaskCount: 0, effort: 0 },
  { id: 'done', title: 'Done camp', kind: 'milestone', x: 40, y: 60, routeRatio: 0.4, completed: true, taskCount: 2, completedTaskCount: 2, effort: 2 },
  { id: 'open', title: 'Open camp', kind: 'milestone', x: 70, y: 40, routeRatio: 0.7, completed: false, taskCount: 2, completedTaskCount: 0, effort: 2 },
  { id: 'goal', title: 'Goal', kind: 'goal', x: 90, y: 10, routeRatio: 1, completed: false, taskCount: 0, completedTaskCount: 0, effort: 1 },
];

describe('journey rewards', () => {
  it('creates rewards only for completed milestones', () => {
    expect(buildJourneyRewards(checkpoints, 'mountain')).toEqual([expect.objectContaining({ checkpointId: 'done', kind: 'summit-token' })]);
  });

  it('changes only reward presentation between themes', () => {
    const mountain = buildJourneyRewards(checkpoints, 'mountain')[0];
    const ocean = buildJourneyRewards(checkpoints, 'ocean')[0];
    expect(ocean.checkpointId).toBe(mountain.checkpointId);
    expect(ocean.kind).toBe('pearl-token');
  });
});
