# Handover

This repo is meant to end up owned by Seattle Makers. It was built in a
personal GitHub account and first deployed from a personal Cloudflare account,
so this is the list of what has to move and what breaks if it does not.

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

## Do not attach the real subdomain to the first deployment

The first deployment lives in a personal Cloudflare account and is disposable.
Workers cannot be moved between Cloudflare accounts: the Worker is recreated
under the new account, and the `*.workers.dev` hostname changes with it.

That is cheap - it is a git-connected build with no state - but only if nothing
is pointing at the old hostname yet. So **leave `tools.seattlemakers.org` (or
whatever it ends up being) until the Cloudflare account is the makerspace's
one.** Doing the DNS step once, at the end, avoids a window where the published
address stops working.

The same reasoning applies to anything printed or bookmarked. Note that the
label maker's *save* feature is the URL - the README says "to keep a sheet,
bookmark it" - so staff bookmarks break if the host changes under them. Another
reason the throwaway hostname should stay throwaway.

## Transfer steps

1. **GitHub repo → the org.** Transferring into an organisation needs
   repo-creation rights there, so either the person transferring is added to
   the org first, or an org owner initiates it. History, issues and stars come
   across, and GitHub redirects the old URL.

2. **Update the local remote** afterwards - the redirect works, but pointing at
   the real URL avoids confusion:
   `git remote set-url origin https://github.com/<org>/seattle-makers-tools.git`

3. **Reconnect Cloudflare to GitHub.** The GitHub app authorisation does not
   follow a repo across owners, so the Worker loses its source. If the
   Cloudflare account is also changing, skip this and do step 4 instead.

4. **Recreate the Worker** under the makerspace Cloudflare account.
   Use a role login (something like `tech@seattlemakers.org`) rather than a
   personal one, so it is not tied to one member. Settings, in full:

   | Field | Value |
   | --- | --- |
   | Build command | `npm run build` |
   | Deploy command | `npx wrangler deploy` |
   | Environment variables | none |

   Everything else comes from `wrangler.toml` - the entry point and the
   `dist/` assets directory - so there is nothing else to fill in. `.nvmrc`
   pins Node 22.12.0 and Cloudflare honours it.

5. **Point the subdomain at it**, now that the account is the final one.

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
