import type {
  IDate,
  IStatusAndPriority,
  ITitleAndDescription,
} from './index'
import type { Prettify } from './utility'

interface ISubtask extends IDate, IStatusAndPriority, ITitleAndDescription {
  taskId: string
}

interface ISubtaskUpdate extends Partial<ISubtask> {
  id: string
}

export type Subtask = Prettify<ISubtask>
export type SubtaskUpdate = Prettify<ISubtaskUpdate>
