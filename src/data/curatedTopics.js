// First draft of hand-picked "start here" hadis per topic, for the site owner to edit.
//
// Each topic name matches a topic on the Topics page exactly. Every entry points to a real
// hadis (book id from src/lib/books.js, number that has a data file), and the note is a short
// Bengali line (12 words at most) that describes what that hadis actually says. The picks were
// chosen from short, clear hadis spread over different books. Please read them, replace any
// you do not like, and add more: the structure is { book, number, note }.

export const CURATED_TOPICS = {
  'ঈমান': [
    { book: 'bukhari', number: 7, note: 'ইসলামের পাঁচ ভিত্তি: সাক্ষ্য, নামায, যাকাত, হজ্জ, রমযানের রোযা।' },
    { book: 'tirmidhi', number: 2517, note: 'নিজের জন্য যা পছন্দ, ভাইয়ের জন্যও তা পছন্দ করা মুমিনের গুণ।' },
    { book: 'nasai', number: 5003, note: 'ঈমানের সত্তরের বেশি শাখা আছে, লজ্জা তার একটি।' },
    { book: 'ibnmajah', number: 3971, note: 'আল্লাহ ও আখিরাতে ঈমানদার ভালো কথা বলবে, নইলে চুপ থাকবে।' },
    { book: 'ibnmajah', number: 4184, note: 'লজ্জাশীলতা ঈমানের অংশ, আর ঈমানের স্থান জান্নাত।' },
  ],
  'নামায': [
    { book: 'bukhari', number: 420, note: 'কিছু নামায ঘরেও পড়ো, ঘরকে কবরের মতো করো না।' },
    { book: 'bukhari', number: 687, note: 'কাতার সোজা করো, কারণ এটি নামাযের সৌন্দর্যের অংশ।' },
    { book: 'muslim', number: 158, note: 'সঠিক সময়ে নামায ও পিতামাতার সাথে সদ্ব্যবহার সর্বোত্তম আমল।' },
    { book: 'ibnmajah', number: 278, note: 'দ্বীনে স্থির থাকো; তোমাদের সর্বোত্তম আমল হলো নামায।' },
    { book: 'tirmidhi', number: 2619, note: 'ঈমান ও কুফরের পার্থক্য হলো নামায ছেড়ে দেওয়া।' },
  ],
  'রোজা': [
    { book: 'bukhari', number: 37, note: 'ঈমান ও সওয়াবের আশায় রমযানের রোযা রাখলে আগের গুনাহ মাফ।' },
    { book: 'bukhari', number: 3029, note: 'জান্নাতের রাইয়্যান নামের দরজা দিয়ে শুধু রোযাদাররা প্রবেশ করবে।' },
    { book: 'bukhari', number: 1801, note: 'সাহরী খাও, কারণ সাহরীতে বরকত আছে।' },
    { book: 'muslim', number: 2626, note: 'রমযানের পর সর্বোত্তম রোযা মুহাররমের, ফরযের পর সর্বোত্তম নামায রাতের।' },
    { book: 'abudawud', number: 2355, note: 'রোযা অবস্থায় অশ্লীল কথা ও ঝগড়া থেকে বিরত থাকো।' },
  ],
  'যাকাত': [
    { book: 'ibnmajah', number: 1788, note: 'যাকাত আদায় করলে মালের ব্যাপারে তোমার দায়িত্ব পূর্ণ হয়।' },
    { book: 'ibnmajah', number: 1792, note: 'বছর পূর্ণ না হলে কোনো মালের যাকাত দিতে হয় না।' },
    { book: 'tirmidhi', number: 643, note: 'যাকাত আদায়ে সীমালঙ্ঘন, যাকাত না দেওয়ার মতোই অন্যায়।' },
    { book: 'bukhari', number: 1378, note: 'মুসলিমের ঘোড়া ও গোলামের ওপর কোনো যাকাত নেই।' },
    { book: 'nasai', number: 2485, note: 'পাঁচ ওসকের কম শস্য ও খেজুরে যাকাত ওয়াজিব নয়।' },
  ],
  'হজ্জ': [
    { book: 'bukhari', number: 1703, note: 'অশ্লীলতা ও গুনাহ ছাড়া হজ্জ করলে নবজাতকের মতো নিষ্পাপ ফেরা যায়।' },
    { book: 'bukhari', number: 1430, note: 'মকবুল হজ্জ সর্বোত্তম আমল।' },
    { book: 'ibnmajah', number: 2888, note: 'এক উমরা পরের উমরা পর্যন্ত কাফফারা; কবুল হজ্জের প্রতিদান জান্নাত।' },
    { book: 'abudawud', number: 1732, note: 'হজ্জের ইচ্ছা থাকলে দেরি না করে দ্রুত তা সম্পন্ন করো।' },
    { book: 'tirmidhi', number: 941, note: 'রমযান মাসে উমরা করা হজ্জের সমতুল্য।' },
  ],
  'দোয়া': [
    { book: 'tirmidhi', number: 3371, note: 'দু’আ ইবাদতের সারবস্তু।' },
    { book: 'abudawud', number: 521, note: 'আযান ও ইকামতের মাঝের দু’আ কখনো ফিরিয়ে দেওয়া হয় না।' },
    { book: 'tirmidhi', number: 3387, note: 'তাড়াহুড়া না করলে বান্দার দু’আ কবুল করা হয়।' },
    { book: 'nasai', number: 5470, note: 'শত্রুতা, নিফাক ও মন্দ চরিত্র থেকে আশ্রয় চাওয়ার দু’আ।' },
    { book: 'abudawud', number: 1482, note: 'নবী জাওয়ামি, অর্থাৎ ব্যাপক অর্থের দু’আ ভালোবাসতেন।' },
  ],
  'জান্নাত': [
    { book: 'bukhari', number: 6043, note: 'জাহান্নাম প্রবৃত্তিতে ঘেরা, আর জান্নাত দুঃখ-কষ্টে ঘেরা।' },
    { book: 'bukhari', number: 6044, note: 'জান্নাত ও জাহান্নাম তোমার জুতার ফিতার চেয়েও কাছে।' },
    { book: 'muslim', number: 6290, note: 'আত্মীয়তার সম্পর্ক ছিন্নকারী জান্নাতে প্রবেশ করবে না।' },
    { book: 'bukhari', number: 1121, note: 'নবীর ঘর ও মিম্বরের মাঝের স্থান জান্নাতের বাগান।' },
    { book: 'bukhari', number: 1777, note: 'রমযান এলে জান্নাতের দরজাগুলো খুলে দেওয়া হয়।' },
  ],
  'ক্ষমা': [
    { book: 'ibnmajah', number: 2043, note: 'আল্লাহ উম্মতের ভুল, বিস্মৃতি ও বাধ্য হয়ে করা কাজ ক্ষমা করেছেন।' },
    { book: 'tirmidhi', number: 2501, note: 'সবাই গুনাহগার; সবচেয়ে ভালো তারা, যারা তওবা করে।' },
    { book: 'tirmidhi', number: 3537, note: 'প্রাণ কণ্ঠে না পৌঁছা পর্যন্ত আল্লাহ বান্দার তওবা কবুল করেন।' },
    { book: 'ibnmajah', number: 3703, note: 'দুই মুসলিম মুসাফাহা করলে আলাদা হওয়ার আগেই ক্ষমা পায়।' },
    { book: 'ibnmajah', number: 897, note: 'দুই সিজদার মাঝে নবী “রব্বিগফির লী” বলে ক্ষমা চাইতেন।' },
  ],
  'ধৈর্য': [
    { book: 'tirmidhi', number: 2016, note: 'সুন্দর আচরণ, ধৈর্য ও মধ্যমপন্থা নবুওয়াতের চল্লিশ ভাগের এক ভাগ।' },
    { book: 'ibnmajah', number: 1596, note: 'বিপদের প্রথম আঘাতে ধৈর্য ধরাই প্রকৃত ধৈর্য।' },
    { book: 'nasai', number: 1872, note: 'ধৈর্য ধরতে হয় বিপদ আসার একদম প্রথম মুহূর্তেই।' },
    { book: 'ibnmajah', number: 1764, note: 'কৃতজ্ঞ আহারকারী ধৈর্যশীল রোযাদারের সমান মর্যাদা পায়।' },
    { book: 'ibnmajah', number: 1745, note: 'রোযা ধৈর্যের অর্ধাংশ এবং শরীরের যাকাত।' },
  ],
  'দান': [
    { book: 'bukhari', number: 4965, note: 'দান শুরু করো নিজের পোষ্যদের থেকে; উত্তম দান অভাবমুক্ত রাখে।' },
    { book: 'nasai', number: 3666, note: 'কোন সাদাকা উত্তম? নবী বললেন, পানি পান করানো।' },
    { book: 'ibnmajah', number: 3667, note: 'ফিরে আসা অসহায় কন্যার জন্য ব্যয় সর্বোত্তম দান।' },
    { book: 'ibnmajah', number: 243, note: 'ইলম শিখে মুসলিম ভাইকে শেখানো সর্বোত্তম দান।' },
    { book: 'tirmidhi', number: 1967, note: 'দানশীল আল্লাহ, জান্নাত ও মানুষের কাছে; কৃপণ সবার থেকে দূরে।' },
  ],
};
