/**
 * Mock data for the first builds. Profiles use catalog vocabulary
 * (src/data/catalog.ts) so the commonality engine produces strong, realistic
 * matches. Commonalities are no longer hand-written — they're computed from
 * these profiles by src/engine/commonality.ts.
 */
import { palette } from '../theme/colors';
import { Connection, HandleSource, Nudge, User } from './types';

/** The signed-in user. */
export const currentUser: User = {
  id: 'me',
  name: 'Bryn Jorgensen',
  avatarColor: palette.orange,
  interests: ['Film', 'Running', 'Vinyl'],
  hobbies: [
    'Photography', 'Running', 'Cooking', 'Collecting vinyl records',
    'Rock climbing', 'Watching movies', 'Coffee culture',
  ],
  topHobbies: ['Photography', 'Running', 'Cooking', 'Rock climbing', 'Collecting vinyl records'],
  bucketList: ['Run a marathon', 'See the Northern Lights', 'Learn to surf'],
  certifications: ['First Aid / CPR'],
  travel: ['Lisbon', 'Mexico City', 'Tokyo'],
  lifeExperiences: ['Lived abroad in Berlin', 'Ran a supper club'],
  handles: [
    { source: 'instagram', value: '@bryn.jpg' },
    { source: 'letterboxd', value: 'brynj', dataPulled: true },
    { source: 'strava', value: 'Bryn J', dataPulled: true },
    { source: 'spotify', value: 'brynj', dataPulled: true },
    { source: 'polarsteps', value: 'brynj', dataPulled: true },
  ],
  pulled: {
    spotify: {
      topArtists: ['Phoebe Bridgers', 'Khruangbin', 'Fleet Foxes', 'Sufjan Stevens'],
      topGenres: ['Indie folk', 'Indie rock'],
    },
    letterboxd: { favorites: ['Perfect Days', 'Past Lives', 'Aftersun'] },
    strava: { activities: ['Trail running', 'Road cycling'] },
    polarsteps: { places: ['Lisbon', 'Tokyo', 'Mexico City'] },
  },
  profileCompletion: 92,
};

/** The 18 V1 handle-sharing platforms, with display labels and tint colors. */
export const handleMeta: Record<
  HandleSource,
  { label: string; tint: string }
> = {
  instagram: { label: 'Instagram', tint: '#C13584' },
  snapchat: { label: 'Snapchat', tint: '#FFFC00' },
  linkedin: { label: 'LinkedIn', tint: '#0A66C2' },
  spotify: { label: 'Spotify', tint: '#1DB954' },
  letterboxd: { label: 'Letterboxd', tint: '#FF8000' },
  facebook: { label: 'Facebook', tint: '#1877F2' },
  twitter: { label: 'Twitter / X', tint: '#1a1a1a' },
  tiktok: { label: 'TikTok', tint: '#1a1a1a' },
  goodreads: { label: 'Goodreads', tint: '#9D8B73' },
  strava: { label: 'Strava', tint: '#FC4C02' },
  duolingo: { label: 'Duolingo', tint: '#58CC02' },
  chesscom: { label: 'Chess.com', tint: '#7FA650' },
  yelp: { label: 'Yelp', tint: '#FF1A1A' },
  opentable: { label: 'OpenTable', tint: '#DA3743' },
  polarsteps: { label: 'Polarsteps', tint: '#FF5C5C' },
  meetup: { label: 'Meetup', tint: '#ED1C40' },
  bandsintown: { label: 'Bandsintown', tint: '#00B4B3' },
  steam: { label: 'Steam', tint: '#1B2838' },
};

