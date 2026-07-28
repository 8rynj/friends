/**
 * Catalog data — curated, de-duplicated, emoji-free interest/goal/skill lists
 * organized into sections. Drives the onboarding hobby picker and the
 * add-later profile editors, and provides the section labels the commonality
 * engine uses to categorize matches.
 *
 * Dedup rule: each item appears in exactly one section within a catalog (first
 * occurrence wins); near-duplicates from the source lists are collapsed.
 */

export interface CatalogSection {
  title: string;
  items: string[];
}

/** Hobbies & interests — used in onboarding and the Hobbies editor. */
export const hobbyCatalog: CatalogSection[] = [
  {
    title: 'Creative',
    items: [
      'Drawing', 'Painting', 'Watercolor', 'Digital art', 'Photography',
      'Calligraphy', 'Hand lettering', 'Scrapbooking', 'Journaling',
      'Bullet journaling', 'Creative writing', 'Poetry', 'Blogging', 'Writing',
      'DIY crafts', 'Knitting', 'Crocheting', 'Sewing', 'Embroidery',
      'Jewelry making', 'Candle making', 'Woodworking', 'Pottery / ceramics',
      'Graphic design',
    ],
  },
  {
    title: 'Active & Outdoor',
    items: [
      'Hiking', 'Walking', 'Running', 'Jogging', 'Cycling', 'Mountain biking',
      'Yoga', 'Pilates', 'Swimming', 'Rock climbing', 'Camping', 'Fishing',
      'Gardening', 'Birdwatching', 'Skateboarding', 'Roller skating',
      'Paddleboarding', 'Kayaking', 'Surfing', 'Frisbee', 'Snowboarding',
      'Skiing', 'Weightlifting', 'Fitness classes', 'Stretching / mobility',
    ],
  },
  {
    title: 'Social & Fun',
    items: [
      'Board games', 'Card games', 'Trivia nights', 'Karaoke', 'Dancing',
      'Hosting dinner parties', 'Wine tasting', 'Beer tasting',
      'Cooking with friends', 'Escape rooms', 'Bowling', 'Mini golf',
      'Pool / billiards', 'Darts', 'Volunteering', 'Book clubs', 'Game nights',
      'Travel planning', 'Meetup groups', 'Language exchange',
      'Mixology / cocktails',
    ],
  },
  {
    title: 'Learning & Mind',
    items: [
      'Reading', 'Learning a language', 'Podcasts', 'Documentaries', 'Chess',
      'Puzzles', 'Sudoku', 'Crossword puzzles', 'Coding', 'Investing',
      'Personal finance', 'History', 'Genealogy', 'Astronomy', 'Philosophy',
      'Meditation', 'Memory training', 'Debate', 'Online courses',
      'Public speaking', 'Science', 'Technology', 'AI / machine learning',
    ],
  },
  {
    title: 'Relaxed & Solo',
    items: [
      'Watching movies', 'TV shows', 'Listening to music',
      'Collecting vinyl records', 'Collecting (coins, stamps, etc.)', 'Baking',
      'Coffee brewing', 'Tea tasting', 'Coloring books', 'ASMR', 'Napping',
      'Window shopping', 'Thrifting', 'Interior decorating', 'Pet training',
      'Aquarium keeping', 'Origami', 'Model building', 'People watching',
      'Daydreaming',
    ],
  },
  {
    title: 'Music & Entertainment',
    items: [
      'Playing an instrument', 'Guitar', 'Piano', 'Singing', 'Anime', 'Manga',
      'Graphic novels', 'Video games', 'Theater / performing arts', 'Opera',
      'Classical music', 'Jazz', 'Pop music', 'Rock music', 'Hip-hop / rap',
      'EDM / electronic music', 'Attending concerts', 'Going to festivals',
      'Film festivals',
    ],
  },
  {
    title: 'Food & Drink',
    items: [
      'Cooking', 'Cooking new recipes', 'Trying new restaurants',
      'Coffee culture', 'Tea culture', 'Wine appreciation', 'Healthy eating',
      'Nutrition', 'Veganism / vegetarianism',
    ],
  },
  {
    title: 'Sports',
    items: ['Basketball', 'Soccer', 'Tennis', 'Golf', 'Playing sports'],
  },
  {
    title: 'Lifestyle & Wellness',
    items: [
      'Fitness', 'Mindfulness', 'Sleep optimization', 'Skincare',
      'Personal care', 'Haircare', 'Fashion', 'Streetwear',
      'Sustainable fashion', 'Watches', 'Mental health',
    ],
  },
  {
    title: 'Culture & Travel',
    items: [
      'Travel', 'Road trips', 'Adventure travel', 'Cultural experiences',
      'Museums', 'Art galleries', 'Architecture', 'Wildlife / nature',
      'Animals / pets', 'Environmentalism / sustainability',
      'Social justice / activism', 'Politics', 'Entrepreneurship',
    ],
  },
];

