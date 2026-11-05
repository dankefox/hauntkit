import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEngine, HauntkitError } from '../packages/core/engine.mjs';
import { ghostInnWorld } from '../apps/ghost-inn/world.mjs';
import { lostLettersWorld } from '../apps/lost-letters/world.mjs';

const ghostEngine = () => createEngine({ worlds: [ghostInnWorld] });
const lettersEngine = () => createEngine({ worlds: [lostLettersWorld] });

function assertThrowsCode(fn, code) {
  assert.throws(fn, (err) => err instanceof HauntkitError && (!code || err.code === code));
}

// --- Ghost Inn ---------------------------------------------------------------

test('ghost-inn initial observe hides all undiscovered answers', () => {
  const e = ghostEngine();
  const v = e.createSession('ghost-inn');
  const json = JSON.stringify(v);
  assert.ok(!json.includes('Evelyn'), 'initial observe must not reveal Evelyn');
  assert.ok(!json.includes('0813'), 'initial observe must not reveal the code');
  assert.ok(!json.includes('8:13'), 'initial observe must not reveal the clock time');
  assert.strictEqual(v.version, 0);
  assert.strictEqual(v.room.id, 'lobby');
  assert.deepStrictEqual(v.inventory, []);
  assert.deepStrictEqual(v.clues, []);
  assert.strictEqual(v.ending, null);
  assert.ok(v.actions.includes('move'));
  assert.ok(v.actions.includes('inspect'));
  assert.ok(v.actions.includes('talk'));
  assert.ok(!v.actions.includes('unlock'));
  assert.ok(!v.actions.includes('return_letter'));
});

// Plays the mystery up to the point where the player is back in the lobby
// holding the letter, ready to deliver it. Returns the session id (version 9).
function journeyToLobbyWithLetter(e) {
  const id = e.createSession('ghost-inn').sessionId;
  e.dispatch(id, { action: 'inspect', input: { target: 'bell' }, expectedVersion: 0 });
  e.dispatch(id, { action: 'inspect', input: { target: 'guestbook' }, expectedVersion: 1 });
  e.dispatch(id, { action: 'move', input: { room: 'library' }, expectedVersion: 2 });
  e.dispatch(id, { action: 'inspect', input: { target: 'portrait' }, expectedVersion: 3 });
  e.dispatch(id, { action: 'inspect', input: { target: 'clock' }, expectedVersion: 4 });
  e.dispatch(id, { action: 'move', input: { room: 'attic' }, expectedVersion: 5 });
  e.dispatch(id, { action: 'unlock', input: { code: '0813' }, expectedVersion: 6 });
  e.dispatch(id, { action: 'inspect', input: { target: 'trunk' }, expectedVersion: 7 });
  e.dispatch(id, { action: 'move', input: { room: 'lobby' }, expectedVersion: 8 });
  return id;
}

test('ghost-inn complete journey reaches the open ending', () => {
  const e = ghostEngine();
  const id = journeyToLobbyWithLetter(e);
  const r = e.dispatch(id, {
    action: 'return_letter',
    input: { recipientName: 'Evelyn Vale', choice: 'open' },
    expectedVersion: 9,
  });
  assert.strictEqual(r.view.ending.id, 'open-memory');
  assert.strictEqual(r.view.ending.title, 'Memory Returned');
  assert.ok(r.view.ending.text.includes('Evelyn'));
  // The letter is delivered and removed from inventory.
  assert.ok(!r.view.inventory.some((i) => i.id === 'letter'));
});

test('ghost-inn complete journey reaches the kept-secret ending', () => {
  const e = ghostEngine();
  const id = journeyToLobbyWithLetter(e);
  const r = e.dispatch(id, {
    action: 'return_letter',
    input: { recipientName: 'Evelyn Vale', choice: 'keep' },
    expectedVersion: 9,
  });
  assert.strictEqual(r.view.ending.id, 'kept-secret');
  assert.strictEqual(r.view.ending.title, 'A Kept Secret');
});

