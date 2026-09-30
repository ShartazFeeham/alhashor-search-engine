// Interaction checks in a real browser. Usage: node scripts/browser-checks.mjs <base-url>
import { openPage } from './browser.mjs';

const base = process.argv[2];
let failed = false;
const report = (ok, what, detail = '') => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}${detail ? ` (${detail})` : ''}`);
  if (!ok) failed = true;
};

// Paging must land at the very top, with the navigation bar visible (Next.js used to stop mid-page).
{
  const page = await openPage(`${base}/search?q=%E0%A6%B0%E0%A7%8B%E0%A6%9C%E0%A6%BE`);
  try {
    await page.waitFor(`document.body.innerText.includes('মোট ৪০৩')`, 'the results');
    await page.eval('window.scrollTo(0, 1500)');
    const clicked = await page.click('পরের', 'button');
    await page.waitFor(`document.body.innerText.includes('২১ - ৪০')`, 'page 2');
    // The page scrolls smoothly (Bootstrap sets scroll-behavior: smooth), so wait for it to settle.
    let top = await page.eval('document.documentElement.scrollTop');
    for (let i = 0; i < 25 && top !== 0; i++) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      top = await page.eval('document.documentElement.scrollTop');
    }
    report(clicked && top === 0, 'paging scrolls to the top', `scrollTop=${top}`);
    report(
      (await page.eval(`new URLSearchParams(location.search).get('page')`)) === '2',
      'the address holds page 2'
    );
  } finally {
    await page.close();
  }
}

// A saved theme is applied on load (by the inline script, before first paint) and changes the colours.
{
  const page = await openPage(`${base}/`);
  try {
    await page.waitFor(`document.readyState === 'complete'`, 'the home page');
    await page.eval(`localStorage.setItem('boikotha.settings', JSON.stringify({ theme: 'dark' }))`);
    await page.eval('location.reload()');
    await new Promise((resolve) => setTimeout(resolve, 800));
    await page.waitFor(`document.readyState === 'complete'`, 'the reloaded page');
    report((await page.eval(`document.documentElement.getAttribute('data-theme')`)) === 'dark', 'a saved dark theme is set on the page');
    const background = await page.eval(`getComputedStyle(document.body).backgroundColor`);
    report(background === 'rgb(5, 12, 10)', 'the dark theme colours the page', background);
  } finally {
    await page.close();
  }
}

// A keyboard walk: Tab reaches controls in a sensible order, each focused control shows a ring,
// Enter opens the narrator chain, the arrow keys move between hadis, and narrow widths do not
// overflow sideways.
{
  const page = await openPage(`${base}/hadis/bukhari/307`);
  try {
    await page.waitFor(`document.body.innerText.includes('বর্ণনায়')`, 'the hadis');
    const order = [];
    let allRings = true;
    for (let i = 0; i < 8; i++) {
      await page.key('Tab');
      const focus = await page.eval(`(() => { const e = document.activeElement; const c = getComputedStyle(e);
        return { name: (e.getAttribute('aria-label') || e.textContent || '').trim().slice(0, 30), ring: c.outlineStyle !== 'none' && parseFloat(c.outlineWidth) > 0 }; })()`);
      order.push(focus.name);
      if (!focus.ring) allRings = false;
    }
    report(allRings, 'every control reached by Tab shows a focus ring', order.join(' | '));
    report(order[0].includes('BoiKotha') && order.indexOf('হোম') < order.indexOf('হাদীস বই'), 'the tab order follows the page (brand, then navigation)');

    const toggle = await page.eval(`(() => { const b = [...document.querySelectorAll('button')].find((e) => e.textContent.includes('বর্ণনায়')); b.focus(); return true; })()`);
    await page.key('Enter');
    report(toggle && (await page.eval(`document.querySelector('[aria-expanded="true"]') !== null`)), 'Enter opens the narrator chain');

    await page.eval('document.activeElement.blur()');
    await page.key('ArrowRight');
    await page.waitFor(`location.pathname === '/hadis/bukhari/308'`, 'the next hadis');
    report(true, 'the right arrow key opens the next hadis');
    await page.key('ArrowLeft');
    await page.waitFor(`location.pathname === '/hadis/bukhari/307'`, 'the previous hadis');
    report(true, 'the left arrow key goes back');

    for (const width of [600, 320]) {
      await page.resize(width, 800);
      await new Promise((resolve) => setTimeout(resolve, 300));
      const overflow = await page.eval('document.documentElement.scrollWidth - window.innerWidth');
      report(overflow <= 0, `no sideways overflow at ${width}px (text at 200% and small phones)`, `overflow=${overflow}`);
    }
  } finally {
    await page.close();
  }
}

process.exit(failed ? 1 : 0);
