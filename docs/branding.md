# The patron-facing library brand

R-17. A library supplies a logo, alt text and a theme name, and discovery
renders them. This is where they are typed in.

## Two ways to supply an image, and neither is the fallback

A consortium with a brand team and a CDN must not be made to re-upload into our
storage. A consortium with neither must not be told to go and find hosting
before it can have a logo. So `BrandImageField` offers both a URL and an upload,
and they write to the same field, because the column stores a URL either way.

## Choosing a file does not upload it

The file is staged in the component and uploaded by the form at **Save**.

Uploading at pick time left a stored image behind every time somebody changed
their mind or closed the tab. The upload and the mutation that stores its URL
are two separate calls, so `dcb-service` cannot distinguish an abandoned image
from one about to be used; it keeps unreferenced uploads for a grace period and
sweeps them daily. That works, but it means the ordinary act of reconsidering a
logo leaves rows in a database. Staging collapses the window from "until the
administrator decides" to the moment between two calls in one submit handler.
An orphan then needs the upload to succeed and the mutation to fail
immediately, which is rare and still swept.

**The cost, stated plainly.** Validation moves from immediate to on-save. An
administrator who picks a 6000×4000 image used to be told at once and is now
told when they save. That is a worse form, and it is the accepted trade: the
size check in `BrandImageField` catches the common case at pick time, and
everything else — magic bytes, dimensions, decodability — can only be answered
by the server, which is the whole point of the server being the authority.

## PNG and JPEG, said before the picker opens

The accepted formats are stated next to the button rather than discovered from
a rejected upload.

- **SVG is refused** because it is a script-capable document, and one served
  from our own origin would be stored XSS in the chrome of every patron page,
  including the sign-in page.
- **WebP is refused** because the server cannot re-encode it, and an image it
  cannot decode is one it will not store.

The `accept` attribute is a **convenience, never a control**: a file picker
filter is a hint to the operating system and says nothing about the bytes.
`dcb-service` sniffs magic bytes, ignores the filename and the declared content
type, enforces byte and dimension caps from the image header before any decode,
and re-encodes what it stores. Nothing a browser says is evidence about the
bytes.

## Whether to offer the upload at all — R-17b

A deployment with `dcb.branding.assets.store=none` has no upload route:
dcb-service's controller is `@Requires(beans = BrandAssetStore.class)`, so
`POST /brand-assets` is a 404 and the button could only ever fail. The fact is
published on `/info` precisely so the decision can be made before an
administrator has picked a file.

**Unknown means available, deliberately.** Every path that does not produce an
explicit "none" — request in flight, request failed, no API base configured, a
service older than the branding block — resolves to true. Hiding the control on
unknown would remove a working feature whenever `/info` is briefly unreachable,
with nothing on screen to explain it. Showing it costs a clear refusal at Save,
which dcb-service already writes.

Hiding a button is UX here, not authorisation. The control on uploading is the
role check on the route.

**Cached for two hours.** The asset store is deployment configuration: it
changes when the service is redeployed and not otherwise. This matches
`dcb-admin-ui`'s `/info` cadence rather than re-asking on every mount of the
library form.
