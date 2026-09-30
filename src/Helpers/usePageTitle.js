import { useEffect } from "react";

const SITE = "BoiKotha";
const HOME_TITLE = "BoiKotha - হাদীস সম্ভার";

// usePageTitle() is the home title; usePageTitle("হাদীস সার্চ") gives "হাদীস সার্চ - BoiKotha".
// Empty parts are skipped, so usePageTitle(query, "হাদীস সার্চ") works before anything is typed.
export function usePageTitle(...parts) {
    const named = parts.filter(Boolean);
    const title = named.length > 0 ? [...named, SITE].join(" - ") : HOME_TITLE;
    useEffect(() => {
        document.title = title;
    }, [title]);
}
