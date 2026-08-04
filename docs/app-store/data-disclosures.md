# App Privacy data disclosures (App Store Connect)

This maps what Knowable actually collects to Apple's **App Privacy**
questionnaire (App Store Connect → App Privacy → "Get Started"), so it can be
filled in by hand — Apple has no API for this, it's a manual form per app
version. Source of truth: `PRIVACY.md` + the "Data pull" and "Supabase"
sections of `CLAUDE.md`.

**Key clarification up front:** Knowable never requests iOS Contacts
permission and never reads the device address book. There is no
`NSContactsUsageDescription` in this app because no code path calls
`expo-contacts` or any Contacts API — confirmed by repo-wide search. The SMS
invite flow only uses a phone number the user *types in* for the person
they're inviting. Apple's "Contact Info" data-type category, however, still
applies because the app collects **phone number** (for phone-auth sign-in)
and **name** (profile) — see below. Don't check "Contacts" (the address-book
permission type) — do declare "Contact Info" (the data-type category) for
phone number/name.

## How to read this table

Apple's form asks, per data type: **Collected?** → **Linked to the user's
identity?** → **Used for tracking (per Apple's ATT definition)?** → purpose
(one or more of App Functionality, Analytics, Product Personalization, etc).
All of the below is **opt-in** — none of it is collected in the app's default
mock-data mode (no account, everything local). Fill this form for the build
that has Supabase/PostHog/Sentry configured; if you ship without those env
vars set, most rows can be answered "Data Not Collected."

| Apple category | Data type | Collected? | Linked to identity? | Used to track you? | Purpose | Notes |
|---|---|---|---|---|---|---|
| Contact Info | Phone Number | Yes (if backend enabled) | Yes | No | App Functionality (sign-in) | Passwordless OTP sign-in via Supabase Auth + Twilio. Not shared/sold. |
| Contact Info | Name | Yes (if backend enabled) | Yes | No | App Functionality | Profile display name, self-entered. |
| Contact Info | Physical Address | No | — | — | — | "Where you met" is free text about the meeting, not a mailing address. |
| Contact Info | Email Address | No | — | — | — | No email collection anywhere in the app today. |
| User Content | Photos or Videos | No | — | — | — | No camera/photo-library access anywhere in the app. |
| User Content | Other User Content | Yes (if backend enabled) | Yes | No | App Functionality | Profile facets (hobbies, bucket list, certs, travel, life experiences) and connection notes, synced only when signed in. |
| Identifiers | User ID | Yes (if backend enabled) | Yes | No | App Functionality | Supabase `auth.uid()` — required for owner-scoped access control (RLS). |
| Identifiers | Device ID | Yes (if push enabled) | Yes | No | App Functionality | Expo push token, used only to route opted-in notifications. |
| Usage Data | Product Interaction | Yes (if PostHog enabled) | Yes (session-linked) | No | Analytics | 4 product events only: connect made, nudge acted on, data-pull connected, onboarding completed. No ad targeting. |
| Diagnostics | Crash Data | Yes (if Sentry enabled) | Pseudonymous | No | App Functionality (bug fixing) | Standard crash/error reports. |
| Contacts | (device address book) | **No** | — | — | — | App never requests `NSContactsUsageDescription` / Contacts permission. Do not declare this. |
| Location | Precise/Coarse Location | No | — | — | — | "Where you met" fields are free-text, not device location services. |
| Financial Info | any | No | — | — | — | No payments/subscriptions in this app. |
| Health & Fitness | Fitness | Only if user connects Strava | Yes | No | App Functionality | Strava OAuth returns recent activity *types* only (e.g. "Trail running"), used purely as an icebreaker signal — not full workout data. |
| Other Data Types | Other (music/media taste) | Only if user connects Spotify/Letterboxd/Goodreads | Yes | No | App Functionality | Top artists/genres (Spotify OAuth), favorite films (Letterboxd public RSS), favorite/currently-reading books (Goodreads public RSS). |

## Data NOT collected, ever

- Precise or coarse location (device location services)
- Camera, photo library, microphone
- Device contacts / address book
- Payment or financial info
- Browsing history outside the app
- Advertising identifiers / third-party ad tracking (no ATT prompt needed —
  Knowable does no cross-app/cross-site tracking, so "Used to Track You"
  should be **No** for every row)

## Third parties data may be shared with (service providers, not sold to)

- **Supabase** — backend database + auth (phone OTP via Twilio), when
  configured.
- **PostHog** — product analytics, when configured.
- **Sentry** — crash/error reporting, when configured.
- **Apple Push Notification service / Firebase Cloud Messaging** (via Expo's
  push service) — notification delivery, when push is enabled.
- **Spotify, Strava** — only if the user explicitly connects that account
  (OAuth); Knowable receives only the specific scopes requested.
- **Letterboxd, Goodreads** — public profile RSS feeds the user points the
  app at; no auth, no private data.

## App Store Connect questionnaire — quick answers

- **"Do you or your third-party partners collect data from this app?"** →
  Yes, if shipping with Supabase/PostHog/Sentry configured. If shipping the
  default mock-data build with none of those env vars set, the honest answer
  is **No** (no network calls happen at all).
- **Data used to track you across apps/websites?** → No.
- **Data linked to the user's identity?** → Yes for phone number, name,
  profile content, user ID (all tied to the signed-in account); analytics
  events are session-linked; crash data is pseudonymous.

## Export compliance

`app.json`'s `ios.config.usesNonExemptEncryption` is set to `false` — the app
only uses standard HTTPS/TLS (Apple's export-exempt category), so App Store
Connect's per-build encryption question should auto-resolve to "No" without
manual entry each time. If that ever stops being true (e.g. custom
end-to-end crypto is added), update that flag and expect to answer the
question manually.
