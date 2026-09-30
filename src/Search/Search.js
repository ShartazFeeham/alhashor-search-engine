import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import HadisView from "../Helpers/HadisView";
import NextPrev from "../Helpers/NextPrev";
import React from 'react';
import "./Search.css"
import 'bootstrap/dist/css/bootstrap.min.css';
import getNum from "../Helpers/EngToBng";
import Loading from "../Helpers/Loading";
import { HADIS_PER_PAGE, pageFromParam, pageSlice } from "../Helpers/paging";
import Suggestions from "./Suggestions";
import { normalizeQuery, searchTags } from "./searchIndex";

const IDLE = 0;
const SEARCHING = 1;
const DONE = 2;

/*
    The address is the source of truth: /search?q=<words>&page=<n>
    Whenever the query in the address changes (a new search, back/forward, an opened link)
    the hadis for its words are looked up (see searchIndex.js), best matches first.
    The page shows 20 results at a time.
*/
function Search() {
    const [params, setParams] = useSearchParams();
    const query = params.get("q") || "";
    const words = useMemo(() => normalizeQuery(query), [query]);

    const [text, setText] = useState(query);
    const [results, setResults] = useState([]);
    const [status, setStatus] = useState(words.length > 0 ? SEARCHING : IDLE);

    const resultCount = results.length;
    const page = pageFromParam(params.get("page"), resultCount);

    // Keep the search box in step with the address.
    useEffect(() => {
        setText(query);
    }, [query]);

    useEffect(() => {
        setResults([]);
        if (words.length === 0) {
            setStatus(IDLE);
            return;
        }
        let cancelled = false; // a newer search (or leaving the page) replaces this one
        setStatus(SEARCHING);
        searchTags(words).then((tags) => {
            if (cancelled) return;
            setResults(tags);
            setStatus(DONE);
        });
        return () => {
            cancelled = true;
        };
    }, [words]);

    function search(event) {
        event.preventDefault();
        const q = normalizeQuery(text).join(" ");
        if (q === "") return;
        setParams({ q });
    }

    function setPage(target) {
        setParams(target === 0 ? { q: query } : { q: query, page: String(target + 1) });
    }

    // RETURN
    return (
        <div>
            <form onSubmit={search} className="sc">
                <div className="info">হাদীসের ক্রম কিংবা বর্ণনাকারীর নাম দিয়ে হাদীস খুঁজুন। অথবা যেকোনো শব্দ/বিষয় কিংবা হাদীসের অংশ লিখে সার্চ করুন।
                <br></br>
                <b>সমস্ত হাদীস বাংলায়, অতএব শুধু বাংলায় লিখে সার্চ করুন! </b>
                </div>
                <hr></hr>
                <input id="search" name="search" type={"text"} className={"sb"} value={text} onChange={(event) => setText(event.target.value)} /><br></br>
                <input type="submit" className="s" value="Search" />
                {status === IDLE ? <Suggestions setBox={setText} /> : ""}
            </form>
            {resultCount > 0 ? <div className="count">{"মোট " + getNum(resultCount.toString()) + " টি হাদিস পাওয়া গেছে "}
                <br /><b>
                    {getNum((page * HADIS_PER_PAGE + 1).toString()) + " - " + getNum(Math.min((page + 1) * HADIS_PER_PAGE, resultCount).toString()) + " পর্যন্ত দেখানো হচ্ছে"} </b></div> : ""}
            {pageSlice(results, page).map(
                (hadis) => (
                    <HadisView key={hadis} tag={hadis} words={words} />
                )
            )}
            {resultCount > 0 ? <NextPrev page={page} setPage={setPage} resultCount={resultCount} /> :
                status === SEARCHING ? <Loading /> : ""
            }
            {status === DONE && resultCount === 0 ? <div className="nf">কেবল মাত্র বাংলা লেখায় সার্চ করুন। কোনো ফলাফল না পাওয়া গেলে বানান পরিবর্তন করে লিখুন।</div> : ""}
        </div>
    );
}
export default Search;
