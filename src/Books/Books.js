import { useState } from "react";
import getNum from "../Helpers/EngToBng";
import HadisView from "../Helpers/HadisView";
import { HADIS_PER_PAGE } from "../Helpers/paging";
import { BOOKS } from "./bookList";
import 'bootstrap/dist/css/bootstrap.min.css';
import './Book.css'

const NON_BREAKING_SPACE = " ";

function Books() {
    const [selected, setSelected] = useState(null); // index into BOOKS, null until one is chosen
    const [page, setPage] = useState(0);

    const book = selected === null ? null : BOOKS[selected];
    const lastPage = book ? Math.ceil(book.total / HADIS_PER_PAGE) - 1 : 0;
    const first = page * HADIS_PER_PAGE + 1;
    const last = book ? Math.min(first + HADIS_PER_PAGE - 1, book.total) : 0;

    const tags = [];
    for (let number = first; number <= last; number++) {
        tags.push(book.code + "-" + number);
    }

    function chooseBook(index) {
        setSelected(index);
        setPage(0);
    }

    function goToPage(target) {
        setPage(Math.min(Math.max(target, 0), lastPage));
    }

    return (
        <div>
            {book === null ? <div className="sel">নিচে থেকে যেকোনো একটি বই ক্লিক করুন</div> : ""}
            <div className="bcontainer">
                {BOOKS.map((b, index) => (
                    <button key={b.code} className={index === selected ? "book-on" : "book"} onClick={() => { chooseBook(index) }}>
                        {b.name.replaceAll(" ", NON_BREAKING_SPACE)}
                    </button>
                ))}
            </div>
            {book !== null ?
                <div className="headline">
                    <div className="title">
                        {book.name}
                    </div>
                    <div className="tcontainer">
                        <div className="titem">
                            <div onClick={() => { goToPage(page - 10) }}>-10</div>
                        </div>
                        <div className="titem">
                            <div onClick={() => { goToPage(page - 1) }}>&#171; Prev</div>
                        </div>
                        <div className="titem">{getNum(first.toString()) + "-" + getNum(last.toString()) + "/" + getNum(book.total.toString())}</div>
                        <div className="titem"><div onClick={() => { goToPage(page + 1) }}>Next &#187;</div></div>
                        <div className="titem">
                            <div onClick={() => { goToPage(page + 10) }}>+10</div>
                        </div>
                    </div>
                </div> : ""}
            {tags.map(
                (hadis) => (
                    <HadisView key={hadis} tag={hadis} words={[]} />
                )
            )}
        </div>
    );
}
export default Books;
