import { JourneyCheckpoint } from './journeyMap';
import { JourneyThemeId } from './types';

export type JourneyRewardKind = 'summit-token' | 'leaf-token' | 'star-token' | 'ember-token' | 'pearl-token' | 'crown-token';

export interface JourneyReward {
  id: string;
  checkpointId: string;
  title: string;
  kind: JourneyRewardKind;
  x: number;
  y: number;
}

const rewardKind = (themeId: JourneyThemeId): JourneyRewardKind => {
  if (themeId === 'world-tree') return 'leaf-token';
  if (themeId === 'cosmic') return 'star-token';
  if (themeId === 'volcano') return 'ember-token';
  if (themeId === 'ocean') return 'pearl-token';
  if (themeId === 'castle') return 'crown-token';
  return 'summit-token';
};

export const buildJourneyRewards = (
  checkpoints: JourneyCheckpoint[],
  themeId: JourneyThemeId,
): JourneyReward[] => checkpoints
  .filter((checkpoint) => checkpoint.kind === 'milestone' && checkpoint.completed)
  .map((checkpoint, index) => ({
    id: `reward:${checkpoint.id}`,
    checkpointId: checkpoint.id,
    title: `${checkpoint.title} completed`,
    kind: rewardKind(themeId),
    x: checkpoint.x + (index % 2 === 0 ? -25 : 25),
    y: checkpoint.y - 27,
  }));
