# PMT Phase 1 — R2 Image Pipeline

## Scope
- Product/media uploads are routed to Cloudflare R2 instead of Google Drive when using the existing admin `uploadImage` action.
- Browser-side conversion is WebP.
- The client repeatedly adjusts quality and dimensions until the encoded file is **under 250,000 bytes**.
- The Worker rejects non-WebP uploads and files at/above 250,000 bytes as a second safety gate.
- R2 objects are served through the PMT Worker at `/img/r2/<key>` with long-lived immutable caching.
- Existing `pmtPost({action:'uploadImage', ...})` callers are preserved through a compatibility wrapper, so the product editor does not need a destructive rewrite.
- Uploads are authenticated against the existing PMT admin session and require Owner, Manager, or Editor role.

## R2 layout
`products/YYYY-MM-DD/<uuid>.webp`

## Required Cloudflare setup
Create the R2 bucket named `pmt-media`, then deploy this branch/config so the Worker binding `MY_BUCKET` points to it.

## Important current-repo limitation
The existing product editor/backend currently cap the number of stored product images below the new target of six in some paths. Phase 1 moves the media pipeline to R2 and enforces the 250 KB image size; the six-image capacity should be completed as the next media-schema/UI compatibility step rather than silently dropping existing limits.

## Safety notes
- The old Drive upload endpoint remains in the Apps Script backend as a legacy compatibility path. The Phase 1 browser upload path no longer calls it.
- No existing Drive media is deleted by this phase.
- No product records are rewritten by this phase.
- If R2 is unavailable, new media uploads fail without deleting existing product data.
