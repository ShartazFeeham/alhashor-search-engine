import './suggestions.css'
import { clickable } from '../Helpers/clickable'
function Suggestions({setBox}) {
    const sug = [
        "রোজা",
        "নফল নামায",
        "লায়লাতুল কদর",
        "১৫০",
        "২৪২২",
        "আবু হুরায়রা",
        "আয়েশা (রাঃ)",
        "প্রত্যেক কাজ নিয়তের সাথে সম্পর্কিত",
        "ইসলামের ভিত্তি পাঁচটি"
    ];
    return (
        <div className='s-cont'>
            {sug?.map(
                (item) => (
                    <div key={item} className="s-item" {...clickable(() => setBox(item))}>{item}</div>
                )
            )}
        </div>
    );
}

export default Suggestions;
