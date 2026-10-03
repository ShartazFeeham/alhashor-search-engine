import { LIMITS, STORAGE_KEY, THEME_COLORS } from './settings';

// Runs inline in <head> before first paint, so a saved theme and the saved reading size and line
// gap are applied without a flash or a reflow. It is part of the app, not an outside script.
// With no saved theme (or a saved value that is not a theme) the page is light, whatever the device prefers; a saved 'auto' (follow the device) removes the attribute so the stylesheet follows the device.
// A saved text width from an older version is ignored. A value that is missing or not a number is skipped (the stylesheet holds the same defaults).
// The ranges repeat clampSettings in settings.js; a test compares the two.
const KEY = JSON.stringify(STORAGE_KEY);

export const themeScript = `var d=document.documentElement,s={},t='light';try{s=JSON.parse(localStorage.getItem(${KEY})||'{}')||{};if(s.theme==='auto'||s.theme==='dark'||s.theme==='sepia')t=s.theme}catch(e){s={}}try{var C=${JSON.stringify(THEME_COLORS)},c=t;if(t==='auto'){c=window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';d.removeAttribute('data-theme')}else d.setAttribute('data-theme',t);var m=document.querySelectorAll('meta[name="theme-color"]');for(var i=0;i<m.length;i++){m[i].removeAttribute('media');m[i].setAttribute('content',C[c])}}catch(e){}try{var n=function(k,v,a,b,u){if(v==null)return;v=Number(v);if(isFinite(v))d.style.setProperty(k,Math.min(Math.max(v,a),b)+u)};n('--rs',s.size,${LIMITS.size.min},${LIMITS.size.max},'px');n('--rlh',s.lineHeight,${LIMITS.lineHeight.min},${LIMITS.lineHeight.max},'')}catch(e){}`;
