import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import HadisDisplay from "./HadisDisplay";
import HadisIndex from "./HadisIndex";
import { pageFromParam, pageSlice } from "../Helpers/paging";
import { usePageTitle } from "../Helpers/usePageTitle";
import { normalizeQuery, searchTags } from "../Search/searchIndex";
import './Topics.css'

const NO_TOPIC = "সূচিপত্র";

// The address is the source of truth: /topics?topic=<name>&page=<n>
// A topic shows only the hadis that contain every word of the topic.
function Topics() {
    const [params, setParams] = useSearchParams();
    const topic = params.get("topic") || "";
    const words = useMemo(() => normalizeQuery(topic), [topic]);
    usePageTitle(topic, "বিষয়ভিত্তিক হাদীস");

    const [results, setResults] = useState([]);
    const [searching, setSearching] = useState(words.length > 0);

    const page = pageFromParam(params.get("page"), results.length);

    useEffect(() => {
        setResults([]);
        if (words.length === 0) {
            setSearching(false);
            return;
        }
        let cancelled = false; // a newer topic (or leaving the page) replaces this one
        setSearching(true);
        searchTags(words, { requireAll: true }).then((tags) => {
            if (cancelled) return;
            setResults(tags);
            setSearching(false);
        });
        return () => {
            cancelled = true;
        };
    }, [words]);

    function selectTopic(name) {
        setParams({ topic: name });
    }

    function setPage(target) {
        setParams(target === 0 ? { topic } : { topic, page: String(target + 1) });
    }

    return (
        <div>
            <div className="row">
                <div className="left">
                    <div className="idx">
                        {topic || NO_TOPIC}
                    </div>
                    <HadisIndex onSelect={selectTopic} />
                </div>
                <div className="right">
                    <HadisDisplay topic={topic || NO_TOPIC} hadisList={pageSlice(results, page)} searching={searching} page={page} setPage={setPage} resultCount={results.length} />
                </div>
            </div>
        </div>
    );
} export default Topics;
