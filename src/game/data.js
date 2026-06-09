// ============ PINK SIGNAL — story data ============
// All characters, events and organizations are entirely fictional.

const asset = (path) => `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`;

export const CHARACTERS = {
  zara: {
    name: 'Zara “Pinky” Shah',
    short: 'Zara',
    role: 'Socialite. Event planner. Survivor.',
    desc: 'The face of a hidden elite network.',
    portrait: asset('/portraits/zara.png'),
    vo: 'Everyone knew her as Pinky. Some called her dangerous. Some called her powerful. But no one knew how she became part of the game.',
    voice: { pitch: 1.12, rate: 0.96, gender: 'f' },
    look: { outfit: 0x241019, accent: 0xff2d7e, skin: 0xc9987d, hair: 0x140b08, hairLong: true },
  },
  rayyan: {
    name: 'Rayyan Malik',
    short: 'Rayyan',
    role: 'Cybercrime analyst. Quiet, smart, and obsessed with the truth.',
    desc: 'A digital hunter who lives between deleted files and hidden backups.',
    portrait: asset('/portraits/rayyan.png'),
    vo: 'Rayyan was not a field officer. He was a digital hunter. Phones, chats, deleted files, hidden backups — that was his world.',
    voice: { pitch: 1.0, rate: 0.97, gender: 'm' },
    look: { outfit: 0x2a2d33, accent: 0x4d7fb5, skin: 0xb98a64, hair: 0x16100c },
  },
  haris: {
    name: 'DSP Haris Qureshi',
    short: 'Haris',
    role: 'Senior investigator. Honest, tired, and carrying too many buried cases.',
    desc: 'He has seen the system from the inside — and what it does to the truth.',
    portrait: asset('/portraits/haris.png'),
    vo: 'Haris had seen the system from the inside. He knew the truth was never enough. You needed proof that could survive power.',
    voice: { pitch: 0.78, rate: 0.88, gender: 'm' },
    look: { outfit: 0x3a3526, accent: 0xc9a45c, skin: 0xb08158, hair: 0x4a4a4a },
  },
  mahnoor: {
    name: 'Mahnoor Ali',
    short: 'Mahnoor',
    role: 'Investigative journalist. Brave, sharp, and willing to risk everything.',
    desc: 'She follows the story when everyone else looks away.',
    portrait: asset('/portraits/mahnoor.png'),
    vo: 'Mahnoor followed the story when everyone else looked away. She knew the case was bigger than one woman.',
    voice: { pitch: 1.18, rate: 1.0, gender: 'f' },
    look: { outfit: 0x1c2026, accent: 0x4d7fb5, skin: 0xc09070, hair: 0x17100a, hairLong: true },
  },
  sami: {
    name: 'Sami Khan',
    short: 'Sami',
    role: 'Hacker friend. Funny, nervous, loyal, and dangerously useful.',
    desc: 'He can unlock a phone, trace a number, and panic — all at the same time.',
    portrait: asset('/portraits/sami.png'),
    vo: 'Sami could unlock a phone, trace a number, and panic at the same time. But when things got dark, he never left.',
    voice: { pitch: 1.22, rate: 1.1, gender: 'm' },
    look: { outfit: 0x20262a, accent: 0x35d08a, skin: 0xb98a64, hair: 0x100b08 },
  },
  mirza: {
    name: 'Senator Jalal Mirza',
    short: 'Mirza',
    role: 'Public leader. Private monster. A man protected by influence.',
    desc: 'He never touches the dirt. He owns the people who clean it for him.',
    portrait: asset('/portraits/mirza.png'),
    vo: 'Mirza never touched the dirt. He only owned the people who cleaned it for him.',
    voice: { pitch: 0.7, rate: 0.85, gender: 'm' },
    look: { outfit: 0x14151c, accent: 0xc9a45c, skin: 0xb08560, hair: 0x6b6b70 },
  },
  naveed: {
    name: 'Inspector Naveed Rana',
    short: 'Naveed',
    role: 'Corrupt officer. Case fixer. Evidence destroyer.',
    desc: 'He knows where the files are buried, because he buried many of them himself.',
    portrait: asset('/portraits/naveed.png'),
    vo: 'Naveed knew where the files were buried because he buried many of them himself.',
    voice: { pitch: 0.82, rate: 0.92, gender: 'm' },
    look: { outfit: 0x16181d, accent: 0xb3122e, skin: 0x9e6e4a, hair: 0x111009 },
  },
  ayan: {
    name: 'Ayan Sheikh',
    short: 'Ayan',
    role: 'Witness. Victim. A young man who saw too much.',
    desc: 'He entered the parties for fun. He left with fear.',
    portrait: asset('/portraits/ayan.png'),
    vo: 'Ayan entered the parties for fun. He left with fear.',
    voice: { pitch: 1.15, rate: 1.04, gender: 'm' },
    look: { outfit: 0x23262e, accent: 0x6b7280, skin: 0xbb8d68, hair: 0x100b08 },
  },
  // minor cast
  mahira: {
    name: 'Mahira', short: 'Mahira', role: 'Event assistant',
    portrait: asset('/portraits/zara.png'), hidePortrait: true,
    voice: { pitch: 1.25, rate: 1.05, gender: 'f' },
    look: { outfit: 0x2c1f2a, accent: 0xc9a45c, skin: 0xc09070, hair: 0x17100a, hairLong: true },
  },
  bluesuit: {
    name: 'Man in the Blue Suit', short: 'Blue Suit', role: 'Courier of the Circle',
    portrait: null,
    voice: { pitch: 0.9, rate: 0.9, gender: 'm' },
    look: { outfit: 0x18243d, accent: 0x4d7fb5, skin: 0xa97f58, hair: 0x14100c },
  },
  police: {
    name: 'Police', short: 'Police', role: '', portrait: null,
    voice: { pitch: 0.85, rate: 1.05, gender: 'm' },
    look: { outfit: 0x1c2230, accent: 0x4d7fb5, skin: 0xa97f58, hair: 0x111111 },
  },
  guard: {
    name: 'Guard', short: 'Guard', role: '', portrait: null,
    voice: { pitch: 0.85, rate: 1.0, gender: 'm' },
    look: { outfit: 0x14141a, accent: 0x55585e, skin: 0xa97f58, hair: 0x111111 },
  },
  reporter: {
    name: 'Reporter', short: 'Reporter', role: '', portrait: null,
    voice: { pitch: 1.1, rate: 1.12, gender: 'f' },
    look: { outfit: 0x2a2330, accent: 0xc9a45c, skin: 0xc09070, hair: 0x17100a, hairLong: true },
  },
  narrator: {
    name: 'Narrator', short: '', role: '', portrait: null,
    voice: { pitch: 0.92, rate: 0.9, gender: 'm' },
  },
  unknown: {
    name: 'Unknown Number', short: 'Unknown', role: '', portrait: null,
    voice: { pitch: 0.6, rate: 0.82, gender: 'm' },
  },
};

