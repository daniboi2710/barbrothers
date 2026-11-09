// Bar Brother shared drawing kit: the "Brother" stick figure and the bar.
// All poses use one coordinate system: bar at y=300, floor at y=1180, canvas width 1080.
const NS = 'http://www.w3.org/2000/svg';
const CHALK = '#F4F0E6', TAPE = '#FFD21F', BOARD = '#15191B';

const HANDS = { lH: [400, 300], rH: [680, 300] };
const POSES = {
  stand_smug:  { head:[540,600], neck:[540,682], hip:[540,905], lE:[420,800], lH:[492,892], rE:[660,800], rH:[588,892], lK:[495,1040], lF:[470,1180], rK:[585,1040], rF:[610,1180], mood:'smug' },
  look_up:     { head:[540,590], neck:[540,682], hip:[540,905], lE:[490,800], lH:[480,915], rE:[590,800], rH:[600,915], lK:[510,1040], lF:[495,1180], rK:[570,1040], rF:[585,1180], mood:'worried' },
  crouch:      { head:[540,690], neck:[540,772], hip:[540,985], lE:[450,860], lH:[430,960], rE:[630,860], rH:[650,960], lK:[440,1060], lF:[480,1180], rK:[640,1060], rF:[600,1180], mood:'angry' },
  jump:        { head:[540,500], neck:[540,582], hip:[540,805], lE:[468,470], lH:[402,345], rE:[612,470], rH:[678,345], lK:[505,940], lF:[480,1060], rK:[575,940], rF:[600,1060], mood:'angry' },
  hang:        { head:[540,462], neck:[540,545], hip:[540,770], lE:[462,432], ...HANDS, rE:[618,432], lK:[520,905], lF:[520,1040], rK:[560,905], rF:[560,1040], mood:'strain' },
  hang_2cm:    { head:[540,438], neck:[540,520], hip:[540,745], lE:[446,420], ...HANDS, rE:[634,420], lK:[500,860], lF:[470,985], rK:[580,870], rF:[625,985], mood:'strain' },
  hang_kick:   { head:[540,442], neck:[540,525], hip:[540,750], lE:[448,424], ...HANDS, rE:[632,424], lK:[470,850], lF:[430,960], rK:[610,880], rF:[660,1010], mood:'strain' },
  sit_gassed:  { head:[565,812], neck:[535,895], hip:[540,1125], lE:[430,1000], lH:[385,1115], rE:[650,1000], rH:[705,1115], lK:[395,1100], lF:[270,1160], rK:[685,1100], rF:[810,1160], mood:'gassed' },
  stand_ready: { head:[540,600], neck:[540,682], hip:[540,905], lE:[440,760], lH:[452,650], rE:[640,760], rH:[628,650], lK:[495,1040], lF:[470,1180], rK:[585,1040], rF:[610,1180], mood:'determined' },
  top:         { head:[540,232], neck:[540,318], hip:[540,543], lE:[318,410], ...HANDS, rE:[762,410], lK:[520,680], lF:[520,815], rK:[560,680], rF:[560,815], mood:'strain' },
  top_happy:   { head:[540,232], neck:[540,318], hip:[540,543], lE:[318,410], ...HANDS, rE:[762,410], lK:[500,680], lF:[470,800], rK:[580,680], rF:[610,800], mood:'happy' },
};

function el(name, attrs, parent) {
  const n = document.createElementNS(NS, name);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(n);
  return n;
}

function defs(svg) {
  const d = el('defs', {}, svg);
  const f = el('filter', { id:'chalk', x:'-10%', y:'-10%', width:'120%', height:'120%' }, d);
  el('feTurbulence', { type:'fractalNoise', baseFrequency:'0.09', numOctaves:'2', seed:'7', result:'n' }, f);
  el('feDisplacementMap', { in:'SourceGraphic', in2:'n', scale:'7' }, f);
  const g = el('linearGradient', { id:'steel', x1:0, y1:0, x2:0, y2:1 }, d);
  [['0','#EDEFEF'],['.35','#AEB5B8'],['.7','#6C7478'],['1','#3F464A']].forEach(([o,c]) =>
    el('stop', { offset:o, 'stop-color':c }, g));
}

function drawBar(svg, y) {
  const g = el('g', {}, svg);
  el('rect', { x:-20, y:y-17, width:1120, height:34, rx:17, fill:'url(#steel)' }, g);
  [[400,74],[680,74]].forEach(([x,w]) =>
    el('rect', { x:x-w/2, y:y-17, width:w, height:34, fill:CHALK, opacity:.42, filter:'url(#chalk)' }, g));
  return g;
}

function line(p, a, b, extra) {
  el('line', { x1:a[0], y1:a[1], x2:b[0], y2:b[1], stroke:CHALK, 'stroke-width':26, 'stroke-linecap':'round', ...extra }, p);
}

