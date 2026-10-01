'use client';

import Link from "next/link";
import PageTitle from "../Helpers/PageTitle";

function NotFound() {
    return (
        <main className="screen notfound">
            <PageTitle parts={["পৃষ্ঠাটি পাওয়া যায়নি"]} />
            <h1 className="h1">পৃষ্ঠাটি পাওয়া যায়নি</h1>
            <Link href="/" className="ui-btn primary">হোম পেজে ফিরে যান</Link>
        </main>
    );
}

export default NotFound;
