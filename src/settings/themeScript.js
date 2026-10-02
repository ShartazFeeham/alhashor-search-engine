// Runs inline in <head> before first paint, so a saved theme and the saved reading size, line gap
// and width are applied without a flash or a reflow. It is part of the app, not an outside script.
// A value that is missing or not a number is skipped (the stylesheet holds the same defaults).
// The ranges repeat clampSettings in settings.js; a test compares the two.
export const themeScript = `try{var d=document.documentElement,s=JSON.parse(localStorage.getItem('boikotha.settings')||'{}');if(s.theme&&s.theme!=='auto'){d.setAttribute('data-theme',s.theme)}var n=function(k,v,a,b,u){if(v==null)return;v=Number(v);if(isFinite(v))d.style.setProperty(k,Math.min(Math.max(v,a),b)+u)};n('--rs',s.size,14,28,'px');n('--rlh',s.lineHeight,1.5,2.4,'');n('--rw',s.width,26,46,'em')}catch(e){}`;
