import type {
  IDate,
  IStatusAndPriority,
  ITitleAndDescription,
} from './index'
import type { Prettify } from './utility'

interface IEvent extends IDate, IStatusAndPriority, ITitleAndDescription {
  eventType: string
  location: string
  recurrenceRule: string
}

interface IEventUpdate extends Partial<IEvent> {
  id: string
}

export type Event = Prettify<IEvent>
export type EventUpdate = Prettify<IEventUpdate>
