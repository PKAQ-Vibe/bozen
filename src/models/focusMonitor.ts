export interface FocusLeaveEvent {
  id: string;
  taskId: string;
  taskTitle: string;
  date: string;
  leftAt: number;
  returnedAt?: number;
  durationSeconds?: number;
  reason: 'background' | 'heartbeat-gap';
}
