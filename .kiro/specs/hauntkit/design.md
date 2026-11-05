# Design — owner-selected interfaces

ES modules work in browser and Node. packages/core/engine.mjs exports createEngine
and HauntkitError. apps/ghost-inn/world.mjs exports ghostInnWorld;
apps/lost-letters/world.mjs exports lostLettersWorld.

createEngine({worlds}) returns:
- createSession(worldId,{id}={}) -> public view
- observe(sessionId) -> {sessionId,worldId,version,...world.observe(state)}
- dispatch(sessionId,{action,input={},expectedVersion}) -> {view,events,artifact?}
- snapshot(sessionId) -> deep clone {schemaVersion:1,id,worldId,version,state}
- restore(snapshot) validates envelope and world state, refuses existing IDs,
  returns public view.

expectedVersion is mandatory nonnegative integer; stale means CONFLICT. Actions
run against a structuredClone, validateState on result, then commit once. Errors
leave original state and version untouched. Input objects must not be mutated.
IDs default crypto.randomUUID(). Errors have code and message; engine error codes
NOT_FOUND, BAD_WORLD, BAD_ACTION, BAD_INPUT, CONFLICT, BAD_SAVE.
World shape: {id,initialState(),validateState(state),observe(state),actions:{[id]:
function(draft,input)}}. Actions return {events:string[],artifact?:{name,mime,text}}.
World validation returns true, false or throws. Public observe is a clone.

Ghost world id ghost-inn. Starts lobby. Rooms lobby/library/attic/garden.
Actions move {room}, inspect {target}, talk {character,topic}, unlock {code},
return_letter {recipientName,choice}. Lobby bell yields brass key; guestbook
mentions E. Vale's letter. Library portrait reveals Evelyn Vale, clock reveals
8:13. Attic requires key, trunk requires code 0813 AND discovered clock clue.
Inspect open trunk grants letter. Return to Maude in lobby with discovered
Evelyn Vale name, choose open or keep for two endings. Maude is Evelyn, whose
memory returns; garden Rowan offers atmosphere/hints. Closed trunk inspection
never gives letter, unknown targets and remote talk fail.

Ghost observe fields:
room:{id,name,description}, rooms:[{id,name,locked}], targets:[{id,label}],
characters:[{id,name,topics:[{id,label}]}], inventory:[{id,label}],
clues:[{id,title,text}], journal:string[], ending:null|{id,title,text},
actions:string[] currently relevant IDs. Initial observe must NOT include
Evelyn, 0813, or 8:13. Hint text must not reveal undiscovered answers.

Letters world id lost-letters. Actions:
set_brief {recipient,memory,wish,promise}, compose {tone}, revise {tone},
edit {text}, undo {}, seal {}. Tones warm/gentle/clear. Recipient and memory
required to compose. Keep prior drafts for undo, edits unseal, seal emits
{name,mime:'text/plain',text} artifact. Guided composer uses authored templates,
no pretend AI. Public fields brief,tone,draft,sealed,canUndo,versions(count),
journal,actions. Strictly validate inputs/saves, reject unknown fields, set
reasonable field length bounds. Free text is data, never game rules.

State modules do not import DOM, Node-only APIs or transport libraries. Browser
storage is on-device. MCP sessions stay in that MCP process.
