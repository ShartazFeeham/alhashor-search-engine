'use client';

import Link from "next/link";
import PageTitle from "../Helpers/PageTitle";

function NotFound() {
    return (
        <div className="container text-center mt-5">
            <PageTitle parts={["পৃষ্ঠাটি পাওয়া যায়নি"]} />
            <h3>পৃষ্ঠাটি পাওয়া যায়নি</h3>
            <p className="mt-3">
                <Link href="/">হোম পেজে ফিরে যান</Link>
            </p>
        </div>
    );
}

export default NotFound;
