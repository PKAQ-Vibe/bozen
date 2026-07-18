import { useCallback, useSyncExternalStore } from 'react';
import { getDayTasks, updateTask } from '@/services';
import type { TaskInstance } from '@/models';
import { todayKey } from '@/utils/date';

const listeners = new Set<() => void>();
let cache: Record<string, TaskInstance[]> = {};

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function emit() {
  cache = {};
  listeners.forEach((l) => l());
}

function snapshotFor(date: string): TaskInstance[] {
  if (!cache[date]) cache[date] = getDayTasks(date);
  return cache[date];
}

export function useDayTasks(date: string = todayKey()) {
  const get = useCallback(() => snapshotFor(date), [date]);
  const tasks = useSyncExternalStore(subscribe, get, get);

  return {
    tasks,
    save(task: TaskInstance) {
      updateTask(date, task);
      emit();
    },
    refresh() {
      emit();
    },
  };
}

export function notifyDayTasksChanged() {
  emit();
}
