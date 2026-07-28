# SmartRefill legacy Auth users

`sr-legacy-user.json` is a **sanitized** Firebase Auth export used to enrich the
SR Legacy business list (emails, display names, last sign-in).

- Matched to Firestore stations by Auth `localId` (user doc id) or email
- Used to enrich owner name / email / last sign-in on stations that already have a profile
- Auth users without a Firestore `profile/main` are **not** listed in Triage or Contacted/Ignored
- Password hashes and salts are **not** stored here — never re-add them

Backend copy (deployed with the API):

`backend/functions/src/data/sr-legacy-users.json`
