import { formatDate, weekdayName } from './bnDate';

test('writes a date in Bengali with the month name and no thousands comma in the year', () => {
  expect(formatDate(new Date(2026, 9, 2))).toBe('২ অক্টোবর ২০২৬');
  expect(formatDate(new Date(2027, 0, 31))).toBe('৩১ জানুয়ারি ২০২৭');
});

test('can use English digits', () => {
  expect(formatDate(new Date(2026, 9, 2), 'en')).toBe('2 অক্টোবর 2026');
});

test('names every month', () => {
  const months = Array.from({ length: 12 }, (_, m) => formatDate(new Date(2026, m, 1)).split(' ')[1]);
  expect(months).toEqual(['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর']);
});

test('names the weekday', () => {
  expect(weekdayName(new Date(2026, 9, 2))).toBe('শুক্রবার');
  expect(Array.from({ length: 7 }, (_, d) => weekdayName(new Date(2026, 9, 4 + d)))).toEqual([
    'রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার',
  ]);
});
