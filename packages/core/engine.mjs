// Hauntkit shared core engine.
//
// A small, transport-agnostic state machine: isolated sessions, optimistic
// version checks, atomic actions against a clone, and public observations that
// never expose the engine's internal state references. Browser and Node
// compatible — it imports nothing and relies only on structuredClone and
// globalThis.crypto.randomUUID, both available in Node >= 20 and modern browsers.

export class HauntkitError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'HauntkitError';
    this.code = code;
  }
}

function newId() {
  return globalThis.crypto.randomUUID();
}

export function createEngine({ worlds } = {}) {
  // Normalize the worlds registry into an id -> world map. Accepts either an
  // array of world objects or a plain object map; worlds are keyed by their own
  // `id` so the caller's container shape does not matter.
  const worldMap = Object.create(null);
  const source = Array.isArray(worlds) ? worlds : Object.values(worlds || {});
  for (const world of source) {
    if (world && typeof world === 'object' && typeof world.id === 'string') {
      worldMap[world.id] = world;
    }
  }

  const sessions = new Map();

  function findWorld(worldId) {
    const world = worldMap[worldId];
    if (!world) {
      throw new HauntkitError('BAD_WORLD', `Unknown world: ${worldId}`);
    }
    if (
      typeof world.initialState !== 'function' ||
      typeof world.validateState !== 'function' ||
      typeof world.observe !== 'function' ||
      typeof world.actions !== 'object' ||
      world.actions === null
    ) {
      throw new HauntkitError('BAD_WORLD', `World is malformed: ${worldId}`);
    }
    return world;
  }

  // Build a public view from a session. The world's observe() describes the
  // state; the engine clones that description so callers can never mutate the
  // session through a view, and prefixes the session/world/version envelope.
  function viewOf(session, world) {
    const observed = structuredClone(world.observe(structuredClone(session.state)));
    return {
      ...observed,
      sessionId: session.id,
      worldId: session.worldId,
      version: session.version,
    };
  }

  // Run a world's validateState, normalizing its three allowed outcomes
  // (true / false / throw) into a HauntkitError with the caller-chosen code.
  function runValidate(world, state, errCode) {
    let valid;
    try {
      valid = world.validateState(state);
    } catch (e) {
      throw new HauntkitError(errCode, (e && e.message) ? e.message : 'state validation failed');
    }
    if (valid !== true) {
      throw new HauntkitError(errCode, 'state validation failed');
    }
  }

  function createSession(worldId, { id } = {}) {
    const world = findWorld(worldId);
    const sessionId = id === undefined ? newId() : id;
    if (typeof sessionId !== 'string' || sessionId === '') {
      throw new HauntkitError('BAD_INPUT', 'session id must be a non-empty string');
    }
    if (sessions.has(sessionId)) {
      throw new HauntkitError('CONFLICT', `session already exists: ${sessionId}`);
    }
    const session = {
      id: sessionId,
      worldId: world.id,
      version: 0,
      state: structuredClone(world.initialState()),
    };
    runValidate(world, session.state, 'BAD_INPUT');
    const view = viewOf(session, world);
    sessions.set(sessionId, session);
    return view;
  }

  function observe(sessionId) {
    const session = sessions.get(sessionId);
    if (!session) {
      throw new HauntkitError('NOT_FOUND', `session not found: ${sessionId}`);
    }
    const world = findWorld(session.worldId);
    return viewOf(session, world);
  }

  function dispatch(sessionId, { action, input, expectedVersion } = {}) {
    const session = sessions.get(sessionId);
    if (!session) {
      throw new HauntkitError('NOT_FOUND', `session not found: ${sessionId}`);
    }
    const world = findWorld(session.worldId);

    if (typeof action !== 'string' || action === '') {
      throw new HauntkitError('BAD_INPUT', 'action must be a non-empty string');
    }
    if (
      typeof expectedVersion !== 'number' ||
      !Number.isSafeInteger(expectedVersion) ||
      expectedVersion < 0 || expectedVersion === Number.MAX_SAFE_INTEGER
    ) {
      throw new HauntkitError('BAD_INPUT', 'expectedVersion must be a nonnegative integer');
    }
    // Stale views must refresh before any action can apply.
    if (expectedVersion !== session.version) {
      throw new HauntkitError(
        'CONFLICT',
        `stale version: expected ${expectedVersion}, current ${session.version}`,
      );
    }
    const actionFn = Object.hasOwn(world.actions, action) ? world.actions[action] : undefined;
    if (typeof actionFn !== 'function') {
      throw new HauntkitError('BAD_ACTION', `unknown action: ${action}`);
    }

    const inObj = input === undefined ? {} : input;
    if (inObj === null || typeof inObj !== 'object' || Array.isArray(inObj)) {
      throw new HauntkitError('BAD_INPUT', 'input must be an object');
    }
    // Clone both input and state so a misbehaving action can never mutate the
    // caller's input object or the committed session state before validation.
    const inputClone = structuredClone(inObj);
    const draft = structuredClone(session.state);

    let result;
    try {
      result = actionFn(draft, inputClone);
    } catch (e) {
      if (e instanceof HauntkitError) throw e;
      throw new HauntkitError('BAD_INPUT', (e && e.message) ? e.message : 'action failed');
    }

    if (!result || typeof result !== 'object' || Array.isArray(result)) {
      throw new HauntkitError('BAD_INPUT', 'action must return an object');
    }

    let events = result.events;
    if (events === undefined) events = [];
    if (!Array.isArray(events)) {
      throw new HauntkitError('BAD_INPUT', 'action events must be an array');
    }
    events = events.map((e, i) => {
      if (typeof e !== 'string') {
        throw new HauntkitError('BAD_INPUT', `event ${i} must be a string`);
      }
      return e;
    });

    let artifact;
    if (result.artifact !== undefined && result.artifact !== null) {
      const a = result.artifact;
      if (!a || typeof a !== 'object' || Array.isArray(a)) {
        throw new HauntkitError('BAD_INPUT', 'artifact must be an object');
      }
      if (
        typeof a.name !== 'string' ||
        typeof a.mime !== 'string' ||
        typeof a.text !== 'string'
      ) {
        throw new HauntkitError('BAD_INPUT', 'artifact must have name, mime, and text');
      }
      artifact = { name: a.name, mime: a.mime, text: a.text };
    }

    // The action's result must be a valid world state before it is committed.
    // If validation fails, nothing is written — original state and version are
    // untouched because we only ever mutated the throwaway draft.
    runValidate(world, draft, 'BAD_INPUT');

    // Projection can fail too. Build it before changing committed state.
    const next = { ...session, state: draft, version: expectedVersion + 1 };
    const view = viewOf(next, world);
    // Commit once.
    session.state = draft;
    session.version = expectedVersion + 1;
    const out = { view, events };
    if (artifact) out.artifact = artifact;
    return out;
  }

  function snapshot(sessionId) {
    const session = sessions.get(sessionId);
    if (!session) {
      throw new HauntkitError('NOT_FOUND', `session not found: ${sessionId}`);
    }
    return {
      schemaVersion: 1,
      id: session.id,
      worldId: session.worldId,
      version: session.version,
      state: structuredClone(session.state),
    };
  }

  function restore(snapshot) {
    if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
      throw new HauntkitError('BAD_SAVE', 'snapshot must be an object');
    }
    const envelopeKeys = ['schemaVersion', 'id', 'worldId', 'version', 'state'];
    if (Object.keys(snapshot).length !== envelopeKeys.length || Object.keys(snapshot).some(k => !envelopeKeys.includes(k))) {
      throw new HauntkitError('BAD_SAVE', 'unrecognized or missing snapshot fields');
    }
    if (snapshot.schemaVersion !== 1) {
      throw new HauntkitError('BAD_SAVE', 'unsupported or missing schemaVersion');
    }
    if (typeof snapshot.id !== 'string' || snapshot.id === '') {
      throw new HauntkitError('BAD_SAVE', 'snapshot id is missing');
    }
    if (typeof snapshot.worldId !== 'string' || snapshot.worldId === '') {
      throw new HauntkitError('BAD_SAVE', 'snapshot worldId is missing');
    }
    if (
      typeof snapshot.version !== 'number' ||
      !Number.isSafeInteger(snapshot.version) ||
      snapshot.version < 0
    ) {
      throw new HauntkitError('BAD_SAVE', 'snapshot version is invalid');
    }
    if (!snapshot.state || typeof snapshot.state !== 'object' || Array.isArray(snapshot.state)) {
      throw new HauntkitError('BAD_SAVE', 'snapshot state is invalid');
    }

    const world = findWorld(snapshot.worldId);
    const stateCopy = structuredClone(snapshot.state);
    runValidate(world, stateCopy, 'BAD_SAVE');

    if (sessions.has(snapshot.id)) {
      throw new HauntkitError('CONFLICT', `session already exists: ${snapshot.id}`);
    }

    const restored = {
      id: snapshot.id,
      worldId: snapshot.worldId,
      version: snapshot.version,
      state: stateCopy,
    };
    const view = viewOf(restored, world);
    sessions.set(snapshot.id, restored);
    return view;
  }

  return { createSession, observe, dispatch, snapshot, restore };
}
