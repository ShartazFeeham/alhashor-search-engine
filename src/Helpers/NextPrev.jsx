import { lastPageOf } from './paging';

// Previous / next buttons. The parent owns the page and shows the right slice of the results.
function NextPrev({ page, setPage, resultCount }) {
    const lastPage = lastPageOf(resultCount);

    function goTo(target) {
        if (target < 0 || target > lastPage) return;
        setPage(target);
        document.documentElement.scrollTop = 0;
    }

    return (
        <div className='npc'>
            <table width={"100%"}>
                <tbody>
                    <tr>
                        <td>
                            <button type='button' className='pn btn' onClick={() => goTo(page - 1)}>&#171; আগের পৃষ্ঠা</button>
                        </td>
                        <td>

                            <button type='button' className='pn btn' onClick={() => goTo(page + 1)}>পরের পৃষ্ঠা &#187;</button>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
}

export default NextPrev;