test('ghost-inn bell yields the brass key and guestbook yields a clue', () => {
  const e = ghostEngine();
  const id = e.createSession('ghost-inn').sessionId;
  const r = e.dispatch(id, { action: 'inspect', input: { target: 'bell' }, expectedVersion: 0 });
  assert.ok(r.view.inventory.some((i) => i.id === 'brass-key'));
  assert.ok(r.view.rooms.some((room) => room.id === 'attic' && room.locked === false));
  const r2 = e.dispatch(id, {
    action: 'inspect',
    input: { target: 'guestbook' },
    expectedVersion: 1,
  });
  assert.ok(r2.view.clues.some((c) => c.id === 'guestbook'));
  // The guestbook clue hints at E. Vale without revealing the full name.
  const clue = r2.view.clues.find((c) => c.id === 'guestbook');
  assert.ok(clue.text.includes('E. Vale'));
  assert.ok(!clue.text.includes('Evelyn'));
});

test('ghost-inn portrait and clock reveal Evelyn and 8:13', () => {
  const e = ghostEngine();
  const id = e.createSession('ghost-inn').sessionId;
  e.dispatch(id, { action: 'inspect', input: { target: 'bell' }, expectedVersion: 0 });
  e.dispatch(id, { action: 'move', input: { room: 'library' }, expectedVersion: 1 });
  const r = e.dispatch(id, { action: 'inspect', input: { target: 'portrait' }, expectedVersion: 2 });
  assert.ok(r.view.clues.some((c) => c.id === 'portrait-name' && c.text.includes('Evelyn')));
  const r2 = e.dispatch(id, { action: 'inspect', input: { target: 'clock' }, expectedVersion: 3 });
  assert.ok(r2.view.clues.some((c) => c.id === 'clock-time' && c.text.includes('8:13')));
});

test('ghost-inn denies moving to the attic without the key', () => {
  const e = ghostEngine();
  const id = e.createSession('ghost-inn').sessionId;
  assertThrowsCode(
    () => e.dispatch(id, { action: 'move', input: { room: 'attic' }, expectedVersion: 0 }),
    'BAD_INPUT',
  );
  // No state mutation: still in the lobby, version unchanged.
  assert.strictEqual(e.observe(id).room.id, 'lobby');
  assert.strictEqual(e.observe(id).version, 0);
});

test('ghost-inn closed trunk inspection never grants the letter', () => {
  const e = ghostEngine();
  const id = e.createSession('ghost-inn').sessionId;
  e.dispatch(id, { action: 'inspect', input: { target: 'bell' }, expectedVersion: 0 });
  e.dispatch(id, { action: 'move', input: { room: 'attic' }, expectedVersion: 1 });
  const r = e.dispatch(id, { action: 'inspect', input: { target: 'trunk' }, expectedVersion: 2 });
  // A closed trunk is examinable, but yields nothing.
  assert.ok(Array.isArray(r.events) && r.events.length > 0);
  assert.ok(!r.view.inventory.some((i) => i.id === 'letter'));
  assert.ok(!r.view.clues.some((c) => c.id === 'letter-found'));
  assert.strictEqual(r.view.ending, null);
});

test('ghost-inn wrong code does not mutate state', () => {
  const e = ghostEngine();
  const id = e.createSession('ghost-inn').sessionId;
  e.dispatch(id, { action: 'inspect', input: { target: 'bell' }, expectedVersion: 0 });
  e.dispatch(id, { action: 'move', input: { room: 'attic' }, expectedVersion: 1 });
  assertThrowsCode(
    () => e.dispatch(id, { action: 'unlock', input: { code: '1234' }, expectedVersion: 2 }),
    'BAD_INPUT',
  );
  const v = e.observe(id);
  assert.strictEqual(v.version, 2);
  assert.ok(!v.clues.some((c) => c.id === 'letter-found'));
  assert.ok(!v.inventory.some((i) => i.id === 'letter'));
});

test('ghost-inn correct code without the clock clue does not open the trunk', () => {
  const e = ghostEngine();
  const id = e.createSession('ghost-inn').sessionId;
  e.dispatch(id, { action: 'inspect', input: { target: 'bell' }, expectedVersion: 0 });
  e.dispatch(id, { action: 'move', input: { room: 'attic' }, expectedVersion: 1 });
  assertThrowsCode(
    () => e.dispatch(id, { action: 'unlock', input: { code: '0813' }, expectedVersion: 2 }),
    'BAD_INPUT',
  );
  const v = e.observe(id);
  assert.strictEqual(v.version, 2);
  // trunk still effectively locked: no letter available
  assert.ok(!v.inventory.some((i) => i.id === 'letter'));
});

