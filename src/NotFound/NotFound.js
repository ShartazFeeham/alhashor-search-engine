import { Link } from "react-router-dom";
import { usePageTitle } from "../Helpers/usePageTitle";

function NotFound() {
    usePageTitle("পৃষ্ঠাটি পাওয়া যায়নি");
    return (
        <div className="container text-center mt-5">
            <h3>পৃষ্ঠাটি পাওয়া যায়নি</h3>
            <p className="mt-3">
                <Link to="/">হোম পেজে ফিরে যান</Link>
            </p>
        </div>
    );
}

export default NotFound;
