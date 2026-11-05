// Ghost Inn — a four-room exploration mystery built on the Hauntkit engine.
//
// The world owns its own business rules; the engine owns sessions, versions,
// cloning and public observations. This module imports only the HauntkitError
// type and is otherwise browser/Node agnostic. Internal state is private; the
// observe() projection is the only thing players (or narrators) ever see, and
// it never reveals answers the player has not yet discovered.

import { HauntkitError } from '../../packages/core/engine.mjs';

const ROOM_IDS = ['lobby', 'library', 'attic', 'garden'];

const ROOMS = {
  lobby: {
    id: 'lobby',
    name: 'The Lobby',
    description:
      'A low-lit foyer where the Ghost Inn receives its guests. A bell sits on the front desk, and a guestbook lies open beside it.',
  },
  library: {
    id: 'library',
    name: 'The Library',
    description:
      'Tall shelves and a grandfather clock fill this quiet room. A portrait watches from the far wall, its plaque half in shadow.',
  },
  attic: {
    id: 'attic',
    name: 'The Attic',
    description:
      'Sloped ceilings and stored memories. A heavy trunk sits beneath the eaves, and a window looks out over the grounds.',
  },
  garden: {
    id: 'garden',
    name: 'The Garden',
    description:
      'A wild, gentle garden behind the inn. A dry fountain and an old sundial keep each other company here.',
  },
};

const TARGETS = {
  lobby: [
    { id: 'bell', label: 'The Bell' },
    { id: 'guestbook', label: 'The Guestbook' },
  ],
  library: [
    { id: 'portrait', label: 'The Portrait' },
    { id: 'clock', label: 'The Grandfather Clock' },
    { id: 'shelves', label: 'The Shelves' },
  ],
  attic: [
    { id: 'trunk', label: 'The Trunk' },
    { id: 'window', label: 'The Window' },
  ],
  garden: [
    { id: 'fountain', label: 'The Fountain' },
    { id: 'sundial', label: 'The Sundial' },
  ],
};

const CHARACTERS = {
  lobby: [
    {
      id: 'maude',
      name: 'Maude',
      topics: [
        { id: 'inn', label: 'The inn' },
        { id: 'guests', label: 'Her guests' },
      ],
    },
  ],
  garden: [
    {
      id: 'rowan',
      name: 'Rowan',
      topics: [
        { id: 'garden', label: 'The garden' },
        { id: 'hints', label: 'A quiet hint' },
      ],
    },
  ],
};

const ITEMS = {
  'brass-key': { label: 'A Brass Key' },
  letter: { label: 'A Sealed Letter' },
};

const ITEM_IDS = ['brass-key', 'letter'];

const CLUE_IDS = ['guestbook', 'portrait-name', 'clock-time', 'letter-found'];
const CLUE_FACTS = {
  guestbook: { title: 'The Guestbook', text: 'A faded entry reads: "E. Vale departed in haste, leaving a letter uncollected."' },
  'portrait-name': { title: 'The Portrait', text: 'A plaque beneath the portrait reads "Evelyn Vale, beloved benefactor of the inn."' },
  'clock-time': { title: 'The Stopped Clock', text: 'The grandfather clock has stopped at 8:13.' },
  'letter-found': { title: 'The Letter', text: 'A sealed letter, addressed to Evelyn Vale, rests in the open trunk.' },
};

const ENDING_IDS = ['open-memory', 'kept-secret'];

const ENDINGS = {
  'open-memory': {
    id: 'open-memory',
    title: 'Memory Returned',
    text:
      'You hand Maude the letter. She turns it in her hands, then breaks the seal. As she reads, something steadies behind her eyes. "Evelyn," she says — and the name is her own, returned to her after long years. "I remember now." The Ghost Inn seems to settle, as if a long-held breath has finally gone. Its last guest is home, and home remembers her.',
  },
  'kept-secret': {
    id: 'kept-secret',
    title: 'A Kept Secret',
    text:
      'You choose to keep the letter sealed, and press it gently into Maude\'s hands. She holds it without opening, and a quiet understanding passes between you. Some letters wait because they must; some because they should. The inn folds back into its gentle hush, and the secret stays kind.',
  },
};

