const BOOK_FOLDERS = {
    BUK: "Bukhari",
    DAU: "Daud",
    MAJ: "Majah",
    MUS: "Muslim",
    NAS: "Nasae",
    TIR: "Tirmiji",
};

// "BUK-124" -> "/json/hadis/Bukhari/0124/text.txt" (null if the book code is unknown)
export function hadisUrl(tag) {
    const folder = BOOK_FOLDERS[tag.substring(0, 3)];
    if (!folder) return null;
    const number = tag.substring(4).padStart(4, "0");
    return `${process.env.PUBLIC_URL}/json/hadis/${folder}/${number}/text.txt`;
}
