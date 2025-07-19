import type { Prettify } from './utility'

interface ITag {
  name: string
  color: string
  goalId?: string
  taskId?: string
  milestoneId?: string
  todoId?: string
  subtaskId?: string
  eventId?: string
}

interface ITagUpdate extends Partial<Pick<ITag, 'name' | 'color'>> {
  id: string
}

export type Tag = Prettify<ITag>
export type TagUpdate = Prettify<ITagUpdate>
