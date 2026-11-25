import { describe, it, expect } from 'vitest';
import { whyTransitionBlocked as why } from '../../src/lib/permissions/task-status';
import { can } from '../../src/lib/permissions/roles';
describe('status', () => {
  it('member starts assigned work', () => expect(why('todo','in_progress','member',true)).toBeNull());
  it('member cannot start unassigned work', () => expect(why('todo','in_progress','member',false)).not.toBeNull());
  it('nobody jumps straight to completed', () => expect(why('in_progress','completed','management',false)).not.toBeNull());
  it('management can reopen', () => expect(why('completed','in_progress','management',false)).toBeNull());
  it('invalid jump blocked', () => expect(why('todo','revision','leader',false)).not.toBeNull());
});
describe('roles', () => {
  it('management cannot change roles', () => expect(can('management','user.changeRole')).toBe(false));
  it('member cannot create tasks', () => expect(can('member','task.create')).toBe(false));
});