const STATE_KEYS = [
  'room',
  'inventory',
  'bellRung',
  'guestbookRead',
  'portraitExamined',
  'clockExamined',
  'trunkUnlocked',
  'letterTaken',
  'letterReturned',
  'clues',
  'journal',
  'ending',
];

const BOOL_KEYS = [
  'bellRung',
  'guestbookRead',
  'portraitExamined',
  'clockExamined',
  'trunkUnlocked',
  'letterTaken',
  'letterReturned',
];

function rejectUnknownKeys(input, allowed) {
  for (const key of Object.keys(input)) {
    if (!allowed.includes(key)) {
      throw new HauntkitError('BAD_INPUT', `Unknown field '${key}'.`);
    }
  }
}

function relevantActions(s) {
  const ids = ['move', 'inspect'];
  if ((CHARACTERS[s.room] || []).length > 0) ids.push('talk');
  if (s.room === 'attic' && !s.trunkUnlocked) ids.push('unlock');
  if (s.inventory.includes('letter') && s.room === 'lobby' && !s.letterReturned) {
    ids.push('return_letter');
  }
  return ids;
}

function dialogue(draft, ch, topicId) {
  if (ch.id === 'maude') {
    if (topicId === 'inn') {
      return 'Maude tends the quiet hearth. "The inn has stood longer than the road that leads to it. Folks come — and some stay longer than they planned."';
    }
    if (topicId === 'guests') {
      return 'Maude\'s gaze drifts. "Guests leave things behind. A letter. A name half-remembered. The inn keeps them, till someone comes looking."';
    }
  }
  if (ch.id === 'rowan') {
    if (topicId === 'garden') {
      return 'Rowan brushes soil from a stubborn root. "The garden remembers everyone who walked it. Even the ones who forgot themselves."';
    }
    if (topicId === 'hints') {
      if (!draft.clockExamined) {
        return 'Rowan taps the sundial. "Time keeps its secrets in odd places — on a face that has stopped, perhaps."';
      }
      if (!draft.trunkUnlocked) {
        return 'Rowan lowers their voice. "A clock that stops still keeps a number. Numbers, I hear, open locks."';
      }
      if (!draft.letterTaken) {
        return 'Rowan glances up toward the house. "Something waits above, now that it has been opened."';
      }
      if (!draft.letterReturned) {
        return 'Rowan smiles, gentle. "A letter long delayed still knows its way home."';
      }
      return 'Rowan nods. "Some deliveries change more than the one who carries them."';
    }
  }
  return `${ch.name} falls quiet.`;
}

