import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEngine, HauntkitError } from '../packages/core/engine.mjs';
import { ghostInnWorld } from '../apps/ghost-inn/world.mjs';
import { lostLettersWorld } from '../apps/lost-letters/world.mjs';

// A tiny counter world used to exercise engine mechanics in isolation, without
// depending on any real world's rules.
const counterWorld = {
  id: 'counter',
  initialState: () => ({ count: 0, items: [] }),
  validateState: (s) =>
    !!s &&
    typeof s === 'object' &&
    !Array.isArray(s) &&
    typeof s.count === 'number' &&
    Array.isArray(s.items),
  observe: (s) => ({ count: s.count, items: [...s.items] }),
  actions: {
    increment(draft, input) {
      draft.count += typeof input.by === 'number' ? input.by : 1;
      return { events: [`count is now ${draft.count}`] };
    },
    addItem(draft, input) {
      draft.items.push(input.item);
      return { events: ['added'] };
    },
    // Deliberately produces an invalid state so the engine must roll back.
    breakState(draft) {
      delete draft.count;
      return { events: ['broken'] };
    },
    withArtifact() {
      return { events: ['done'], artifact: { name: 'note.txt', mime: 'text/plain', text: 'hello' } };
    },
    throwPlain() {
      throw new Error('boom');
    },
    throwHauntkit() {
      throw new HauntkitError('BAD_INPUT', 'nope');
    },
    // Tries to mutate the input object it receives; the engine hands it a clone.
    mutateInput(draft, input) {
      draft.count += input.by;
      input.by = 999;
      return { events: [] };
    },
  },
};

function makeEngine() {
  return createEngine({ worlds: [counterWorld, ghostInnWorld, lostLettersWorld] });
}

function assertThrowsCode(fn, code) {
  assert.throws(fn, (err) => err instanceof HauntkitError && (!code || err.code === code));
}

test('createSession returns a public view with version 0', () => {
  const engine = makeEngine();
  const v = engine.createSession('counter');
  assert.strictEqual(v.worldId, 'counter');
  assert.strictEqual(v.version, 0);
  assert.strictEqual(v.count, 0);
  assert.deepStrictEqual(v.items, []);
  assert.ok(typeof v.sessionId === 'string' && v.sessionId.length > 0);
});

test('createSession accepts a custom id', () => {
  const engine = makeEngine();
  const v = engine.createSession('counter', { id: 'fixed-id' });
  assert.strictEqual(v.sessionId, 'fixed-id');
});

test('createSession with a colliding custom id conflicts', () => {
  const engine = makeEngine();
  engine.createSession('counter', { id: 'dup' });
  assertThrowsCode(() => engine.createSession('counter', { id: 'dup' }), 'CONFLICT');
});

test('createSession unknown world is BAD_WORLD', () => {
  const engine = makeEngine();
  assertThrowsCode(() => engine.createSession('nope'), 'BAD_WORLD');
});

test('two sessions are independent and get distinct ids', () => {
  const engine = makeEngine();
  const a = engine.createSession('counter');
  const b = engine.createSession('counter');
  assert.notStrictEqual(a.sessionId, b.sessionId);
  engine.dispatch(a.sessionId, { action: 'increment', input: { by: 5 }, expectedVersion: 0 });
  assert.strictEqual(engine.observe(b.sessionId).count, 0);
});

test('observe returns a clone that cannot mutate the session', () => {
  const engine = makeEngine();
  const id = engine.createSession('counter').sessionId;
  engine.dispatch(id, { action: 'addItem', input: { item: 'x' }, expectedVersion: 0 });
  const view = engine.observe(id);
  view.items.push('y');
  view.count = 999;
  assert.deepStrictEqual(engine.observe(id).items, ['x']);
  assert.strictEqual(engine.observe(id).count, 0);
});

test('observe unknown session is NOT_FOUND', () => {
  const engine = makeEngine();
  assertThrowsCode(() => engine.observe('ghost'), 'NOT_FOUND');
});

test('dispatch commits and increments the version', () => {
  const engine = makeEngine();
  const id = engine.createSession('counter').sessionId;
  const r = engine.dispatch(id, { action: 'increment', input: { by: 3 }, expectedVersion: 0 });
  assert.strictEqual(r.view.version, 1);
  assert.strictEqual(r.view.count, 3);
  assert.deepStrictEqual(r.events, ['count is now 3']);
});

test('dispatch missing expectedVersion is BAD_INPUT', () => {
  const engine = makeEngine();
  const id = engine.createSession('counter').sessionId;
  assertThrowsCode(() => engine.dispatch(id, { action: 'increment' }), 'BAD_INPUT');
});

