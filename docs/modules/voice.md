# Module: Voice

Staff reconstruction of TF2 voice chat from SourceTV (or client) demo files.

## Goals

- Let staff upload a `.dem` file and process it into per-utterance WAV clips plus a JSON timeline manifest.
- Present a multi-track timeline of who spoke when, with a Discord/Teams-style "who's talking" speaker sidebar during playback.
- Keep the heavy lifting (demo parse, Steam voice codec, segmentation) in a panel-agnostic Rust CLI binary (`voice-processor`), invoked as a local subprocess.
- Gate the whole module to `admin` / `owner` via existing Steam session roles.

## Non-goals (v1)

- Automatic transfer of demos from the game server (manual upload only).
- A MySQL source capability / adapter (this is panel-local file processing, not a game-DB fan-out).
- Module toggle in `/admin/settings` (toggles are keyed by `Capability` today; voice is not a capability).
- Background job queue / async status polling (processing is a synchronous subprocess call for MVP).
- Text chat correlation.
- Auth of its own (inherits panel Steam OpenID + roles).
- Video / gameplay reconstruction from the demo.

## User stories

1. As staff, I upload a `.dem` and see it appear in a list with status `uploaded`.
2. As staff, I click Process and wait for the CLI to finish; status becomes `processed` (or `failed`).
3. As staff, I open a processed demo and hear a chronological reconstruction of voice chat, with speakers lighting up as the playhead crosses their segments.
4. As staff, I see in-game names (not bare SteamID64s) wherever the demo's userinfo table has them.
5. As staff, I can tell who owns each timeline lane without using the sidebar, and jump to that player's next utterance from the playhead.

## Architecture

```
Browser  →  /voice UI  →  SvelteKit /api/voice/* (role-gated)
                              │
                              ├─ write source.dem under /app/data/voice/<id>/
                              ├─ spawn voice-processor <dem> <out_dir>
                              ├─ read manifest.json + WAVs from disk
                              └─ voice_demos SQLite row for status/metadata
```

The Rust binary never learns about SQLite, Steam auth, or roles. Contract:

```
voice-processor <demo.dem> [output_dir]
→ writes <steam_id>_<n>.wav segments + manifest.json into output_dir
→ exit 0 on success
```

The reconstruction UI draws speaker lanes from `manifest.json` immediately. Clip WAVs are fetched and decoded in the background with the Web Audio API, then scheduled at `start_seconds`. The browser does not mix speakers into continuous buffers.

## Storage

On-disk layout (shared Docker volume, same as panel SQLite):

```
/app/data/voice/<id>/
  source.dem
  manifest.json          # after process
  <steamid>_<n>.wav      # after process
```

SQLite table `voice_demos` (panel DB):

| Column              | Notes                                                 |
| ------------------- | ----------------------------------------------------- |
| `id`                | text PK (uuid)                                        |
| `original_filename` | uploaded name                                         |
| `uploader_steam_id` | staff who uploaded                                    |
| `status`            | `uploaded` \| `processing` \| `processed` \| `failed` |
| `map`               | from manifest, nullable until processed               |
| `duration_seconds`  | from manifest, nullable until processed               |
| `error_message`     | set on `failed`                                       |
| `recorded_at`       | approx. recording end (browser `File.lastModified`)   |
| `uploaded_at`       | timestamp                                             |
| `processed_at`      | timestamp, nullable                                   |

TF2 demo headers do not store absolute wall-clock time. Timeline HH:mm labels (browser local timezone) pick a session start in this order:

1. A timestamp embedded in the original filename (SourceTV `auto-YYYY-MM-DD-HH-mm-ss` and compact `YYYYMMDD-HHMMSS` forms). That value is the recording _start_.
2. Otherwise `recorded_at - duration`, treating `recorded_at` as the recording _end_.

`recorded_at` must come from the browser `File.lastModified` sent as a form field. Multipart `File.lastModified` on the server is the upload time, not the demo's disk date. If the staff copied or downloaded the `.dem` later, (2) can still be hours off. Filename timestamps survive that.

## Manifest shape

Produced by `voice-processor`. `steam_id` keys are **strings** (SteamID64 exceeds JS safe integer range).

