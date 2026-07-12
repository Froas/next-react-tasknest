export const TODAY_DATA_CHANGED_EVENT = 'tasknest:today-data-changed';

export const notifyTodayDataChanged = () => {
 if (typeof window !== 'undefined') window.dispatchEvent(new Event(TODAY_DATA_CHANGED_EVENT));
};
