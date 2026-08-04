# Knowable Privacy Policy

**Last updated: August 4, 2026**

Knowable ("Knowable," "we," "us") helps you turn good conversations into real
friendships by capturing connections, surfacing what you have in common, and
nudging timely follow-up. This policy explains what data the app collects,
why, and the choices you have.

If you have questions, contact **privacy@knowable.app**.

## 1. Data the app collects by default (no account required)

By default Knowable runs entirely on your device with no account and no
backend — this is the mode the app ships in today. In this mode:

- Your profile (name, hobbies, bucket list, certifications, travel, life
  experiences, top hobbies, and any handles you add for other apps like
  Instagram or Spotify) is stored **only on your device** (local app
  storage), never transmitted anywhere.
- Connections you add, nudge/cadence settings, and pending invites are also
  stored only on your device.
- Nothing is sent to us or any third party unless a feature below is
  explicitly enabled.

Deleting the app deletes this data. The in-app "Sign out" / reset action in
Settings also clears it back to the demo state.

## 2. Data collected when optional features are enabled

Knowable has optional, opt-in capabilities. Each is a no-op — no network
calls, no data collected — until you (or the person who built your copy of
the app) turns it on.

### Account + sync (phone number, profile, connections)

If the app is configured to sync with our backend (Supabase), creating an
account requires your **phone number** for passwordless sign-in (we send a
one-time verification code by SMS via our SMS provider). Once signed in:

- Your profile, connections, nudges, and contact history sync to our backend
  so they're available across devices and so real connect flows (NFC bump,
  search, SMS invite/claim) work between two real accounts.
- Your data is scoped to your account only (row-level security keyed to your
  user id) — other users can only see what you've explicitly shared with
  them as part of a connection.
- **We do not access your device's address book / contacts.** The SMS invite
  feature only uses a phone number you type in yourself for the person
  you're inviting; Knowable never reads or uploads your phone's contact
  list.

### Push notifications

If you turn on nudge reminders or new-commonality notifications, your device
receives a push notification token (via Apple/Google's push services) that
we use only to deliver notifications you've opted into — reminders to follow
up with someone, or an alert when a connection adds something you have in
common. You can turn this off anytime in Settings, which removes your token
from our systems.

### Analytics and crash reporting

If enabled, we use PostHog (product analytics) and Sentry (crash/error
reporting) to understand app usage and fix bugs. We track a small set of
product events (e.g., "a connection was made," "a nudge was acted on," "a
data-pull source was connected," "onboarding was completed") along with
standard crash/diagnostic data. These events are tied to your app session,
not sold, and not used for advertising.

### Connecting third-party platforms (data pull)

You can optionally connect platforms like Spotify, Strava, Letterboxd, or
Goodreads so Knowable can surface things you have in common with a
connection (e.g., shared favorite artists, films, or activities):

- **Spotify / Strava** use that platform's own sign-in (OAuth). We receive
  only the specific data the platform's API returns for the fields we
  request (e.g., top artists/genres, recent activity types) — never your
  password. Tokens are stored securely on your device (iOS Keychain /
  Android Keystore) and used only to refresh that data.
- **Letterboxd / Goodreads** read your **public** profile feed (the same
  RSS feed anyone could view on their website) using a username you supply
  — no password or account access.
- You can disconnect any of these at any time; doing so stops future pulls
  but does not automatically delete data already shown to a connection as a
  commonality.

## 3. How we use data

We use the data described above only to: operate the app's core features
(connections, commonalities, nudges), authenticate you, deliver
notifications you've opted into, and improve the app (analytics/crash
reports, when enabled). We do not sell your data, and we do not use it for
third-party advertising.

## 4. Sharing

We share data only with:

- **Service providers** who process it on our behalf under contract (e.g.,
  our backend/database provider, SMS provider for verification codes, push
  notification services, analytics/crash-reporting providers) — only to the
  extent needed to provide the service.
- **Other Knowable users**, but only what you choose to share as part of a
  connection (e.g., a handle you mark as shared, or facets that feed the
  commonality engine for people you're connected to).
- **Law enforcement or regulators** if required by law.

We never sell personal data.

## 5. Data retention & deletion

Local-only data lives on your device until you delete the app or reset it in
Settings. Synced data (when an account is enabled) is retained while your
account is active. To delete your account and associated data, contact
**privacy@knowable.app** — we'll delete your profile, connections, and
associated data within 30 days, except where we're required to retain
records by law.

## 6. Children's privacy

Knowable is not directed at children under 13, and we do not knowingly
collect data from children under 13. If you believe a child has provided us
data, contact us and we'll delete it.

## 7. Your choices

- Turn NFC bump, search discoverability, nudge reminders, new-commonality
  notifications, and email fallback on or off anytime in **Settings →
  Privacy / Notifications**.
- Disconnect any third-party data-pull source anytime.
- Request access to, correction of, or deletion of your data by contacting
  us.

## 8. Security

We use industry-standard measures (encryption in transit via HTTPS/TLS,
owner-scoped access controls on our backend, Keychain/Keystore-backed
storage for third-party tokens) to protect your data. No method of
transmission or storage is 100% secure, but we work to protect your
information.

## 9. Changes to this policy

We may update this policy as the app changes. We'll update the "Last
updated" date above; material changes will be highlighted in the app.

## 10. Contact

Questions or requests: **privacy@knowable.app**
