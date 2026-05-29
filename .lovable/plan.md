## Goal

1. Replace the bare `<audio>` element on the Call Detail page with a custom player that supports play/pause, scrubbing (seek bar), skip ±10s, time display, volume, and playback speed — with the download option suppressed.
2. Make sure **super admins** can always read the full transcript on any tenant's call, even when that tenant's plan doesn't include transcripts (currently the same plan gate hides it from admins too).
3. Make sure clients whose plan includes transcripts see them in full (this already works on the detail page, but their **Call Log list** only shows a 100-char preview — we'll keep the preview but ensure the detail page transcript view is unmistakable and easy to read).

## Changes

### 1. New component: `src/components/audio-player.tsx`
Custom controls built on a hidden `<audio>` element:
- Play / pause button
- Scrubbable progress bar (click + drag to seek)
- Skip back 10s / skip forward 10s
- Current time / total duration (mm:ss)
- Volume slider + mute toggle
- Playback speed selector (0.75× / 1× / 1.25× / 1.5× / 2×)
- `controlsList="nodownload"`, `disablePictureInPicture`, `onContextMenu` blocked to discourage downloading
- Styled with existing design tokens (`bg-card`, `border-border`, `text-primary`, etc.) to match the premium feel of the rest of the app

### 2. `src/routes/_authenticated/dashboard.calls.$id.tsx`
- Swap the existing `<audio controls src={...} />` for `<AudioPlayer src={call.recording_url} />`.
- Change the transcript gate from `canUse(plan, "transcripts")` to `isSuperAdmin || canUse(plan, "transcripts")` so super admins always see the full transcript when impersonating/viewing a client. Pull `isSuperAdmin` from `useMe()` (already used elsewhere in the file's siblings).
- Make the transcript card visually clearer: larger max-height, monospace-free readable text, copy-to-clipboard button.

### 3. `src/routes/_authenticated/dashboard.calls.tsx`
- No behavior change for client users (preview stays at 100 chars, locked-feature banner stays for plans without transcripts).
- For super admins viewing a tenant context, suppress the bottom "Transcripts locked" banner (it's irrelevant for them).

## Out of scope
- No changes to data model, RLS, or server functions.
- No download-prevention beyond the browser-level `controlsList="nodownload"` (true DRM is not feasible here, and the file URL is still a signed Supabase storage link).

## Technical notes
- Pure client-side React + Tailwind; no new dependencies.
- Player uses `useRef<HTMLAudioElement>` + `requestAnimationFrame` for smooth progress updates.
- Component is reusable for any future audio surface (e.g., admin client view).
