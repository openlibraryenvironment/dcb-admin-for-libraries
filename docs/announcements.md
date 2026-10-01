# Announcements

What a library can tell its patrons, and the four decisions that shape the form.

## What this is for, and the sentence that says so

Discovery-affecting news: an ILS migration, a requesting outage, a branch closure that
changes where things can be collected.

It is **not** a what's-on board, not a newsletter and not a marketing slot — every one of
which a library will reasonably ask for once the field exists. That constraint lives in the
form's help text rather than only here, because a constraint that exists only in a document
does not survive contact with the person filling in the form. `announcements.scope_help` is
that sentence, and it points at the library's own website for everything else.

## The expiry is required, and there is no "never"

The failure mode of every announcement banner ever built is the notice from March still up
in November, which teaches every patron to ignore that strip permanently — including on the
day it matters.

dcb-service refuses a notice with no end. This form asks for one and defaults it to a
fortnight, so the easy path is also the right one. An expired notice stays in the list,
greyed, because "why has that gone" is the next question an administrator asks.

The date input sends the **end** of the chosen day. An administrator choosing the 30th means
"up to and including the 30th"; sending midnight would take the notice down a day early, on
the day they thought it would still be up.

## No scope on the update input

That is dcb-service's decision rather than an omission in the client. Moving a library's
notice to consortium scope by editing it would widen its reach to every patron of every
member library, through a path that never asks the question the create path asks. A
misplaced notice is withdrawn and republished.

There is no urgency control either. Urgency exists to rank a consortium notice against a
library's own, and this surface is the library's own — offering the switch here would let
somebody set a flag that changes nothing.

## Behind a flag that changes the document, not the render

`VITE_FEATURE_ANNOUNCEMENTS` is not a render switch. dcb-service declares none of these
operations on any release, so asking a deployment that lacks them for `announcements` is a
GraphQL validation error that fails the **whole operation** rather than returning null for
the part it cannot answer.

So the flag gates the document that is sent, and the route renders an explanation rather
than a form when it is off: an administrator who arrives from a bookmark is told why,
instead of meeting something that cannot work.

The capability row carries `since: null` for the same reason — there is no release to name
yet. `schemaConformance.test.ts` excludes these documents from its narrower passes through
`FLAG_ONLY`, which is a documented door rather than a silent skip: see
[testing.md](testing.md), "Documents only sent behind a flag".

## Where the contract lives

The schema this app targets is dcb-service's `feat/discovery-contract` branch, which is its
main plus what a discovery front end needs. Until that branch merges and a release carries
it, nothing here can reach a deployment.
