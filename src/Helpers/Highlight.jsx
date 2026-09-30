import { normalizeBengali } from "./bengali";

function Highlight(props){
    const word = normalizeBengali(props.word);
    for(let i=0; i<props.mark.length; i++){
        if(word.includes(normalizeBengali(props.mark[i]))){
            return (
                <b>
                    {props.word+" "}
                </b>
            )
        }
    }
    return (
        <span>
            {props.word+" "}
        </span>
    )
}
export default Highlight;