test('ghost-inn remote talk fails (character not in the room)', () => {
  const e = ghostEngine();
  const id = e.createSession('ghost-inn').sessionId;
  e.dispatch(id, { action: 'inspect', input: { target: 'bell' }, expectedVersion: 0 });
  e.dispatch(id, { action: 'move', input: { room: 'library' }, expectedVersion: 1 });
  assertThrowsCode(
    () => e.dispatch(id, { action: 'talk', input: { character: 'maude', topic: 'inn' }, expectedVersion: 2 }),
    'BAD_INPUT',
  );
  assert.strictEqual(e.observe(id).version, 2);
});

test('ghost-inn remote unlock fails (not in the attic)', () => {
  const e = ghostEngine();
  const id = e.createSession('ghost-inn').sessionId;
  assertThrowsCode(
    () => e.dispatch(id, { action: 'unlock', input: { code: '0813' }, expectedVersion: 0 }),
    'BAD_INPUT',
  );
  assert.strictEqual(e.observe(id).version, 0);
});

test('ghost-inn unknown target fails', () => {
  const e = ghostEngine();
  const id = e.createSession('ghost-inn').sessionId;
  assertThrowsCode(
    () => e.dispatch(id, { action: 'inspect', input: { target: 'nonsense' }, expectedVersion: 0 }),
    'BAD_INPUT',
  );
  assert.strictEqual(e.observe(id).version, 0);
});

test('ghost-inn Rowan hints never reveal undiscovered answers', () => {
  const e = ghostEngine();
  const id = e.createSession('ghost-inn').sessionId;
  e.dispatch(id, { action: 'inspect', input: { target: 'bell' }, expectedVersion: 0 });
  e.dispatch(id, { action: 'move', input: { room: 'garden' }, expectedVersion: 1 });
  // Hint before the clock is discovered.
  const r = e.dispatch(id, {
    action: 'talk',
    input: { character: 'rowan', topic: 'hints' },
    expectedVersion: 2,
  });
  const earlyHint = r.events[0];
  assert.ok(!earlyHint.includes('8:13'));
  assert.ok(!earlyHint.includes('0813'));
  assert.ok(!earlyHint.includes('Evelyn'));
  // Hint after the clock is discovered but before the trunk opens.
  e.dispatch(id, { action: 'move', input: { room: 'lobby' }, expectedVersion: 3 });
  e.dispatch(id, { action: 'move', input: { room: 'library' }, expectedVersion: 4 });
  e.dispatch(id, { action: 'inspect', input: { target: 'clock' }, expectedVersion: 5 });
  e.dispatch(id, { action: 'move', input: { room: 'garden' }, expectedVersion: 6 });
  const r2 = e.dispatch(id, {
    action: 'talk',
    input: { character: 'rowan', topic: 'hints' },
    expectedVersion: 7,
  });
  assert.ok(!r2.events[0].includes('0813'));
  assert.ok(!r2.events[0].includes('8:13'));
});

test('ghost-inn return_letter without a letter fails', () => {
  const e = ghostEngine();
  const id = e.createSession('ghost-inn').sessionId;
  assertThrowsCode(
    () =>
      e.dispatch(id, {
        action: 'return_letter',
        input: { recipientName: 'Evelyn Vale', choice: 'open' },
        expectedVersion: 0,
      }),
    'BAD_INPUT',
  );
});

test('ghost-inn return_letter with a wrong name fails', () => {
  const e = ghostEngine();
  const id = journeyToLobbyWithLetter(e);
  assertThrowsCode(
    () =>
      e.dispatch(id, {
        action: 'return_letter',
        input: { recipientName: 'Nobody', choice: 'open' },
        expectedVersion: 9,
      }),
    'BAD_INPUT',
  );
});

test('ghost-inn cannot deliver the letter twice', () => {
  const e = ghostEngine();
  const id = journeyToLobbyWithLetter(e);
  e.dispatch(id, {
    action: 'return_letter',
    input: { recipientName: 'Evelyn Vale', choice: 'open' },
    expectedVersion: 9,
  });
  assertThrowsCode(
    () =>
      e.dispatch(id, {
        action: 'return_letter',
        input: { recipientName: 'Evelyn Vale', choice: 'keep' },
        expectedVersion: 10,
      }),
    'BAD_INPUT',
  );
});

test('ghost-inn snapshot and restore preserves puzzle progress', () => {
  const e = ghostEngine();
  const id = journeyToLobbyWithLetter(e);
  const snap = e.snapshot(id);
  const restored = e.restore({ ...snap, id: 'second-chance' });
  assert.strictEqual(restored.version, 9);
  assert.ok(restored.inventory.some((i) => i.id === 'letter'));
  // The restored session can still reach an ending.
  const r = e.dispatch('second-chance', {
    action: 'return_letter',
    input: { recipientName: 'Evelyn Vale', choice: 'keep' },
    expectedVersion: 9,
  });
  assert.strictEqual(r.view.ending.id, 'kept-secret');
});