export const connections: Connection[] = [
  {
    id: 'sarah',
    user: {
      id: 'sarah',
      name: 'Sarah Chen',
      avatarColor: palette.navy,
      interests: ['Ceramics', 'Running', 'Film'],
      hobbies: ['Pottery / ceramics', 'Running', 'Photography', 'Hiking'],
      topHobbies: ['Pottery / ceramics', 'Running', 'Photography'],
      bucketList: ['Hike the Pacific Crest Trail', 'Run a marathon'],
      certifications: [],
      travel: ['Tokyo', 'Lisbon'],
      lifeExperiences: ['Did a ceramics residency in Japan'],
      handles: [
        { source: 'instagram', value: '@sarahmakes' },
        { source: 'strava', value: 'Sarah Chen', dataPulled: true },
        { source: 'letterboxd', value: 'sarahc', dataPulled: true },
        { source: 'spotify', value: 'sarahc', dataPulled: true },
      ],
      pulled: {
        spotify: { topArtists: ['Fleet Foxes', 'Big Thief'], topGenres: ['Indie folk'] },
        letterboxd: { favorites: ['Perfect Days', 'Portrait of a Lady on Fire'] },
        strava: { activities: ['Trail running'] },
      },
      recentlyAdded: ['Photography'],
      connectionIds: ['dana', 'priya', 'theo', 'maya'],
      profileCompletion: 92,
    },
    method: 'nfc',
    connectionType: 'friend',
    metContext: { location: 'Trail running club', event: 'Saturday meetup' },
    sharedContactInfo: ['instagram', 'strava'],
    nudgeCadence: 'monthly',
    lastContacted: '2026-06-10',
    nextNudge: '2026-06-28',
    contactHistory: [
      { id: 'h1', date: '2026-06-10', via: 'instagram', note: 'Sent her a trail rec' },
      { id: 'h2', date: '2026-05-22', via: 'strava' },
    ],
  },
  {
    id: 'marcus',
    user: {
      id: 'marcus',
      name: 'Marcus Bell',
      avatarColor: palette.yellow,
      interests: ['Vinyl', 'Cooking', 'Chess'],
      hobbies: ['Collecting vinyl records', 'Cooking', 'Chess'],
      topHobbies: ['Collecting vinyl records', 'Cooking', 'Chess'],
      bucketList: ['Start a blog or YouTube channel'],
      certifications: ['Bartending / Mixology'],
      travel: ['Mexico City'],
      lifeExperiences: ['Ran a supper club'],
      handles: [
        { source: 'spotify', value: 'marcusb', dataPulled: true },
        { source: 'instagram', value: '@marcuscooks' },
      ],
      pulled: {
        spotify: { topArtists: ['Khruangbin', 'Marvin Gaye', 'Hiatus Kaiyote'], topGenres: ['Soul', 'Funk'] },
      },
      connectionIds: ['dana'],
      profileCompletion: 72,
    },
    method: 'sms',
    connectionType: 'friend',
    metContext: { event: 'Dinner party', location: 'Dana’s place' },
    sharedContactInfo: ['instagram', 'spotify'],
    nudgeCadence: 'monthly',
    lastContacted: null,
    nextNudge: '2026-06-27',
    contactHistory: [],
  },
  {
    id: 'dana',
    user: {
      id: 'dana',
      name: 'Dana Okafor',
      avatarColor: palette.orange,
      interests: ['Bouldering', 'Coffee', 'Reading'],
      hobbies: ['Rock climbing', 'Coffee culture', 'Reading'],
      topHobbies: ['Rock climbing', 'Coffee culture', 'Reading'],
      bucketList: ['Learn to surf'],
      certifications: [],
      travel: ['Lisbon'],
      lifeExperiences: [],
      handles: [
        { source: 'instagram', value: '@danaclimbs' },
        { source: 'spotify', value: 'danao', dataPulled: true },
      ],
      pulled: {
        spotify: { topArtists: ['Fleet Foxes', 'Bon Iver'], topGenres: ['Indie folk'] },
      },
      connectionIds: ['marcus', 'sarah', 'nadia', 'owen'],
      profileCompletion: 60,
    },
    method: 'search',
    connectionType: 'acquaintance',
    metContext: { location: 'Climbing gym' },
    sharedContactInfo: ['instagram'],
    nudgeCadence: 'quarterly',
    lastContacted: '2026-05-01',
    nextNudge: '2026-07-15',
    contactHistory: [{ id: 'h3', date: '2026-05-01', via: 'instagram' }],
  },
  {
    id: 'priya',
    user: {
      id: 'priya',
      name: 'Priya Nair',
      avatarColor: palette.navy,
      interests: ['Live music', 'Travel', 'Photography'],
      hobbies: ['Attending concerts', 'Travel', 'Photography'],
      topHobbies: ['Attending concerts', 'Photography', 'Travel'],
      bucketList: ['Attend a major music festival'],
      certifications: [],
      travel: ['Tokyo', 'Mexico City', 'Lisbon'],
      lifeExperiences: ['Backpacked solo through SE Asia'],
      handles: [
        { source: 'bandsintown', value: 'priyan', dataPulled: true },
        { source: 'instagram', value: '@priya.shoots' },
        { source: 'letterboxd', value: 'priyan', dataPulled: true },
      ],
      pulled: {
        bandsintown: { artists: ['Phoebe Bridgers', 'Beach House'] },
        letterboxd: { favorites: ['Past Lives', 'Call Me By Your Name'] },
      },
      recentlyAdded: ['Running'],
      connectionIds: ['sarah'],
      profileCompletion: 84,
    },
    method: 'nfc',
    connectionType: 'friend',
    metContext: { event: 'Indie show', location: 'Baby’s All Right' },
    sharedContactInfo: ['instagram', 'bandsintown'],
    nudgeCadence: 'weekly',
    lastContacted: '2026-06-20',
    nextNudge: '2026-06-29',
    contactHistory: [{ id: 'h4', date: '2026-06-20', via: 'instagram' }],
  },
];

