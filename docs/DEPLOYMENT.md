# DCB Admin for Libraries Deployment Guide

This document outlines how to configure and deploy **DCB Admin for Libraries**. The application is a React Single Page Application (SPA) built with Vite and TypeScript.

Because it is a static SPA, it can be hosted in several ways. We officially support three deployment targets: **AWS (S3 + CloudFront)**, **Cloudflare Pages**, and **Docker**. Other methods of hosting SPAs may work, but are not officially supported. Feel free to contribute if you have a new way of hosting the app!

---

## 1. Global Prerequisites: Keycloak Setup

Before deploying the application, you must configure your OpenRS Keycloak system so the application can authenticate users securely.

Log into your Keycloak dashboard, select the `dcb-hub` realm, and complete these steps exactly as written:

1. Add a custom attribute called `code` to every user requiring access.
2. Ensure this value strictly corresponds to their library's agency code.
3. Navigate to **Client Scopes**, then select **profile**.
4. Add a **User Attribute Mapper** for the `code` attribute.
5. Select **"by configuration"** so the application can successfully extract it from the token.
6. Configure a new PKCE client.
7. Ensure the client name matches the `VITE_KEYCLOAK_ID` you plan to use in your environment variables.
8. Set the flow to **Standard flow**.
9. Turn **OFF** client authentication (this must be a public access type, not a confidential OIDC client).
10. Under the "Advanced" tab, set the Proof Key for Code Exchange (PKCE) Code Challenge Method to **S256**.
11. Set **Valid Redirect URIs** to the app's own path, scoped by a trailing wildcard: `https://<host>/dcb-admin-for-libraries/*` on a shared origin such as `mobius.kihosting.net`, or `https://<host>/*` when the app is at the root. Sign-in returns to the base and sign-out to `<base>logout?loggedOut=true`, so the exact base URL alone rejects the sign-out redirect. Leave **Valid post logout redirect URIs** as `+` (the same list). Set **Web Origins** to the origin only, with no path (`https://<host>`). Keep this client separate from DCB Admin's even on the same host.
    **CRITICAL SECURITY NOTE:** Never use a bare wildcard (`*`) or a host-wide one where other apps share the origin: either lets a redirect deliver the authorisation code somewhere this app does not control.

---

## 2. Environment Variables

The application requires the following environment variables to function properly. How you apply them depends on your chosen deployment method (see Section 3).

