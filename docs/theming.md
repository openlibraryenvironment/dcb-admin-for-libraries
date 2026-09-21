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

Three preferences work this way:

| Preference | What it sets | Why it cannot be overlaid |
|---|---|---|
| Density | MUI's spacing unit (8px / 6px) | `theme.spacing` is a function |
| Text size | the root font size (93.75%–112.5%) | every `rem` in the type scale derives from it |
| Typeface | `typography.fontFamily` | every variant derives from it at build time |

The colour scheme and the animation setting do **not**: see §2 and §7.

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

## 4. Typefaces

`src/themes/fonts.ts` is a **fixed vocabulary**. A font name ends up inside a
CSS declaration, so it is never taken from configuration, a URL, or anything a
user typed: the choice is an id from the list and the stack beside it is the
only string that reaches the theme.

**Every family is self-hosted.** None loads from `fonts.googleapis.com`. A staff
console that fetches a typeface from a third party makes every administrator's
browser announce itself to that third party on every page load, which is a
data-protection decision nobody has taken. Removing exactly that request from
`index.html` is what the Lighthouse budget was introduced alongside.

Licences: Roboto is Apache-2.0; Inter, Lexend and Atkinson Hyperlegible Next are
OFL-1.1. All four are redistributable in a commercial product.

**Payload, measured rather than asserted.** Declaring five families costs 317
bytes gzipped: a variable font's `@font-face` is small, and the 892 KB of woff2
beside it is fetched only when something is actually *painted* in that family.
Somebody who never opens the picker downloads exactly the one they are reading
in.

The preference is **per user, never per library**. It is a comfort and
accessibility choice belonging to whoever is looking at the screen; a
library-wide override would hand one colleague's choice to another who needs a
different one.

## 5. Contrast is measured, not asserted

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

## 6. Adding a token

1. Add the value to each scheme in `src/themes/tokens.ts`.
2. Declare it in `src/themes/augmentation.ts`.
3. Add its **pair** to `tests/themeContrast.test.ts` — the ink *and* the ground
   it lands on. A ratio asserted against the wrong ground is worse than no
   assertion.

## 7. Motion

`reduced` is CSS on the root element, not a theme value — which is why it is
absent from `ThemeDisplay` and from the build's cache key.

Two rules, because there are two ways to ask for it: the OS's
`prefers-reduced-motion`, which applies unless the user has explicitly chosen
full motion, and the user's own choice, which applies whatever the OS says. A
preference has to be overridable in **both** directions, or somebody on a
machine that is not theirs is stuck with someone else's setting. "Match my
device" writes no attribute at all, so the media query answers alone.

`!important` is correct here and nowhere else in this application: MUI's
transition components write `transition-duration` **inline** at runtime, and no
stylesheet rule beats an inline declaration. `0.01ms` rather than `0`, because a
zero duration skips `transitionend` and MUI's own callbacks wait on it — a
Dialog that never fires it never unmounts.