// --- Lost Letters ------------------------------------------------------------

test('lost-letters compose, manual edit, undo, tone revision, seal', () => {
  const e = lettersEngine();
  const v0 = e.createSession('lost-letters');
  const id = v0.sessionId;
  assert.strictEqual(v0.version, 0);
  assert.strictEqual(v0.brief, null);
  assert.strictEqual(v0.draft, '');
  assert.strictEqual(v0.sealed, false);
  assert.strictEqual(v0.canUndo, false);
  assert.strictEqual(v0.versions, 0);
  assert.deepStrictEqual(v0.actions, ['set_brief']);

  const r1 = e.dispatch(id, {
    action: 'set_brief',
    input: {
      recipient: 'Evelyn',
      memory: 'the summer we found the lighthouse',
      wish: 'you find your way back',
      promise: 'I will keep the lamp lit',
    },
    expectedVersion: 0,
  });
  assert.strictEqual(r1.view.brief.recipient, 'Evelyn');
  assert.strictEqual(r1.view.versions, 0);
  assert.deepStrictEqual(r1.view.actions, ['set_brief', 'compose']);

  const r2 = e.dispatch(id, { action: 'compose', input: { tone: 'warm' }, expectedVersion: 1 });
  const draftWarm = r2.view.draft;
  assert.ok(draftWarm.includes('Dear Evelyn,'));
  assert.ok(draftWarm.includes('the summer we found the lighthouse'));
  assert.ok(draftWarm.includes('I will keep the lamp lit'));
  assert.strictEqual(r2.view.tone, 'warm');
  assert.strictEqual(r2.view.versions, 1);
  assert.strictEqual(r2.view.canUndo, false);
  assert.deepStrictEqual(r2.view.actions, ['set_brief', 'compose', 'revise', 'edit', 'seal']);

  const r3 = e.dispatch(id, {
    action: 'edit',
    input: { text: 'My dear friend, I write because I must. The lighthouse still stands.' },
    expectedVersion: 2,
  });
  assert.strictEqual(r3.view.draft, 'My dear friend, I write because I must. The lighthouse still stands.');
  assert.strictEqual(r3.view.versions, 2);
  assert.strictEqual(r3.view.canUndo, true);
  assert.strictEqual(r3.view.sealed, false);

  const r4 = e.dispatch(id, { action: 'undo', input: {}, expectedVersion: 3 });
  assert.strictEqual(r4.view.draft, draftWarm);
  assert.strictEqual(r4.view.versions, 2);
  assert.strictEqual(r4.view.canUndo, false);

  const r5 = e.dispatch(id, { action: 'revise', input: { tone: 'gentle' }, expectedVersion: 4 });
  const draftGentle = r5.view.draft;
  assert.ok(draftGentle.includes('Dear Evelyn,'));
  assert.ok(draftGentle.includes('the summer we found the lighthouse'));
  assert.strictEqual(r5.view.tone, 'gentle');
  assert.strictEqual(r5.view.versions, 3);
  assert.strictEqual(r5.view.canUndo, true);
  assert.notStrictEqual(draftGentle, draftWarm);

  const r6 = e.dispatch(id, { action: 'seal', input: {}, expectedVersion: 5 });
  assert.strictEqual(r6.view.sealed, true);
  assert.ok(r6.artifact);
  assert.strictEqual(r6.artifact.mime, 'text/plain');
  assert.strictEqual(r6.artifact.text, draftGentle);
  assert.strictEqual(r6.artifact.name, 'letter-to-Evelyn.txt');
  assert.strictEqual(r6.view.draft, draftGentle);
});