test('dispatch non-integer expectedVersion is BAD_INPUT', () => {
  const engine = makeEngine();
  const id = engine.createSession('counter').sessionId;
  assertThrowsCode(
    () => engine.dispatch(id, { action: 'increment', input: {}, expectedVersion: 1.5 }),
    'BAD_INPUT',
  );
});

test('dispatch negative expectedVersion is BAD_INPUT', () => {
  const engine = makeEngine();
  const id = engine.createSession('counter').sessionId;
  assertThrowsCode(
    () => engine.dispatch(id, { action: 'increment', input: {}, expectedVersion: -1 }),
    'BAD_INPUT',
  );
});

test('dispatch stale version is CONFLICT and leaves state untouched', () => {
  const engine = makeEngine();
  const id = engine.createSession('counter').sessionId;
  engine.dispatch(id, { action: 'increment', input: { by: 2 }, expectedVersion: 0 });
  assertThrowsCode(
    () => engine.dispatch(id, { action: 'increment', input: { by: 2 }, expectedVersion: 0 }),
    'CONFLICT',
  );
  assert.strictEqual(engine.observe(id).version, 1);
  assert.strictEqual(engine.observe(id).count, 2);
});

test('dispatch unknown action is BAD_ACTION', () => {
  const engine = makeEngine();
  const id = engine.createSession('counter').sessionId;
  assertThrowsCode(
    () => engine.dispatch(id, { action: 'frobnicate', input: {}, expectedVersion: 0 }),
    'BAD_ACTION',
  );
});

test('dispatch does not mutate the caller input object', () => {
  const engine = makeEngine();
  const id = engine.createSession('counter').sessionId;
  const input = { by: 5 };
  engine.dispatch(id, { action: 'mutateInput', input, expectedVersion: 0 });
  assert.strictEqual(input.by, 5);
  assert.strictEqual(engine.observe(id).count, 5);
});

test('dispatch rolls back when the action produces invalid state', () => {
  const engine = makeEngine();
  const id = engine.createSession('counter').sessionId;
  engine.dispatch(id, { action: 'increment', input: { by: 4 }, expectedVersion: 0 });
  assertThrowsCode(
    () => engine.dispatch(id, { action: 'breakState', input: {}, expectedVersion: 1 }),
    'BAD_INPUT',
  );
  // State and version are untouched after the rollback.
  assert.strictEqual(engine.observe(id).version, 1);
  assert.strictEqual(engine.observe(id).count, 4);
});

test('dispatch wraps a plain Error thrown by an action as BAD_INPUT', () => {
  const engine = makeEngine();
  const id = engine.createSession('counter').sessionId;
  let err;
  try {
    engine.dispatch(id, { action: 'throwPlain', input: {}, expectedVersion: 0 });
  } catch (e) {
    err = e;
  }
  assert.ok(err instanceof HauntkitError);
  assert.strictEqual(err.code, 'BAD_INPUT');
  assert.strictEqual(err.message, 'boom');
  assert.strictEqual(engine.observe(id).version, 0);
});

test('dispatch propagates a HauntkitError from an action unchanged', () => {
  const engine = makeEngine();
  const id = engine.createSession('counter').sessionId;
  let err;
  try {
    engine.dispatch(id, { action: 'throwHauntkit', input: {}, expectedVersion: 0 });
  } catch (e) {
    err = e;
  }
  assert.ok(err instanceof HauntkitError);
  assert.strictEqual(err.code, 'BAD_INPUT');
  assert.strictEqual(err.message, 'nope');
  assert.strictEqual(engine.observe(id).version, 0);
});

test('dispatch surfaces an artifact', () => {
  const engine = makeEngine();
  const id = engine.createSession('counter').sessionId;
  const r = engine.dispatch(id, { action: 'withArtifact', input: {}, expectedVersion: 0 });
  assert.deepStrictEqual(r.artifact, { name: 'note.txt', mime: 'text/plain', text: 'hello' });
});

test('snapshot is a deep clone with schemaVersion 1', () => {
  const engine = makeEngine();
  const id = engine.createSession('counter').sessionId;
  engine.dispatch(id, { action: 'increment', input: { by: 7 }, expectedVersion: 0 });
  const snap = engine.snapshot(id);
  assert.strictEqual(snap.schemaVersion, 1);
  assert.strictEqual(snap.id, id);
  assert.strictEqual(snap.worldId, 'counter');
  assert.strictEqual(snap.version, 1);
  assert.strictEqual(snap.state.count, 7);
  // Mutating the snapshot must not affect the live session.
  snap.state.count = -1;
  assert.strictEqual(engine.observe(id).count, 7);
});

test('snapshot unknown session is NOT_FOUND', () => {
  const engine = makeEngine();
  assertThrowsCode(() => engine.snapshot('ghost'), 'NOT_FOUND');
});

