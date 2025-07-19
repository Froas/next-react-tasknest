import type {
  IDate,
  IStatusAndPriority,
  ITitleAndDescription,
} from './index'
import type { Prettify } from './utility'

interface ITask extends IDate, IStatusAndPriority, ITitleAndDescription {
  dueDate: Date
  milestoneId: string
}

interface ITaskUpdate extends Partial<ITask> {
  id: string
}

export type Task = Prettify<ITask>
export type TaskUpdate = Prettify<ITaskUpdate>