/** Bucket-list goals — used in the Bucket List editor. */
export const bucketListCatalog: CatalogSection[] = [
  {
    title: 'Travel & Adventure',
    items: [
      'Visit Paris', 'See the Northern Lights', 'Go on an African safari',
      'Visit the Great Wall of China', 'Explore the Amazon rainforest',
      'Visit the Galápagos Islands', 'See Machu Picchu',
      'Climb Mount Kilimanjaro', 'Hike the Inca Trail', 'Explore Iceland',
      'Road trip across the USA', 'Visit Japan', 'See cherry blossoms in Japan',
      'Visit Santorini', 'Tour Italy', 'Go to the Maldives',
      'Swim in the Great Barrier Reef', 'Visit Petra',
      "Explore Egypt's pyramids", 'Ride the Trans-Siberian Railway',
    ],
  },
  {
    title: 'Adventure & Thrills',
    items: [
      'Skydiving', 'Bungee jumping', 'Paragliding', 'Hot air balloon ride',
      'Scuba diving', 'Snorkel with sharks', 'Whitewater rafting', 'Zip-lining',
      'Caving / spelunking', 'Ski in the Alps', 'Ice climbing', 'Hang gliding',
      'Cliff diving', 'Sandboarding', 'ATV / dune buggy riding', 'Dog sledding',
      'Swim with dolphins', 'Whale watching',
    ],
  },
  {
    title: 'Skill Growth',
    items: [
      'Learn a new language', 'Learn to play an instrument', 'Write a book',
      'Start a blog or YouTube channel', 'Take a cooking class',
      'Take a photography course', 'Learn to dance', 'Learn to surf',
      'Take an art class', 'Become a yoga instructor', 'Take a martial arts class',
      'Learn woodworking', 'Learn to sail', 'Learn self-defense',
      'Take a public speaking course', 'Master meditation', 'Learn to ski',
      'Learn to ride a motorcycle', 'Take a mixology class', 'Learn to paint',
    ],
  },
  {
    title: 'Life Experiences',
    items: [
      'Attend the Olympics', 'Go to the Super Bowl', 'Attend a World Cup',
      'Attend a major music festival', 'Watch a Broadway show', 'See an opera',
      'Go to a film festival', 'Attend a TED Talk live', 'Meet a celebrity',
      'Volunteer abroad', 'Run a charity race', 'Run a marathon',
      'Climb a famous peak', 'Sleep under the stars', 'Go on a cruise',
      'Travel solo', 'Live in another country for a month',
      'Experience zero gravity', 'Go on a meditation retreat',
      'Help someone in need',
    ],
  },
  {
    title: 'Nature & Wildlife',
    items: [
      'Swim in a bioluminescent bay', 'Camp in Yosemite',
      'Hike the Appalachian Trail', 'Hike the Pacific Crest Trail',
      'See the Grand Canyon', 'Watch wildlife in Africa',
      'Swim with sea turtles', 'Go whale shark diving', 'See wild gorillas',
      'Visit Antarctica', 'Explore a cave system', 'Go on a desert safari',
      'See a volcano', 'See a total solar eclipse', 'Hike a glacier',
      'Trek through Patagonia', 'Kayak through fjords', 'Explore coral reefs',
      'Walk on a frozen lake', 'Plant a tree',
    ],
  },
];

