import { useRef, useState } from "react";
import HadisView from "../Helpers/HadisView";
import NextPrev from "../Helpers/NextPrev";
import React from 'react';
import "./Search.css"
import 'bootstrap/dist/css/bootstrap.min.css';
import getNum from "../Helpers/EngToBng";
import Loading from "../Helpers/Loading";
import Suggestions from "./Suggestions";
import { normalizeQuery, searchTags } from "./searchIndex";

const IDLE = 0;
const SEARCHING = 1;
const DONE = 2;

function Search() {

    const [allResults, setAllResults] = useState([]);
    const [page, setPage] = useState(0);
    const [displayHadis, setDisplayHadis] = useState([]);
    const [resultCount, setResultCount] = useState(0);
    const [searchedWords, setSearchedWords] = useState([]);
    const [status, setStatus] = useState(IDLE);
    const latestSearch = useRef(0);

    /*
        Clean the input into words
        Find the hadis tags for every word (see searchIndex.js), best matches first
        Display 20 results per page
    */

    function setBox(input) {
        document.getElementById("search").value = input;
    }

    const scan = async (event) => {
        event.preventDefault();
        const words = normalizeQuery(event.target.elements.search.value);
        if (words.length === 0) return;

        const thisSearch = ++latestSearch.current;
        setPage(0);
        setAllResults([]);
        setDisplayHadis([]);
        setResultCount(0);
        setSearchedWords(words);
        setStatus(SEARCHING);

        const tags = await searchTags(words);
        if (thisSearch !== latestSearch.current) return; // a newer search replaced this one

        setAllResults(tags);
        setDisplayHadis(tags.slice(0, 20));
        setResultCount(tags.length);
        setStatus(DONE);
    };

    // RETURN
    return (
        <div>
            <form onSubmit={scan} className="sc">
                <div className="info">হাদীসের ক্রম কিংবা বর্ণনাকারীর নাম দিয়ে হাদীস খুঁজুন। অথবা যেকোনো শব্দ/বিষয় কিংবা হাদীসের অংশ লিখে সার্চ করুন।
                <br></br>
                <b>সমস্ত হাদীস বাংলায়, অতএব শুধু বাংলায় লিখে সার্চ করুন! </b>
                </div>
                <hr></hr>
                <input id="search" name="search" type={"text"} className={"sb"} /><br></br>
                <input type="submit" className="s" value="Search" />
                {status === IDLE ? <Suggestions setBox={setBox} /> : ""}
            </form>
            {resultCount > 0 ? <div className="count">{"মোট " + getNum(resultCount.toString()) + " টি হাদিস পাওয়া গেছে "}
                <br /><b>
                    {getNum((page * 20 + 1).toString()) + " - " + ((page * 20 + 20) < resultCount ? getNum((page * 20 + 20).toString()) : getNum(resultCount.toString())) + " পর্যন্ত দেখানো হচ্ছে"} </b></div> : ""}
            {displayHadis?.map(
                (hadis) => (
                    <HadisView key={hadis} tag={hadis} words={searchedWords} />
                )
            )}
            {resultCount > 0 ? <NextPrev page={page} setPage={setPage} allResults={allResults} setDisplayHadis={setDisplayHadis} resultCount={resultCount} /> :
                status === SEARCHING ? <Loading /> : ""
            }
            {status === DONE && resultCount === 0 ? <div className="nf">কেবল মাত্র বাংলা লেখায় সার্চ করুন। কোনো ফলাফল না পাওয়া গেলে বানান পরিবর্তন করে লিখুন।</div> : ""}
        </div>
    );
}
export default Search;
