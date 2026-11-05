// Lost Letters — a guided letter-writing world built on the Hauntkit engine.
//
// The composer uses authored, deterministic templates (no pretend AI). Free
// text supplied by the writer is data, never interpreted as game rules. The
// world strictly validates its own state and inputs so that nothing malformed
// can be committed or restored.

import { HauntkitError } from '../../packages/core/engine.mjs';

const TONES = ['warm', 'gentle', 'clear'];

const STATE_KEYS = ['brief', 'tone', 'draft', 'sealed', 'history', 'versions', 'journal'];
const BRIEF_KEYS = ['recipient', 'memory', 'wish', 'promise'];

const RECIPIENT_MAX = 100;
const MEMORY_MAX = 1000;
const WISH_MAX = 500;
const PROMISE_MAX = 500;
const DRAFT_MAX = 5000;

function rejectUnknownKeys(input, allowed) {
  for (const key of Object.keys(input)) {
    if (!allowed.includes(key)) {
      throw new HauntkitError('BAD_INPUT', `Unknown field '${key}'.`);
    }
  }
}

// Deterministic, authored templates. Given the same brief and tone they always
// produce the same letter, so this is story mode, not live model output.
function generateDraft(brief, tone) {
  const { recipient, memory, wish, promise } = brief;
  const lines = [];
  lines.push(`Dear ${recipient},`);
  lines.push('');
  if (tone === 'warm') {
    lines.push(
      `I keep coming back to this memory:\n${memory}\n\nSome moments keep their warmth no matter how much time passes. This is one of mine.`,
    );
  } else if (tone === 'gentle') {
    lines.push(
      `A small memory has stayed with me:\n${memory}\n\nI have been holding it gently. Today, I wanted to share it with you.`,
    );
  } else {
    lines.push(
      `There is a memory I want to put into words:\n${memory}\n\nIt matters to me. I did not want to leave it unsaid.`,
    );
  }
  lines.push('');
  if (wish) {
    if (tone === 'gentle') lines.push(`Something I would like you to know:\n${wish}`);
    else lines.push(`There is something I want you to know:\n${wish}`);
    lines.push('');
  }
  if (promise) {
    if (tone === 'warm') lines.push(`And a small promise:\n${promise}`);
    else if (tone === 'gentle') lines.push(`A little promise I can keep:\n${promise}`);
    else lines.push(`My promise:\n${promise}`);
    lines.push('');
  }
  if (tone === 'warm') lines.push('Yours, always,');
  else if (tone === 'gentle') lines.push('Softly,');
  else lines.push('Sincerely,');
  return lines.join('\n');
}

function readBriefInput(input) {
  rejectUnknownKeys(input, BRIEF_KEYS);
  const recipient = input.recipient;
  const memory = input.memory;
  if (typeof recipient !== 'string' || recipient.trim() === '') {
    throw new HauntkitError('BAD_INPUT', 'A recipient is required.');
  }
  if (recipient.length > RECIPIENT_MAX) {
    throw new HauntkitError('BAD_INPUT', `Recipient is too long (max ${RECIPIENT_MAX}).`);
  }
  if (typeof memory !== 'string' || memory.trim() === '') {
    throw new HauntkitError('BAD_INPUT', 'A memory is required.');
  }
  if (memory.length > MEMORY_MAX) {
    throw new HauntkitError('BAD_INPUT', `Memory is too long (max ${MEMORY_MAX}).`);
  }
  const wish = input.wish === undefined ? '' : input.wish;
  if (typeof wish !== 'string') {
    throw new HauntkitError('BAD_INPUT', 'Wish must be text.');
  }
  if (wish.length > WISH_MAX) {
    throw new HauntkitError('BAD_INPUT', `Wish is too long (max ${WISH_MAX}).`);
  }
  const promise = input.promise === undefined ? '' : input.promise;
  if (typeof promise !== 'string') {
    throw new HauntkitError('BAD_INPUT', 'Promise must be text.');
  }
  if (promise.length > PROMISE_MAX) {
    throw new HauntkitError('BAD_INPUT', `Promise is too long (max ${PROMISE_MAX}).`);
  }
  return {
    recipient: recipient.trim(),
    memory: memory.trim(),
    wish: wish.trim(),
    promise: promise.trim(),
  };
}