function inspectTarget(draft, target) {
  switch (target) {
    case 'bell': {
      if (!draft.bellRung) {
        draft.bellRung = true;
        draft.inventory.push('brass-key');
        const line = 'You ring the bell. A brass key tumbles from a hidden slot in the desk.';
        draft.journal.push(line);
        return { events: [line] };
      }
      const line = 'The bell hangs still. You have already taken what it offered.';
      draft.journal.push(line);
      return { events: [line] };
    }
    case 'guestbook': {
      if (!draft.guestbookRead) {
        draft.guestbookRead = true;
        draft.clues.push({
          id: 'guestbook',
          title: 'The Guestbook',
          text: 'A faded entry reads: "E. Vale departed in haste, leaving a letter uncollected."',
        });
        const line = 'You skim the guestbook. One entry lingers: "E. Vale departed in haste, leaving a letter uncollected."';
        draft.journal.push(line);
        return { events: [line] };
      }
      const line = 'The guestbook rests where you left it; you have already read its entry.';
      draft.journal.push(line);
      return { events: [line] };
    }
    case 'portrait': {
      if (!draft.portraitExamined) {
        draft.portraitExamined = true;
        draft.clues.push({
          id: 'portrait-name',
          title: 'The Portrait',
          text: 'A plaque beneath the portrait reads "Evelyn Vale, beloved benefactor of the inn."',
        });
        const line = 'You study the portrait. Its plaque reads "Evelyn Vale, beloved benefactor of the inn."';
        draft.journal.push(line);
        return { events: [line] };
      }
      const line = 'The portrait watches the room with painted patience; you have already learned its name.';
      draft.journal.push(line);
      return { events: [line] };
    }
    case 'clock': {
      if (!draft.clockExamined) {
        draft.clockExamined = true;
        draft.clues.push({
          id: 'clock-time',
          title: 'The Stopped Clock',
          text: 'The grandfather clock has stopped at 8:13.',
        });
        const line = 'You check the grandfather clock. It has stopped at 8:13.';
        draft.journal.push(line);
        return { events: [line] };
      }
      const line = 'The clock keeps its stopped time, 8:13, as before.';
      draft.journal.push(line);
      return { events: [line] };
    }
    case 'shelves': {
      const line = 'Dusty volumes line the shelves, their titles too faded to read.';
      draft.journal.push(line);
      return { events: [line] };
    }
    case 'trunk': {
      if (!draft.trunkUnlocked) {
        const line = 'The trunk sits locked, its brass latch firm. You will need to open it to see inside.';
        draft.journal.push(line);
        return { events: [line] };
      }
      if (!draft.letterTaken) {
        draft.letterTaken = true;
        draft.inventory.push('letter');
        draft.clues.push({
          id: 'letter-found',
          title: 'The Letter',
          text: 'A sealed letter, addressed to Evelyn Vale, rests in the open trunk.',
        });
        const line = 'You lift a sealed letter from the open trunk. It is addressed to Evelyn Vale.';
        draft.journal.push(line);
        return { events: [line] };
      }
      const line = 'The trunk is empty now; you have already taken the letter.';
      draft.journal.push(line);
      return { events: [line] };
    }
    case 'window': {
      const line = 'Through the attic window, you see the garden below, half-wild in the dusk.';
      draft.journal.push(line);
      return { events: [line] };
    }
    case 'fountain': {
      const line = 'The fountain is dry, but moss softens its basin. It feels like a wish left waiting.';
      draft.journal.push(line);
      return { events: [line] };
    }
    case 'sundial': {
      const line = 'The sundial casts no shadow at this hour, yet Rowan tends it as though it still spoke.';
      draft.journal.push(line);
      return { events: [line] };
    }
    default:
      throw new HauntkitError('BAD_INPUT', `There is no '${target}' to examine here.`);
  }
}

function initialState() {
  return {
    room: 'lobby',
    inventory: [],
    bellRung: false,
    guestbookRead: false,
    portraitExamined: false,
    clockExamined: false,
    trunkUnlocked: false,
    letterTaken: false,
    letterReturned: false,
    clues: [],
    journal: [
      'You step into the Ghost Inn, drawn by something you cannot name. The lobby is warm, though no fire burns in the hearth.',
    ],
    ending: null,
  };
}

