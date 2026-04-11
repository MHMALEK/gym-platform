/**
 * Stable refs for `useList({ pagination })`. A new inline object each render can
 * change Refine/React Query keys and cause repeated refetches (loops).
 */
export const REFINE_LIST_FIRST_PAGE_200 = { current: 1, pageSize: 200 } as const;

/** Same as above with explicit server mode (e.g. clients list). */
export const REFINE_LIST_FIRST_PAGE_200_SERVER = { current: 1, pageSize: 200, mode: "server" as const };
