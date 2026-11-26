/* Data Coach: simple pictures, drawn here as SVG (no image files, nothing downloaded). An icon for each
   kind of data, and pictures for the values themselves: coins, die faces, and colored dots that always
   come with their color's name (so color is never the only clue). Every picture is decorative or has
   the value in text beside it. */
const Pics = (() => {
  'use strict';
  // Stroke and fill use the palette: ink is the text brown, and a few soft accent colors.
  const INK = '#3b2f25', CARD = '#fffdf8', CLAY = '#9c4a26', SAGE = '#5f6f35', SAND = '#f3e3c8', SKY = '#4a6f8f', RED = '#94401c';
  const svg = (body, label = '') => `<svg viewBox="0 0 48 48" class="icon" ${label ? `role="img" aria-label="${label}"` : 'aria-hidden="true"'} fill="none" stroke="${INK}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
  const pips = (n, size = 4) => {
    const P = { 1: [[24, 24]], 2: [[15, 15], [33, 33]], 3: [[14, 14], [24, 24], [34, 34]], 4: [[15, 15], [33, 15], [15, 33], [33, 33]], 5: [[14, 14], [34, 14], [24, 24], [14, 34], [34, 34]], 6: [[15, 13], [33, 13], [15, 24], [33, 24], [15, 35], [33, 35]] }[n] || [];
    return P.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="${size}" fill="${INK}" stroke="none"/>`).join('');
  };

  // ---------- An icon for each kind of data ----------
  const ICONS = {
    coins: `<circle cx="24" cy="24" r="17" fill="${SAND}"/><circle cx="24" cy="24" r="12"/><path d="M20 18v12M28 18v12M20 24h8"/>`,
    dice: `<rect x="7" y="7" width="34" height="34" rx="7" fill="${CARD}"/>${pips(5, 3.2)}`,
    spinner: `<circle cx="24" cy="24" r="18" fill="${CARD}"/><path d="M24 6v36M6 24h36"/><path d="M24 24l9-11" stroke="${RED}" stroke-width="3.5"/><circle cx="24" cy="24" r="2.5" fill="${INK}"/>`,
    marbles: `<path d="M12 18c-3 8-3 18 3 22h18c6-4 6-14 3-22z" fill="${SAND}"/><path d="M15 18h18M18 18l-2-6h16l-2 6"/><circle cx="20" cy="31" r="4" fill="${RED}"/><circle cx="29" cy="29" r="4" fill="${SKY}"/><circle cx="25" cy="36" r="3.5" fill="${SAGE}"/>`,
    eyes: `<path d="M5 24c6-9 13-13 19-13s13 4 19 13c-6 9-13 13-19 13S11 33 5 24z" fill="${CARD}"/><circle cx="24" cy="24" r="7" fill="${SKY}"/><circle cx="24" cy="24" r="3" fill="${INK}" stroke="none"/>`,
    height: `<rect x="30" y="5" width="10" height="38" rx="2" fill="${SAND}"/><path d="M30 12h5M30 19h4M30 26h5M30 33h4"/><circle cx="16" cy="12" r="5"/><path d="M16 17v14M10 22h12M16 31l-5 11M16 31l5 11"/>`,
    shoes: `<path d="M7 30V18c0-3 6-3 8 0 3 5 9 7 17 8 6 1 9 3 9 6v4H7z" fill="${SAND}"/><path d="M7 36h34M18 22l3-3M22 25l3-3"/>`,
    reunion: `<circle cx="12" cy="17" r="5"/><circle cx="36" cy="17" r="5"/><circle cx="24" cy="25" r="4"/><path d="M5 40c0-8 3-14 7-14s7 6 7 14M29 40c0-8 3-14 7-14s7 6 7 14M18 41c0-5 3-9 6-9s6 4 6 9"/>`,
    sleep: `<path d="M30 8a15 15 0 1 0 10 25A13 13 0 0 1 30 8z" fill="${SAND}"/><path d="M31 15h6l-6 7h6"/>`,
    screen: `<rect x="13" y="5" width="22" height="38" rx="4" fill="${CARD}"/><rect x="17" y="10" width="14" height="24" rx="1" fill="${SAND}" stroke="none"/><circle cx="24" cy="38.5" r="1.5" fill="${INK}" stroke="none"/>`,
    travel: `<rect x="6" y="12" width="36" height="22" rx="4" fill="${SAND}"/><path d="M6 24h36M16 12v12M26 12v12"/><circle cx="14" cy="36" r="4" fill="${CARD}"/><circle cx="34" cy="36" r="4" fill="${CARD}"/>`,
    scores: `<path d="M12 5h18l7 7v31H12z" fill="${CARD}"/><path d="M30 5v7h7"/><path d="M17 33l4-11 4 11M18.5 29h5M30 25v8M26 29h8" stroke="${RED}"/>`,
    siblings: `<circle cx="16" cy="13" r="5"/><circle cx="33" cy="17" r="4"/><path d="M8 42c0-10 3-18 8-18s8 8 8 18M27 42c0-8 2-14 6-14s6 6 6 14"/>`,
    pets: `<circle cx="24" cy="31" r="8" fill="${SAND}"/><circle cx="13" cy="21" r="4"/><circle cx="20" cy="13" r="4"/><circle cx="29" cy="13" r="4"/><circle cx="36" cy="21" r="4"/>`,
    months: `<rect x="7" y="10" width="34" height="31" rx="3" fill="${CARD}"/><path d="M7 19h34M16 6v8M32 6v8"/><path d="M14 26h4M22 26h4M30 26h4M14 33h4M22 33h4"/>`,
    subject: `<path d="M24 12c-6-4-13-4-18-2v28c5-2 12-2 18 2 6-4 13-4 18-2V10c-5-2-12-2-18 2z" fill="${CARD}"/><path d="M24 12v28"/>`,
    points: `<circle cx="24" cy="24" r="17" fill="#e8b48c"/><path d="M7 24h34M24 7v34M12 12c6 6 6 18 0 24M36 12c-6 6-6 18 0 24"/>`,
    run: `<circle cx="24" cy="27" r="15" fill="${CARD}"/><path d="M24 27l6-7M20 6h8M24 6v6M37 13l3-3"/>`,
    freethrows: `<path d="M8 8h18v12H8z" fill="${CARD}"/><path d="M13 20h10l-2 10h-6z"/><circle cx="34" cy="34" r="8" fill="#e8b48c"/><path d="M26 34h16M34 26v16"/>`,
    reaction: `<rect x="20" y="4" width="8" height="40" rx="2" fill="${SAND}"/><path d="M20 11h4M20 18h4M20 25h4M20 32h4"/><path d="M8 28l5-6h-4l5-7" stroke="${RED}"/><path d="M40 28l-5-6h4l-5-7" stroke="${RED}"/>`,
    weather: `<rect x="20" y="5" width="8" height="28" rx="4" fill="${CARD}"/><circle cx="24" cy="37" r="7" fill="${RED}"/><path d="M24 33V16" stroke="${RED}" stroke-width="3"/><path d="M28 12h4M28 19h4M28 26h4"/>`,
    plant: `<path d="M14 32h20l-3 11H17z" fill="#e8b48c"/><path d="M24 32V14"/><path d="M24 22c-7 0-11-4-11-10 7 0 11 4 11 10zM24 18c6 0 10-4 10-9-6 0-10 4-10 9z" fill="#c9d4a8"/>`,
    rainfall: `<path d="M12 26a8 8 0 0 1 2-15 11 11 0 0 1 21 2 7 7 0 0 1 1 13z" fill="${CARD}"/><path d="M16 32l-2 5M25 32l-2 5M34 32l-2 5" stroke="${SKY}" stroke-width="3"/>`,
  };
  const icon = key => (ICONS[key] ? svg(ICONS[key]) : '');

  // ---------- The values as pictures ----------
  // Colors for categories that are colors, soft enough for the palette but clearly told apart; the name
  // always shows beside the dot.
  const COLOR = { Red: '#b3413b', Blue: '#3f6fa8', Green: '#4f7a3a', Yellow: '#d9b23a', Purple: '#7a4f9a', Orange: '#d07a2e', Brown: '#7a4a2a', Hazel: '#9a7b3c', Gray: '#8d8a85' };
  const coin = side => `<svg viewBox="0 0 24 24" class="pic-svg" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="${side === 'Heads' ? SAND : '#e6dccb'}" stroke="${INK}" stroke-width="1.6"/><text x="12" y="16" text-anchor="middle" font-size="11" font-weight="700" fill="${INK}" font-family="system-ui, sans-serif">${side[0]}</text></svg>`;
  const die = n => `<svg viewBox="0 0 48 48" class="pic-svg" aria-hidden="true"><rect x="3" y="3" width="42" height="42" rx="8" fill="${CARD}" stroke="${INK}" stroke-width="3"/>${pips(n, 4.2)}</svg>`;
  const dot = c => `<span class="dot" style="background:${COLOR[c]}" aria-hidden="true"></span>`;
  /* How one value is shown: { html, label } (label: what a screen reader hears, when the picture replaces
     the text), or null to show the value as plain text. */
  function value(set, x) {
    if (!set) return null;
    if (set.key === 'coins') return { html: `${coin(x)}<span class="pic-name">${x}</span>` };
    if (set.key === 'dice' && set.o && set.o.dice === '1') return { html: die(x), label: String(x) };
    if (COLOR[x]) return { html: `${dot(x)}${x}` };
    return null;
  }
  // Kinds of data that move when they are made: a coin flips, a die tumbles, a spinner spins, a bag shakes.
  const MOTION = { coins: 'flip', dice: 'tumble', spinner: 'spin', marbles: 'shake' };

  return { ICONS, icon, value, COLOR, MOTION };
})();
