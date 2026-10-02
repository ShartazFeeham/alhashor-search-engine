import { LIMITS, STORAGE_KEY } from './settings';

// Runs inline in <head> before first paint, so a saved theme and the saved reading size and line
// gap are applied without a flash or a reflow. It is part of the app, not an outside script.
// A saved text width from an older version is ignored. A value that is missing or not a number is skipped (the stylesheet holds the same defaults).
// The ranges repeat clampSettings in settings.js; a test compares the two.
const KEY = JSON.stringify(STORAGE_KEY);

export const themeScript = `try{var d=document.documentElement,l=localStorage,r=l.getItem(${KEY});var s=JSON.parse(r||'{}');if(s.theme&&s.theme!=='auto'){d.setAttribute('data-theme',s.theme)}var n=function(k,v,a,b,u){if(v==null)return;v=Number(v);if(isFinite(v))d.style.setProperty(k,Math.min(Math.max(v,a),b)+u)};n('--rs',s.size,${LIMITS.size.min},${LIMITS.size.max},'px');n('--rlh',s.lineHeight,${LIMITS.lineHeight.min},${LIMITS.lineHeight.max},'')}catch(e){}`;
