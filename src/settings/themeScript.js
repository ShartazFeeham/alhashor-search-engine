// Runs inline in <head> before first paint, so a saved theme is applied without a flash. It is
// part of the app, not an outside script.
export const themeScript = `try{var s=JSON.parse(localStorage.getItem('boikotha.settings')||'{}');if(s.theme&&s.theme!=='auto'){document.documentElement.setAttribute('data-theme',s.theme)}}catch(e){}`;
