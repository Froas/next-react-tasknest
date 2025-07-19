export type Status = 'outstanding' | 'in-progress' | 'finished' | 'cancelled' | 'closed' | 'aborted' | 'started'
export type Priority = 'low' | 'medium' | 'high'

export interface IStatusAndPriority {
  status: Status
  priority: Priority
}

export interface ITitleAndDescription {
  title: string
  description: string
}

export interface IDate {
  endDatetime: Date
  startDatetime: Date
}