```json
{
	"map": "ctf_turbine_pro_rc4",
	"server": "45.235.99.105:27042",
	"duration_seconds": 73.56,
	"ticks": 4904,
	"players": {
		"76561199695934482": "PlayerName"
	},
	"segments": [
		{
			"steam_id": "76561199695934482",
			"file": "76561199695934482_0.wav",
			"start_tick": 396,
			"end_tick": 514,
			"start_seconds": 5.94,
			"end_seconds": 7.71
		}
	]
}
```

Segmentation rule: a new clip starts when the same player's packets are more than ~1.5s (100 demo ticks) apart.

## Routes

| Route                              | Notes                                             |
| ---------------------------------- | ------------------------------------------------- |
| `/voice`                           | List + upload form                                |
| `/voice/[id]`                      | Reconstruction timeline + speaker sidebar         |
| `POST /api/voice/upload`           | Multipart `.dem` → disk + `voice_demos` row       |
| `POST /api/voice/[id]/process`     | Spawn `voice-processor`, update row from manifest |
| `GET /api/voice/[id]/manifest`     | Serve `manifest.json`                             |
| `GET /api/voice/[id]/audio/[file]` | Serve a WAV clip                                  |

All routes: `requireRole(locals, ['admin', 'owner'])`. No `requireModule` (not a `Capability`).

## Permissions

| Action                     | Role               |
| -------------------------- | ------------------ |
| View list / reconstruction | `admin` or `owner` |
| Upload / process           | `admin` or `owner` |

Server enforces the same rules as the nav. No “visible but 403” mismatch.

## Env

| Var                    | Notes                                                                  |
| ---------------------- | ---------------------------------------------------------------------- |
| `VOICE_PROCESSOR_PATH` | Absolute path to the CLI binary. Default: `voice-processor` on `PATH`. |
| `VOICE_DATA_DIR`       | Root for per-demo folders. Default: `<panel data dir>/voice`.          |

## UI

- List page: table of demos (filename, map, duration, status, uploaded at) + upload control + Process / View actions.
- Reconstruction page: a manifest-driven HTML timeline (one lane per speaker, utterance bars from `start_seconds` / `end_seconds`). Playback schedules the per-utterance WAVs with the Web Audio API (lookahead decode, no mixed buffer). The speaker sidebar highlights whoever is talking at the current playhead.
- Each lane has a pinned identity gutter (avatar + in-game name) that stays visible while the timeline scrolls. Clicking a lane label or a speaker name in the sidebar seeks to that player's next clip from the playhead.
- The sidebar has a name/SteamID filter so staff can isolate a player in a busy demo.
- Playback may autoscroll to keep the playhead in view. Manual horizontal scroll detaches that follow so staff can inspect another part of the demo while audio keeps running. Follow cursor reattaches.
- Timeline ruler times are local HH:mm inferred from the filename when possible, otherwise from the file date. The status line names which heuristic was used.
- The reconstruction view must paint lanes from the manifest immediately. Do not block the page on decoding or mixing audio.
- Chrome: existing shadcn-svelte primitives (`Button`, `Table`, `Badge`, bordered panels). No CapCut-style video editor.

## Deployment

`bin/voice-processor` is a prebuilt Linux x86_64 (glibc/bookworm) CLI committed to this repo. The Dockerfile copies it into the runtime image — no Rust toolchain or sibling `steam-audio-codec` checkout at image-build time. Rebuild the binary from `steam-audio-codec` when the decoder changes, then replace `bin/voice-processor`. Local Windows dev can point `VOICE_PROCESSOR_PATH` at a `.exe` build instead.

## Acceptance checks

- Unauthenticated / `user`-role requests to `/voice` get 403.
- Upload of a real TF2 STV demo creates a row and `source.dem` on disk.
- Process writes `manifest.json` with a `players` map and at least one segment when voice is present.
- Reconstruction page plays clips in timeline order and lights the matching speaker row while that clip is under the playhead.
- Each timeline lane shows a pinned avatar and in-game name aligned with that lane.
- Clicking a speaker identity seeks to that player's next utterance after the playhead (wrapping to their first clip).
- During playback, manual horizontal scroll is not pulled back to the playhead.
- Opening a processed demo shows speaker lanes immediately. Playback does not wait for every WAV to decode.
- The Rust binary has no dependency on panel SQLite, Steam session, or Axum.
