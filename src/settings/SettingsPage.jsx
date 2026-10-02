'use client';

import PageTitle from '../Helpers/PageTitle';
import { toBengaliDigits } from '../lib/digits';
import { useDigits } from '../lib/useDigits';
import Button from '../ui/Button';
import Chip from '../ui/Chip';
import { useSettings } from './SettingsProvider';

const THEMES = [
  ['auto', 'স্বয়ংক্রিয়'],
  ['light', 'হালকা'],
  ['dark', 'গাঢ়'],
  ['sepia', 'সেপিয়া'],
];

const SAMPLE =
  'ইয়াহুদী ও নাসারাদের প্রতি আল্লাহর অভিশাপ, তারা তাদের নবীদের কবরকে মসজিদে পরিণত করেছে।';

// A stepper: a label, the current value and minus / plus buttons that stop at the limits.
function Stepper({ label, value, display, min, max, step, onChange, lessLabel, moreLabel }) {
  return (
    <div className="settings-row">
      <span className="settings-label">{label}</span>
      <div className="settings-stepper">
        <Button size="sm" aria-label={lessLabel} disabled={value <= min} onClick={() => onChange(Math.max(min, round(value - step)))}>−</Button>
        <output>{display}</output>
        <Button size="sm" aria-label={moreLabel} disabled={value >= max} onClick={() => onChange(Math.min(max, round(value + step)))}>+</Button>
      </div>
    </div>
  );
}

const round = (n) => Math.round(n * 100) / 100;

export default function SettingsPage() {
  const { settings, update, reset } = useSettings();
  const digits = useDigits();
  const fraction = (n) => (settings.digits === 'en' ? String(n) : toBengaliDigits(String(n)));

  return (
    <main id="main" tabIndex={-1} className="screen settings">
      <PageTitle parts={['পড়ার সেটিংস']} />
      <h1 className="h1">পড়ার সেটিংস</h1>
      <p className="muted">এগুলো শুধু এই ডিভাইসে সংরক্ষিত থাকে। কোথাও পাঠানো হয় না।</p>

      <section className="settings-section" aria-labelledby="set-theme">
        <h2 className="h3" id="set-theme">রঙের থিম</h2>
        <div className="chips">
          {THEMES.map(([id, label]) => (
            <Chip key={id} pressed={settings.theme === id} onClick={() => update({ theme: id })}>{label}</Chip>
          ))}
        </div>
      </section>

      <section className="settings-section" aria-labelledby="set-read">
        <h2 className="h3" id="set-read">পড়ার আকার</h2>
        <Stepper
          label="লেখার আকার (পিক্সেল)"
          value={settings.size} display={digits(settings.size)} min={14} max={28} step={2}
          lessLabel="লেখা ছোট করুন" moreLabel="লেখা বড় করুন"
          onChange={(size) => update({ size })}
        />
        <Stepper
          label="লাইনের ফাঁক"
          value={settings.lineHeight} display={fraction(settings.lineHeight)} min={1.5} max={2.4} step={0.1}
          lessLabel="লাইনের ফাঁক কমান" moreLabel="লাইনের ফাঁক বাড়ান"
          onChange={(lineHeight) => update({ lineHeight })}
        />
        <Stepper
          label="লেখার প্রস্থ"
          value={settings.width} display={digits(settings.width)} min={26} max={46} step={2}
          lessLabel="লেখার প্রস্থ কমান" moreLabel="লেখার প্রস্থ বাড়ান"
          onChange={(width) => update({ width })}
        />
        <p className="settings-preview" aria-label="নমুনা">{SAMPLE}</p>
      </section>

      <section className="settings-section" aria-labelledby="set-digits">
        <h2 className="h3" id="set-digits">সংখ্যার ধরন</h2>
        <div className="chips">
          <Chip pressed={settings.digits === 'bn'} onClick={() => update({ digits: 'bn' })}>বাংলা</Chip>
          <Chip pressed={settings.digits === 'en'} onClick={() => update({ digits: 'en' })}>English</Chip>
        </div>
      </section>

      <Button variant="ghost" onClick={reset}>আগের মতো করুন</Button>
    </main>
  );
}
