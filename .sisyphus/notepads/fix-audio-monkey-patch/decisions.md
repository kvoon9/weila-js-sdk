# Decisions — fix-audio-monkey-patch

## [2026-03-11] Session ses_32517ef22ffesJgmfGOUM79cTP

### Scope Decision

- Fix Vite playground ONLY (user explicitly chose smallest scope)
- No Rspack playground, no SDK changes, no vite.config.ts changes

### Prototype Target

- Use `AudioWorklet.prototype.addModule` (NOT `Worklet.prototype`)
- Reason: Worklet.prototype is broader and would affect PaintWorklet/AnimationWorklet

### No Guard Check

- Do NOT use `if (originalAddModule)` guard
- Reason: `AudioWorklet.prototype.addModule` always exists in browsers that support AudioWorklet
- The guard was the original bug (always false on wrong prototype)

### Sequential Counter vs Filename Matching

- Use sequential counter for blob: URLs (first call = player, second = recorder)
- Reason: Blob URLs are opaque UUIDs, no filename can be extracted
- SDK call order is deterministic (source confirmed: weila_audio.ts lines 101-102)

### Plugin Files

- Delete or annotate (agent's discretion in Task 2)
- Neither causes harm but both confuse future devs
