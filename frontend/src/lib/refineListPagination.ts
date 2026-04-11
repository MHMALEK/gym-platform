/**
 * Stable refs for `useList({ pagination })`. A new inline object each render can
 * change Refine/React Query keys and cause repeated refetches (loops).
 * `mode: "server"` ensures the data provider receives limit/offset (required for lists to load).
 */
export const REFINE_LIST_FIRST_PAGE_200 = { current: 1, pageSize: 200, mode: "server" as const };

/** @deprecated alias — same as REFINE_LIST_FIRST_PAGE_200 */
export const REFINE_LIST_FIRST_PAGE_200_SERVER = REFINE_LIST_FIRST_PAGE_200;