function validateState(s) {
  if (!s || typeof s !== 'object' || Array.isArray(s)) return false;
  if (Object.keys(s).length !== STATE_KEYS.length) return false;
  for (const key of Object.keys(s)) {
    if (!STATE_KEYS.includes(key)) return false;
  }
  if (typeof s.room !== 'string' || !ROOM_IDS.includes(s.room)) return false;
  for (const key of BOOL_KEYS) {
    if (typeof s[key] !== 'boolean') return false;
  }
  if (!Array.isArray(s.inventory)) return false;
  if (new Set(s.inventory).size !== s.inventory.length) return false;
  for (const id of s.inventory) {
    if (typeof id !== 'string' || !ITEM_IDS.includes(id)) return false;
  }
  if (!Array.isArray(s.clues)) return false;
  if (new Set(s.clues.map(c => c?.id)).size !== s.clues.length) return false;
  for (const c of s.clues) {
    if (!c || typeof c !== 'object' || Array.isArray(c)) return false;
    if (typeof c.id !== 'string' || !CLUE_IDS.includes(c.id)) return false;
    if (typeof c.title !== 'string' || typeof c.text !== 'string') return false;
    if (Object.keys(c).length !== 3 || c.title !== CLUE_FACTS[c.id].title || c.text !== CLUE_FACTS[c.id].text) return false;
  }
  if (!Array.isArray(s.journal)) return false;
  if (s.journal.length > 100) return false;
  for (const line of s.journal) {
    if (typeof line !== 'string' || line.length > 2000) return false;
  }
  if (s.ending !== null) {
    if (!s.ending || typeof s.ending !== 'object' || Array.isArray(s.ending)) return false;
    if (typeof s.ending.id !== 'string' || !ENDING_IDS.includes(s.ending.id)) return false;
    if (typeof s.ending.title !== 'string' || typeof s.ending.text !== 'string') return false;
    if (Object.keys(s.ending).length !== 3 || s.ending.title !== ENDINGS[s.ending.id].title || s.ending.text !== ENDINGS[s.ending.id].text) return false;
  }
  if (s.bellRung !== s.inventory.includes('brass-key')) return false;
  if (s.room === 'attic' && !s.bellRung) return false;
  if (s.trunkUnlocked && (!s.clockExamined || !s.bellRung)) return false;
  if (s.letterTaken && !s.trunkUnlocked) return false;
  if (s.letterReturned && !s.letterTaken) return false;
  if (s.letterReturned !== (s.ending !== null)) return false;
  if (s.inventory.includes('letter') !== (s.letterTaken && !s.letterReturned)) return false;
  for (const [flag,id] of [['guestbookRead','guestbook'],['portraitExamined','portrait-name'],['clockExamined','clock-time'],['letterTaken','letter-found']]) {
    if (s[flag] !== s.clues.some(c => c.id === id)) return false;
  }
  return true;
}

function observe(s) {
  return {
    room: { id: s.room, name: ROOMS[s.room].name, description: ROOMS[s.room].description },
    rooms: ROOM_IDS.map((id) => ({
      id,
      name: ROOMS[id].name,
      locked: id === 'attic' ? !s.inventory.includes('brass-key') : false,
    })),
    targets: (TARGETS[s.room] || []).map((t) => ({ id: t.id, label: t.label })),
    characters: (CHARACTERS[s.room] || []).map((c) => ({
      id: c.id,
      name: c.name,
      topics: c.topics.map((t) => ({ id: t.id, label: t.label })),
    })),
    inventory: s.inventory.map((id) => ({ id, label: ITEMS[id].label })),
    clues: s.clues.map((c) => ({ id: c.id, title: c.title, text: c.text })),
    journal: [...s.journal],
    ending: s.ending
      ? { id: s.ending.id, title: s.ending.title, text: s.ending.text }
      : null,
    actions: relevantActions(s),
  };
}

function move(draft, input) {
  rejectUnknownKeys(input, ['room']);
  const target = input.room;
  if (typeof target !== 'string' || !ROOM_IDS.includes(target)) {
    throw new HauntkitError('BAD_INPUT', 'That is not a place you can go.');
  }
  if (target === draft.room) {
    throw new HauntkitError('BAD_INPUT', `You are already in ${ROOMS[target].name}.`);
  }
  if (target === 'attic' && !draft.inventory.includes('brass-key')) {
    throw new HauntkitError('BAD_INPUT', 'The attic door is locked. You will need a key.');
  }
  draft.room = target;
  const line = `You make your way to ${ROOMS[target].name}.`;
  draft.journal.push(line);
  return { events: [line] };
}

function inspect(draft, input) {
  rejectUnknownKeys(input, ['target']);
  const target = input.target;
  if (typeof target !== 'string' || target === '') {
    throw new HauntkitError('BAD_INPUT', 'Choose something to examine.');
  }
  const roomTargets = TARGETS[draft.room] || [];
  if (!roomTargets.some((t) => t.id === target)) {
    throw new HauntkitError('BAD_INPUT', `There is no '${target}' to examine here.`);
  }
  return inspectTarget(draft, target);
}

