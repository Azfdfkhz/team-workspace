export type TaskStatus = 'not_started'|'todo'|'in_progress'|'in_review'|'revision'|'completed'|'cancelled';
export type Role = 'leader'|'management'|'member';

export const TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  not_started: ['todo', 'in_progress', 'cancelled'],
  todo: ['in_progress', 'cancelled'],
  in_progress: ['in_review', 'todo', 'cancelled'],
  in_review: ['completed', 'revision'],
  revision: ['in_review', 'in_progress', 'cancelled'],
  completed: ['in_progress'],
  cancelled: [],
};
const REVIEW_DRIVEN: TaskStatus[] = ['in_review', 'revision', 'completed'];

/** Mirrors change_task_status() in SQL. null = allowed, otherwise a user-facing reason (PRD §6.5). */
export function whyTransitionBlocked(from: TaskStatus, to: TaskStatus, role: Role, isAssignee: boolean): string | null {
  if (REVIEW_DRIVEN.includes(to)) return 'Gunakan "Submit for review" atau keputusan review.';
  if (role === 'member' && !(isAssignee && to === 'in_progress')) return 'Member hanya dapat memulai tugas yang ditugaskan kepadanya.';
  if (!TRANSITIONS[from].includes(to)) return `Status ${from} tidak dapat langsung menjadi ${to}.`;
  return null;
}
