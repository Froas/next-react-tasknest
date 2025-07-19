import type {
  IDate,
  IStatusAndPriority,
  ITitleAndDescription,
} from './index'
import type { Prettify } from './utility'

interface IGoal extends IDate, ITitleAndDescription {}

interface IGoalCreate extends IGoal, IStatusAndPriority {}

interface IGoalUpdate extends Partial<IGoalCreate> { id: string }

export type Goal = Prettify<IGoal>
export type GoalCreate = Prettify<IGoalCreate>
export type GoalUpdate = Prettify<IGoalUpdate>
