## Project Configuration

- **Language**: TypeScript
- **Package Manager**: bun
- **Add-ons**: prettier, tailwindcss, mcp

## Spec-driven rewrite

This is a spec-driven rewrite of the Electric Servers TF2 panel. Read [docs/README.md](./docs/README.md) before implementing anything; it indexes vision, architecture, module specs, and the loading/UX rule. Update the relevant doc when product intent changes, then change code, not the other way around.

## Definition of done

- Matches an existing spec in `docs/`, or the spec was updated first.
- `bun run check` passes.
- Svelte code was validated with the Svelte MCP `svelte-autofixer` tool until clean.
- No hardcoded regions, no Flowbite/admin-dashboard patterns, no MongoDB, no ELO reversion, no full-await blocking `load` (see `.cursor/rules/`).

---

You are able to use the Svelte MCP server, where you have access to comprehensive Svelte 5 and SvelteKit documentation. Here's how to use the available tools effectively:

## Available Svelte MCP Tools:

### 1. list-sections

Use this FIRST to discover all available documentation sections. Returns a structured list with titles, use_cases, and paths.
When asked about Svelte or SvelteKit topics, ALWAYS use this tool at the start of the chat to find relevant sections.

### 2. get-documentation

Retrieves full documentation content for specific sections. Accepts single or multiple sections.
After calling the list-sections tool, you MUST analyze the returned documentation sections (especially the use_cases field) and then use the get-documentation tool to fetch ALL documentation sections that are relevant for the user's task.

### 3. svelte-autofixer

Analyzes Svelte code and returns issues and suggestions.
You MUST use this tool whenever writing Svelte code before sending it to the user. Keep calling it until no issues or suggestions are returned.

### 4. playground-link

Generates a Svelte Playground link with the provided code.
After completing the code, ask the user if they want a playground link. Only call this tool after user confirmation and NEVER if code was written to files in their project.
