/* Data Coach: bar graphs and pie charts, drawn as SVG. Each can be drawn by the student (drag, or use the
   arrow keys; every value snaps to a whole count or a whole share) or shown finished, as a picture with
   its values in words for screen readers. */
const Charts = (() => {
  'use strict';
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const fmt = Stats.fmt;
  // Slice colors: a category that is a color gets its color; others get soft palette shades.
  const SHADES = ['#f3e3c8', '#e3e8d3', '#f3dfd0', '#dfe6ee', '#efe0ec', '#f6ead2', '#e6dccb', '#ece3d3', '#d9e4dc', '#f1d9d2', '#e2dcef', '#f4ecd0'];
  const fill = (c, i) => Pics.COLOR[c] || SHADES[i % SHADES.length];
  // Where the pointer is, in the SVG's own units.
  function svgPoint(svg, e) {
    const b = svg.getBoundingClientRect(), vb = svg.viewBox.baseVal;
    return { x: vb.x + (e.clientX - b.left) * (vb.width / b.width), y: vb.y + (e.clientY - b.top) * (vb.height / b.height) };   // the viewBox may not start at 0 0 (the pie's does not)
  }

  /* ---------- Bar graph ----------
     o: { cats, values (bar heights), step (count scale; null until chosen), top, edit, onChange } */
  const BW = 340, BH = 250, L = 44, Rm = 10, Tm = 14;
  function bar(box, o) {
    // A histogram's bars touch (each is a range of numbers); a bar graph's bars stand apart.
    const k = o.cats.length, plotW = BW - L - Rm, colW = plotW / k, barW = o.hist ? colW : Math.min(36, colW * 0.62);
    const longest = Math.max(...o.cats.map(c => String(fmt(c)).length)), tilt = longest * 6.4 > colW - 2;
    const Bm = tilt ? 58 : 36, plotH = BH - Tm - Bm, top = o.top || 1;
    const y = v => Tm + plotH * (1 - v / top);
    const x = i => L + colW * i + colW / 2;
    let grid = '';
    if (o.step) for (let v = 0; v <= top; v += o.step) grid += `<line x1="${L}" y1="${y(v)}" x2="${BW - Rm}" y2="${y(v)}" class="c-grid"/><text x="${L - 6}" y="${y(v) + 4}" text-anchor="end" class="c-tick">${v}</text>`;
    const labels = o.cats.map((c, i) => tilt ? `<text transform="translate(${x(i) + 4} ${Tm + plotH + 10}) rotate(-45)" text-anchor="end" class="c-lab">${esc(fmt(c))}</text>` : `<text x="${x(i)}" y="${Tm + plotH + 18}" text-anchor="middle" class="c-lab">${esc(fmt(c))}</text>`).join('');
    const cols = o.cats.map((c, i) => {
      const v = o.values[i], h = plotH * v / top;
      const attrs = o.edit && o.step ? ` tabindex="0" role="slider" aria-label="${esc(fmt(c))} bar" aria-valuemin="0" aria-valuemax="${top}" aria-valuenow="${v}" aria-valuetext="${esc(fmt(c))}: ${v}"` : '';
      return `<g class="c-col${o.edit && o.step ? ' c-edit' : ''}" data-i="${i}"${attrs}>
        <rect class="c-hit" x="${x(i) - colW / 2}" y="${Tm}" width="${colW}" height="${plotH}" fill="transparent"/>
        <rect class="c-bar" x="${x(i) - barW / 2}" y="${y(v)}" width="${barW}" height="${h}" fill="${o.hist ? SHADES[0] : fill(c, i)}"/>
        ${o.edit && o.step ? `<rect class="c-handle" x="${x(i) - barW / 2 + (o.hist ? 3 : -3)}" y="${y(v) - 4}" width="${barW + (o.hist ? -6 : 6)}" height="8" rx="3"/><text class="c-val" x="${x(i)}" y="${y(v) - 8}" text-anchor="middle">${v || ''}</text>` : ''}
      </g>`;
    }).join('');
    const label = o.edit ? '' : ` role="img" aria-label="${o.hist ? 'Histogram' : 'Bar graph'}. ${esc(o.cats.map((c, i) => `${fmt(c)}: ${o.values[i]}`).join(', '))}."`;
    box.innerHTML = `<svg class="chart${o.edit && o.step ? ' c-editing' : ''}" viewBox="0 0 ${BW} ${BH}"${label}>
      ${grid}<line x1="${L}" y1="${Tm}" x2="${L}" y2="${Tm + plotH}" class="c-axis"/><line x1="${L}" y1="${Tm + plotH}" x2="${BW - Rm}" y2="${Tm + plotH}" class="c-axis"/>
      <text transform="translate(12 ${Tm + plotH / 2}) rotate(-90)" text-anchor="middle" class="c-lab">Count</text>${cols}${labels}</svg>`;
    if (!o.edit || !o.step) return;
    const svg = box.querySelector('svg');
    const set = (i, v) => {
      v = Math.max(0, Math.min(top, Math.round(v)));
      if (v === o.values[i]) return;
      o.values[i] = v;
      const g = svg.querySelector(`[data-i="${i}"]`), h = plotH * v / top;
      g.querySelector('.c-bar').setAttribute('y', y(v)); g.querySelector('.c-bar').setAttribute('height', h);
      g.querySelector('.c-handle').setAttribute('y', y(v) - 4);
      const t = g.querySelector('.c-val'); t.setAttribute('y', y(v) - 8); t.textContent = v || '';
      g.setAttribute('aria-valuenow', v); g.setAttribute('aria-valuetext', `${fmt(o.cats[i])}: ${v}`);
      if (o.onChange) o.onChange();
    };
    svg.querySelectorAll('.c-col').forEach(g => {
      const i = +g.dataset.i, toV = e => top * (1 - (svgPoint(svg, e).y - Tm) / plotH);
      // A mouse or pen drags the bar. A finger taps it instead (the bar goes to where the tap lifts), so a swipe over the graph
      // still scrolls the page and never changes a bar.
      let touch = null;
      g.addEventListener('pointerdown', e => {
        if (e.pointerType === 'touch') { touch = { x: e.clientX, y: e.clientY }; return; }
        e.preventDefault(); g.focus(); set(i, toV(e)); try { g.setPointerCapture(e.pointerId); } catch (err) { /* no capture: the bar still moves on each press */ }
      });
      g.addEventListener('pointerup', e => { if (e.pointerType === 'touch' && touch && Math.hypot(e.clientX - touch.x, e.clientY - touch.y) < 10) { g.focus(); set(i, toV(e)); } touch = null; });
      g.addEventListener('pointercancel', () => { touch = null; });
      g.addEventListener('pointermove', e => { if (g.hasPointerCapture(e.pointerId)) set(i, toV(e)); });
      g.addEventListener('keydown', e => {
        const d = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1, PageUp: o.step, PageDown: -o.step }[e.key];
        if (d !== undefined) { e.preventDefault(); set(i, o.values[i] + d); } else if (e.key === 'Home') { e.preventDefault(); set(i, 0); } else if (e.key === 'End') { e.preventDefault(); set(i, top); }
      });
    });
  }

  /* ---------- Pie chart ----------
     o: { cats, values (each slice's count), n (equal parts), edit, onChange }. Slices run clockwise from the top. */
  const PW = 300, CX = 150, CY = 150, RAD = 108;
  const pt = (c, n, r) => { const a = (c / n) * 2 * Math.PI - Math.PI / 2; return { x: CX + r * Math.cos(a), y: CY + r * Math.sin(a) }; };
  function slicePath(a, b, n) {
    if (b - a <= 0) return '';
    if (b - a >= n) return `M${CX} ${CY - RAD} A${RAD} ${RAD} 0 1 1 ${CX - 0.01} ${CY - RAD} Z`;
    const p = pt(a, n, RAD), q = pt(b, n, RAD);
    return `M${CX} ${CY} L${p.x} ${p.y} A${RAD} ${RAD} 0 ${(b - a) / n > 0.5 ? 1 : 0} 1 ${q.x} ${q.y} Z`;
  }
  function pie(box, o) {
    const n = o.n, k = o.cats.length, legendId = `legend-${Math.random().toString(36).slice(2, 8)}`;
    const cumTo = i => o.values.slice(0, i + 1).reduce((s, x) => s + x, 0);
    // The parts: one light tick per equal share, so the snapping is visible.
    let ticks = '';
    if (n <= 60) for (let j = 0; j < n; j++) { const p = pt(j, n, RAD), q = pt(j, n, RAD + 5); ticks += `<line x1="${p.x}" y1="${p.y}" x2="${q.x}" y2="${q.y}" class="c-tickmark"/>`; }
    const slices = o.cats.map((c, i) => `<path class="c-slice${c === 'Yellow' ? ' on-light' : Pics.COLOR[c] ? ' on-color' : ''}" data-s="${i}" fill="${fill(c, i)}"/><text class="c-slab" data-t="${i}" text-anchor="middle">${esc(fmt(c))}</text>`).join('');
    const edges = o.edit ? o.cats.slice(0, -1).map((c, i) => `<g class="c-edge" data-i="${i}" tabindex="0" role="slider" aria-label="Edge after ${esc(fmt(c))}" aria-valuemin="0" aria-valuemax="${n}"><line x1="${CX}" y1="${CY}" class="c-edgeline"/><circle r="22" fill="transparent" class="c-grab"/><circle r="8" class="c-knob"/></g>`).join('') : '';
    const label = o.edit ? ` aria-describedby="${legendId}"` : ` role="img" aria-label="Pie chart. ${esc(o.cats.map((c, i) => `${fmt(c)}: ${o.values[i]} of ${n}`).join(', '))}."`;
    box.innerHTML = `<svg class="chart pie${o.edit ? ' c-dragging' : ''}" viewBox="-60 14 ${PW + 120} ${PW - 28}"${label}><circle cx="${CX}" cy="${CY}" r="${RAD}" class="c-rim"/>${slices}<circle cx="${CX}" cy="${CY}" r="${RAD}" class="c-outline"/>${ticks}${edges}</svg>${o.edit || o.legend ? `<ul class="c-legend" id="${legendId}"></ul>` : ''}`;
    const svg = box.querySelector('svg'), legend = box.querySelector('.c-legend');
    // Move every slice, name, edge and legend line to the current counts (the SVG itself stays, so a drag keeps going).
    function update() {
      let cum = 0;
      o.cats.forEach((c, i) => {
        const a = cum, b = cum + o.values[i]; cum = b;
        svg.querySelector(`[data-s="${i}"]`).setAttribute('d', slicePath(a, b, n));
        // Every slice is named: inside when there is room, just outside the circle when the slice is small. An empty slice has no name (the legend still lists it).
        const t = svg.querySelector(`[data-t="${i}"]`), big = o.values[i] / n >= 0.08, m = pt((a + b) / 2, n, big ? RAD * 0.62 : RAD + 14);
        t.setAttribute('x', m.x); t.setAttribute('y', m.y + 4); t.style.display = o.values[i] ? '' : 'none';
        t.setAttribute('text-anchor', big || Math.abs(m.x - CX) < 12 ? 'middle' : m.x > CX ? 'start' : 'end');
        if (i < k - 1 && o.edit) {
          const g = svg.querySelector(`[data-i="${i}"]`), p = pt(b, n, RAD);
          g.querySelector('line').setAttribute('x2', p.x); g.querySelector('line').setAttribute('y2', p.y);
          g.querySelectorAll('circle').forEach(ci => { ci.setAttribute('cx', p.x); ci.setAttribute('cy', p.y); });
          g.setAttribute('aria-valuenow', o.values[i]); g.setAttribute('aria-valuetext', `${fmt(c)}: ${o.values[i]} of ${n}`);
        }
      });
      // legend 'names': just which color is which (a reading question must not show its answer); otherwise each share too.
      if (legend) legend.innerHTML = o.cats.map((c, i) => `<li><span class="c-swatch" style="background:${fill(c, i)}" aria-hidden="true"></span>${esc(fmt(c))}${o.legend === 'names' ? '' : `: ${o.values[i]} of ${n} (${fmt(o.values[i] / n * 100)}%)`}</li>`).join('');
    }
    // Moving edge i changes slice i and slice i + 1; the edge stays between its neighbors.
    const setEdge = (i, c) => {
      const lo = cumTo(i - 1), hi = cumTo(i + 1), now = cumTo(i);
      c = Math.max(lo, Math.min(hi, Math.round(c)));
      if (c === now) return;
      o.values[i] += c - now; o.values[i + 1] -= c - now;
      update();
      if (o.onChange) o.onChange();
    };
    const partAt = e => { const p = svgPoint(svg, e); let a = Math.atan2(p.y - CY, p.x - CX) + Math.PI / 2; if (a < 0) a += 2 * Math.PI; return (a / (2 * Math.PI)) * n; };
    if (o.edit) svg.querySelectorAll('.c-edge').forEach(g => {
      const i = +g.dataset.i;
      g.addEventListener('pointerdown', e => { e.preventDefault(); g.focus(); try { g.setPointerCapture(e.pointerId); } catch (err) { /* no capture to take */ } });
      // Past 12 o'clock the angle wraps from the last part to 0: take whichever of c, c - n, c + n is nearest the edge's place.
      g.addEventListener('pointermove', e => { if (!g.hasPointerCapture(e.pointerId)) return; const now = cumTo(i), c = partAt(e); setEdge(i, [c, c - n, c + n].reduce((a, b) => (Math.abs(b - now) < Math.abs(a - now) ? b : a))); });
      g.addEventListener('keydown', e => {
        const d = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1 }[e.key];
        if (d !== undefined) { e.preventDefault(); setEdge(i, cumTo(i) + d); }
      });
    });
    update();
    return { update };
  }

  /* ---------- Dot plot ----------
     o: { ticks (the number line's values, or category names), values (dots above each), edit, erase (taps
     take a dot away), onChange }. Tapping above a value adds a dot there; arrow keys add and take away. */
  const DW = 340, DL = 14, DR = 14;
  function dot(box, o) {
    const k = o.ticks.length, step = (DW - DL - DR) / k, r = Math.min(7, step * 0.38), gap = r * 2 + 2;
    const tall = Math.max(6, ...o.values) + (o.edit ? 2 : 0), base = 18 + tall * gap, H = base + 34;
    const x = i => DL + step * (i + 0.5);
    const every = k > 16 ? 2 : 1;
    const ticks = o.ticks.map((t, i) => `<line x1="${x(i)}" y1="${base}" x2="${x(i)}" y2="${base + 6}" class="c-axis"/>${i % every ? '' : `<text x="${x(i)}" y="${base + 20}" text-anchor="middle" class="c-lab">${esc(fmt(t))}</text>`}`).join('');
    const cols = o.ticks.map((t, i) => {
      const dots = Array.from({ length: o.values[i] }, (_, j) => `<circle cx="${x(i)}" cy="${base - r - 3 - j * gap}" r="${r}" class="c-dot"/>`).join('');
      const attrs = o.edit ? ` tabindex="0" role="slider" aria-label="Dots at ${esc(fmt(t))}" aria-valuemin="0" aria-valuemax="99" aria-valuenow="${o.values[i]}" aria-valuetext="${esc(fmt(t))}: ${o.values[i]} ${o.values[i] === 1 ? 'dot' : 'dots'}"` : '';
      return `<g class="c-col${o.edit ? ' c-tap' : ''}" data-i="${i}"${attrs}><rect x="${x(i) - step / 2}" y="4" width="${step}" height="${base}" fill="transparent"/>${dots}</g>`;
    }).join('');
    const label = o.edit ? '' : ` role="img" aria-label="Dot plot. ${esc(o.ticks.map((t, i) => `${fmt(t)}: ${o.values[i]}`).join(', '))}."`;
    box.innerHTML = `<svg class="chart" viewBox="0 0 ${DW} ${H}"${label}><line x1="${DL}" y1="${base}" x2="${DW - DR}" y2="${base}" class="c-axis"/>${ticks}${cols}</svg>`;
    if (!o.edit) return;
    const change = (i, d) => {
      const v = Math.max(0, o.values[i] + d);
      if (v === o.values[i]) return;
      o.values[i] = v; dot(box, o);
      const g = box.querySelector(`[data-i="${i}"]`); if (g) g.focus();
      if (o.onChange) o.onChange();
    };
    box.querySelectorAll('.c-col').forEach(g => {
      const i = +g.dataset.i;
      g.addEventListener('click', () => change(i, o.erase && o.erase() ? -1 : 1));
      g.addEventListener('keydown', e => {
        const d = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1 }[e.key];
        if (d !== undefined) { e.preventDefault(); change(i, d); }
      });
    });
  }

  /* ---------- Stem-and-leaf plot (finished) ---------- rows: [[stem, [leaves]]], key: "5 | 8 means 58". */
  function stem(box, ch) {
    box.innerHTML = `<table class="stem"><caption>Stem | Leaf</caption><tbody>${ch.rows.map(([s, l]) => `<tr><th scope="row">${s}</th><td>${l.join(' ')}</td></tr>`).join('')}</tbody></table>${ch.key ? `<p class="stem-key">Key: ${esc(ch.key)}</p>` : ''}`;
  }

  /* ---------- Box plot ----------
     o: { axis: { lo, hi, step }, values: [lo whisker, Q1, median, Q3, hi whisker], out (outlier dots), edit, snap, onChange }.
     Each of the five handles is dragged along the number line (or set with the arrow keys), and stays between its neighbors. */
  const XW = 340, XL = 18, XR = 18, NAMES5 = ['Lower whisker', 'Q1', 'Median', 'Q3', 'Upper whisker'];
  function boxPlot(box, o) {
    const { lo, hi, step } = o.axis, X = v => XL + (XW - XL - XR) * (v - lo) / (hi - lo), BY = 30, BH = 34, AY = 96, H = o.edit ? 150 : 122, snap = o.snap || 0.5;
    let ticks = '';
    for (let t = lo; t <= hi + 1e-9; t += step) ticks += `<line x1="${X(t)}" y1="${AY}" x2="${X(t)}" y2="${AY + 6}" class="c-axis"/><text x="${X(t)}" y="${AY + 20}" text-anchor="middle" class="c-lab">${fmt(t)}</text>`;
    const label = o.edit ? '' : ` role="img" aria-label="Box plot. Lower whisker ${fmt(o.values[0])}, Q1 ${fmt(o.values[1])}, median ${fmt(o.values[2])}, Q3 ${fmt(o.values[3])}, upper whisker ${fmt(o.values[4])}${o.out.length ? `; outliers ${o.out.map(fmt).join(', ')}` : ''}."`;
    const handles = o.edit ? NAMES5.map((nm, i) => `<g class="c-knobg" data-i="${i}" tabindex="0" role="slider" aria-label="${nm}" aria-valuemin="${lo}" aria-valuemax="${hi}"><rect class="c-grabx" y="${BY - 18}" width="30" height="${AY - BY + 46}" fill="transparent"/><line class="c-hline" y1="${BY - 8}" y2="${AY + 30}"/><circle class="c-knob" cy="${AY + 36}" r="7"/></g>`).join('') : '';
    box.innerHTML = `<svg class="chart${o.edit ? ' c-dragging' : ''}" viewBox="0 0 ${XW} ${H}"${label}><line x1="${XL}" y1="${AY}" x2="${XW - XR}" y2="${AY}" class="c-axis"/>${ticks}<g class="c-boxg"></g>${o.out.map(x => `<circle cx="${X(x)}" cy="${BY + BH / 2}" r="5" class="c-outdot"/>`).join('')}${handles}</svg>`;
    const svg = box.querySelector('svg'), g = svg.querySelector('.c-boxg');
    function update() {
      const [a, q1, m, q3, b] = o.values.map(X), mid = BY + BH / 2;
      g.innerHTML = `<line x1="${a}" y1="${mid}" x2="${q1}" y2="${mid}" class="c-whisk"/><line x1="${q3}" y1="${mid}" x2="${b}" y2="${mid}" class="c-whisk"/><line x1="${a}" y1="${BY + 8}" x2="${a}" y2="${BY + BH - 8}" class="c-whisk"/><line x1="${b}" y1="${BY + 8}" x2="${b}" y2="${BY + BH - 8}" class="c-whisk"/><rect x="${q1}" y="${BY}" width="${Math.max(0, q3 - q1)}" height="${BH}" class="c-boxr"/><line x1="${m}" y1="${BY}" x2="${m}" y2="${BY + BH}" class="c-med"/>`;
      if (!o.edit) return;
      svg.querySelectorAll('.c-knobg').forEach(h => {
        const i = +h.dataset.i, x = X(o.values[i]);
        h.querySelector('rect').setAttribute('x', x - 15); h.querySelector('line').setAttribute('x1', x); h.querySelector('line').setAttribute('x2', x); h.querySelector('circle').setAttribute('cx', x);
        h.setAttribute('aria-valuenow', o.values[i]); h.setAttribute('aria-valuetext', `${NAMES5[i]}: ${fmt(o.values[i])}`);
      });
    }
    const setV = (i, v) => {
      const lo2 = i ? o.values[i - 1] : lo, hi2 = i < 4 ? o.values[i + 1] : hi;
      v = Math.max(lo2, Math.min(hi2, +(Math.round(v / snap) * snap).toFixed(6)));
      if (v === o.values[i]) return;
      o.values[i] = v; update(); if (o.onChange) o.onChange();
    };
    update();
    if (!o.edit) return;
    // Handles at the same value sit on top of each other, and each is held between its neighbors, so the one on top might
    // not be free to move. The first move decides: leftward takes the lowest of them, rightward the highest.
    const knobs = [...svg.querySelectorAll('.c-knobg')];
    knobs.forEach(h => {
      const i = +h.dataset.i, toV = e => lo + (svgPoint(svg, e).x - XL) / (XW - XL - XR) * (hi - lo);
      let pick = null;   // the handle this drag moves, once known
      h.addEventListener('pointerdown', e => {
        e.preventDefault(); h.focus(); try { h.setPointerCapture(e.pointerId); } catch (err) { /* no capture to take */ }
        const group = o.values.map((x, j) => j).filter(j => o.values[j] === o.values[i]);
        pick = group.length === 1 ? i : { group };
      });
      h.addEventListener('pointermove', e => {
        if (!h.hasPointerCapture(e.pointerId) || pick === null) return;
        const v = toV(e);
        if (typeof pick === 'object') {
          if (Math.abs(v - o.values[i]) < snap / 2) return;   // not moved far enough to tell which way
          pick = v < o.values[i] ? Math.min(...pick.group) : Math.max(...pick.group);
          if (pick !== i) knobs[pick].focus();
        }
        setV(pick, v);
      });
      h.addEventListener('pointerup', () => { pick = null; });
      h.addEventListener('pointercancel', () => { pick = null; });
      h.addEventListener('keydown', e => {
        const d = { ArrowRight: snap, ArrowUp: snap, ArrowLeft: -snap, ArrowDown: -snap, PageUp: step, PageDown: -step }[e.key];
        if (d !== undefined) { e.preventDefault(); setV(i, o.values[i] + d); }
      });
    });
  }

  /* ---------- Line graph ----------
     o: { labels (along the bottom), values (null until placed), axis: { lo, hi, step }, edit, snap, onChange }.
     A point is dragged up and down its column (a finger taps instead, so the page still scrolls), or set with the arrow keys;
     the placed points are joined in order. An axis that doesn't start at 0 shows a break mark. */
  const LW = 340, LL = 44, LR = 10, LT = 12;
  function line(box, o) {
    const k = o.labels.length, { lo, hi, step } = o.axis, snap = o.snap || 1, colW = (LW - LL - LR) / k;
    const tilt = k > 10, LB = tilt ? 44 : 30, H = 240, plotH = H - LT - LB;
    const Y = v => LT + plotH * (1 - (v - lo) / (hi - lo)), X = i => LL + colW * (i + 0.5);
    let grid = '';
    for (let t = lo; t <= hi + 1e-9; t += step) grid += `<line x1="${LL}" y1="${Y(t)}" x2="${LW - LR}" y2="${Y(t)}" class="c-grid"/><text x="${LL - 6}" y="${Y(t) + 4}" text-anchor="end" class="c-tick">${fmt(t)}</text>`;
    const brk = lo > 0 ? `<path d="M${LL - 5} ${LT + plotH - 4} l5 -4 l5 4 l-5 4 z" class="c-break"/>` : '';
    // A long stretch labels about 12 of its points (the questions name only those).
    const every = k > 20 ? Math.ceil(k / 12) : 1;
    const labels = o.labels.map((l, i) => (i % every ? '' : tilt ? `<text transform="translate(${X(i) + 4} ${LT + plotH + 10}) rotate(-45)" text-anchor="end" class="c-lab">${esc(l)}</text>` : `<text x="${X(i)}" y="${LT + plotH + 18}" text-anchor="middle" class="c-lab">${esc(l)}</text>`)).join('');
    const cols = o.labels.map((l, i) => `<g class="c-col${o.edit ? ' c-edit' : ''}" data-i="${i}"${o.edit ? ` tabindex="0" role="slider" aria-label="${esc(l)}" aria-valuemin="${lo}" aria-valuemax="${hi}"` : ''}><rect class="c-lhit" x="${X(i) - colW / 2}" y="${LT}" width="${colW}" height="${plotH}" fill="transparent"/><circle r="${k > 20 ? 3 : 5}" class="c-lpt"/></g>`).join('');
    const label = o.edit ? '' : ` role="img" aria-label="Line graph. ${esc(o.labels.map((l, i) => `${l}: ${fmt(o.values[i])}`).join(', '))}."`;
    box.innerHTML = `<svg class="chart${o.edit ? ' c-editing' : ''}" viewBox="0 0 ${LW} ${H}"${label}>${grid}<line x1="${LL}" y1="${LT}" x2="${LL}" y2="${LT + plotH}" class="c-axis"/><line x1="${LL}" y1="${LT + plotH}" x2="${LW - LR}" y2="${LT + plotH}" class="c-axis"/>${brk}<polyline class="c-lline"/>${cols}${labels}</svg>`;
    const svg = box.querySelector('svg');
    function update() {
      const pts = o.values.map((v, i) => (v === null ? null : `${X(i)},${Y(v)}`));
      // The line joins each run of placed points, in order.
      svg.querySelector('.c-lline').setAttribute('points', pts.every(p => p !== null) ? pts.join(' ') : pts.filter(p => p !== null).join(' '));
      svg.querySelectorAll('.c-col').forEach(g => {
        const i = +g.dataset.i, v = o.values[i], c = g.querySelector('circle');
        if (v === null) c.setAttribute('display', 'none'); else { c.removeAttribute('display'); c.setAttribute('cx', X(i)); c.setAttribute('cy', Y(v)); }
        if (o.edit) { g.setAttribute('aria-valuenow', v === null ? lo : v); g.setAttribute('aria-valuetext', v === null ? `${o.labels[i]}: not placed` : `${o.labels[i]}: ${fmt(v)}`); }
      });
    }
    const setV = (i, v) => { v = Math.max(lo, Math.min(hi, +(Math.round(v / snap) * snap).toFixed(6))); if (v === o.values[i]) return; o.values[i] = v; update(); if (o.onChange) o.onChange(); };
    update();
    if (!o.edit) return;
    svg.querySelectorAll('.c-col').forEach(g => {
      const i = +g.dataset.i, toV = e => lo + (1 - (svgPoint(svg, e).y - LT) / plotH) * (hi - lo);
      let touch = null;
      g.addEventListener('pointerdown', e => {
        if (e.pointerType === 'touch') { touch = { x: e.clientX, y: e.clientY }; return; }
        e.preventDefault(); g.focus(); setV(i, toV(e)); try { g.setPointerCapture(e.pointerId); } catch (err) { /* no capture to take */ }
      });
      g.addEventListener('pointermove', e => { if (g.hasPointerCapture(e.pointerId)) setV(i, toV(e)); });
      g.addEventListener('pointerup', e => { if (e.pointerType === 'touch' && touch && Math.hypot(e.clientX - touch.x, e.clientY - touch.y) < 10) { g.focus(); setV(i, toV(e)); } touch = null; });
      g.addEventListener('pointercancel', () => { touch = null; });
      g.addEventListener('keydown', e => {
        const d = { ArrowUp: snap, ArrowRight: snap, ArrowDown: -snap, ArrowLeft: -snap, PageUp: step, PageDown: -step }[e.key];
        if (d !== undefined) { e.preventDefault(); setV(i, (o.values[i] === null ? Math.round((lo + hi) / 2 / snap) * snap : o.values[i]) + (o.values[i] === null ? 0 : d)); }
      });
    });
  }

  /* ---------- Normal curve ----------
     o: { lo, hi (the number line), mu, sd (the curve's center and spread), and either a histogram under it
     (bins: each bin's start, counts, w, n) or model: true (a curve alone, marked at the mean and 1, 2 and 3 SDs
     each side), edit, snap, onChange }. Two handles below the number line move the center and the spread (the
     spread handle sits one SD right of the center). */
  const CW = 340, CL = 44, CR = 12, CT = 14;
  function curve(box, o) {
    const bars = !!o.counts, CB = o.edit ? 92 : bars ? 36 : 46, H = bars ? 250 + (o.edit ? 56 : 0) : 220, plotH = H - CT - CB, plotW = CW - CL - CR, base = CT + plotH;
    const X = x => CL + plotW * (x - o.lo) / (o.hi - o.lo), snap = o.snap || 1;
    // Headroom above the tallest bar, so a well-fitted curve's peak isn't cut off.
    const maxC = bars ? Math.ceil(Math.max(...o.counts) * 1.2) : 0, step = bars ? Displays.goodStep(maxC) : 0, top = bars ? Displays.topFor(step, maxC) : 1;
    // The curve's height at x: for a histogram, scaled so its area matches the bars' (n values in bins w wide).
    const height = (x, mu, sd) => (bars ? o.n * o.w : 1) / (sd * Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * ((x - mu) / sd) ** 2);
    const yTop = bars ? top : height(o.mu, o.mu, o.sd) * 1.12, Y = c => CT + plotH * (1 - c / yTop);
    let grid = '', axis = '';
    if (bars) {
      for (let c = 0; c <= top; c += step) grid += `<line x1="${CL}" y1="${Y(c)}" x2="${CW - CR}" y2="${Y(c)}" class="c-grid"/><text x="${CL - 6}" y="${Y(c) + 4}" text-anchor="end" class="c-tick">${c}</text>`;
      const edges = [...o.bins, o.bins[o.bins.length - 1] + o.w], every = Math.ceil(edges.length / 8);
      axis = edges.map((a, i) => `<line x1="${X(a)}" y1="${base}" x2="${X(a)}" y2="${base + 5}" class="c-axis"/>${i % every ? '' : `<text x="${X(a)}" y="${base + 17}" text-anchor="middle" class="c-lab">${fmt(a)}</text>`}`).join('');
    } else for (let k = -3; k <= 3; k++) {
      const x = X(o.mu + k * o.sd);
      axis += `<line x1="${x}" y1="${CT}" x2="${x}" y2="${base}" class="c-grid"/><line x1="${x}" y1="${base}" x2="${x}" y2="${base + 5}" class="c-axis"/><text x="${x}" y="${base + 17}" text-anchor="middle" class="c-lab">${fmt(+(o.mu + k * o.sd).toFixed(6))}</text><text x="${x}" y="${base + 31}" text-anchor="middle" class="c-tick">${k ? `${k > 0 ? '+' : '−'}${Math.abs(k)} SD` : 'mean'}</text>`;
    }
    const rects = bars ? o.bins.map((a, i) => `<rect class="c-bar" x="${X(a)}" y="${Y(o.counts[i])}" width="${X(a + o.w) - X(a)}" height="${base - Y(o.counts[i])}" fill="${SHADES[0]}"/>`).join('') : '';
    const NAME = ['Center', 'Spread'];
    const handles = o.edit ? NAME.map((nm, i) => `<g class="c-knobg" data-i="${i}" tabindex="0" role="slider" aria-label="${nm}"><rect y="${CT}" width="30" height="${plotH + 52}" fill="transparent"/><line class="c-hline" y1="${CT}" y2="${base}"/><line class="c-hline" y1="${base + 22}" y2="${base + 26}"/><circle class="c-knob" cy="${base + 34}" r="8"/><text class="c-lab" y="${base + (i ? 74 : 58)}" text-anchor="middle">${nm}</text></g>`).join('') : '';
    const label = o.edit ? '' : ` role="img" aria-label="${bars ? `Histogram with a normal curve over it, centered at ${fmt(Stats.round(o.mu, 1))} with a spread of ${fmt(Stats.round(o.sd, 1))}. Bars from ${fmt(o.bins[0])}, ${fmt(o.w)} wide: ${o.counts.join(', ')}.` : `Normal curve with mean ${fmt(o.mu)} and standard deviation ${fmt(o.sd)}, marked at ${[-3, -2, -1, 0, 1, 2, 3].map(k => fmt(+(o.mu + k * o.sd).toFixed(6))).join(', ')}.`}"`;
    const clip = `dc-clip-${Math.random().toString(36).slice(2, 8)}`;
    box.innerHTML = `<svg class="chart${o.edit ? ' c-dragging' : ''}" viewBox="0 0 ${CW} ${H}"${label}><defs><clipPath id="${clip}"><rect x="${CL}" y="${CT - 2}" width="${plotW}" height="${plotH + 2}"/></clipPath></defs>${grid}${rects}${axis}<line x1="${CL}" y1="${base}" x2="${CW - CR}" y2="${base}" class="c-axis"/>${bars ? `<line x1="${CL}" y1="${CT}" x2="${CL}" y2="${base}" class="c-axis"/><text transform="translate(12 ${CT + plotH / 2}) rotate(-90)" text-anchor="middle" class="c-lab">Count</text>` : ''}<polyline class="c-curve" clip-path="url(#${clip})"/>${handles}</svg>`;
    const svg = box.querySelector('svg');
    function update() {
      const pts = [];
      for (let j = 0; j <= 120; j++) { const x = o.lo + (o.hi - o.lo) * j / 120; pts.push(`${X(x).toFixed(1)},${Y(height(x, o.mu, o.sd)).toFixed(1)}`); }
      svg.querySelector('.c-curve').setAttribute('points', pts.join(' '));
      if (!o.edit) return;
      svg.querySelectorAll('.c-knobg').forEach(h => {
        const i = +h.dataset.i, v = i ? o.mu + o.sd : o.mu, x = X(v);
        h.querySelector('rect').setAttribute('x', x - 15); h.querySelectorAll('line').forEach(l => { l.setAttribute('x1', x); l.setAttribute('x2', x); }); h.querySelector('circle').setAttribute('cx', x); h.querySelector('text').setAttribute('x', x);
        h.setAttribute('aria-valuemin', i ? snap : o.lo); h.setAttribute('aria-valuemax', i ? (o.hi - o.lo) / 2 : o.hi);
        h.setAttribute('aria-valuenow', i ? o.sd : o.mu); h.setAttribute('aria-valuetext', i ? `Spread: ${fmt(o.sd)}, one standard deviation, out to ${fmt(+(o.mu + o.sd).toFixed(6))}` : `Center: ${fmt(o.mu)}`);
      });
    }
    // The center moves the whole curve; the spread handle sets how far one SD reaches from the center.
    const tidy = v => +(Math.round(v / snap) * snap).toFixed(6);
    const setV = (i, v) => {
      if (i) { const s = Math.max(snap, Math.min((o.hi - o.lo) / 2, tidy(v))); if (s === o.sd) return; o.sd = s; } else { const m = Math.max(o.lo, Math.min(o.hi, tidy(v))); if (m === o.mu) return; o.mu = m; }
      update(); if (o.onChange) o.onChange();
    };
    update();
    if (!o.edit) return;
    svg.querySelectorAll('.c-knobg').forEach(h => {
      const i = +h.dataset.i, toV = e => { const x = o.lo + (svgPoint(svg, e).x - CL) / plotW * (o.hi - o.lo); return i ? x - o.mu : x; };
      h.addEventListener('pointerdown', e => { e.preventDefault(); h.focus(); try { h.setPointerCapture(e.pointerId); } catch (err) { /* no capture to take */ } });
      h.addEventListener('pointermove', e => { if (h.hasPointerCapture(e.pointerId)) setV(i, toV(e)); });
      h.addEventListener('keydown', e => {
        const d = { ArrowRight: snap, ArrowUp: snap, ArrowLeft: -snap, ArrowDown: -snap, PageUp: 5 * snap, PageDown: -5 * snap }[e.key];
        if (d !== undefined) { e.preventDefault(); setV(i, (i ? o.sd : o.mu) + d); }
      });
    });
  }

  // A finished display (from the data's chart field), not editable.
  function show(box, ch) {
    if (ch.type === 'pie') pie(box, { cats: ch.cats, values: ch.counts.slice(), n: ch.n, edit: false, legend: 'names' });   // the legend names every slice, even one too small to label
    else if (ch.type === 'dot') dot(box, { ticks: ch.ticks, values: ch.counts.slice(), edit: false });
    else if (ch.type === 'stem') stem(box, ch);
    else if (ch.type === 'box') boxPlot(box, { axis: ch.axis, values: [ch.five.lo, ch.five.q1, ch.five.med, ch.five.q3, ch.five.hi], out: ch.five.out, edit: false });
    else if (ch.type === 'line') line(box, { labels: ch.labels, values: ch.values.slice(), axis: ch.axis, edit: false });
    else if (ch.type === 'curve') curve(box, Object.assign({}, ch, { edit: false }));
    else bar(box, { cats: ch.cats, values: ch.counts.slice(), step: ch.step, top: ch.top, edit: false, hist: ch.type === 'hist' });
  }
  return { bar, pie, dot, stem, boxPlot, line, curve, show };
})();
