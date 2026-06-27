/**
 * Mock data for the first build. Realistic sample content so the screens read
 * like the real product. Replace with API/persistence in a later milestone.
 */
import { palette } from '../theme/colors';
import {
  Connection,
  HandleSource,
  Nudge,
  User,
} from './types';

/** The signed-in user. */
export const currentUser: User = {
  id: 'me',
  name: 'Bryn Jorgensen',
  avatarColor: palette.orange,
  interests: ['Film', 'Running', 'Vinyl'],
  hobbies: ['Bouldering', 'Film photography', 'Cooking', 'Vinyl collecting', 'Trail running'],
  bucketList: ['See the northern lights', 'Run a marathon', 'Learn to surf'],
  travel: ['Lisbon', 'Mexico City', 'Tokyo'],
  lifeExperiences: ['Lived abroad in Berlin', 'Ran a supper club'],
  handles: [
    { source: 'instagram', value: '@bryn.jpg' },
    { source: 'letterboxd', value: 'brynj' },
    { source: 'strava', value: 'Bryn J' },
    { source: 'spotify', value: 'brynj' },
  ],
  profileCompletion: 72,
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

/** Hobby pool for onboarding (narrow to top 5, §5A). */
export const hobbyPool: string[] = [
  'Bouldering',
  'Film photography',
  'Vinyl collecting',
  'Trail running',
  'Cooking',
  'Pottery',
  'Cycling',
  'Live music',
  'Reading',
  'Hiking',
  'Board games',
  'Coffee',
  'Surfing',
  'Painting',
  'Yoga',
  'Chess',
  'Gardening',
  'Baking',
  'Travel',
  'Thrifting',
];

export const connections: Connection[] = [
  {
    id: 'sarah',
    user: {
      id: 'sarah',
      name: 'Sarah Chen',
      avatarColor: palette.navy,
      interests: ['Ceramics', 'Trail running', 'Film'],
      hobbies: ['Pottery', 'Trail running', 'Film photography'],
      bucketList: ['Thru-hike the PCT'],
      travel: ['Tokyo', 'Lisbon'],
      lifeExperiences: ['Did a ceramics residency in Japan'],
      handles: [
        { source: 'instagram', value: '@sarahmakes' },
        { source: 'strava', value: 'Sarah Chen' },
        { source: 'letterboxd', value: 'sarahc' },
      ],
      profileCompletion: 90,
    },
    method: 'nfc',
    connectionType: 'friend',
    metContext: 'Trail running club, Saturday meetup',
    sharedContactInfo: ['instagram', 'strava'],
    nudgeCadence: 'monthly',
    lastContacted: '2026-06-10',
    nextNudge: '2026-06-28',
    commonalities: [
      {
        id: 'c1',
        category: 'Fitness',
        title: 'You both trail run',
        detail: 'Sarah logged 32km on Strava this week — ask about her route.',
        source: 'strava',
      },
      {
        id: 'c2',
        category: 'Film',
        title: 'Both love slow cinema',
        detail: 'You both five-starred "Perfect Days" on Letterboxd.',
        source: 'letterboxd',
      },
      {
        id: 'c3',
        category: 'Travel',
        title: 'Both spent time in Tokyo',
        detail: 'Sarah did a ceramics residency there.',
      },
    ],
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
      hobbies: ['Vinyl collecting', 'Cooking', 'Chess'],
      bucketList: ['Open a record store'],
      travel: ['Mexico City'],
      lifeExperiences: ['Ran a supper club'],
      handles: [
        { source: 'spotify', value: 'marcusb' },
        { source: 'instagram', value: '@marcuscooks' },
      ],
      profileCompletion: 65,
    },
    method: 'sms',
    connectionType: 'friend',
    metContext: 'Dinner party at Dana’s',
    sharedContactInfo: ['instagram', 'spotify'],
    nudgeCadence: 'monthly',
    lastContacted: null,
    nextNudge: '2026-06-27',
    commonalities: [
      {
        id: 'c4',
        category: 'Music',
        title: 'Both collect vinyl',
        detail: 'Marcus shares your taste in 70s soul on Spotify.',
        source: 'spotify',
      },
      {
        id: 'c5',
        category: 'Food',
        title: 'You both host supper clubs',
      },
    ],
    contactHistory: [],
  },
  {
    id: 'dana',
    user: {
      id: 'dana',
      name: 'Dana Okafor',
      avatarColor: palette.orange,
      interests: ['Bouldering', 'Coffee', 'Reading'],
      hobbies: ['Bouldering', 'Coffee', 'Reading'],
      bucketList: ['Climb in Fontainebleau'],
      travel: ['Lisbon'],
      lifeExperiences: [],
      handles: [{ source: 'instagram', value: '@danaclimbs' }],
      profileCompletion: 48,
    },
    method: 'search',
    connectionType: 'acquaintance',
    metContext: 'Climbing gym',
    sharedContactInfo: ['instagram'],
    nudgeCadence: 'quarterly',
    lastContacted: '2026-05-01',
    nextNudge: '2026-07-15',
    commonalities: [
      {
        id: 'c6',
        category: 'Fitness',
        title: 'You both boulder',
        detail: 'Dana wants to climb in Fontainebleau — so do you.',
      },
    ],
    contactHistory: [
      { id: 'h3', date: '2026-05-01', via: 'instagram' },
    ],
  },
  {
    id: 'priya',
    user: {
      id: 'priya',
      name: 'Priya Nair',
      avatarColor: palette.navy,
      interests: ['Live music', 'Travel', 'Photography'],
      hobbies: ['Live music', 'Travel', 'Film photography'],
      bucketList: ['See a show in every borough'],
      travel: ['Tokyo', 'Mexico City', 'Lisbon'],
      lifeExperiences: ['Backpacked solo through SE Asia'],
      handles: [
        { source: 'bandsintown', value: 'priyan' },
        { source: 'instagram', value: '@priya.shoots' },
      ],
      profileCompletion: 80,
    },
    method: 'nfc',
    connectionType: 'friend',
    metContext: 'Indie show at Baby’s All Right',
    sharedContactInfo: ['instagram', 'bandsintown'],
    nudgeCadence: 'weekly',
    lastContacted: '2026-06-20',
    nextNudge: '2026-06-29',
    commonalities: [
      {
        id: 'c7',
        category: 'Music',
        title: 'Both into live shows',
        detail: 'Priya has 3 upcoming shows on Bandsintown.',
        source: 'bandsintown',
      },
      {
        id: 'c8',
        category: 'Photography',
        title: 'Both shoot film',
      },
      {
        id: 'c9',
        category: 'Travel',
        title: 'Both spent time in Lisbon',
      },
    ],
    contactHistory: [
      { id: 'h4', date: '2026-06-20', via: 'instagram' },
    ],
  },
];

/** Lookup helper used by the connection profile route. */
export function getConnection(id: string): Connection | undefined {
  return connections.find((c) => c.id === id);
}

/** The connection surfaced on the icebreaker / post-bump screen. */
export const justBumped: Connection = connections[0];

/** Active nudges for the home screen. */
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
  {
    id: 'n2',
    connectionId: 'sarah',
    trigger: 'event',
    message: 'Sarah just added she’s into ceramics — you are too.',
    scheduledDate: '2026-06-28',
    response: null,
    due: false,
  },
];

/** Marquee ticker phrases (§ Marquee). */
export const marqueePhrases: string[] = [
  'KNOWABLE',
  'SHOW UP FOR THE PEOPLE WORTH KEEPING',
  'FOLLOW-THROUGH, NOT FOLLOWERS',
  'REAL FRIENDSHIPS',
];
