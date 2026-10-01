import { toBengaliDigits } from './digits';

const MONTHS = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
const WEEKDAYS = ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'];

export const weekdayName = (date) => WEEKDAYS[date.getDay()];

// "২ অক্টোবর ২০২৬". The year has no thousands comma, so it is not written with formatNumber.
export function formatDate(date, digits = 'bn') {
  const text = `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
  return digits === 'en' ? text : toBengaliDigits(text);
}
