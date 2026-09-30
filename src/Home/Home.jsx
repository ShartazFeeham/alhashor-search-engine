'use client';

import Link from "next/link";
import './Home.css'
import { usePageTitle } from "../Helpers/usePageTitle";

function Home() {
    usePageTitle();
    return (
        <div className="homeCont">
            <div className="row">
                <div className="col-sm-6" >
                    <Link href={'/search'} className='link'>
                        <div className="card m-2">
                            <h5 className="card-header">Search Hadis</h5>
                            <div className="container">
                                <div className="row">
                                    <div className="col img-container">
                                        <img src="/photos/search.png" alt="search" className="card-img-top card-pic"></img>
                                    </div>
                                    <div className="col">
                                        <div className="card-body">
                                            <p className="card-text">হাদীসের ক্রম কিংবা বর্ণনাকারীর নাম দিয়ে হাদীস খুঁজুন। অথবা যেকোনো শব্দ/বিষয় কিংবা হাদীসের অংশ লিখে সার্চ করে সেই বিষয়ের সমস্ত হাদীস দেখুন। </p>
                                            <div className="btn btn-success btn-full">হাদীস সার্চ</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Link>
                </div>

                <div className="col-sm-6">
                    <Link href={'/topics'} className='link'>
                        <div className="card m-2">
                            <h5 className="card-header">Hadis by topics</h5>
                            <div className="container">
                                <div className="row">
                                    <div className="col img-container">
                                        <img src="/photos/topics.jpg" alt="topics" className="card-img-top card-pic"></img>
                                    </div>
                                    <div className="col">
                                        <div className="card-body">
                                            <p className="card-text">বিভিন্ন বিষয়-ভিত্তিক হাদীস এর তালিকা। নামাজ, রোজা, ভাগ্য, পবিত্রতা, সুন্নাহ, ঈমান, আমল ইত্যাদি সহ আরও শতাধিক বিষয়ে সকল হাদীস একসাথে তালিকায়।  </p>
                                            <div className="btn btn-primary btn-full p-1">বিষয়ভিত্তিক হাদীস </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Link>
                </div>
            </div>


            <div className="row">
                <div className="col-sm-6">
                    <Link href={'/books'} className='link'>
                        <div className="card m-2">
                            <h5 className="card-header">Books</h5>
                            <div className="container">
                                <div className="row">
                                    <div className="col img-container">
                                        <img src="/photos/book.jpg" alt="book" className="card-img-top card-pic"></img>
                                    </div>
                                    <div className="col">
                                        <div className="card-body">
                                            <p className="card-text">সিহাহ সিত্তাহ (বুখারি, মুসলিম, তিরমিজি, আবুদাউদ, ইবন্‌ মাজাহ, নাসা'ঈ) শুরু হতে শেষ পর্যন্ত সকল হাদীস পড়ুন। </p>
                                            <div className="btn btn-warning btn-full">হাদীসের বই</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Link>
                </div>

                <div className="col-sm-6">
                    <div className="card m-2">
                        <h5 className="card-header">More...</h5>
                        <div className="container">
                            <div className="row">
                                <div className="col img-container">
                                    <img src="/photos/cs.jpg" alt="coming soon" className="card-img-top card-pic"></img>
                                </div>
                                <div className="col">
                                    <div className="card-body">
                                        <p className="card-text">ইসলামের বিভিন্ন বিষয়ে আরও নতুন বই (তাফসির, সিরাত, বিধান, ইতিহাস) শীগ্রই আসছে ইনশাল্লাহ। (জ্ঞান হোক সকলের জন্য উন্মুক্ত)। </p>
                                        <div className="btn btn-info btn-full">Coming soon</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
export default Home;