test('lost-letters warm, gentle and clear tones produce distinct drafts', () => {
  const e = lettersEngine();
  const id = e.createSession('lost-letters').sessionId;
  e.dispatch(id, {
    action: 'set_brief',
    input: { recipient: 'Sam', memory: 'the orchard in October' },
    expectedVersion: 0,
  });
  const warm = e.dispatch(id, { action: 'compose', input: { tone: 'warm' }, expectedVersion: 1 }).view.draft;
  // Restart from a fresh session for a clean gentle draft.
  const id2 = e.createSession('lost-letters').sessionId;
  e.dispatch(id2, {
    action: 'set_brief',
    input: { recipient: 'Sam', memory: 'the orchard in October' },
    expectedVersion: 0,
  });
  const gentle = e.dispatch(id2, { action: 'compose', input: { tone: 'gentle' }, expectedVersion: 1 }).view.draft;
  const id3 = e.createSession('lost-letters').sessionId;
  e.dispatch(id3, {
    action: 'set_brief',
    input: { recipient: 'Sam', memory: 'the orchard in October' },
    expectedVersion: 0,
  });
  const clear = e.dispatch(id3, { action: 'compose', input: { tone: 'clear' }, expectedVersion: 1 }).view.draft;
  assert.notStrictEqual(warm, gentle);
  assert.notStrictEqual(warm, clear);
  assert.notStrictEqual(gentle, clear);
  assert.ok(warm.includes('Yours, always,'));
  assert.ok(gentle.includes('Softly,'));
  assert.ok(clear.includes('Sincerely,'));
});

test('lost-letters rejects bad brief input', () => {
  const e = lettersEngine();
  const id = e.createSession('lost-letters').sessionId;
  assertThrowsCode(
    () => e.dispatch(id, { action: 'set_brief', input: { memory: 'a memory' }, expectedVersion: 0 }),
    'BAD_INPUT',
  );
  assertThrowsCode(
    () => e.dispatch(id, { action: 'set_brief', input: { recipient: 'Eve' }, expectedVersion: 0 }),
    'BAD_INPUT',
  );
  assertThrowsCode(
    () =>
      e.dispatch(id, {
        action: 'set_brief',
        input: { recipient: 'x'.repeat(101), memory: 'm' },
        expectedVersion: 0,
      }),
    'BAD_INPUT',
  );
  assertThrowsCode(
    () =>
      e.dispatch(id, {
        action: 'set_brief',
        input: { recipient: 'Eve', memory: 'x'.repeat(1001) },
        expectedVersion: 0,
      }),
    'BAD_INPUT',
  );
  assertThrowsCode(
    () =>
      e.dispatch(id, {
        action: 'set_brief',
        input: { recipient: 'Eve', memory: 'm', bogus: 1 },
        expectedVersion: 0,
      }),
    'BAD_INPUT',
  );
  // None of the failed set_brief calls committed; version is still 0.
  assert.strictEqual(e.observe(id).version, 0);
});

test('lost-letters rejects composing without a brief or with a bad tone', () => {
  const e = lettersEngine();
  const id = e.createSession('lost-letters').sessionId;
  assertThrowsCode(
    () => e.dispatch(id, { action: 'compose', input: { tone: 'warm' }, expectedVersion: 0 }),
    'BAD_INPUT',
  );
  e.dispatch(id, {
    action: 'set_brief',
    input: { recipient: 'Eve', memory: 'a memory' },
    expectedVersion: 0,
  });
  assertThrowsCode(
    () => e.dispatch(id, { action: 'compose', input: { tone: 'loud' }, expectedVersion: 1 }),
    'BAD_INPUT',
  );
  assertThrowsCode(
    () => e.dispatch(id, { action: 'compose', input: { tone: 'warm', bogus: 1 }, expectedVersion: 1 }),
    'BAD_INPUT',
  );
});

test('lost-letters rejects bad edit, undo and seal input', () => {
  const e = lettersEngine();
  const id = e.createSession('lost-letters').sessionId;
  // edit before any draft exists
  assertThrowsCode(
    () => e.dispatch(id, { action: 'edit', input: { text: 'hi' }, expectedVersion: 0 }),
    'BAD_INPUT',
  );
  // undo before any history exists
  assertThrowsCode(
    () => e.dispatch(id, { action: 'undo', input: {}, expectedVersion: 0 }),
    'BAD_INPUT',
  );
  // seal before any draft exists
  assertThrowsCode(
    () => e.dispatch(id, { action: 'seal', input: {}, expectedVersion: 0 }),
    'BAD_INPUT',
  );
  e.dispatch(id, {
    action: 'set_brief',
    input: { recipient: 'Eve', memory: 'a memory' },
    expectedVersion: 0,
  });
  e.dispatch(id, { action: 'compose', input: { tone: 'warm' }, expectedVersion: 1 });
  // edit with no text
  assertThrowsCode(
    () => e.dispatch(id, { action: 'edit', input: {}, expectedVersion: 2 }),
    'BAD_INPUT',
  );
  // edit with empty text
  assertThrowsCode(
    () => e.dispatch(id, { action: 'edit', input: { text: '   ' }, expectedVersion: 2 }),
    'BAD_INPUT',
  );
  // edit with unknown field
  assertThrowsCode(
    () => e.dispatch(id, { action: 'edit', input: { text: 'hi', bogus: 1 }, expectedVersion: 2 }),
    'BAD_INPUT',
  );
  // edit too long
  assertThrowsCode(
    () => e.dispatch(id, { action: 'edit', input: { text: 'x'.repeat(5001) }, expectedVersion: 2 }),
    'BAD_INPUT',
  );
});

