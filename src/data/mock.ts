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
      profileCompletion: 92,
    },
    method: 'nfc',
    connectionType: 'friend',
    metContext: 'Trail running club, Saturday meetup',
    mutuals: ['Dana Okafor'],
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
      profileCompletion: 72,
    },
    method: 'sms',
    connectionType: 'friend',
    metContext: 'Dinner party at Dana’s',
    mutuals: ['Dana Okafor'],
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
      profileCompletion: 60,
    },
    method: 'search',
    connectionType: 'acquaintance',
    metContext: 'Climbing gym',
    mutuals: ['Marcus Bell', 'Sarah Chen'],
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
      profileCompletion: 84,
    },
    method: 'nfc',
    connectionType: 'friend',
    metContext: 'Indie show at Baby’s All Right',
    mutuals: ['Sarah Chen'],
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
      profileCompletion: 88,
    },
    method: 'nfc',
    connectionType: 'friend',
    metContext: 'Saturday group ride',
    mutuals: ['Sarah Chen'],
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
      profileCompletion: 78,
    },
    method: 'nfc',
    connectionType: 'friend',
    metContext: 'Book club',
    mutuals: ['Dana Okafor'],
    sharedContactInfo: ['instagram', 'goodreads'],
    nudgeCadence: 'monthly',
    lastContacted: null,
    nextNudge: null,
    contactHistory: [],
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