function readToneInput(input) {
  rejectUnknownKeys(input, ['tone']);
  if (typeof input.tone !== 'string') {
    throw new HauntkitError('BAD_INPUT', 'A tone is required.');
  }
  if (!TONES.includes(input.tone)) {
    throw new HauntkitError('BAD_INPUT', 'Tone must be warm, gentle, or clear.');
  }
  return input.tone;
}

function relevantActions(s) {
  const ids = ['set_brief'];
  if (s.brief) ids.push('compose');
  if (s.versions > 0) {
    ids.push('revise', 'edit');
    if (s.draft !== '') ids.push('seal');
  }
  if (s.history.length > 0) ids.push('undo');
  return ids;
}

function initialState() {
  return {
    brief: null,
    tone: null,
    draft: '',
    sealed: false,
    history: [],
    versions: 0,
    journal: ['A blank page waits. Begin by setting down the heart of your letter.'],
  };
}

function validateState(s) {
  if (!s || typeof s !== 'object' || Array.isArray(s)) return false;
  if (Object.keys(s).length !== STATE_KEYS.length) return false;
  for (const key of Object.keys(s)) {
    if (!STATE_KEYS.includes(key)) return false;
  }
  if (s.brief !== null) {
    if (!s.brief || typeof s.brief !== 'object' || Array.isArray(s.brief)) return false;
    if (Object.keys(s.brief).length !== BRIEF_KEYS.length) return false;
    for (const key of Object.keys(s.brief)) {
      if (!BRIEF_KEYS.includes(key)) return false;
    }
    if (
      typeof s.brief.recipient !== 'string' ||
      typeof s.brief.memory !== 'string' ||
      typeof s.brief.wish !== 'string' ||
      typeof s.brief.promise !== 'string'
    ) {
      return false;
    }
    if (s.brief.recipient.length > RECIPIENT_MAX) return false;
    if (s.brief.memory.length > MEMORY_MAX) return false;
    if (s.brief.wish.length > WISH_MAX) return false;
    if (s.brief.promise.length > PROMISE_MAX) return false;
    if (!s.brief.recipient.trim() || !s.brief.memory.trim()) return false;
  }
  if (s.tone !== null && !TONES.includes(s.tone)) return false;
  if (typeof s.draft !== 'string' || s.draft.length > DRAFT_MAX) return false;
  if (typeof s.sealed !== 'boolean') return false;
  if (!Array.isArray(s.history) || s.history.length > 50) return false;
  for (const h of s.history) {
    if (!h || typeof h !== 'object' || Array.isArray(h) || Object.keys(h).length !== 2 || !Object.hasOwn(h,'draft') || !Object.hasOwn(h,'tone')) return false;
    if (typeof h.draft !== 'string' || !h.draft.trim() || h.draft.length > DRAFT_MAX || !TONES.includes(h.tone)) return false;
  }
  if (
    typeof s.versions !== 'number' ||
    !Number.isSafeInteger(s.versions) ||
    s.versions < 0
  ) {
    return false;
  }
  if (!Array.isArray(s.journal) || s.journal.length > 100) return false;
  for (const line of s.journal) {
    if (typeof line !== 'string' || line.length > 2000) return false;
  }
  if (s.versions === 0 && (s.draft !== '' || s.tone !== null || s.history.length || s.sealed)) return false;
  if (s.versions > 0 && (!s.brief || !s.draft.trim() || !TONES.includes(s.tone))) return false;
  return true;
}

function observe(s) {
  return {
    brief: s.brief
      ? {
          recipient: s.brief.recipient,
          memory: s.brief.memory,
          wish: s.brief.wish,
          promise: s.brief.promise,
        }
      : null,
    tone: s.tone,
    draft: s.draft,
    sealed: s.sealed,
    canUndo: s.history.length > 0,
    versions: s.versions,
    journal: [...s.journal],
    actions: relevantActions(s),
  };
}