test('lost-letters reject unknown action input fields for undo and seal', () => {
  const e = lettersEngine();
  const id = e.createSession('lost-letters').sessionId;
  e.dispatch(id, {
    action: 'set_brief',
    input: { recipient: 'Eve', memory: 'a memory' },
    expectedVersion: 0,
  });
  e.dispatch(id, { action: 'compose', input: { tone: 'warm' }, expectedVersion: 1 });
  e.dispatch(id, { action: 'edit', input: { text: 'a manual line' }, expectedVersion: 2 });
  assertThrowsCode(
    () => e.dispatch(id, { action: 'undo', input: { bogus: 1 }, expectedVersion: 3 }),
    'BAD_INPUT',
  );
  e.dispatch(id, { action: 'undo', input: {}, expectedVersion: 3 });
  assertThrowsCode(
    () => e.dispatch(id, { action: 'seal', input: { bogus: 1 }, expectedVersion: 4 }),
    'BAD_INPUT',
  );
});

test('lost-letters does not overwrite an existing session on restore', () => {
  const e = lettersEngine();
  const v = e.createSession('lost-letters');
  e.dispatch(v.sessionId, {
    action: 'set_brief',
    input: { recipient: 'Eve', memory: 'a memory' },
    expectedVersion: 0,
  });
  const snap = e.snapshot(v.sessionId);
  // Restoring with the same id must be refused.
  assertThrowsCode(() => e.restore(snap), 'CONFLICT');
  // Restoring with a fresh id works and does not disturb the original.
  const restored = e.restore({ ...snap, id: 'fresh-letter' });
  assert.strictEqual(restored.sessionId, 'fresh-letter');
  assert.strictEqual(restored.brief.recipient, 'Eve');
  // The original session is untouched.
  assert.strictEqual(e.observe(v.sessionId).brief.recipient, 'Eve');
});

test('lost-letters rejects saves with unknown state fields', () => {
  const e = lettersEngine();
  const v = e.createSession('lost-letters');
  e.dispatch(v.sessionId, {
    action: 'set_brief',
    input: { recipient: 'Eve', memory: 'a memory' },
    expectedVersion: 0,
  });
  const snap = e.snapshot(v.sessionId);
  const tampered = { ...snap, id: 'tampered', state: { ...snap.state, unknownField: true } };
  assertThrowsCode(() => e.restore(tampered), 'BAD_SAVE');
});

test('lost-letters rejects saves with invalid field types', () => {
  const e = lettersEngine();
  const v = e.createSession('lost-letters');
  const snap = e.snapshot(v.sessionId);
  const bad = {
    schemaVersion: 1,
    id: 'bad-type',
    worldId: 'lost-letters',
    version: 0,
    state: { ...snap.state, draft: 123 },
  };
  assertThrowsCode(() => e.restore(bad), 'BAD_SAVE');
});

test('lost-letters public observe never exposes internal history directly', () => {
  const e = lettersEngine();
  const id = e.createSession('lost-letters').sessionId;
  e.dispatch(id, {
    action: 'set_brief',
    input: { recipient: 'Eve', memory: 'a memory' },
    expectedVersion: 0,
  });
  e.dispatch(id, { action: 'compose', input: { tone: 'warm' }, expectedVersion: 1 });
  e.dispatch(id, { action: 'edit', input: { text: 'a manual line' }, expectedVersion: 2 });
  const view = e.observe(id);
  // The public fields match the design contract exactly.
  assert.deepStrictEqual(
    Object.keys(view).sort(),
    ['brief', 'tone', 'draft', 'sealed', 'canUndo', 'versions', 'journal', 'actions', 'sessionId', 'worldId', 'version'].sort(),
  );
  assert.strictEqual(view.canUndo, true);
  assert.strictEqual(view.versions, 2);
});
