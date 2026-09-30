import { useEffect, useState } from "react";
import { clickable } from "./clickable";
import Highlight from "./Highlight";
import 'bootstrap/dist/css/bootstrap.min.css';
import './HadisView.css'
import getNum, { getBook } from "./EngToBng";
import { hadisUrl } from "./hadisPath";
import Loading from "./Loading";

const LIMIT = 600;

function HadisView(props) {
    const [hadisText, setHadisText] = useState("");
    const [expanded, setExpanded] = useState(false);
    const [failed, setFailed] = useState(false);
    const [copied, setCopied] = useState(false);
    const words = props.words;
    const tag = props.tag;

    useEffect(() => {
        let cancelled = false;
        setHadisText("");
        setExpanded(false);
        setFailed(false);
        const url = hadisUrl(tag);
        if (url === null) {
            setFailed(true);
            return;
        }
        fetch(url)
            .then((res) => {
                if (!res.ok) throw new Error("Hadis not found");
                return res.json();
            })
            .then((data) => {
                if (!cancelled) setHadisText(data);
            })
            .catch(() => {
                if (!cancelled) setFailed(true);
            });
        return () => {
            cancelled = true;
        };
    }, [tag]);

    const truncated = !expanded && hadisText.length > LIMIT;
    const toShow = truncated ? hadisText.substring(0, LIMIT) + "...." : hadisText;

    // The "copied" note disappears by itself.
    useEffect(() => {
        if (!copied) return;
        const timer = setTimeout(() => setCopied(false), 2000);
        return () => clearTimeout(timer);
    }, [copied]);

    function copyHadis() {
        if (hadisText.length === 0) return;
        navigator.clipboard.writeText(hadisText);
        setCopied(true);
    }

    return (
        <div className="hvc">
            <br></br>
            <div className="card text-dark bg-light m-1">
                <h5 className="card-header ref">{getBook(tag)}{getNum(tag.substring(4, tag.length))}</h5>
                <div className="card-body">
                    <div className="h-text">
                        {failed ? <div>হাদীসটি লোড করা যায়নি।</div> :
                            toShow.length === 0 ? <Loading /> :
                                toShow.split(" ").map((word, i) => <Highlight key={i} word={word} mark={words} />)
                        }
                    </div>
                </div>
                <div className="ftr">
                    <div className="op" {...clickable(copyHadis)}>
                        <img src="/photos/copy.png" height={20} width={20} alt="copy" /> Copy
                    </div>
                    {copied ? <div className="copied">কপি করা হয়েছে</div> : ""}
                    {truncated ? <div className="more" {...clickable(() => setExpanded(true))}>সম্পূর্ণ হাদীস দেখুন...</div> : ""}
                </div>
            </div>
        </div>
    );
}

export default HadisView;
