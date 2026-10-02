'use client';

import PageTitle from '../Helpers/PageTitle';
import { toBengaliDigits } from '../lib/digits';
import { useDigits } from '../lib/useDigits';
import Button from '../ui/Button';
import Chip from '../ui/Chip';
import { LIMITS } from './settings';
import { useSettings } from './SettingsProvider';

const THEMES = [
  ['auto', 'স্বয়ংক্রিয়'],
  ['light', 'হালকা'],
  ['dark', 'গাঢ়'],
  ['sepia', 'সেপিয়া'],
];

const SAMPLE =
  'ইয়াহুদী ও নাসারাদের প্রতি আল্লাহর অভিশাপ, তারা তাদের নবীদের কবরকে মসজিদে পরিণত করেছে।';

const round = (n) => Math.round(n * 100) / 100;

// A range slider (the whole range is reachable by dragging on a phone) with a minus and a plus
// button of 44px for one fine step; the current value is shown in text beside the label.
function Slider({ label, value, display, min, max, step, onChange, lessLabel, moreLabel }) {
  return (
    <div className="settings-slider">
      <div className="settings-row">
        <span className="settings-label">{label}</span>
        <output className="settings-value">{display}</output>
      </div>
      <div className="settings-slider-controls">
        <Button size="sm" aria-label={lessLabel} disabled={value <= min} onClick={() => onChange(Math.max(min, round(value - step)))}>−</Button>
        <input
          type="range"
          className="settings-range"
          aria-label={label}
          aria-valuetext={display}
          min={min} max={max} step={step} value={value}
          onChange={(event) => onChange(round(Number(event.target.value)))}
        />
        <Button size="sm" aria-label={moreLabel} disabled={value >= max} onClick={() => onChange(Math.min(max, round(value + step)))}>+</Button>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { settings, update, reset } = useSettings();
  const digits = useDigits();
  const gap = (n) => (settings.digits === 'en' ? n.toFixed(1) : toBengaliDigits(n.toFixed(1)));

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
        <Slider
          label="লেখার আকার (পিক্সেল)"
          value={settings.size} display={digits(settings.size)} {...LIMITS.size}
          lessLabel="লেখা ছোট করুন" moreLabel="লেখা বড় করুন"
          onChange={(size) => update({ size })}
        />
        <Slider
          label="লাইনের ফাঁক"
          value={settings.lineHeight} display={gap(settings.lineHeight)} {...LIMITS.lineHeight}
          lessLabel="লাইনের ফাঁক কমান" moreLabel="লাইনের ফাঁক বাড়ান"
          onChange={(lineHeight) => update({ lineHeight })}
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
