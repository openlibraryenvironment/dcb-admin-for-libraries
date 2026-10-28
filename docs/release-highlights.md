# Release highlights and the version in Preferences

On the first signed-in page after a release, a dialog lists that release's main changes in a
few lines, with a link to its full notes on GitHub. Preferences has an **About DCB Admin for
Libraries** section: the version this build is, a link to its release notes, and a button that
shows the highlights again. Read-only users see the dialog and Preferences too, with their
own shorter list of highlights.

## Writing a release's highlights

The highlights are written by hand, not taken from the changelog. The changelog lists every
commit, which is what release notes are for. In `src/constants/releaseHighlights.ts`:

1. Raise `HIGHLIGHTS_GENERATION` by one. Every browser that has seen an older generation is
   shown the new one once.
2. Set `HIGHLIGHTS` to the keys of three to five changes, in the order they are shown.
3. Set `READ_ONLY_HIGHLIGHTS` to the ones a read-only user can use. They have Requesting
   and Preferences only: no Home, Insights, library pages or exports. Where an item is
   true for them only in part, give it a key of its own, as `accessibility_read_only` is,
   rather than tell them about a page they cannot open.
4. In `src/locales/en-GB/en-GB.json`, under `release_highlights.items`, give each key a
   `heading` (a few words) and a `body` (one or two sentences, in what the library sees,
   not in the code's terms). Remove the previous release's items, from
   `src/locales/en-US/en-US.json` too. Add an item to en-US only where the American
   wording differs; `tests/localeParity.test.ts` fails on a British spelling left for an
   American reader.

Do this in the change that lands the feature, or just before the release. A release whose
changes are not worth a dialog leaves the generation alone, and nobody is interrupted.

The generation is a number of its own rather than the version because the version is not
known when the code is written: semantic-release chooses it from the commits as it releases.

## Where the version comes from

The `build` job runs before semantic-release chooses the version, so no build-time constant
can hold it. The version is read at runtime, in this order (`src/helpers/release.ts`):

1. **Under the KI bootloader**, from the bundle's own URL: each release is served from a
   directory named for it (`.../dcb-admin-for-libraries/v1.14.0/`).
2. **Otherwise**, from `release.json` beside the bundle, `{"version":"v1.14.0"}`. Both
   `deploy_tag_to_s3` and `deploy_release_to_r2` write it from `$RELEASE_VERSION` before
   uploading. A missing file, or the SPA's own HTML in its place, is no version.
3. **With neither**, Preferences shows "Development build" and the commit from the build stamp,
   or "Version not known".

What the file says is checked like any other input: only `vX.Y.Z` or `X.Y.Z` is a version.

The release-notes link goes to `https://github.com/openlibraryenvironment/dcb-admin-for-libraries/releases/tag/v<version>`,
the public mirror's page for the version, or to the releases list when it is not known.

## Who has seen them

The last generation dismissed is kept in `localStorage`, per browser, like the home page's
last visit: a desk computer shared by several people shares it. Closing the dialog by its
button, Escape or the backdrop all count as seen. Signing out does not clear it, as it does
not clear display settings. When user preferences reach dcb-service, it belongs there, so it
follows the person ([saved-filters.md](saved-filters.md) lists the same move for saved
filters).

In e2e, `seedAuth` marks every generation as seen, so the dialog does not sit over each spec's
first page; a spec that tests it signs in with `releaseHighlightsSeen: false`.