/** Lookup helper used by the connection profile route. */
export function getConnection(id: string): Connection | undefined {
  return connections.find((c) => c.id === id);
}

/** The connection surfaced on the icebreaker / post-bump screen by default. */
export const justBumped: Connection = connections[0];

/**
 * Discoverable people for the connect / bump flow. Since NFC isn't wired yet,
 * the FAB "bumps" the next person from this pool that the user hasn't already
 * connected with, then routes to the icebreaker.
 */
export const newCandidates: Connection[] = [
  {
    id: 'theo',
    user: {
      id: 'theo',
      name: 'Theo Martins',
      avatarColor: palette.navy,
      interests: ['Cycling', 'Coffee', 'Film'],
      hobbies: ['Cycling', 'Coffee culture', 'Photography'],
      topHobbies: ['Cycling', 'Photography', 'Coffee culture'],
      bucketList: ['Ski in the Alps'],
      certifications: [],
      travel: ['Lisbon', 'Mexico City'],
      lifeExperiences: ['Bike-toured the Pyrenees'],
      handles: [
        { source: 'strava', value: 'Theo M', dataPulled: true },
        { source: 'instagram', value: '@theoshoots' },
        { source: 'letterboxd', value: 'theom', dataPulled: true },
        { source: 'spotify', value: 'theom', dataPulled: true },
      ],
      pulled: {
        spotify: { topArtists: ['Khruangbin', 'Tame Impala'], topGenres: ['Indie rock'] },
        letterboxd: { favorites: ['Aftersun', 'Drive'] },
        strava: { activities: ['Road cycling'] },
      },
      connectionIds: ['sarah'],
      profileCompletion: 88,
    },
    method: 'nfc',
    connectionType: 'friend',
    metContext: { event: 'Saturday group ride' },
    sharedContactInfo: ['strava', 'instagram'],
    nudgeCadence: 'monthly',
    lastContacted: null,
    nextNudge: null,
    contactHistory: [],
  },
  {
    id: 'nadia',
    user: {
      id: 'nadia',
      name: 'Nadia Rahman',
      avatarColor: palette.orange,
      interests: ['Reading', 'Pottery', 'Coffee'],
      hobbies: ['Reading', 'Pottery / ceramics', 'Coffee culture'],
      topHobbies: ['Reading', 'Pottery / ceramics', 'Coffee culture'],
      bucketList: ['Write a book'],
      certifications: ['Tutor'],
      travel: ['Tokyo'],
      lifeExperiences: ['Ran a bookshop pop-up'],
      handles: [
        { source: 'goodreads', value: 'nadiar', dataPulled: true },
        { source: 'instagram', value: '@nadiamakes' },
      ],
      pulled: {
        goodreads: {
          favorites: ['Tomorrow, and Tomorrow, and Tomorrow'],
          reading: ['The Overstory'],
        },
      },
      connectionIds: ['dana'],
      profileCompletion: 78,
    },
    method: 'nfc',
    connectionType: 'friend',
    metContext: { event: 'Book club' },
    sharedContactInfo: ['instagram', 'goodreads'],
    nudgeCadence: 'monthly',
    lastContacted: null,
    nextNudge: null,
    contactHistory: [],
  },
];