| Variable                 | Required | Description                                                                                                                                                                                                                                                                                                   |
| ------------------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `VITE_KEYCLOAK_URL`      | **Yes**  | The URL of the Keycloak server being used for your OpenRS system.                                                                                                                                                                                                                                             |
| `VITE_KEYCLOAK_ID`       | **Yes**  | The name of the Keycloak client (e.g., `dcb-admin-libraries`).                                                                                                                                                                                                                                                |
| `VITE_DCB_API_BASE`      | **Yes**  | The URL of the dcb-service instance.                                                                                                                                                                                                                                                                          |
| `VITE_DCB_SEARCH_BASE`   | **Yes**  | The URL of the dcb-locate instance.                                                                                                                                                                                                                                                                           |
| `VITE_MUI_X_LICENSE_KEY` | **Yes**  | Provided by the Hosting Provider. Unlocks MUI X Premium features. It is OK for this to be exposed in the bundle: it is not OK for this to be publicly broadcast (i.e. committed to a repository). See [MUI X docs](https://mui.com/x/introduction/licensing/#license-key-security)!                           |
| `VITE_PUBLIC_URL`        | No       | Standalone base path. Defaults to `/`. Must include leading and trailing slashes (e.g. `/dcb-admin-for-libraries/`). **Build-time only.** The standalone entry uses it for assets, routing, public assets and storage. The bootloader entry always routes at `/` and resolves assets from its own bundle URL. |

> [!NOTE]
> `VITE_PUBLIC_URL` is not runtime tenant configuration. Set it only at build time for standalone/subpath deployments. Host-specific backend, search, Keycloak and licence values should be supplied by `inject_env.json` in standalone runtime-config deployments or by the KI bootloader host configuration.

> [!IMPORTANT]
> Under a subpath, only the router adds the base. A root-relative `href` or `window.open("/patronRequests/…")` resolves against the origin root, outside this app — on a shared origin such as Mobius, into whatever else is mounted there. Navigate with `to` on a router link (`CustomLink`), and pass `appUrl(path)` to `window.open`. ESLint fails both patterns when the path is a literal; it cannot see a path held in a variable.

---

## 2a. Feature flags: which dcb-service this deployment is talking to

This application ships on its own cadence, and a dcb-service upgrade takes time to reach
production, so one release of this app has to run against more than one release of the
backend. Anything that needs a newer dcb-service is behind a runtime flag, switched on
**when this environment's own dcb-service is upgraded, with no rebuild**: the container
re-renders `inject_env.json` from its environment on every start, so a changed variable
plus a restart is the whole procedure.

**Every flag is off unless it is explicitly `true`.** An unset variable, an empty string,
`0` and `yes` all read as off, so an environment that has never heard of a flag simply
does not show the feature.

| Variable | Enable at dcb-service | What it turns on |
| --- | --- | --- |
| `VITE_FEATURE_LIBRARY_BRANDING` | **9.0.0** or later | The "How your library appears to patrons" block on the library profile: logo, logo description and discovery theme |
| `VITE_FEATURE_INSIGHTS` | **9.0.0** or later | The Insights page, and the top-titles / top-requesters panels on the library profile (all of them call `/insights/**`) |
| `VITE_FEATURE_LIBRARY_SUPPORT_URL` | **no release serves this yet** (not yet on dcb-service main) | The "Report a problem URL" field in the "Links for patrons" block |
| `VITE_FEATURE_INSIGHTS_WALK_UP` | **after 9.1.0**: the release carrying `/insights/library-breakdown` | The "Collected in person, or sent" panel under Insights, Service. Needs `VITE_FEATURE_INSIGHTS` too |
| `VITE_FEATURE_AGENCY_SCOPED_REQUESTS` | **9.0.0** or later | Scoping the request grids by agency code rather than by Host LMS code, and the library column that needs it |
| `VITE_FEATURE_GUARDED_CLEANUP` | **9.0.0** or later | Request cleanup that the service refuses, with a reason, while the item is still out |
| `VITE_FEATURE_INSIGHTS_TRENDS` | **9.1.0** or later (`/insights/trend`) | The duration trend panel on Insights → Trends. Needs `VITE_FEATURE_INSIGHTS` as well |
| `VITE_FEATURE_ANNOUNCEMENTS` | **no release serves this yet** | The Announcements page. Leave it off: on a service without the announcement operations, the page's whole GraphQL request is rejected |
| `VITE_FEATURE_TODAY_SINCE_LAST_VISIT` | any supported release | Today: count problems and activity since the user's last visit, remembered per browser |
| `VITE_FEATURE_TODAY_LAST_WEEK` | any supported release | Today: each problem and activity count compared with the same time last week |
| `VITE_FEATURE_TODAY_SETUP_CHECKLIST` | any supported release | Today: a profile checklist for a library that has never borrowed or supplied |
| `VITE_FEATURE_TODAY_INSIGHTS` | with `VITE_FEATURE_INSIGHTS` | Today: the Insights overview tiles for the last 7 days. Off while `VITE_FEATURE_INSIGHTS` is |
| `VITE_FEATURE_TODAY_ANNOUNCEMENTS` | with `VITE_FEATURE_ANNOUNCEMENTS` | Today: the notices live for the library's patrons. Off while `VITE_FEATURE_ANNOUNCEMENTS` is |
| `VITE_FEATURE_TODAY_LIBRARY_SPLIT` | with `VITE_FEATURE_AGENCY_SCOPED_REQUESTS` | Today: a by-library table for users who administer more than one library. Off while agency scoping is |
| `VITE_FEATURE_TODAY_PICKUP_HERE` | **8.71.0 only** | Today: other libraries' patrons collecting at the library's locations. Off whenever `VITE_FEATURE_AGENCY_SCOPED_REQUESTS` is on, because 9.0.0 and later do not show a library the requests it only collects |

**On the kihosting.net hosts you do not set these.** Those deployments are served by the
shared Cloudflare worker that also serves DCB Admin, which derives the whole flag block
from the dcb-service version named for that host: its `APP_FEATURES` table maps each flag to
the first version that serves it. The worker is not kept in this repository or in
`dcb-admin-ui`; that repo's `dcb-hub-admin-ui/docs/deployment.md` (Option A) describes it.
A flag added here has to be added to the worker's table for this app in the same change, or
it is undefined, and so off, on every one of those hosts. Nothing in this repository can
catch that. The release checklist in section 5 lists what the table needs for 2.0.

**`VITE_FEATURE_AGENCY_SCOPED_REQUESTS` is the one flag that is not cosmetic when off.**
It switches the request filter from `patronHostlmsCode` to `patronAgencyCode`. Left off on
a 9.0.0 deployment, libraries sharing a Host LMS see one another's requests, so it goes on
with the upgrade rather than after it.

## 2b. Is there a discovery front end? `VITE_DISCOVERY_ACTIVE`

This one is **not** about which dcb-service you run, which is why it is not a
`VITE_FEATURE_*` and is listed separately.

| Variable | Set it when | What it turns on |
| --- | --- | --- |
| `VITE_DISCOVERY_ACTIVE` | An OpenRS discovery front end is deployed for this consortium | The two blocks on the library profile that configure discovery and nothing else: "How your library appears to patrons" (logo, logo description, theme) and "Links for patrons" (library website, report-a-problem URL) |

A consortium using DCB with its own discovery layer has nowhere for a patron logo, a theme
name or a footer link to appear. Leaving this unset hides them rather than offering an
administrator settings nothing will ever read.

**It composes with the flags above, it does not replace them.** The brand block needs both
a discovery app to render it *and* a dcb-service that can store it, so
`VITE_DISCOVERY_ACTIVE` and `VITE_FEATURE_LIBRARY_BRANDING` must both be `true`.

**Switching it off is safe and reversible.** Unlike every flag in 2a it changes only what
is rendered: the GraphQL documents are untouched, and the library mutation sends changed
fields only - so a brand already stored stays stored, and turning the flag back on shows it
again. `e2e/discovery-inactive.spec.ts` asserts both halves.

### Getting it wrong in each direction

A flag left **off** after the upgrade costs a hidden feature and nothing else.

A flag switched **on** too early is the expensive mistake, because the newer GraphQL
fields do not degrade gracefully: a field the server does not declare is a validation
error that fails the whole operation. `LoadLibrary` runs in four routes and the on-site
borrowing form, so `VITE_FEATURE_LIBRARY_BRANDING=true` against 8.71.0 does not grey out a
form — it takes those pages down.

### Adding the next one

The rule lives in `src/constants/serviceCapabilities.ts`, not in prose. Add a row naming
the release and the fields, declare the flag in `src/helpers/featureFlags.ts`, add it to
`docker/production/inject_env.json.template`, and commit that release's schema as
`schema.v<version>.graphqls`. Three test suites then check the claim rather than trusting
it: that the flag reaches a deployment, that the release really has those fields (and the
one before it does not), and that every document is valid against both the oldest
supported release and dcb-service main.

---

## 3. Deployment Pathways

Choose the deployment method that matches your infrastructure.

### KI bootloader bundle

`npm run build` creates one `dist/` artifact with the standalone `index.html`
and a fixed adapter entry point:

```ts
mount({ element, config }): Promise<void>
```

Publish the same directory to existing standalone destinations and as
`dcb-admin-for-libraries/<version>/` in the `ki-front-end-bundles` R2 bucket.
Configure KI Console SPA bootstrap host records with app
`dcb-admin-for-libraries`, a version such as `next` or `v1.2.3`, and a public
`config` object containing the variables from Section 2.

The existing S3 paths, Docker image, `inject_env.json`, and local `npm run dev`
flow remain unchanged.

### After a deploy

Every deploy deletes the previous build's hashed chunks, so a tab opened before it asks
for a chunk that no longer exists at its next lazy route. TanStack Router recovers from
that itself: `lazyRouteComponent` reloads the page once per missing chunk, which fetches the
new `index.html`, and shows the route's error page if the chunk is still missing after
that. `e2e/route-error.spec.ts` holds it to one reload. Do not add a second
`vite:preloadError` handler on top: one was tried, and it reloaded a permanently missing
chunk in a loop.

The reload only helps if `index.html` is never served from a cache. The pipeline uploads it
with `Cache-Control: no-store`, hashed assets as immutable, and the other stable names
(`ki-bootstrap.js`, the favicon) as `no-cache`. If the Cloudflare worker sets its own
headers, it must keep those semantics.

### Option A: Cloudflare Pages

**Architecture:** This uses a "Build Once, Deploy Anywhere" approach. You deploy the exact same static build to every environment, and a small Cloudflare Pages Function dynamically supplies the environment-specific configuration to the app at runtime via `/inject_env.json`.

**Deployment Steps:**

1. Create a Cloudflare Pages project pointing at your repository.
2. Set the build command to `npm run build` and the output directory to `dist`.
3. Add the variables from Section 2 directly into the Cloudflare dashboard under your Pages environment bindings.
4. Deploy the application.
5. Verify that Cloudflare automatically serves the configuration as JSON via `/inject_env.json`.

### Option B: AWS (S3 + CloudFront)

**Architecture:** This approach uses a static build. Because S3 has no server-side execution, environment variables cannot be injected at runtime. Every `VITE_*` value is permanently baked into the JavaScript bundle during the build phase. You must build a separate artifact for each environment (dev, staging, production).

**Architecture Note** (main.tsx Fallback): On a plain S3 bucket, there is no server-side component to generate /inject*env.json. The application deliberately attempts to fetch this file, and when it receives a 404 error, it intentionally falls back to the build-time import.meta.env.VITE*\* variables.

**Deployment Steps:**

1. Export all environment variables listed in Section 2 on your build machine (or in your CI/CD runner).
2. Run `npm run build` to generate the `dist/` directory.
3. Sync the `dist/` directory to your S3 bucket.
4. Ensure your sync command sets `Cache-Control: no-store, no-cache, must-revalidate` strictly on `/index.html` to guarantee users always receive the latest app updates instantly.
5. Configure CloudFront's custom error responses.
6. Map `403` and `404` errors to return `/index.html` with a `200` status.
7. Ensure this is configured so the application's client-side routing can handle deep links and page refreshes correctly.

**CI/CD Examples**

Using "staging" as an example environment.

1. Build the application with environment variables

`VITE_KEYCLOAK_URL=https://staging-keycloak... VITE_DCB_API_BASE=https://staging-api... npm run build`

2. Sync the built assets to your S3 bucket

`aws s3 sync dist/ s3://dcb-admin-staging --delete`

3. Invalidate the CloudFront cache (crucial for /index.html)

`aws cloudfront create-invalidation --distribution-id <id> --paths "/index.html" "/\*"`

### Option C: Docker (Self-Hosted / Portable)

**Architecture:** Similar to Cloudflare, this uses a runtime-config approach. The provided Dockerfile (`docker/production/Dockerfile`) builds the app and serves it via an Nginx alpine container (`nginx:stable-alpine`). On boot, nginx's own template mechanism renders `docker/production/default.conf.template` into the live server config, and a script in `/docker-entrypoint.d/` (`docker/production/40-inject-env.sh`) uses `envsubst` on `docker/production/inject_env.json.template` to render `/inject_env.json` from the container's environment variables. Client-side routes (deep links/refreshes) fall back to `index.html`, and both `index.html` and `inject_env.json` are served with `Cache-Control: no-store, no-cache, must-revalidate` so redeployed containers are never masked by a stale cache.

**Security Note**: The Dockerfile deliberately uses floating minor-version tags (e.g., node:22-alpine, nginx:stable-alpine) rather than pinned patch versions. This ensures that every time the image is rebuilt, it automatically picks up the latest base-OS security patches.

**Deployment Steps:**

1. Build the image using `docker build -f docker/production/Dockerfile -t dcb-admin-libraries .`.
2. Run the container, passing in your environment variables via the `-e` flag.
3. Map the port correctly, keeping in mind the application runs on port `80` inside the container.

**Run Command Example:**

```bash
docker run -p 8080:80 \
  -e VITE_MUI_X_LICENSE_KEY="..." \
  -e VITE_KEYCLOAK_URL="https://keycloak..." \
  -e VITE_KEYCLOAK_ID="dcb-admin-libraries" \
  -e VITE_DCB_API_BASE="https://api..." \
  -e VITE_DCB_SEARCH_BASE="https://search..." \
  -e VITE_PUBLIC_URL="/libraries-admin/" \
  -e VITE_DISCOVERY_ACTIVE="true" \
  -e VITE_FEATURE_LIBRARY_BRANDING="true" \
  -e VITE_FEATURE_INSIGHTS="true" \
  dcb-admin-libraries

```

The two feature flags above are the dcb-service **9.0.0** set (Section 2a). Against an
older deployment, leave them out. Switching them on later is a changed `-e` and a
container restart — `40-inject-env.sh` re-renders `inject_env.json` on every start, so the
bundle is never rebuilt.

---

## 4. Security Note: PKCE vs. Traditional Client Secrets

Because DCB Admin for Libraries is a Single Page Application (SPA) that runs entirely in the user's browser, we strictly require the **Proof Key for Code Exchange (PKCE)** method instead of the traditional "Client Secret" flow for Keycloak authentication.

### The Problem with Client Secrets in SPAs

- **High exposure risk:** Traditional OAuth2 flows rely on a static "Client Secret" to exchange an authorization code for an access token.
- **No secure storage:** In a static SPA, there is no secure backend server to hide this secret. If a Client Secret were used, it would have to be embedded into the frontend JavaScript, making it easy for anyone inspecting the browser source code or network tab to steal it.

### The PKCE Advantage

PKCE was explicitly designed to secure public clients like SPAs and mobile applications where secrets cannot be hidden.

- **Dynamic verification:** Instead of relying on a static, unchanging secret, PKCE generates a unique, temporary cryptographic "Code Verifier" and "Code Challenge" for every single login attempt.
- **Interception protection:** When the application requests an access token, it must provide the original verifier. Even if a malicious actor (such as a compromised browser extension) intercepts the authorization code during the redirect, it is completely useless without the original verifier (which remains secure in the legitimate user's local browser memory).
- **OAuth best practices:** Using PKCE (specifically with the `S256` hashing method) is the current industry gold standard and is recommended by the OAuth 2.0 Security Best Current Practice guidelines.

---

## 5. Releasing to the kihosting hosts

The kihosting hosts, `mobius.kihosting.net` among them, serve this app at
`/dcb-admin-for-libraries/` through the Cloudflare worker that also serves DCB Admin at
`/dcb-admin/`. The pipeline publishes the bundle; these are the parts it cannot do. Work
through them before the release pipeline runs, and the checks after it.

### Before the release

1. **The worker's flag table for this app.** In `APP_FEATURES`, each flag maps to the
   first dcb-service release that serves it:

   | Flag | First served by |
   | --- | --- |
   | `VITE_FEATURE_INSIGHTS`, `VITE_FEATURE_LIBRARY_BRANDING`, `VITE_FEATURE_AGENCY_SCOPED_REQUESTS`, `VITE_FEATURE_GUARDED_CLEANUP` | 9.0.0 |
   | `VITE_FEATURE_INSIGHTS_TRENDS` | 9.1.0 |
   | `VITE_FEATURE_LIBRARY_SUPPORT_URL`, `VITE_FEATURE_ANNOUNCEMENTS`, `VITE_FEATURE_INSIGHTS_WALK_UP` | none yet: must resolve to off |
   | `VITE_FEATURE_TODAY_*` | a product choice, not a release: see section 2a for what each needs beside it |

   A flag that is absent from the table is off on every host, which is the safe failure for
   the last row and the wrong one for the others. `VITE_FEATURE_AGENCY_SCOPED_REQUESTS`
   matters most: left off against 9.x, libraries that share a Host LMS see each other's
   requests (section 2a).
2. **The Keycloak client for each host.** Valid Redirect URIs
   `https://<host>/dcb-admin-for-libraries/*`, Valid post logout redirect URIs `+`, Web
   Origins `https://<host>` (section 1, step 11). With only the exact base URL, sign-out
   fails with Keycloak's "Invalid redirect uri".
3. **The worker's Content Security Policy.** `index.html` carries one inline script, which
   applies the reader's colour scheme before first paint. Under `script-src 'self'` it is
   blocked and the wrong theme flashes on every load. The `build` job prints the source to
   allow, `'sha256-…'`, at the end of its log, from `scripts/print-csp-hashes.mjs`. Take it
   from the release pipeline's own `build` job: the hash changes with the base path and with
   any edit to the script, so a value copied from an earlier release can be stale.
4. **Cache headers.** The deploy uploads `index.html` with `Cache-Control: no-store`, hashed
   files under `assets/` as `immutable`, and the other fixed names as `no-cache`. The worker
   must pass these through, or keep the same meaning if it sets its own. After a deploy,
   TanStack Router reloads an open tab once to fetch the new `index.html` ("After a deploy"
   in section 3), and that only works if `index.html` is never served from a cache.

### After the release

To see which build a host is serving, `curl -s https://<host>/dcb-admin-for-libraries/ | grep dcb-admin-for-libraries-build`
prints the commit it was built from; the build job asserts the stamp is there.

1. The R2 bucket `ki-front-end-bundles/dcb-admin-for-libraries/` holds `v<version>/`, and
   `latest.json` reads `{"version":"v<version>"}`. Before 2.0, no release had ever reached R2.
2. `ki-libs-spa-hosting/archive/dcb-admin-for-libraries-v<version>/` exists. While there, look
   for a key ending in a bare `dcb-admin-for-libraries-`: releases before 2.0 wrote their
   archive there, and it is safe to delete.
3. `curl -sI https://<host>/dcb-admin-for-libraries/` shows `cache-control: no-store`, and any
   `/dcb-admin-for-libraries/assets/*.js` shows `immutable`.
4. Sign in and sign out on each host. Sign-out returns to
   `/dcb-admin-for-libraries/logout?loggedOut=true` without a Keycloak error page.
5. With the browser's developer tools open, reload: no CSP violation is reported for an
   inline script.

