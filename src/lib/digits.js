const BENGALI = '০১২৩৪৫৬৭৮৯';

export const toBengaliDigits = (text) => String(text).replace(/[0-9]/g, (d) => BENGALI[d]);
export const toEnglishDigits = (text) => String(text).replace(/[০-৯]/g, (d) => BENGALI.indexOf(d));

export function formatNumber(value, digits = 'bn') {
  const text = Number(value).toLocaleString('en-US');
  return digits === 'en' ? text : toBengaliDigits(text);
}
