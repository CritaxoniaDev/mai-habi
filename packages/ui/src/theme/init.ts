import { THEME_STORAGE_KEY } from './controller';

/**
 * Runs before first paint, inline in the document head.
 *
 * Without this the browser paints the light stylesheet and then swaps to dark
 * once hydration catches up — the white flash the design rules forbid. It is a
 * string rather than a module because it has to execute synchronously, ahead of
 * any bundle.
 */
export const THEME_INIT_SCRIPT = `(function(){
var m='system';
try{m=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)})||'system'}catch(_){}
if(m!=='light'&&m!=='dark')m='system';
var d=m==='dark'||(m==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);
var e=document.documentElement;
e.classList.add(d?'dark':'light');
e.style.colorScheme=d?'dark':'light';
e.dataset.themeMode=m;
e.dataset.theme=d?'dark':'light';
})();`;
