# Electric Panel docs

Spec-driven rewrite of the Electric Servers TF2 panel.

| Doc                                        | Purpose                                    |
| ------------------------------------------ | ------------------------------------------ |
| [VISION.md](./VISION.md)                   | Product intent and success criteria        |
| [ARCHITECTURE.md](./ARCHITECTURE.md)       | Sources, capabilities, layers, non-goals   |
| [ROADMAP.md](./ROADMAP.md)                 | Ordered milestones                         |
| [modules/sources.md](./modules/sources.md) | Data source registry                       |
| [modules/mge.md](./modules/mge.md)         | Player-facing MGE stats                    |
| [modules/whois.md](./modules/whois.md)     | Staff investigation tools                  |
| [modules/voice.md](./modules/voice.md)     | Staff voice-chat reconstruction from demos |
| [modules/auth.md](./modules/auth.md)       | Steam identity and roles                   |
| [modules/admin.md](./modules/admin.md)     | Owner-only sources/users/settings admin    |
| [modules/loading.md](./modules/loading.md) | Skeletons-first, non-blocking navigation   |
| [transcripts/](./transcripts/)             | Planning session logs                      |

Implement against these specs. Prefer updating a doc when product intent changes, then changing code.
