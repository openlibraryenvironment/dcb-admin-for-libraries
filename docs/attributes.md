# Field labels and their values

`src/components/Attribute/Attribute.tsx` renders one label/value pair as a
description list: `<dl><dt>Full name</dt><dd>Anytown Library</dd></dl>`.

## Why it exists

199 pairs were written as

```tsx
<Stack direction="column">
  <Typography variant="attributeTitle">{t("library.full_name")}</Typography>
  <RenderAttribute attribute={library?.fullName} />
</Stack>
```

Two spans in a flex column. Visually a label above a value; programmatically two
unrelated runs of text. A screen-reader user moving through the patron request
page heard eighty-nine labels and eighty-nine values with nothing saying which
belonged to which — **WCAG 1.3.1 Info and Relationships**, and axe cannot see
it, because there is no broken relationship to detect. Only an absent one.

`tests/attributePairs.test.ts` is therefore a static scan: the
`attributeTitle` variant may only be rendered inside `Attribute`.

## One list per pair, not one per page

The semantically ideal shape is one `<dl>` per section with many `dt`/`dd`
rows inside it — the GOV.UK summary list. It is not what this does, and the
reason is structural rather than lazy: the grids these pairs sit in mix
attributes with `h1`s, buttons and dividers as siblings, so a `<dl>` around the
container would be invalid HTML and a lie about what the container holds.

Restructuring every detail page's grid to separate attributes from everything
else is a larger change than the fix it enables. If those pages are ever
reworked, one list per section is the shape to move to.

## The library profile is different

`ProfileField`, local to `src/routes/__authenticated/index.tsx`, wraps
`Attribute` only when the page is in read mode. In edit mode the `TextField`
carries its own label, and a heading seven pixels above a floating label saying
the same thing is a second visible name for one control (WCAG 2.5.3).

It is local to that route rather than a `labelled` flag on `Attribute` because
only that page has two modes: the difference belongs at the edge that owns it,
not in the shared component where the next special case would join it.
`e2e/library-profile.spec.ts` asserts both halves — the pair exists in read
mode, and the `dt` is gone in edit mode.

## Two things found while converting

`Section` was `Attribute` under another name, untyped (`{ title, children }: any`).
Its twelve call sites now use `Attribute` and the file is deleted.

`TopRequestorSummary` and `TopTitlesSummary` rendered their own heading in the
empty state, using the same translation key their caller already renders as an
`h2` — so a library with no requests this month saw "Top requesters this
month" twice. The duplicate is gone.
