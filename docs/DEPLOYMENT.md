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
11. Set the **Valid Redirect URIs** and **Web Origins** strictly to the exact URL where your application will be hosted (e.g., `https://libraries.yourlibrary.org`). **CRITICAL SECURITY NOTE:** Never use a wildcard (`*`) in production, as this may allow malicious sites to steal user tokens.

---

## 2. Environment Variables

The application requires the following environment variables to function properly. How you apply them depends on your chosen deployment method (see Section 3).

| Variable                 | Required | Description                                                                                                                                                                                                                                                                         |
| ------------------------ | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `VITE_KEYCLOAK_URL`      | **Yes**  | The URL of the Keycloak server being used for your OpenRS system.                                                                                                                                                                                                                   |
| `VITE_KEYCLOAK_ID`       | **Yes**  | The name of the Keycloak client (e.g., `dcb-admin-libraries`).                                                                                                                                                                                                                      |
| `VITE_DCB_API_BASE`      | **Yes**  | The URL of the dcb-service instance.                                                                                                                                                                                                                                                |
| `VITE_DCB_SEARCH_BASE`   | **Yes**  | The URL of the dcb-locate instance.                                                                                                                                                                                                                                                 |
| `VITE_MUI_X_LICENSE_KEY` | **Yes**  | Provided by the Hosting Provider. Unlocks MUI X Premium features. It is OK for this to be exposed in the bundle: it is not OK for this to be publicly broadcast (i.e. committed to a repository). See [MUI X docs](https://mui.com/x/introduction/licensing/#license-key-security)! |

> [!NOTE]
> Unlike other variants of the admin UI, **DCB Admin for Libraries** uses relative asset paths (`base: "./"`) in its build configuration. This means you do **not** need to supply a build-time `VITE_PUBLIC_URL` variable if hosting on a subpath (e.g., `/libraries-admin/`). The application's scripts and styles will automatically resolve correctly relative to the deployment folder.

---

## 3. Deployment Pathways

Choose the deployment method that matches your infrastructure.

### Option A: AWS (S3 + CloudFront)

**Architecture:** This approach uses a static build. Because S3 has no server-side execution, environment variables cannot be injected at runtime. Every `VITE_*` value is permanently baked into the JavaScript bundle during the build phase. You must build a separate artifact for each environment (dev, staging, production).

**Deployment Steps:**

1. Export all environment variables listed in Section 2 on your build machine (or in your CI/CD runner).
2. Run `npm run build` to generate the `dist/` directory.
3. Sync the `dist/` directory to your S3 bucket.
4. Ensure your sync command sets `Cache-Control: no-store, no-cache, must-revalidate` strictly on `/index.html` to guarantee users always receive the latest app updates instantly.
5. Configure CloudFront's custom error responses.
6. Map `403` and `404` errors to return `/index.html` with a `200` status.
7. Ensure this is configured so the application's client-side routing can handle deep links and page refreshes correctly.

### Option B: Cloudflare Pages

**Architecture:** This uses a "Build Once, Deploy Anywhere" approach. You deploy the exact same static build to every environment, and a small Cloudflare Pages Function dynamically supplies the environment-specific configuration to the app at runtime via `/inject_env.json`.

**Deployment Steps:**

1. Create a Cloudflare Pages project pointing at your repository.
2. Set the build command to `npm run build` and the output directory to `dist`.
3. Add the variables from Section 2 directly into the Cloudflare dashboard under your Pages environment bindings.
4. Deploy the application.
5. Verify that Cloudflare automatically serves the configuration as JSON via `/inject_env.json`.

### Option C: Docker (Self-Hosted / Portable)

**Architecture:** Similar to Cloudflare, this uses a runtime-config approach. The provided Dockerfile builds the app and serves it via an Nginx alpine container (`nginx:stable-alpine`). An entrypoint script uses `envsubst` to dynamically inject the container's environment variables into the app when the container boots.

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
  dcb-admin-libraries

```

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
