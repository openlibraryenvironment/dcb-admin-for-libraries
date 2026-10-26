# Notes on requests

dcb-service 9.2.0 lets the libraries involved in a patron request write notes on it. The rules
are dcb-service's, in its `docs/operational/patron-request-notes.md`. This app shows them on a
request's page behind `VITE_FEATURE_REQUEST_NOTES` ([DEPLOYMENT.md](DEPLOYMENT.md)), a flag of
its own rather than tags', because notes are free text that will often mention the patron and a
consortium may want tags without them.

## What staff see

On the General tab, under **Notes**, newest first, twenty at a time with **Show older notes**.
Each note says which library wrote it, or the consortium, and when. DCB records the library, never
the person. The text is shown exactly as written, never as markup.

A library administrator can write a note as the library, and remove the library's own notes.
Removing asks first; it clears the text, and the note then reads "Removed by" the library. Notes
cannot be edited. Another library's notes, and the consortium's, cannot be removed here.

The box says who can read a note: every library involved in the request, and consortium staff.

## Which library a note is written as

The same rule as tags ([request-tags.md](request-tags.md#which-library-a-tag-is-applied-as)):
the user's libraries that are party to the request. With several, **Write as** asks which; with
none, the page says only the libraries involved can write one.

## Limits

dcb-service's own: up to 2,000 characters a note, which the form checks before sending, and up to
200 notes a request, which dcb-service enforces and whose refusal the page shows as it is worded.
Notes are deleted 12 months after the request ends.
