import type {
  IDate,
  IStatusAndPriority,
} from './index'
import type { Prettify } from './utility'

interface IMilestone extends IDate, IStatusAndPriority {
  title: string
  description: string
  dueDate: Date
  position: number
  goalId: string
}

interface IMilestoneUpdate extends Partial<IMilestone> {
  id: string
}

export type Milestone = Prettify<IMilestone>
export type MilestoneUpdate = Prettify<IMilestoneUpdate>