/** Builds a not-yet-connected directory person with sensible defaults. */
function directoryPerson(user: User): Connection {
  return {
    id: user.id,
    user,
    method: 'search',
    connectionType: 'friend',
    metContext: { event: 'Found on Knowable' },
    sharedContactInfo: user.handles.map((h) => h.source).slice(0, 3),
    nudgeCadence: 'monthly',
    lastContacted: null,
    nextNudge: null,
    contactHistory: [],
  };
}

/**
 * Searchable directory — people who have the app (Spec §5B Method 3). Includes
 * the bump candidates plus a few more so search returns results. Already-
 * connected people are filtered out at search time.
 */
export const directory: Connection[] = [
  ...newCandidates,
  directoryPerson({
    id: 'maya',
    name: 'Maya Lin',
    avatarColor: palette.navy,
    interests: ['Photography', 'Cooking', 'Hiking'],
    hobbies: ['Photography', 'Cooking', 'Hiking'],
    topHobbies: ['Photography', 'Cooking'],
    bucketList: ['See the Northern Lights'],
    certifications: [],
    travel: ['Tokyo'],
    lifeExperiences: [],
    handles: [
      { source: 'instagram', value: '@mayamakes' },
      { source: 'spotify', value: 'mayal', dataPulled: true },
    ],
    pulled: { spotify: { topArtists: ['Fleet Foxes', 'Sufjan Stevens'], topGenres: ['Indie folk'] } },
    connectionIds: ['sarah'],
    profileCompletion: 80,
  }),
  directoryPerson({
    id: 'liam',
    name: 'Liam Walsh',
    avatarColor: palette.yellow,
    interests: ['Chess', 'Reading'],
    hobbies: ['Chess', 'Reading'],
    topHobbies: ['Chess'],
    bucketList: [],
    certifications: [],
    travel: [],
    lifeExperiences: [],
    handles: [{ source: 'chesscom', value: 'liamw' }],
    profileCompletion: 40,
  }),
  directoryPerson({
    id: 'owen',
    name: 'Owen Reyes',
    avatarColor: palette.orange,
    interests: ['Rock climbing', 'Coffee'],
    hobbies: ['Rock climbing', 'Coffee culture'],
    topHobbies: ['Rock climbing'],
    bucketList: ['Learn to surf'],
    certifications: [],
    travel: ['Lisbon'],
    lifeExperiences: [],
    handles: [{ source: 'instagram', value: '@owenclimbs' }],
    connectionIds: ['dana'],
    profileCompletion: 55,
  }),
];

/**
 * Directory people who ignore connect requests (mock disposition). Lets the
 * Search flow demonstrate the ignore / 3-tries / pending-indefinitely logic
 * (§5B Method 3) self-contained — everyone else accepts.
 */
export const searchIgnorers: string[] = ['liam'];

/** Seed incoming connect requests the user can accept or ignore (§5B). */
export const incomingRequestsSeed: { id: string; connection: Connection; note?: string }[] = [
  {
    id: 'req-jess',
    note: 'We met at the climbing gym — let’s connect!',
    connection: directoryPerson({
      id: 'jess',
      name: 'Jess Park',
      avatarColor: palette.navy,
      interests: ['Running', 'Photography', 'Baking'],
      hobbies: ['Running', 'Photography', 'Baking'],
      topHobbies: ['Running', 'Photography'],
      bucketList: ['Run a marathon'],
      certifications: [],
      travel: ['Mexico City'],
      lifeExperiences: [],
      handles: [
        { source: 'instagram', value: '@jessruns' },
        { source: 'strava', value: 'Jess Park', dataPulled: true },
      ],
      pulled: { strava: { activities: ['Trail running'] } },
      profileCompletion: 75,
    }),
  },
];

/**
 * Seed time-based nudges. Event-based nudges (when a connection adds something
 * you share) are generated from each connection's `recentlyAdded` — see
 * generateEventNudges in src/engine/nudges.ts.
 */
export const nudges: Nudge[] = [
  {
    id: 'n1',
    connectionId: 'marcus',
    trigger: 'time',
    message: 'It’s been a while — reach out to Marcus about that supper club.',
    scheduledDate: '2026-06-27',
    response: null,
    due: true,
  },
];

/** Marquee ticker phrases (§ Marquee). */
export const marqueePhrases: string[] = [
  'KNOWABLE',
  'SHOW UP FOR THE PEOPLE WORTH KEEPING',
  'FOLLOW-THROUGH, NOT FOLLOWERS',
  'REAL FRIENDSHIPS',
];
