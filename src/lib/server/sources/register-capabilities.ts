/**
 * Imported once from `hooks.server.ts` purely for the module-load side
 * effect of each capability registering its cache invalidation hook — see
 * docs/modules/admin.md's "Capability self-registration" section.
 */
import './mge';
import './whois';
