# App Store listing copy

Ready to paste into App Store Connect → App Information / Version Information.
Character limits are Apple's as of this writing — trim if they've changed.

## App name (30 char max)

```
Knowable
```
(8 chars — room to spare if a more descriptive name is wanted, but "Knowable"
matches the in-app branding and `app.json`'s `expo.name`.)

## Subtitle (30 char max)

```
Turn contacts into friends
```
(27 chars)

## Promotional text (170 char max — editable without a new build)

```
Capture every good conversation, see what you have in common, and get
nudged to follow up before a connection fades. No more "we should hang
out" that never happens.
```
(168 chars)

## Description (4000 char max)

```
Knowable helps you turn good conversations into real friendships.

You meet someone interesting — at a party, a conference, a coffee shop —
and you mean to follow up. Then life happens, the moment passes, and a
connection that could've mattered just fades out. Knowable is built to stop
that.

HOW IT WORKS

• Capture the connection the moment it happens — tap phones (NFC bump),
  search for someone already on Knowable, or send a text invite if they're
  not on the app yet.

• See what you actually have in common — hobbies, travel, favorite films,
  music, books, activities — surfaced automatically as conversation starters
  for your next hangout, not just a list of small talk you already forgot.

• Get nudged before it's too late — Knowable tracks how long it's been
  since you last reached out to each connection and reminds you on a
  cadence you choose (weekly, monthly, quarterly — or never, your call).

• Keep every connection organized — friend, professional contact,
  acquaintance, or something more — with notes on where you met and how
  you're staying in touch.

WHY KNOWABLE

Most contact apps just store a name and number. Knowable is built around
the moment right after you meet someone, when the connection is warmest —
and the months after, when it's easiest to let it quietly disappear.

Your profile and connections are private by default — nothing leaves your
device unless you choose to sign in and sync. You control what you share
with each connection, whether you're discoverable in search, and whether
NFC bump is on at all.

Knowable doesn't sell your data or use it for advertising. See our full
privacy policy for details.

Turn the people worth keeping into people you actually keep up with.
```
(~1750 chars — well under the 4000 limit; trim the "HOW IT WORKS" bullets if
a shorter version is preferred.)

## Keywords (100 char max, comma-separated, no spaces after commas)

```
friends,networking,contacts,connections,nfc,followup,relationships,icebreaker,social,reminders
```
(97 chars)

## Support URL (required)

```
https://github.com/8rynj/friends
```
Placeholder — swap for a real support page/email if one exists before
submitting. At minimum this should resolve to something a reviewer/user can
actually use to reach you (a GitHub Issues page works for support in a
pinch, but a dedicated support email is preferred).

## Marketing URL (optional)

```
(leave blank until a marketing site exists)
```

## Privacy Policy URL (required)

```
https://github.com/8rynj/friends/blob/main/PRIVACY.md
```
Matches `src/lib/legal.ts`'s `PRIVACY_POLICY_URL`, which is also linked from
Settings → Privacy in-app (Apple Guideline 5.1.1(i) requires an in-app link,
not just the App Store Connect field). If a dedicated privacy-policy web
page is stood up later, update both the App Store Connect field and
`PRIVACY_POLICY_URL` together so they stay in sync.

## Category

```
Primary: Social Networking
Secondary: Lifestyle
```

## Age rating

No user-generated public content, no mature themes — expect a 4+ rating
from Apple's age-rating questionnaire. Answer "No" to the
violence/content-related questions; the one relevant "Yes" is typically
"Unrestricted Web Access" → **No** (the app doesn't embed a browser), and
note the app does collect user data (per `data-disclosures.md`) but has no
UGC moderation concerns since sharing is 1:1 between connections, not public
posts.

## What's New (this version)

```
Welcome to Knowable! Capture connections with NFC bump, search, or a text
invite, see what you have in common, and get nudged to follow up before a
good connection fades.
```
