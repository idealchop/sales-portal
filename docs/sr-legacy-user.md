# SmartRefill legacy Auth users

`sr-legacy-user.json` is a **sanitized** Firebase Auth export used to enrich the
SR Legacy business list (emails, display names, last sign-in).

- Matched to Firestore stations by Auth `localId` (user doc id) or email
- Auth users without a Firestore `profile/main` appear as **Auth only** triage rows
- Password hashes and salts are **not** stored here — never re-add them

Backend copy (deployed with the API):

`backend/functions/src/data/sr-legacy-users.json`