/** Certifications & skills — used in the Certifications editor. */
export const certificationCatalog: CatalogSection[] = [
  {
    title: 'Fitness & Wellness',
    items: [
      'Personal Trainer (CPT)', 'Group Fitness Instructor', 'Yoga Teacher',
      'Pilates Instructor', 'Spin / Cycling Instructor', 'Zumba Instructor',
      'CrossFit Coach', 'Strength & Conditioning Coach', 'Nutrition Coach',
      'Wellness Coach', 'Health Coach', 'Mindfulness Coach',
      'Meditation Instructor', 'Tai Chi Instructor', 'Reiki Practitioner',
      'Massage Therapist', 'First Aid / CPR', 'Lifeguard',
      'Swimming Instructor', 'Athletic Trainer',
    ],
  },
  {
    title: 'Education & Teaching',
    items: [
      'Teaching Credential', 'ESL / TEFL Teacher', 'Montessori Teacher',
      'Special Education Teacher', 'Early Childhood Education',
      'Substitute Teacher', 'Tutor', 'Literacy Specialist', 'Music Teacher',
      'Art Teacher',
    ],
  },
  {
    title: 'Health & Medical',
    items: [
      'Certified Nursing Assistant (CNA)', 'Medical Assistant',
      'Pharmacy Technician', 'EMT / Paramedic', 'Registered Nurse (RN)',
      'Licensed Practical Nurse (LPN)', 'Phlebotomy', 'Radiology Technician',
      'Health Information Technician', 'Physical Therapy Aide',
    ],
  },
  {
    title: 'Business & Professional',
    items: [
      'Project Management (PMP)', 'Six Sigma', 'CPA', 'CFA', 'Bookkeeping',
      'HR (PHR / SPHR)', 'Digital Marketing', 'Google Analytics', 'SEO',
      'Social Media Marketing', 'Salesforce', 'Microsoft Office Specialist',
      'ITIL', 'Scrum Master', 'Leadership / Management', 'Risk Management',
      'Real Estate License', 'Insurance Agent License', 'Event Planning',
      'Wedding Planner',
    ],
  },
  {
    title: 'Creative & Technical',
    items: [
      'Graphic Design', 'Adobe Photoshop / Illustrator', 'Photography (cert)',
      'Videography / Film Production', 'Animation / Motion Graphics',
      'UX / UI Design', 'Web Development', 'Coding Bootcamp',
      'App Development', 'Game Design', 'Interior Design', 'Culinary Arts',
      'Baking / Pastry', 'Sommelier', 'Bartending / Mixology',
    ],
  },
  {
    title: 'Trades & Technical',
    items: [
      'Electrician License', 'Plumbing License', 'HVAC', 'Welding',
      'Carpentry', 'Automotive Technician', 'Forklift Operator',
      "Commercial Driver's License (CDL)", 'Crane Operator', 'Firefighter',
      'Security Guard', 'OSHA Safety', 'Hazardous Materials Handling',
    ],
  },
  {
    title: 'Lifestyle & Specialty',
    items: [
      'Dog / Pet Trainer', 'Life Coach', 'Real Estate Staging', 'Travel Agent',
      'Scuba Instructor', 'Ski / Snowboard Instructor', 'Surf Instructor',
      'Sailing Instructor', 'Drone Pilot (UAV)',
    ],
  },
];

/** Builds an item → section-title lookup from a catalog. */
function buildSectionMap(catalog: CatalogSection[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const section of catalog) {
    for (const item of section.items) {
      if (!(item in map)) map[item] = section.title;
    }
  }
  return map;
}

/** Reverse lookups (item → section) used by the commonality engine. */
export const hobbySection = buildSectionMap(hobbyCatalog);
export const bucketSection = buildSectionMap(bucketListCatalog);
export const certSection = buildSectionMap(certificationCatalog);

/** Flat lists, handy for validation/tests. */
export const allHobbies = hobbyCatalog.flatMap((s) => s.items);
export const allBucketList = bucketListCatalog.flatMap((s) => s.items);
export const allCertifications = certificationCatalog.flatMap((s) => s.items);
