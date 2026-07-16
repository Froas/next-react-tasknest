export {
 JOURNEY_VIEWBOX as MOUNTAIN_VIEWBOX,
 calculateJourneyEffort,
 generateJourneyMap,
 hashJourneySeed,
 locateJourneyDisplayProgress,
 locateJourneyProgress,
 pointAtJourneyProgress,
 sampleJourneyRoute,
 selectJourneyIndices,
 smoothJourneyRoute,
} from './journeyMap';

export type {
 JourneyCheckpoint as JourneyPoint,
 JourneyMapData as MountainMapData,
 JourneyProgressLocation,
 JourneyRouteSegment,
 JourneyTaskStep as JourneyStep,
} from './journeyMap';

import { generateJourneyMap } from './journeyMap';
import { JOURNEY_THEMES } from './journeyThemes';
import { GoalItem } from './types';

export const generateMountainMap = (goal: GoalItem) => generateJourneyMap(goal, JOURNEY_THEMES.mountain);
