import HadisView from "../Helpers/HadisView";
import Loading from "../Helpers/Loading";
import NextPrev from "../Helpers/NextPrev";

function HadisDisplay({ topic, hadisList, searching, page, setPage, allResults, setDisplayHadis, resultCount }) {
    const empty = hadisList === null || hadisList.length === 0;
    return (
        <div>
            {empty && topic === "সূচিপত্র" ? <div className="sel">সূচিপত্র হতে যেকোনো বিষয় নির্বাচন করুন</div> :
                empty && searching ? <Loading /> :
                    empty ? <div className="sel">এই বিষয়ে কোনো হাদীস পাওয়া যায়নি</div> :
                        <div>
                            <NextPrev page={page} setPage={setPage} allResults={allResults} setDisplayHadis={setDisplayHadis} resultCount={resultCount} />
                        </div>
            }
            {
                hadisList?.map(
                    (hadis) => (
                        <HadisView key={hadis} tag={hadis} words={topic.split(" ")} />
                    )
                )
            }
        </div>
    );
}
export default HadisDisplay;
