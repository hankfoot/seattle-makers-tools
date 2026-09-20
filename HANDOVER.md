# Handover

This repo is meant to end up owned by Seattle Makers. **The Cloudflare side is
already there** - the Worker was created under the makerspace's own Cloudflare
account, so the deployment, its URL and its billing are final. What is still
personal is the **GitHub repo**, and that is the only thing left to move.

Written down because the person doing the transfer may not be the person who
set it up.

## What is and is not account-bound

**Not account-bound.** Everything that makes the site work is in this repo:
the pages, the Cloudflare Worker at `worker/index.js`, the parser,
and `wrangler.toml`. There are **no secrets, no environment variables, no
bindings and no database**. Whoever controls the repo controls the behaviour,
and there is no state to migrate.

**Account-bound.** Two things only:

- The Cloudflare *Worker* - which account builds and serves the site.
- The domain attached to it.

## The subdomain can go on whenever you want

This used to say not to attach it. That no longer applies: because the Worker
already lives in the makerspace's Cloudflare account, it is not going to be
recreated somewhere else, so its address is stable and a custom domain can be
pointed at it at any time. Moving the GitHub repo does not disturb it.

Worth knowing *why* the address matters, though, because it stays true: the
label maker's save feature **is** the URL - the README tells staff "to keep a
sheet, bookmark it". So once people start bookmarking sheets, changing the
hostname breaks them. Pick the address you want to keep before publicising it.

Workers cannot be moved between Cloudflare accounts - you delete and recreate,
and the `*.workers.dev` hostname changes - which is the trap this section
originally existed to avoid. Creating it in the right account from the start
sidestepped it.

## Transfer steps

1. **GitHub repo → the org.** Transferring into an organisation needs
   repo-creation rights there, so either the person transferring is added to
   the org first, or an org owner initiates it. History, issues and stars come
   across, and GitHub redirects the old URL.

2. **Update the local remote** afterwards - the redirect works, but pointing at
   the real URL avoids confusion:
   `git remote set-url origin https://github.com/<org>/seattle-makers-tools.git`

3. **Reconnect Cloudflare to GitHub.** This is the one thing the repo move
   breaks. The GitHub app authorisation does not follow a repo across owners,
   so after the transfer the Worker can no longer see its source and stops
   auto-deploying. Re-authorise the Cloudflare GitHub app against the org and
   point the Worker at the transferred repo. The Worker itself, its settings
   and its URL are untouched - this is a reconnection, not a rebuild.

4. **Nothing to do for Cloudflare beyond that.** The Worker is already on the
   makerspace account. For reference, if one ever does need recreating, the
   settings are: build command `npm run build`, deploy command
   `npx wrangler deploy`, no environment variables. Everything else - the entry
   point and the `dist/` assets directory - comes from `wrangler.toml`, and
   `.nvmrc` pins the Node version.

5. **Point the subdomain at it** whenever you want - see above; it does not
   depend on the repo move.

6. **Update the two user-agent strings** to the new repo URL. They identify
   this scraper to seattlemakers.org, so they should point somewhere real:

   - `worker/index.js`
   - `scripts/fetch-events.mjs`

7. **Check `LICENSE`.** It currently reads `Copyright (c) 2026 Seattle Makers`,
   which assumes the work was handed over outright. Correct it if that is not
   the arrangement.

## After the transfer, how anyone contributes

With Cloudflare's git integration connected, every push to `main` builds and
deploys. Nobody needs `wrangler` installed or a Cloudflare login - **GitHub
access is the only access a contributor needs.** Edit a file, open a pull
request, merge, and it is live.

That includes the live-calendar function, which is ordinary JavaScript in this
repo rather than something configured in a dashboard.

## What breaks if the calendar changes

The scrape is the fragile part and it is deliberately loud about it. If
seattlemakers.org redesigns its calendar, `parse()` returns zero events;
`scripts/fetch-events.mjs` then exits non-zero and leaves the previous data in
place, and `worker/index.js` treats it as a failure and serves the
baked calendar with its own older date. The board keeps working and visibly
shows stale data rather than silently going empty. Fix it in
`src/lib/parse-calendar.mjs`, which both callers share.