function talk(draft, input) {
  rejectUnknownKeys(input, ['character', 'topic']);
  const charId = input.character;
  const topicId = input.topic;
  if (typeof charId !== 'string' || charId === '') {
    throw new HauntkitError('BAD_INPUT', 'Choose someone to talk to.');
  }
  if (typeof topicId !== 'string' || topicId === '') {
    throw new HauntkitError('BAD_INPUT', 'Choose something to discuss.');
  }
  const chars = CHARACTERS[draft.room] || [];
  const ch = chars.find((c) => c.id === charId);
  if (!ch) {
    throw new HauntkitError('BAD_INPUT', `There is no one named '${charId}' here.`);
  }
  const topic = ch.topics.find((t) => t.id === topicId);
  if (!topic) {
    throw new HauntkitError('BAD_INPUT', `${ch.name} has nothing to say about that.`);
  }
  const line = dialogue(draft, ch, topicId);
  draft.journal.push(line);
  return { events: [line] };
}

function unlock(draft, input) {
  rejectUnknownKeys(input, ['code']);
  if (draft.room !== 'attic') {
    throw new HauntkitError('BAD_INPUT', 'There is nothing here to unlock.');
  }
  if (draft.trunkUnlocked) {
    throw new HauntkitError('BAD_INPUT', 'The trunk already stands open.');
  }
  if (input.code === undefined || input.code === null) {
    throw new HauntkitError('BAD_INPUT', 'You must enter a code to unlock the trunk.');
  }
  const code = String(input.code).trim();
  if (code !== '0813') {
    throw new HauntkitError('BAD_INPUT', 'The trunk stays shut; that is not the right code.');
  }
  if (!draft.clockExamined) {
    throw new HauntkitError(
      'BAD_INPUT',
      'You enter the code, but the trunk will not open. Something else is missing.',
    );
  }
  draft.trunkUnlocked = true;
  const line = 'The trunk clicks, and its brass latch gives way. The trunk stands open.';
  draft.journal.push(line);
  return { events: [line] };
}

function return_letter(draft, input) {
  rejectUnknownKeys(input, ['recipientName', 'choice']);
  const name = input.recipientName;
  const choice = input.choice;
  if (typeof name !== 'string' || name.trim() === '') {
    throw new HauntkitError('BAD_INPUT', "You must name the letter's recipient.");
  }
  if (typeof choice !== 'string') {
    throw new HauntkitError('BAD_INPUT', 'You must choose to open or keep the letter.');
  }
  if (draft.letterReturned) {
    throw new HauntkitError('BAD_INPUT', 'The letter has already been delivered.');
  }
  if (draft.room !== 'lobby') {
    throw new HauntkitError('BAD_INPUT', 'You can only deliver the letter in the lobby.');
  }
  if (!draft.inventory.includes('letter')) {
    throw new HauntkitError('BAD_INPUT', 'You have no letter to deliver.');
  }
  const norm = name.trim().toLowerCase();
  if (norm !== 'evelyn' && norm !== 'evelyn vale') {
    throw new HauntkitError('BAD_INPUT', 'That does not match the name on the letter.');
  }
  if (choice !== 'open' && choice !== 'keep') {
    throw new HauntkitError('BAD_INPUT', 'You must choose to open or keep the letter.');
  }
  draft.letterReturned = true;
  draft.inventory = draft.inventory.filter((id) => id !== 'letter');
  const ending = choice === 'open' ? ENDINGS['open-memory'] : ENDINGS['kept-secret'];
  draft.ending = ending;
  draft.journal.push(ending.text);
  return { events: [ending.text] };
}

export const ghostInnWorld = {
  id: 'ghost-inn',
  initialState,
  validateState,
  observe,
  actions: Object.fromEntries(Object.entries({ move, inspect, talk, unlock, return_letter }).map(([id,fn]) => [id,(draft,input) => {
    const result = fn(draft,input);
    draft.journal = draft.journal.slice(-100);
    return result;
  }])),
};
