# Handover

This repo is owned by Seattle Makers, and **both halves are now on the
makerspace's own accounts.** The Worker was created under its Cloudflare
account from the start, so the deployment, its URL and its billing were always
final; the GitHub repo was the last personal piece and moved to the
`seattlemakers` org on 2026-09-20.

One step of that move is still outstanding - see *Transfer steps* below, item
3. Written down because the person doing the transfer may not be the person who
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

**The repo moved to the `seattlemakers` org on 2026-09-20 and was renamed
`sm-digital-toolbox` the same day.** It was `hankfoot/seattle-makers-tools`
before that; both old URLs redirect. What the move took, and what it left:

1. ~~**GitHub repo → the org.**~~ Done. Transferred by an org admin via the
   API; history, issues and stars came across, and GitHub redirects the old
   `hankfoot/` URL indefinitely. The repo is still public.

2. ~~**Update the local remote.**~~ Done. The redirect works either way, but
   every clone should be pointed at the real URL:
   `git remote set-url origin https://github.com/seattlemakers/sm-digital-toolbox.git`

3. **Reconnect Cloudflare to GitHub, and clean up the old Worker.** *Still to
   do, and it is the one part of this that a push cannot finish.* Two separate
   things, both in the Cloudflare dashboard:

   - **The authorisation.** The GitHub app authorisation does not follow a repo
     across owners, so the Worker can no longer see its source and has stopped
     auto-deploying. Re-authorise the Cloudflare GitHub app against the
     `seattlemakers` org and point the Worker at `sm-digital-toolbox`.
     **Until this is done, pushes to `main` do not deploy.**

   - **The orphan.** `wrangler.toml`'s `name` is the Worker's name, and it now
     reads `sm-digital-toolbox`. A deploy does not rename a Worker - it creates
     a new one and leaves the old `seattle-makers-tools` Worker running at its
     own address, serving whatever it last built, for as long as nobody deletes
     it. So: deploy, check the new hostname actually serves the site, then
     delete the old Worker by hand. Two live copies of this is the bad outcome,
     because the stale one keeps answering bookmarks.

   **The `*.workers.dev` hostname changes with the name.** That was the accepted
   cost of the rename, and it is the moment to attach the real subdomain (item
   5) rather than publicise a second temporary address - see *The subdomain*
   above for why the URL is load-bearing for the label maker.

4. **Nothing to do for Cloudflare beyond that.** The Worker is already on the
   makerspace account. For reference, if one ever does need recreating, the
   settings are: build command `npm run build`, deploy command
   `npx wrangler deploy`, no environment variables. Everything else - the entry
   point and the `dist/` assets directory - comes from `wrangler.toml`, and
   `.nvmrc` pins the Node version.

5. **Point the subdomain at it** whenever you want - see above; it does not
   depend on the repo move.

6. ~~**Update the two user-agent strings.**~~ Done, and there were three, not
   two. This note used to name `worker/index.js`, which has not carried the
   string since the response moved out of it: it imports `calendarResponse()`
   from `src/lib/calendar-api.mjs`, and that module holds the header. The three
   real ones are `scripts/fetch-events.mjs`, `src/lib/calendar-api.mjs` and
   `src/lib/summarise.mjs` - grep for `user-agent` rather than trusting a list.
   The footer's repo link in `src/components/SiteFooter.astro` moved with
   them.

7. ~~**Check `LICENSE`.**~~ Done. It reads `Copyright (c) 2026 Seattle Makers`,
   which the transfer makes correct rather than presumptuous. Left as is.

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