function drawFace(g, hx, hy, mood) {
  const dark = { stroke:CHALK, 'stroke-width':8, 'stroke-linecap':'round', fill:'none' };
  const eye = (x, y) => el('circle', { cx:x, cy:y, r:8, fill:CHALK }, g);
  const L = hx-22, R = hx+22, Y = hy-2;
  if (mood === 'gassed') {
    [L, R].forEach(x => {
      el('path', { d:`M${x-13} ${Y} H${x+13}`, ...dark }, g);
      el('path', { d:`M${x-9} ${Y+1} A9 9 0 0 0 ${x+9} ${Y+1} Z`, fill:CHALK }, g);
    });
    el('path', { d:`M${hx-22} ${hy+28} Q${hx} ${hy+22} ${hx+22} ${hy+28}`, ...dark }, g);
    el('path', { d:`M${hx-4} ${hy+27} v14 a10 10 0 0 0 20 0 v-14 Z`, fill:TAPE }, g);
    return;
  }
  eye(L, Y); eye(R, Y);
  const brows = {
    angry:      `M${L-15} ${Y-24} L${L+13} ${Y-12} M${R+15} ${Y-24} L${R-13} ${Y-12}`,
    determined: `M${L-15} ${Y-22} L${L+13} ${Y-15} M${R+15} ${Y-22} L${R-13} ${Y-15}`,
    worried:    `M${L-13} ${Y-13} L${L+13} ${Y-24} M${R+13} ${Y-13} L${R-13} ${Y-24}`,
    smug:       `M${R-13} ${Y-24} L${R+15} ${Y-24}`,
  }[mood];
  if (brows) el('path', { d:brows, ...dark }, g);
  const m = {
    smug:       `M${hx-18} ${hy+32} Q${hx+8} ${hy+38} ${hx+26} ${hy+20}`,
    worried:    `M${hx-22} ${hy+36} q11 -13 22 0 t22 0`,
    angry:      `M${hx-20} ${hy+38} Q${hx} ${hy+22} ${hx+20} ${hy+38}`,
    determined: `M${hx-18} ${hy+32} H${hx+18}`,
    happy:      `M${hx-26} ${hy+20} Q${hx} ${hy+56} ${hx+26} ${hy+20} Z`,
  }[mood];
  if (m) el('path', { d:m, ...dark }, g);
  if (mood === 'strain') {
    el('rect', { x:hx-24, y:hy+22, width:48, height:20, rx:5, ...dark }, g);
    for (let i = -8; i <= 8; i += 16)
      el('line', { x1:hx+i, y1:hy+22, x2:hx+i, y2:hy+42, ...dark, 'stroke-width':5 }, g);
  }
}

function drawFigure(parent, p) {
  parent.textContent = '';
  const body = el('g', { filter:'url(#chalk)' }, parent);
  line(body, p.neck, p.lE); line(body, p.lE, p.lH);
  line(body, p.neck, p.rE); line(body, p.rE, p.rH);
  line(body, p.neck, p.hip);
  line(body, p.hip, p.lK); line(body, p.lK, p.lF);
  line(body, p.hip, p.rK); line(body, p.rK, p.rF);
  line(body, p.neck, p.head);
  const [hx, hy] = p.head, R = 62;
  el('circle', { cx:hx, cy:hy, r:R, fill:BOARD, stroke:CHALK, 'stroke-width':14 }, body);
  // Signature yellow headband, knot and tail on the left.
  el('path', { d:`M${hx-60} ${hy-27} Q${hx} ${hy-40} ${hx+60} ${hy-27}`, stroke:TAPE, 'stroke-width':17, fill:'none', 'stroke-linecap':'round' }, parent);
  el('path', { d:`M${hx-62} ${hy-27} q-30 8 -44 36 M${hx-62} ${hy-27} q-36 -6 -56 12`, stroke:TAPE, 'stroke-width':10, fill:'none', 'stroke-linecap':'round' }, parent);
  drawFace(parent, hx, hy, p.mood);
}

function lerpPose(a, b, k) {
  const out = { mood: k < .5 ? a.mood : b.mood };
  for (const key in a) if (Array.isArray(a[key]))
    out[key] = [a[key][0]+(b[key][0]-a[key][0])*k, a[key][1]+(b[key][1]-a[key][1])*k];
  return out;
}

function assertFits(selector) {
  const bad = [];
  document.querySelectorAll(selector).forEach(n => {
    if (n.scrollWidth > n.clientWidth + 1 || n.scrollHeight > n.clientHeight + 1) bad.push(n.className + ': ' + n.textContent.slice(0, 40));
  });
  return bad;
}