export const INTRO_ORDER = ['zara', 'rayyan', 'haris', 'mahnoor', 'sami', 'mirza', 'naveed', 'ayan'];

// ---------- Opening cinematic (luxury apartment, night, rain) ----------
export const OPENING_SCENE = [
  { who: 'narrator', text: 'A city by the sea. Night. Rain against glass. Somewhere above the lights, a deal is going wrong.' },
  { who: 'mirza', text: 'You are becoming too visible, Zara.' },
  { who: 'zara', text: 'You made me visible.' },
  { who: 'mirza', text: 'I made you useful.' },
  { who: 'zara', text: 'And now?' },
  { who: 'mirza', text: 'Now you will follow instructions.' },
  { who: 'zara', text: 'I have names. Dates. Payments. Messages.' },
  { who: 'mirza', text: 'And I have police, media, and courts.' },
  { who: 'narrator', text: 'Zara looks at the pink handbag on the table.', action: 'lookBag' },
  { who: 'zara', text: 'You think I kept everything in one place?' },
  { who: 'narrator', text: 'Mirza turns slowly.', action: 'mirzaTurn' },
  { who: 'mirza', text: 'Careful, Pinky. People like you do not disappear loudly.' },
  { who: 'narrator', text: 'Police sirens. The room flashes red and blue.', action: 'sirens' },
  { who: 'zara', text: 'You came here to warn me.' },
  { who: 'mirza', text: 'No. I came here to see if you were scared.' },
  { who: 'police', text: 'Open the door!', action: 'knock' },
  { who: 'narrator', text: 'Breathing. A heartbeat, getting louder.', action: 'heartbeat' },
];

