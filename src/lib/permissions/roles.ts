import type { Role } from './task-status';
export type Action = 'task.create'|'task.assign'|'task.review'|'user.invite'|'user.changeRole'|'integration.configure'|'workspace.delete';
const MATRIX: Record<Action, Role[]> = {   // PRD §3.4
  'task.create': ['leader','management'], 'task.assign': ['leader','management'], 'task.review': ['leader','management'],
  'user.invite': ['leader'], 'user.changeRole': ['leader'], 'integration.configure': ['leader'], 'workspace.delete': ['leader'],
};
export const can = (role: Role, a: Action) => MATRIX[a].includes(role);
