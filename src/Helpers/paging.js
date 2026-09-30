export const HADIS_PER_PAGE = 20;

// The page number in the address is 1-based ("?page=2"); internally pages start at 0.
// Anything missing or invalid means the first page; a page past the end shows the last one.
export function pageFromParam(param, resultCount) {
    const requested = parseInt(param, 10);
    const page = Number.isNaN(requested) ? 0 : Math.max(requested - 1, 0);
    return Math.min(page, lastPageOf(resultCount));
}

export function lastPageOf(resultCount) {
    return Math.max(Math.ceil(resultCount / HADIS_PER_PAGE) - 1, 0);
}

export function pageSlice(results, page) {
    return results.slice(page * HADIS_PER_PAGE, (page + 1) * HADIS_PER_PAGE);
}
