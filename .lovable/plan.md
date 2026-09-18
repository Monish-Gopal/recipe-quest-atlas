# Remove "API KEY REQUIRED" watermark from World Map

## What's happening
The map's picture tiles come from CARTO, which used to be free with no key. CARTO recently changed their policy — their tiles now show an "API KEY REQUIRED" watermark unless you pay for an account. I confirmed this live on your preview.

## Fix
Switch the map's background tiles in `src/components/WorldMap.tsx` to **OpenStreetMap's free standard tiles** (`tile.openstreetmap.org`) — completely free, no key, no watermark, unlimited for a personal hobby app.

Everything else on the map stays exactly as it is:
- Your recipe pins with flags and category colours
- Green country highlighting and click popups
- The no-repeat / clamped panning fixes

## Trade-off to be aware of
The OpenStreetMap style looks slightly different from the CARTO "Voyager" style you liked (a bit more detail/colour). Free lookalike styles without a key are no longer available — CARTO was the last one. OpenStreetMap is the reliable free choice.

## Technical details
- Replace the `TileLayer` URL with `https://tile.openstreetmap.org/{z}/{x}/{y}.png`, update attribution, keep `noWrap`, `maxBounds`, `maxBoundsViscosity`, `worldCopyJump`.
- Verify in the preview that no watermark text appears on any tile.
