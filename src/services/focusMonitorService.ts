import type { FocusLeaveEvent } from '@/models/focusMonitor';
import { getActiveProfileId } from './profileService';
import { storage } from './storage';

const key = () => `p.${getActiveProfileId()}.focus.leaveEvents`;

export function getFocusLeaveEvents(): FocusLeaveEvent[] {
  return storage.get<FocusLeaveEvent[]>(key(), []);
}

export function recordFocusLeave(event: FocusLeaveEvent): void {
  storage.set(key(), [event, ...getFocusLeaveEvents()].slice(0, 200));
}

export function recordFocusReturn(id: string, returnedAt: number): void {
  storage.set(key(), getFocusLeaveEvents().map((event) => event.id === id ? {
    ...event,
    returnedAt,
    durationSeconds: Math.max(1, Math.round((returnedAt - event.leftAt) / 1000)),
  } : event));
}
