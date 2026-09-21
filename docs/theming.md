# Theming

How `src/themes/` is put together, and why. The code carries the facts; this
carries the arguments that would otherwise be repeated in comments nobody
updates.

## 1. The theme is built, not overlaid

`createTheme(builtTheme, overrides)` deep-merges and does **not** re-derive.
That is fine for a colour, and fatal for `spacing`: `theme.spacing` is a
*function*, and a number merged over it makes every `sx={{ p: 2 }}` in the
application throw.

So anything a user can change has to be an **input to the build** rather than a
patch applied afterwards. That is why `getAppTheme(display)` exists and why
there is no `withDensity(theme)` helper.

Two preferences work this way today:

| Preference | What it sets | Why it cannot be overlaid |
|---|---|---|
| Density | MUI's spacing unit (8px / 6px) | `theme.spacing` is a function |
| Text size | the root font size (93.75%–112.5%) | every `rem` in the type scale derives from it |

The rule that follows for components: **a `px` font size opts that element out
of the text-size preference, silently.** Icons are the exception and stay in px.

## 2. Colour schemes stay schemes

`dcb-admin-ui` swaps a whole built theme per brand and mode. This application
does not, and should not: it declares `cssVariables` with
`colorSchemeSelector: "data"`, reads `theme.vars` or `var(--mui-palette-*)` in
thirteen files, and lets MUI's `useColorScheme()` drive the data attribute.

Replacing that with theme-swapping would touch every one of those files and
reintroduce a flash of the wrong scheme on load, for no gain. So:

- the **colour scheme** (light / dark / high contrast) stays a colour scheme;
- everything else the user can change is built in.

## 3. High contrast is two different things

Confusing them is the usual mistake.

**Ours** is a third colour scheme, promising AAA (7:1) rather than AA (4.5:1).
It is light-based — people who need it mostly need *more* light, not less, and
the operating systems that offer such a mode offer a light one first. Every
neutral inherited from the light palette is re-stated at the higher floor:
`#757575` carries white at 4.61:1, which is AA and not what this scheme claims.

**The operating system's** is `forced-colors: active`, where the OS replaces
every colour with its own and most of our palette stops applying. MUI's
`enhanceHighContrast` maps components onto the system keywords so borders and
focus rings survive instead of vanishing. It takes a *built* theme, which is why
it wraps `createTheme` rather than sitting inside it.

### The extended-scheme trap

MUI augments the `light` and `dark` schemes — deriving `contrastText`, the grey
ramp, action colours and the rest — but uses an **extended** scheme's palette
verbatim. Handed raw tokens, `createThemeWithVars` dies reading
`palette.common.background`; supplying that by hand only moves the failure to
the next missing key.

So the high-contrast tokens go through `createTheme` once on their own, and the
*augmented* result is what the scheme is given. That also puts the scheme's own
`contrastThreshold: 7` in charge of MUI's derivations rather than the default 3.

## 4. Contrast is measured, not asserted

`tests/themeContrast.test.ts` measures every ink against the ground it actually
lands on, per scheme, and reports the **whole** list of failures rather than the
first — a palette change usually breaks several pairs at once, and fixing them
one run at a time is how a rebalance takes an afternoon.

Two grounds are modelled rather than assumed, because getting them wrong
produces confident nonsense:

- **The AppBar does not use `primary.main` in dark.** `enableColorOnDark`
  defaults to `false`, so MUI paints it `background.paper`. Measuring white
  against `#35B7FF` would report a failure the application does not have.
- **The Data Grid's selected-row tint is not a token.** MUI composites it from
  `primary.main` at low alpha, so it is written down as the measured result. It
  is consistently the tighter of the two grounds a row's ink sits on.

The axe gate measures what is *rendered*; this measures what is *declared*. The
gap between them is a token used on a page the gate does not scan, or only when
a form is in error — which is where `error.main` sat at 3.85:1 unnoticed.

## 5. Adding a token

1. Add the value to each scheme in `src/themes/tokens.ts`.
2. Declare it in `src/themes/augmentation.ts`.
3. Add its **pair** to `tests/themeContrast.test.ts` — the ink *and* the ground
   it lands on. A ratio asserted against the wrong ground is worse than no
   assertion.
