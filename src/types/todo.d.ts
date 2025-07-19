import type {
  IDate,
  IStatusAndPriority,
  ITitleAndDescription,
} from './index'
import type { Prettify } from './utility'

interface ITodo extends IDate, IStatusAndPriority, ITitleAndDescription {
  dueDate: Date
  taskId: string
  repeatInterval: string
  nextDueDate: Date
}

interface ITodoUpdate extends Partial<ITodo> {
  id: string
}

export type Todo = Prettify<ITodo>
export type TodoUpdate = Prettify<ITodoUpdate>