function set_brief(draft, input) {
  const brief = readBriefInput(input);
  draft.brief = brief;
  draft.sealed = false;
  const line = `You set down the heart of a letter to ${brief.recipient}.`;
  draft.journal.push(line);
  return { events: [line] };
}

function compose(draft, input) {
  const tone = readToneInput(input);
  if (!draft.brief) {
    throw new HauntkitError('BAD_INPUT', 'Set the brief (recipient and memory) before composing.');
  }
  if (!draft.brief.recipient || !draft.brief.memory) {
    throw new HauntkitError('BAD_INPUT', 'A recipient and memory are required to compose.');
  }
  if (draft.versions > 0) draft.history.push({draft: draft.draft, tone: draft.tone});
  draft.draft = generateDraft(draft.brief, tone);
  draft.tone = tone;
  draft.versions += 1;
  draft.sealed = false;
  const line = `You compose a draft in a ${tone} tone.`;
  draft.journal.push(line);
  return { events: [line] };
}

function revise(draft, input) {
  const tone = readToneInput(input);
  if (draft.versions === 0 || draft.draft === '') {
    throw new HauntkitError('BAD_INPUT', 'Compose a draft before revising.');
  }
  if (!draft.brief) {
    throw new HauntkitError('BAD_INPUT', 'Set the brief before revising.');
  }
  draft.history.push({draft: draft.draft, tone: draft.tone});
  draft.draft = generateDraft(draft.brief, tone);
  draft.tone = tone;
  draft.versions += 1;
  draft.sealed = false;
  const line = `You revise the letter into a ${tone} tone.`;
  draft.journal.push(line);
  return { events: [line] };
}

function edit(draft, input) {
  rejectUnknownKeys(input, ['text']);
  const text = input.text;
  if (typeof text !== 'string') {
    throw new HauntkitError('BAD_INPUT', 'Edit text must be a string.');
  }
  if (text.trim() === '') {
    throw new HauntkitError('BAD_INPUT', 'Edit text must not be empty.');
  }
  if (text.length > DRAFT_MAX) {
    throw new HauntkitError('BAD_INPUT', `Edit text is too long (max ${DRAFT_MAX}).`);
  }
  if (draft.versions === 0) {
    throw new HauntkitError('BAD_INPUT', 'Compose a draft before editing.');
  }
  draft.history.push({draft: draft.draft, tone: draft.tone});
  draft.draft = text;
  draft.versions += 1;
  draft.sealed = false;
  const line = 'You edit the letter by hand.';
  draft.journal.push(line);
  return { events: [line] };
}

function undo(draft, input) {
  rejectUnknownKeys(input, []);
  if (draft.history.length === 0) {
    throw new HauntkitError('BAD_INPUT', 'There is nothing to undo.');
  }
  const previous = draft.history.pop();
  draft.draft = previous.draft;
  draft.tone = previous.tone;
  draft.sealed = false;
  const line = 'You step back to the previous draft.';
  draft.journal.push(line);
  return { events: [line] };
}

function seal(draft, input) {
  rejectUnknownKeys(input, []);
  if (draft.versions === 0 || draft.draft === '') {
    throw new HauntkitError('BAD_INPUT', 'Compose a draft before sealing.');
  }
  draft.sealed = true;
  const safeName = draft.brief?.recipient.replace(/[^\p{L}\p{N} _-]/gu, '').trim().slice(0,80);
  const name = safeName ? `letter-to-${safeName}.txt` : 'letter.txt';
  const artifact = { name, mime: 'text/plain', text: draft.draft };
  const line = 'You seal the letter.';
  draft.journal.push(line);
  return { events: [line], artifact };
}

export const lostLettersWorld = {
  id: 'lost-letters',
  initialState,
  validateState,
  observe,
  actions: Object.fromEntries(Object.entries({ set_brief, compose, revise, edit, undo, seal }).map(([id,fn]) => [id,(draft,input) => {
    const result = fn(draft,input);
    draft.history = draft.history.slice(-50);
    draft.journal = draft.journal.slice(-100);
    return result;
  }])),
};