// ---------- Endings ----------
export const ENDINGS = {
  good: {
    kind: 'Good Ending',
    title: 'The Lights Turn On',
    body:
      'The upload spreads faster than any denial can chase it.\n' +
      'Mahnoor’s report runs at dawn. Rayyan’s files reach an honest court.\n' +
      'Senator Jalal Mirza is exposed. Inspector Naveed Rana is arrested at his own station.\n' +
      'Zara enters witness protection under a name no one will ever say at a party.\n' +
      'The system is damaged — but not fully destroyed. Somewhere, new circles are already forming.\n' +
      'But tonight, for once, the lights are on.',
    quote: '“They called me Pinky like it was a joke. But I was the signal. And this time, everyone saw it.”',
    attr: '— Zara “Pinky” Shah',
  },
  dark: {
    kind: 'Dark Ending',
    title: 'The Scapegoat',
    body:
      'The headlines need one face, and they choose hers.\n' +
      'The evidence is gone — deleted, buried, edited. The powerful men in the photographs were never in the photographs.\n' +
      'Zara is blamed for everything. The trial is quick. The cameras are quicker.\n' +
      'Within a month, the news channels move on to a new story, a new face, a new fire.\n' +
      'The Circle holds its next party on schedule.',
    quote: '“In this city, truth does not lose. It gets edited.”',
    attr: '— Zara “Pinky” Shah',
  },
  power: {
    kind: 'Power Ending',
    title: 'Queen of the Circle',
    body:
      'The deal is signed in silence, the way all real deals are.\n' +
      'Ayan’s name disappears from the witness list. Mahnoor’s story dies in a lawyer’s drawer.\n' +
      'Mirza keeps his seat. And Zara — Zara keeps his secrets.\n' +
      'She survives. She rises. Part of the network now answers to her.\n' +
      'She is colder than before. More careful. More dangerous.\n' +
      'The pink signal still appears in the city at night. Now, it is hers.',
    quote: '“They wanted a face for their sins. I became the face they feared.”',
    attr: '— Zara “Pinky” Shah',
  },
  escape: {
    kind: 'Escape Ending',
    title: 'Ghost Signal',
    body:
      'No upload. No deal. No body. Just an empty rooftop and a phone left in the rain.\n' +
      'The police search the airports. Mirza’s men search everywhere else.\n' +
      'They find nothing. Zara “Pinky” Shah is simply… gone.\n' +
      'Months later, anonymous leaks begin appearing online. A payment here. A guest list there.\n' +
      'Always at night. Always untraceable. Always pink.',
    quote: '“Pink Signal is active again.”',
    attr: '— Unknown Voice Note',
  },
};

