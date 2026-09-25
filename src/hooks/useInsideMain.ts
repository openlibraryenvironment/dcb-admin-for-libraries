import { createContext, useContext } from "react";

/**
 * Whether the tree already sits inside the application's `main` landmark.
 *
 * NotFound and RouteError render in both places: bare, for an unmatched URL or
 * a throw outside the authenticated tree, and INSIDE Layout when a loader
 * throws. A landmark hardcoded on either of them gives the second case two
 * mains, which is its own axe failure - so they ask.
 */
export const InsideMainContext = createContext(false);

export const useInsideMain = (): boolean => useContext(InsideMainContext);
