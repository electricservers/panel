# Module: Auth

Steam identity for the panel, plus SQLite-backed roles.

## Goals

- Login / logout via Steam OpenID.
- Signed session cookie (tamper-resistant).
- Roles for gating staff modules.
- `locals.user` available in server `load` and API routes.

## Non-goals

- Password accounts.
- OAuth providers other than Steam.
- Storing Steam API key material in the client.
- A separate MongoDB (or other remote DB) for panel users.

## Identity

- Steam OpenID establishes `steamId` (prefer Steam64 in app code).
- Display name / avatar refreshed via Steam Web API when needed; cache lightly.
- On first login, create a panel `User` row in SQLite with default role `user` if missing.
- Optional bootstrap: if `OWNER_STEAM_ID` (Steam64) is set in the environment and matches the logging-in user, their role is set to `owner`. Used for fresh deploys where the panel SQLite file is empty (local `data/panel.db` is never uploaded). Safe to leave set permanently; it only promotes that SteamID, never demotes anyone else.

## Session

Replace the old panel’s unsigned JSON cookie.

Proposed shape (server-verified):

```ts
type SessionUser = {
	steamId: string;
	role: 'user' | 'admin' | 'owner';
	name?: string;
	avatar?: string;
};
```

- HttpOnly, Secure in production, SameSite=Lax (or stricter if flows allow).
- Signed or encrypted with a server secret (`SESSION_SECRET`).
- Role always re-read from SQLite on login; consider periodic refresh on request for staff paths.

## Permissions summary

| Area                   | `user` | `admin` | `owner` |
| ---------------------- | ------ | ------- | ------- |
| Public MGE             | yes    | yes     | yes     |
| Whois read/mutate      | no     | yes     | yes     |
| Admin settings / roles | no     | no      | yes     |

Adjust only by updating this table and the guards together.

## Routes

| Route              | Purpose                      |
| ------------------ | ---------------------------- |
| `/api/auth/login`  | Redirect to Steam            |
| `/api/auth/return` | OpenID callback, set session |
| `/api/auth/logout` | Clear session                |

## Acceptance checks

- Tampering with cookie payload cannot escalate role.
- Logged-out users never see staff nav items that hard-require staff.
- Missing panel DB path / failed SQLite open fails auth clearly rather than half-working.