test('restore validates the envelope', () => {
  const engine = makeEngine();
  assertThrowsCode(() => engine.restore(null), 'BAD_SAVE');
  assertThrowsCode(() => engine.restore({}), 'BAD_SAVE');
  assertThrowsCode(
    () => engine.restore({ schemaVersion: 2, id: 'x', worldId: 'counter', version: 0, state: {} }),
    'BAD_SAVE',
  );
  assertThrowsCode(
    () => engine.restore({ schemaVersion: 1, id: '', worldId: 'counter', version: 0, state: {} }),
    'BAD_SAVE',
  );
  assertThrowsCode(
    () =>
      engine.restore({ schemaVersion: 1, id: 'x', worldId: 'counter', version: -1, state: {} }),
    'BAD_SAVE',
  );
  assertThrowsCode(
    () => engine.restore({ schemaVersion: 1, id: 'x', worldId: 'counter', version: 0, state: null }),
    'BAD_SAVE',
  );
});

test('restore unknown world is BAD_WORLD', () => {
  const engine = makeEngine();
  assertThrowsCode(
    () =>
      engine.restore({
        schemaVersion: 1,
        id: 'x',
        worldId: 'nope',
        version: 0,
        state: {},
      }),
    'BAD_WORLD',
  );
});

test('restore invalid world state is BAD_SAVE', () => {
  const engine = makeEngine();
  assertThrowsCode(
    () =>
      engine.restore({
        schemaVersion: 1,
        id: 'x',
        worldId: 'counter',
        version: 0,
        state: { count: 'oops', items: [] },
      }),
    'BAD_SAVE',
  );
});

test('restore refuses an existing id with CONFLICT', () => {
  const engine = makeEngine();
  const id = engine.createSession('counter').sessionId;
  const snap = engine.snapshot(id);
  assertThrowsCode(() => engine.restore(snap), 'CONFLICT');
});

test('restore with a fresh id returns the public view and keeps the version', () => {
  const engine = makeEngine();
  const id = engine.createSession('counter').sessionId;
  engine.dispatch(id, { action: 'increment', input: { by: 9 }, expectedVersion: 0 });
  const snap = engine.snapshot(id);
  const restored = engine.restore({ ...snap, id: 'imported' });
  assert.strictEqual(restored.sessionId, 'imported');
  assert.strictEqual(restored.version, 1);
  assert.strictEqual(restored.count, 9);
  assert.strictEqual(engine.observe('imported').count, 9);
});

test('restore stores a clone, not the snapshot reference', () => {
  const engine = makeEngine();
  const id = engine.createSession('counter').sessionId;
  engine.dispatch(id, { action: 'increment', input: { by: 2 }, expectedVersion: 0 });
  const snap = engine.snapshot(id);
  const restored = engine.restore({ ...snap, id: 'clone-test' });
  snap.state.count = 12345;
  assert.strictEqual(restored.count, 2);
  assert.strictEqual(engine.observe('clone-test').count, 2);
});

test('restore a real Ghost Inn snapshot and continue play', () => {
  const engine = makeEngine();
  const id = engine.createSession('ghost-inn').sessionId;
  engine.dispatch(id, { action: 'inspect', input: { target: 'bell' }, expectedVersion: 0 });
  const snap = engine.snapshot(id);
  const restored = engine.restore({ ...snap, id: 'ghost-import' });
  assert.strictEqual(restored.version, 1);
  assert.ok(restored.inventory.some((i) => i.id === 'brass-key'));
  // The restored session can accept the next action at the restored version.
  engine.dispatch('ghost-import', {
    action: 'move',
    input: { room: 'library' },
    expectedVersion: 1,
  });
  assert.strictEqual(engine.observe('ghost-import').room.id, 'library');
});

test('restore a Lost Letters snapshot round-trips through strict validation', () => {
  const engine = makeEngine();
  const id = engine.createSession('lost-letters').sessionId;
  engine.dispatch(id, {
    action: 'set_brief',
    input: { recipient: 'Eve', memory: 'the long winter', wish: 'warmth', promise: 'to write' },
    expectedVersion: 0,
  });
  engine.dispatch(id, { action: 'compose', input: { tone: 'warm' }, expectedVersion: 1 });
  const snap = engine.snapshot(id);
  const restored = engine.restore({ ...snap, id: 'letter-import' });
  assert.strictEqual(restored.version, 2);
  assert.strictEqual(restored.brief.recipient, 'Eve');
  assert.ok(restored.draft.includes('Dear Eve,'));
  // A snapshot with an unknown state field is rejected.
  const bad = { ...snap, id: 'bad-import', state: { ...snap.state, bogus: true } };
  assertThrowsCode(() => engine.restore(bad), 'BAD_SAVE');
});
