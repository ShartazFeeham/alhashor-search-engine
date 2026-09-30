import { useRef, useState } from "react";
import HadisDisplay from "./HadisDisplay";
import HadisIndex from "./HadisIndex";
import { normalizeQuery, searchTags } from "../Search/searchIndex";
import './Topics.css'

function Topics() {

    const [topic, setTopic] = useState("সূচিপত্র");
    const [allResults, setAllResults] = useState([]);
    const [page, setPage] = useState(0);
    const [displayHadis, setDisplayHadis] = useState([]);
    const [resultCount, setResultCount] = useState(0);
    const [searching, setSearching] = useState(false);
    const latestTopic = useRef(0);

    // A topic shows only the hadis that contain every word of the topic.
    async function selectTopic(topicName) {
        const thisTopic = ++latestTopic.current;
        setAllResults([]);
        setDisplayHadis([]);
        setResultCount(0);
        setSearching(true);

        const tags = await searchTags(normalizeQuery(topicName), { requireAll: true });
        if (thisTopic !== latestTopic.current) return; // a newer topic replaced this one

        setAllResults(tags);
        setDisplayHadis(tags.slice(0, 20));
        setResultCount(tags.length);
        setSearching(false);
    }

    return (
        <div>
            <div className="row">
                <div className="left">
                    <div className="idx">
                        {topic}
                    </div>
                    <HadisIndex setTopic={setTopic} selectTopic={selectTopic} setPage={setPage} />
                </div>
                <div className="right">
                    <HadisDisplay topic={topic} hadisList={displayHadis} searching={searching} page={page} setPage={setPage} allResults={allResults} setDisplayHadis={setDisplayHadis} resultCount={resultCount} />
                </div>
            </div>
        </div>
    );
} export default Topics;