// ---------- Phone seed content ----------
export const PHONE_SEED = {
  messages: [
    { from: 'Mahira', time: '9:12 PM', body: 'Pinky, the guest list for Saturday is confirmed. Table seven asked for you personally. Again.' },
    { from: 'Sami Khan', time: '8:47 PM', body: 'yo don’t use the old number anymore. and DELETE this. actually wait, don’t delete it, I sound suspicious. ok delete it.' },
  ],
  threats: [],
  news: [
    { from: 'CITY NEWS 24', time: 'Tonight', body: 'Glamour and questions: who really pays for the city’s most exclusive parties? Our special report, tonight at 11.' },
  ],
  notes: [
    { from: 'My Notes', time: '—', body: 'Remember: smile at everyone, trust no one, and never let the bag out of your sight.' },
  ],
  calls: [],
  gallery: [],
};

export const EVIDENCE_DEFS = {
  ev_pinkbox: { name: 'The Pink Box', desc: 'A sealed pink box meant for “table seven”. No label. No sender. Heavy with someone else’s sins.' },
  ev_note: { name: 'Hidden Note', desc: 'Slipped under the door: “The signal comes tonight. Be ready. — J.M.”' },
  ev_voicenote: { name: 'Mirza’s Voice Message', desc: 'A recording of Senator Mirza giving instructions about “the pink signal”. Proof of control.' },
  ev_guestlist: { name: 'Farmhouse Guest List', desc: 'A photograph of names that should never appear on the same page: judges, officers, anchors.' },
  ev_basement: { name: 'Basement Door Photo', desc: 'A reinforced door at a private farmhouse, guarded better than the main vault of a bank.' },
  ev_ayan: { name: 'Ayan’s Statement', desc: 'A voice note from a terrified student describing what happens at the “private floors”.' },
  ev_waiter: { name: 'Spy Waiter Photo', desc: 'A cafe waiter wearing an earpiece worth more than his yearly salary.' },
  ev_lawyer: { name: 'Lawyer’s Note', desc: '“Say nothing about the Senator. They only need one wrong sentence.”' },
  ev_drive: { name: 'Hard Drive 17', desc: 'The missing drive from file cabinet 17. Old cases. Familiar names. Buried on purpose.' },
  ev_tracker: { name: 'Handbag Tracker', desc: 'A tiny transmitter sewn into the lining of the pink handbag. Someone always knew where she was.' },
  ev_recording: { name: 'Meeting Recording', desc: 'Senator Mirza, on tape, dividing the city like a dinner bill.' },
  ev_ledger: { name: 'The Blackmail Ledger', desc: 'Photographs, payments, and names. The Circle’s real constitution.' },
};

export const MISSION_META = [
  { id: 1, title: 'The Party', location: 'Luxury Apartment Party — Shahbagh Tower' },
  { id: 2, title: 'The First Signal', location: 'Zara’s Apartment — Night' },
  { id: 3, title: 'Elite Circle', location: 'Private Farmhouse — Outskirts' },
  { id: 4, title: 'The Student', location: 'Parking Level B — Private Event' },
  { id: 5, title: 'Media Leak', location: 'Cafe Sarang — Old Quarter' },
  { id: 6, title: 'Court Pressure', location: 'City Court Complex' },
  { id: 7, title: 'Basement 17', location: 'Evidence Storage — Records Wing' },
  { id: 8, title: 'The Betrayal', location: 'Police Safe House — 3 AM' },
  { id: 9, title: 'The Farmhouse Return', location: 'Mirza’s Farmhouse — Final Infiltration' },
  { id: 10, title: 'Final Signal', location: 'Rooftop — Night — Rain' },
];

export const CREDITS = [
  { role: 'A Fictional Interactive Thriller', name: 'PINK SIGNAL' },
  { role: 'Starring', name: 'Zara “Pinky” Shah' },
  { role: 'With', name: 'Rayyan Malik · DSP Haris Qureshi · Mahnoor Ali' },
  { role: 'And', name: 'Sami Khan · Senator Jalal Mirza · Inspector Naveed Rana · Ayan Sheikh' },
  { role: 'Engine', name: 'Three.js · WebGL · Web Audio' },
  { role: 'Note', name: 'All characters, organizations and events in this game are entirely fictional. Any resemblance to real persons is unintentional.' },
];
