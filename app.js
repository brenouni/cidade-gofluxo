import * as THREE from 'three';
const $ = s => document.querySelector(s);
const data = await (await fetch('data.json', { cache: 'no-store' })).json();
const LS = 'cidade-gofluxo-v3';
const saved = JSON.parse(localStorage.getItem(LS) || '{"respostas":[],"modo":"noite"}');
const setores = data.setores || [];
const edificios = [...setores, ...data.clientes];
const cli = Object.fromEntries(edificios.map(c => [c.id, c]));
const setorIds = new Set(setores.map(s => s.id).concat(['gofluxo']));
const STATUS = { trabalhando: 'Trabalhando', precisa: 'Precisa de você', ocioso: 'Ocioso', erro: 'Erro', aguardando: 'Aguardando frente' };
const atividade = [...saved.respostas.map(r => ({ hora: r.hora, botId: r.botId, texto: r.texto })), ...data.atividade];
for (const r of saved.respostas) { const b = data.bots.find(x => x.id === r.botId); if (b && b.pergunta) { b.status = 'trabalhando'; b.acao = 'Retomando: ' + r.resposta; delete b.pergunta; } }

// ---------- abertura (mascote pousa, depois os textos) ----------
function mascotSVG(size = 200, eyes = { look: 0, blink: false }) {
  const look = eyes.look || 0, blink = eyes.blink ? 0.12 : 1;
  return `<svg viewBox="0 0 100 100" width="${size}" height="${size}" aria-hidden="true" style="overflow:visible;display:block">
    <ellipse cx="50" cy="92" rx="26" ry="5" fill="rgba(0,0,0,.35)"/>
    <circle cx="50" cy="52" r="36" fill="#8b6cff" stroke="rgba(255,255,255,.28)" stroke-width="1.4"/>
    <ellipse cx="38" cy="40" rx="14" ry="10" fill="#fff" opacity=".18"/>
    <line x1="50" y1="18" x2="50" y2="4" stroke="#efeaff" stroke-width="3" stroke-linecap="round"/>
    <circle cx="50" cy="3" r="4.5" fill="#f5d56b"/>
    <g transform="translate(${look},0)">
      <g transform="translate(37,50) scale(1,${blink})">
        <ellipse cx="0" cy="0" rx="7.5" ry="11" fill="#fff"/>
        <circle cx="1" cy="2" r="4.2" fill="#16121f"/>
        <circle cx="2.6" cy=".2" r="1.5" fill="#fff"/>
      </g>
      <g transform="translate(63,50) scale(1,${blink})">
        <ellipse cx="0" cy="0" rx="7.5" ry="11" fill="#fff"/>
        <circle cx="1" cy="2" r="4.2" fill="#16121f"/>
        <circle cx="2.6" cy=".2" r="1.5" fill="#fff"/>
      </g>
    </g>
  </svg>`;
}
let openingDone = false;
function playOpening() {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const preview = /(?:^|[?&])preview=1(?:&|$)/.test(location.search);
  const hero = $('#hero');
  if (!hero || reduced || preview) { finishOpening(true); return; }
  hero.innerHTML = mascotSVG(200, { look: 0 });
  const box = $('#stars');
  if (box && !box.childElementCount) {
    for (let i = 0; i < 40; i++) {
      const s = document.createElement('i'); s.className = 'star';
      s.style.left = Math.random() * 100 + '%'; s.style.top = Math.random() * 100 + '%';
      s.style.animationDelay = (Math.random() * 3) + 's';
      box.appendChild(s);
    }
  }
  requestAnimationFrame(() => { hero.classList.add('fall'); $('#oshadow')?.classList.add('on'); });
  setTimeout(() => {
    hero.classList.remove('fall'); hero.classList.add('land');
    $('#oshock')?.classList.add('go'); $('#odust')?.classList.add('go');
  }, 900);
  setTimeout(() => {
    hero.classList.remove('land'); hero.classList.add('idle');
    hero.innerHTML = mascotSVG(200, { look: 3 });
  }, 1650);
  setTimeout(() => { hero.innerHTML = mascotSVG(200, { look: 3, blink: true }); }, 2000);
  setTimeout(() => {
    hero.innerHTML = mascotSVG(200, { look: 0 });
    $('#openCopy')?.classList.add('show');
  }, 2300);
  setTimeout(() => finishOpening(false), 3400);
}
function finishOpening(instant) {
  if (openingDone) return; openingDone = true;
  $('#opening')?.classList.add('gone');
  document.body.classList.remove('booting');
}
$('#skip')?.addEventListener('click', () => finishOpening(true));
playOpening();

// ---------- cena ----------
const canvas = $('#c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, -100, 200);
const target = new THREE.Vector3(0, 0, 0), camOff = new THREE.Vector3(20, 20, 20);
let zoom = 0.82, viewH = 34;
const hemi = new THREE.HemisphereLight(0xffffff, 0x444466, 0.6); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffffff, 1.2); sun.position.set(15, 25, 8); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 90 }); sun.shadow.bias = -0.0005; scene.add(sun);
const city = new THREE.Group(); scene.add(city); const bgroups = [];
const M = c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85 });
function box(w, h, d, mat, x, y, z, p = city) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; p.add(m); return m; }
const ground = new THREE.Mesh(new THREE.BoxGeometry(52, 1, 48), M('#8fd694')); ground.position.y = -0.5; ground.receiveShadow = true; city.add(ground);
const roadM = M('#4a4e69');
box(52, 0.05, 2.4, roadM, 0, 0.02, 0); box(2.4, 0.05, 48, roadM, 0, 0.02, 0);
const lineM = new THREE.MeshBasicMaterial({ color: '#f2e9e4' });
for (let i = -24; i < 25; i += 2) { box(0.9, 0.06, 0.12, lineM, i, 0.03, 0).castShadow = false; box(0.12, 0.06, 0.9, lineM, 0, 0.03, i).castShadow = false; }
const plazaM = M('#e9e3d5'), plazaSetor = M('#ddd6fe');
const winMats = [];
function windows(g, w, h, d, cor, frente) {
  const dim = frente === 'aguardando';
  const wm = new THREE.MeshStandardMaterial({
    color: dim ? '#1a1c28' : '#2b2d42',
    emissive: dim ? new THREE.Color('#445') : new THREE.Color(cor).lerp(new THREE.Color('#fff2b3'), .6),
    emissiveIntensity: 0
  });
  winMats.push({ m: wm, frente: frente || 'ativa' });
  for (let y = 0.55; y < h - 0.25; y += 0.6)
    for (let x = -w / 2 + 0.4; x < w / 2 - 0.2; x += 0.6) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.28, 0.05), wm); m.position.set(x, y, d / 2 + 0.01); g.add(m);
      const m2 = m.clone(); m2.rotation.y = Math.PI / 2; m2.position.set(w / 2 + 0.01, y, x * d / w); g.add(m2);
    }
}
const sinais = [];
const bLabs = [];
function addBLab(c, y) {
  if (c.grupo !== 'setor' || c.frente !== 'aguardando') return;
  const n = (data.bots || []).filter(b => b.clienteId === c.id && b.naCidade !== false).length;
  if (n < 2) return; // um bot só: o rótulo do próprio bot basta
  const el = document.createElement('div');
  el.className = 'blab dim';
  el.style.setProperty('--c', c.cor);
  el.innerHTML = `<div class="nm">${c.nome}</div><div class="sub">aguardando frente</div>`;
  $('#labels').appendChild(el);
  bLabs.push({ el, cid: c.id, y: y || (c.altura + 1.35) });
}

for (const c of edificios) {
  const g = new THREE.Group(); g.position.set(c.pos[0], 0, c.pos[1]); city.add(g); g.userData.cid = c.id; bgroups.push(g);
  const setor = c.grupo === 'setor';
  const pw = setor ? 5.2 : 8, pd = setor ? 4.6 : 7;
  box(pw, 0.12, pd, setor ? plazaSetor : plazaM, 0, 0.06, 0, g);
  const cor = new THREE.Color(c.cor), base = M(cor.clone().lerp(new THREE.Color('#ffffff'), c.frente === 'aguardando' ? .55 : .45)), acc = M(c.cor);
  if (c.frente === 'aguardando') { base.color.lerp(new THREE.Color('#6b6e7e'), .25); }
  const h = c.altura, fr = c.frente;
  if (c.tipo === 'prefeitura') {
    box(5, h, 3.6, base, 0, h / 2, 0, g); box(5.4, .3, 4, acc, 0, h + .15, 0, g);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(1.2, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), acc); dome.position.y = h + .3; dome.castShadow = true; g.add(dome);
    for (let i = -2; i <= 2; i++) box(.25, h * .8, .25, M('#ffffff'), i * 1.0, h * .4, 2, g);
    windows(g, 5, h, 3.6, c.cor, fr);
  } else if (c.tipo === 'fabrica') {
    box(4.5, h, 3, base, -.3, h / 2, 0, g); for (let i = 0; i < 3; i++) { const r = box(1.5, .6, 3, acc, -1.8 + i * 1.5, h + .3, 0, g); r.rotation.z = .5; }
    const ch = new THREE.Mesh(new THREE.CylinderGeometry(.3, .4, 2.5, 12), M('#6c757d')); ch.position.set(2.3, h + .6, -1); ch.castShadow = true; g.add(ch);
    windows(g, 4.5, h, 3, c.cor, fr);
  } else if (c.tipo === 'clinica') {
    box(4, h, 3.4, base, 0, h / 2, 0, g); box(.4, 1.4, .2, M('#ff4f6d'), 0, h + .9, 0, g); box(1.4, .4, .2, M('#ff4f6d'), 0, h + .9, 0, g);
    windows(g, 4, h, 3.4, c.cor, fr);
  } else if (c.tipo === 'torre') {
    box(3, h, 3, base, 0, h / 2, 0, g); box(2.2, 1.4, 2.2, acc, 0, h + .7, 0, g); box(.1, 1.2, .1, M('#ccc'), 0, h + 2, 0, g);
    windows(g, 3, h, 3, c.cor, fr);
  } else if (c.tipo === 'portao') {
    box(3.2, h, 2.6, base, 0, h / 2, 0, g);
    box(.38, h + .8, .38, acc, -1.55, (h + .8) / 2, 1.45, g);
    box(.38, h + .8, .38, acc, 1.55, (h + .8) / 2, 1.45, g);
    box(3.6, .32, .5, acc, 0, h + .65, 1.45, g);
    const lint = M('#fff'); lint.emissive = new THREE.Color('#34d399'); lint.emissiveIntensity = 0.5;
    box(1.1, .18, .18, lint, 0, h + .95, 1.55, g).castShadow = false;
    windows(g, 3.2, h, 2.6, c.cor, fr);
  } else if (c.tipo === 'lab') {
    box(3.4, h, 2.6, base, 0, h / 2, 0, g);
    box(3.6, .2, 2.8, acc, 0, h + .1, 0, g);
    box(.08, 1.3, .08, M('#c0c4cc'), 1.3, h + .75, 0, g);
    const dish = new THREE.Mesh(new THREE.SphereGeometry(.28, 10, 8, 0, Math.PI * 2, 0, 1.2), M('#e2e8f0')); dish.position.set(1.3, h + 1.45, 0); dish.castShadow = true; g.add(dish);
    windows(g, 3.4, h, 2.6, c.cor, fr);
  } else if (c.tipo === 'studio') {
    box(3.4, h, 2.6, base, 0, h / 2, 0, g);
    const board = M(c.cor); board.emissive = new THREE.Color(c.cor); board.emissiveIntensity = fr === 'aguardando' ? .15 : .55;
    box(2.2, 1.0, .08, board, 0, h + .65, .2, g);
    windows(g, 3.4, h, 2.6, c.cor, fr);
  } else if (c.tipo === 'oficina-bot') {
    box(3.4, h, 2.6, base, 0, h / 2, 0, g);
    box(3.6, .2, 2.8, acc, 0, h + .1, 0, g);
    box(1.8, 1.15, .06, M('#2b2d42'), 0, .65, 1.34, g);
    for (let y = .25; y < 1.15; y += .22) box(1.7, .04, .07, M('#6c757d'), 0, y, 1.36, g);
    windows(g, 3.4, h, 2.6, c.cor, fr);
  } else if (c.tipo === 'setor') {
    box(3.2, h, 2.5, base, 0, h / 2, 0, g);
    box(3.4, .18, 2.7, acc, 0, h + .1, 0, g);
    windows(g, 3.2, h, 2.5, c.cor, fr);
  } else {
    box(5, h, 3.5, base, 0, h / 2, 0, g); box(5.2, .25, 3.7, acc, 0, h + .12, 0, g);
    for (let i = 0; i < 3; i++) { const t = new THREE.Mesh(new THREE.CylinderGeometry(.4, .4, 1, 12), acc); t.position.set(-1.6 + i * 1.1, .5, -2.6); t.castShadow = true; g.add(t); }
    windows(g, 5, h, 3.5, c.cor, fr);
  }
  const sm = new THREE.MeshStandardMaterial({ color: c.cor, emissive: c.cor, emissiveIntensity: c.frente === 'aguardando' ? .2 : .6 }); sinais.push(sm);
  const signZ = (c.tipo === 'prefeitura' ? 1.85 : c.tipo === 'torre' ? 1.55 : (setor ? 1.35 : 1.8)) + .05;
  box(setor ? 2.0 : 2.6, .32, .08, sm, 0, .45, signZ, g).castShadow = false;
  addBLab(c, h + (c.tipo === 'portao' ? 1.6 : 1.15));
}
const trunkM = M('#8d6e63'), leafM = [M('#52b788'), M('#40916c'), M('#74c69d')];
const rnd = (s => () => (s = (s * 16807) % 2147483647) / 2147483647)(7);
function tree(x, z) { box(.2, .6, .2, trunkM, x, .3, z); const l = new THREE.Mesh(new THREE.IcosahedronGeometry(.55 + rnd() * .3, 0), leafM[Math.floor(rnd() * 3)]); l.position.set(x, 1.1, z); l.castShadow = true; city.add(l); }
function occupied(x, z) {
  return edificios.some(c => {
    const r = c.grupo === 'setor' ? 3.2 : 4.5, rz = c.grupo === 'setor' ? 2.8 : 4;
    return Math.abs(x - c.pos[0]) < r && Math.abs(z - c.pos[1]) < rz;
  });
}
for (let i = 0; i < 58; i++) { let x = (rnd() - .5) * 50, z = (rnd() - .5) * 46; if (Math.abs(x) < 2.2 || Math.abs(z) < 2.2) continue; if (occupied(x, z)) continue; tree(x, z); }
const lampLights = [], bulbM = new THREE.MeshStandardMaterial({ color: '#fff', emissive: '#ffd59e', emissiveIntensity: 0 });
for (const [x, z] of [[-5, 1.6], [5, 1.6], [-5, -1.6], [5, -1.6], [1.6, -14], [-1.6, 14], [-15, 1.6], [15, -1.6], [1.6, -7], [-1.6, 7]]) {
  box(.1, 1.6, .1, M('#555'), x, .8, z); box(.25, .2, .25, bulbM, x, 1.7, z);
  const L = new THREE.PointLight('#ffcf8a', 0, 6, 1.5); L.position.set(x, 1.6, z); city.add(L); lampLights.push(L);
}
const cars = []; for (let i = 0; i < 4; i++) { const g = new THREE.Group(); box(1, .4, .55, M(['#ef476f', '#06d6a0', '#118ab2', '#ffd166'][i]), 0, .3, 0, g); box(.55, .3, .5, M('#e0fbfc'), -.05, .6, 0, g); city.add(g); cars.push({ g, axis: i % 2, off: i * 11, dir: i < 2 ? 1 : -1 }); }

// ---------- handoff visível (pacote de exemplo) ----------
const token = new THREE.Mesh(new THREE.BoxGeometry(.55, .16, .42), new THREE.MeshStandardMaterial({ color: '#fff6d5', roughness: .4, emissive: '#f5d56b', emissiveIntensity: .55 }));
token.castShadow = true; token.position.y = 1.15; city.add(token);
const tokenLab = document.createElement('div'); tokenLab.id = 'handoff-lab'; tokenLab.textContent = 'pacote · exemplo';
$('#labels').appendChild(tokenLab);
const HANDOFF = ['curadoria', 'espec', 'qualidade', 'atlas-gofluxo'];
let hFrom = 0, hT = 0;

// ---------- bots ----------
const labels = $('#labels');
const bots = data.bots.filter(b => b.naCidade !== false).map(b => {
  const c = cli[b.clienteId]; const pos = new THREE.Vector3(c.pos[0] + b.offset[0], 0, c.pos[1] + b.offset[1]);
  const g = new THREE.Group(); g.position.copy(pos); city.add(g);
  const dim = b.status === 'aguardando';
  const mat = new THREE.MeshStandardMaterial({ color: b.cor, roughness: .35, emissive: b.cor, emissiveIntensity: dim ? .04 : .15, transparent: dim, opacity: dim ? .8 : 1 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(.42, .45, 6, 16), mat); body.castShadow = true; body.position.y = 1; g.add(body);
  const eyeM = new THREE.MeshBasicMaterial({ color: '#1b1d3a' });
  for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(.07, 8, 8), eyeM); e.position.set(s * .15, .15, .4); body.add(e); }
  const sh = new THREE.Mesh(new THREE.CircleGeometry(.4, 20), new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: .2 })); sh.rotation.x = -Math.PI / 2; sh.position.y = .13; g.add(sh);
  const ring = new THREE.Mesh(new THREE.RingGeometry(.55, .68, 32), new THREE.MeshBasicMaterial({ color: '#ff4f8b', transparent: true, opacity: 0 })); ring.rotation.x = -Math.PI / 2; ring.position.y = .14; g.add(ring);
  const lab = document.createElement('div'); lab.className = 'lab'; lab.style.setProperty('--c', b.cor); labels.appendChild(lab);
  const bub = document.createElement('div'); bub.className = 'bub hidden'; labels.appendChild(bub);
  return { d: b, g, body, ring, lab, bub, ph: rnd() * 6, city: true };
});
function renderBot(o) {
  const b = o.d;
  const wait = b.status === 'aguardando';
  o.lab.className = 'lab' + (b.status === 'erro' ? ' err' : '') + (wait ? ' dim' : '');
  const nCity = data.bots.filter(x => x.clienteId === b.clienteId && x.naCidade !== false).length;
  if (o.city && wait && nCity > 1) o.lab.classList.add('hidden');
  if (wait) o.lab.innerHTML = `<div class="nm">${b.nome}</div>`;
  else o.lab.innerHTML = `<div class="nm">${b.nome}</div><div class="ac">${b.status === 'erro' ? '⚠ ' : ''}${b.acao}</div>`;
  if (b.status === 'precisa' && b.pergunta) {
    o.bub.classList.remove('hidden');
    if (!o.bub.dataset.bound) {
      o.bub.dataset.bound = '1';
      o.bub.onclick = () => o.bub.classList.toggle('open');
      if (b.id === 'qualidade') o.bub.classList.add('open');
    }
    const ex = (b.exemplo || (b.pergunta.texto || '').includes('exemplo')) ? '<div class="ex">DADOS DE EXEMPLO</div>' : '';
    o.bub.innerHTML = `${ex}<div class="t">PRECISA DE VOCÊ · ${b.nome}</div><div class="q">${b.pergunta.texto}</div>` + b.pergunta.opcoes.map((p, i) => `<button data-i="${i}">${p}</button>`).join('');
    o.bub.querySelectorAll('button').forEach(btn => btn.onclick = e => { e.stopPropagation(); responder(o, b.pergunta.opcoes[+btn.dataset.i]); });
  } else o.bub.classList.add('hidden');
  const isSel = selected === o; o.ring.material.opacity = isSel || b.status === 'precisa' || b.status === 'erro' ? .9 : 0;
  o.ring.material.color.set(isSel ? '#ffffff' : b.status === 'erro' ? '#ff3b3b' : '#ff4f8b');
  if (!o.city) o.lab.innerHTML = `<div class="nm">${b.nome}${o.helper || b.exemplo ? ' <small>exemplo</small>' : ''}</div><div><span class="tag"><i class="s-${b.status}"></i>${STATUS[b.status] || b.status}</span></div><div class="ac">${b.acao}</div>`;
}
const hora = () => new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Fortaleza' });
function responder(o, resp) {
  const b = o.d, h = hora(), texto = `Breno respondeu "${resp}" — ${b.pergunta.texto}`;
  saved.respostas.unshift({ botId: b.id, pergunta: b.pergunta.texto, resposta: resp, hora: h, em: new Date().toISOString(), texto }); persist();
  atividade.unshift({ hora: h, botId: b.id, texto });
  b.timeline.push({ hora: h, texto: `Resposta recebida: ${resp}` });
  b.status = 'trabalhando'; b.acao = 'Retomando: ' + resp; delete b.pergunta;
  views.filter(v => v.d === b).forEach(renderBot); refreshUI(); renderPipeline();
}
const persist = () => localStorage.setItem(LS, JSON.stringify(saved));

// ---------- UI ----------
let selected = null; const views = [];
const PIPE = [['Pedido','Ped.'], ['Atlas','Atlas'], ['Especialista','Espec.'], ['Qualidade','Qual.'], ['Breno','Breno'], ['Entrega','Entr.']];
function pipelineIdx() {
  const q = data.bots.find(b => b.id === 'qualidade');
  if (q?.status === 'precisa') return 4;
  if (q?.status === 'trabalhando' && (q.acao || '').toLowerCase().includes('liber')) return 5;
  return 3;
}
function renderPipeline() {
  const el = $('#pipeline'); if (!el) return;
  const idx = pipelineIdx();
  const short = innerWidth < 800;
  el.innerHTML = PIPE.map((n, i) => {
    const cls = i < idx ? 'done' : (i === idx ? 'on' : '');
    const arr = i < PIPE.length - 1 ? '<span class="arr">→</span>' : '';
    return `<span class="p ${cls}"><span class="n">${i + 1}</span> ${short ? n[1] : n[0]}</span>${arr}`;
  }).join('');
}
function groupHtml(title, items, extra = '', fold = false) {
  if (!items.length) return '';
  const rows = items.map(b => `<div class="bi${selected?.d.id === b.id ? ' sel' : ''}" data-id="${b.id}"><span class="av" style="background:${b.cor}"></span>${b.nome}<span class="st s-${b.status}"></span></div>`).join('');
  if (!fold) return `<div class="grp">${title}${extra}</div>` + rows;
  return `<div class="gfold"><button type="button" class="grp fold-toggle" aria-expanded="false">${title} · ${items.length}<span class="chev">▸</span></button><div class="fold hidden">${extra}${rows}</div></div>`;
}
function refreshUI() {
  const n = s => data.bots.filter(b => b.status === s && b.naCidade !== false).length;
  $('#pills').innerHTML = `<span class="pill"><i class="s-trabalhando"></i>${n('trabalhando')} trabalhando</span><span class="pill"><i class="s-precisa"></i>${n('precisa') + n('erro')} precisam de você</span><span class="pill"><i class="s-aguardando"></i>${n('aguardando')} aguardando frente</span><span class="pill"><i class="s-ocioso"></i>${n('ocioso')} ociosos</span>`;
  const internos = id => data.bots.filter(b => b.clienteId === id);
  let html = groupHtml('Centro · Orquestração', internos('gofluxo'));
  for (const s of setores) {
    const items = internos(s.id).filter(b => b.naCidade !== false);
    const tools = internos(s.id).filter(b => b.naCidade === false);
    const tag = s.frente === 'aguardando' ? ' · aguardando' : '';
    const extra = tools.length ? `<div class="tools">no laboratório: ${tools.map(t => t.nome).join(' · ')}</div>` : '';
    html += groupHtml(s.nome + tag, items, extra, s.frente === 'aguardando');
  }
  for (const c of data.clientes.filter(c => c.id !== 'gofluxo')) html += groupHtml(c.nome, internos(c.id));
  $('#botList').innerHTML = html;
  $('#botList').querySelectorAll('.bi').forEach(el => el.onclick = () => selectById(el.dataset.id));
  $('#botList').querySelectorAll('.fold-toggle').forEach(btn => btn.onclick = () => {
    const fold = btn.nextElementSibling;
    const open = fold.classList.toggle('hidden');
    btn.setAttribute('aria-expanded', open ? 'false' : 'true');
    btn.querySelector('.chev').textContent = open ? '▸' : '▾';
  });
  ticker(); renderFeed(); renderPipeline(); if (selected) renderCard();
}
let tickI = 0; function ticker() { if (!atividade.length) return; const a = atividade[tickI % atividade.length]; const b = data.bots.find(x => x.id === a.botId); const ex = a.exemplo || b?.exemplo ? ' · exemplo' : ''; $('#tickTxt').textContent = `${a.hora} · ${b?.nome}: ${a.texto}${ex}`; }
setInterval(() => { tickI++; ticker(); }, 4000);
function renderCard() {
  const b = selected.d, c = cli[b.clienteId], pct = Math.round((b.etapa / Math.max(1, b.totalEtapas)) * 100);
  const ex = b.exemplo ? '<span class="badge" style="margin-left:6px">dados de exemplo</span>' : '';
  $('#card').innerHTML = `<button class="x">✕</button><div class="cl">${c.nome}</div><h3 style="color:${b.cor}">${b.nome}</h3><div style="opacity:.7">${b.papel} ${ex}</div>
  <div style="margin-top:6px"><span class="pill"><i class="s-${b.status}"></i>${STATUS[b.status] || b.status}</span></div>
  <div class="lbl">TAREFA</div><div>${b.tarefa}</div><div style="opacity:.75;margin-top:3px">${b.acao}</div>
  <div class="lbl">Etapa ${b.etapa} de ${b.totalEtapas}</div><div class="bar"><div style="width:${pct}%;background:${b.cor}"></div></div>
  <div class="lbl">LINHA DO TEMPO</div><div class="tl">${(b.timeline || []).map(t => `<div><b>${t.hora}</b>${t.texto}</div>`).join('') || '<div>Sem eventos.</div>'}</div>${mode === 'city' ? `<button class="pillb enter" style="background:${c.cor}">Entrar: ${c.predio} →</button>` : ''}`;
  const en = $('#card').querySelector('.enter'); if (en) en.onclick = () => enter(b.clienteId, b.id);
  $('#card').querySelector('.x').onclick = () => { const p = selected; selected = null; renderBot(p); $('#card').classList.add('hidden'); refreshUI(); };
}
let panTo = null;
function select(o) { const p = selected; selected = o; if (p) renderBot(p); renderBot(o); if (mode === 'inside') zoom = 2.4; $('#card').classList.remove('hidden'); panTo = o.g.getWorldPosition(new THREE.Vector3()).setY(mode === 'inside' ? 1 : 0); $('#side').classList.remove('open'); refreshUI(); }
$('#sideToggle').onclick = () => $('#side').classList.toggle('open');
let tab = 'todos';
function renderFeed() {
  const tabs = [['todos', 'Todos'], ['equipe', 'Equipe'], ...data.clientes.filter(c => c.id !== 'gofluxo').map(c => [c.id, c.nome])];
  $('#tabs').innerHTML = tabs.map(([id, n]) => `<button data-t="${id}" class="${tab === id ? 'on' : ''}">${n}</button>`).join('');
  $('#tabs').querySelectorAll('button').forEach(b => b.onclick = () => { tab = b.dataset.t; renderFeed(); });
  $('#feedList').innerHTML = atividade.filter(a => {
    const b = data.bots.find(x => x.id === a.botId);
    if (tab === 'todos') return true;
    if (tab === 'equipe') return setorIds.has(b?.clienteId);
    return b?.clienteId === tab;
  }).map(a => { const b = data.bots.find(x => x.id === a.botId); const ex = a.exemplo || b?.exemplo ? ' <small>exemplo</small>' : ''; return `<div><span>${a.hora}</span><b style="color:${b?.cor}">${b?.nome}</b> ${a.texto}${ex}</div>`; }).join('') || '<div style="opacity:.6">Sem atividade.</div>';
}
$('#ticker').onclick = () => $('#feed').classList.remove('hidden');
$('#feedClose').onclick = () => $('#feed').classList.add('hidden');

// ---------- iluminação ----------
const MODOS = {
  dia: { bg: '#bde0fe', hemi: ['#ffffff', '#88aa88', .75], sun: ['#fff6e0', 1.5], pos: [15, 25, 8], win: 0, lamp: 0, sign: .4, ground: '#8fd694' },
  entardecer: { bg: '#f4a582', hemi: ['#ffd1a6', '#6b4e71', .55], sun: ['#ff9f5a', 1.1], pos: [25, 9, -5], win: .5, lamp: .6, sign: .9, ground: '#8bbf7a' },
  noite: { bg: '#141634', hemi: ['#6c7bd9', '#1b1d3a', .35], sun: ['#9fb0ff', .45], pos: [-10, 22, 12], win: 1.2, lamp: 2.2, sign: 1.6, ground: '#3f6b55' }
};
const cur = { bg: new THREE.Color(), hs: new THREE.Color(), hg: new THREE.Color(), hi: 0, sc: new THREE.Color(), si: 0, pos: new THREE.Vector3(), win: 0, lamp: 0, sign: 0, gr: new THREE.Color() };
let modo = saved.modo || 'noite', tgt;
function setModo(m, instant) {
  modo = m; saved.modo = m; persist(); const t = MODOS[m];
  tgt = { bg: new THREE.Color(t.bg), hs: new THREE.Color(t.hemi[0]), hg: new THREE.Color(t.hemi[1]), hi: t.hemi[2], sc: new THREE.Color(t.sun[0]), si: t.sun[1], pos: new THREE.Vector3(...t.pos), win: t.win, lamp: t.lamp, sign: t.sign, gr: new THREE.Color(t.ground) };
  if (instant) for (const k in tgt) { if (tgt[k].copy) cur[k].copy(tgt[k]); else cur[k] = tgt[k]; }
  document.querySelectorAll('#tc button').forEach(b => b.classList.toggle('on', b.dataset.m === m));
}
document.querySelectorAll('#tc button').forEach(b => b.onclick = () => setModo(b.dataset.m));
setModo(modo, true);
function applyLight(k) {
  for (const key in tgt) { if (tgt[key].isColor) cur[key].lerp(tgt[key], k); else if (tgt[key].isVector3) cur[key].lerp(tgt[key], k); else cur[key] += (tgt[key] - cur[key]) * k; }
  scene.background = cur.bg; scene.fog = null; hemi.color.copy(cur.hs); hemi.groundColor.copy(cur.hg); hemi.intensity = cur.hi;
  sun.color.copy(cur.sc); sun.intensity = cur.si; sun.position.copy(cur.pos); ground.material.color.copy(cur.gr);
  winMats.forEach(w => { const m = w.m || w; m.emissiveIntensity = (w.frente === 'aguardando') ? cur.win * 0.18 : cur.win; }); lampLights.forEach(l => l.intensity = cur.lamp); bulbM.emissiveIntensity = cur.lamp; sinais.forEach(m => m.emissiveIntensity = cur.sign);
}

// ---------- câmera e toque ----------
function resize() {
  const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false);
  viewH = w / h < 1.3 ? 38 : (h < 500 ? 26 : 30); const a = w / h;
  cam.left = -viewH * a / 2; cam.right = viewH * a / 2; cam.top = viewH / 2; cam.bottom = -viewH / 2; cam.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();
const ptrs = new Map(); let pinch0 = 0, zoom0 = 1, moved = 0;
canvas.addEventListener('pointerdown', e => { canvas.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); moved = 0; if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); zoom0 = zoom; } });
canvas.addEventListener('pointermove', e => {
  const p = ptrs.get(e.pointerId); if (!p) return; const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
  if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; zoom = THREE.MathUtils.clamp(zoom0 * Math.hypot(a.x - b.x, a.y - b.y) / pinch0, .6, 3); return; }
  moved += Math.abs(dx) + Math.abs(dy); panTo = null;
  const s = viewH / innerHeight / zoom; const right = new THREE.Vector3(1, 0, -1).normalize(), fwd = new THREE.Vector3(-1, 0, -1).normalize();
  target.addScaledVector(right, -dx * s).addScaledVector(fwd, dy * s * 1.41);
  const lim = mode === 'city' ? 20 : 8; target.x = THREE.MathUtils.clamp(target.x, -lim, lim); target.z = THREE.MathUtils.clamp(target.z, -lim, lim);
});
const up = e => { ptrs.delete(e.pointerId); if (e.type === 'pointerup' && moved < 6 && ptrs.size === 0) pick(e); };
canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
canvas.addEventListener('wheel', e => { e.preventDefault(); zoom = THREE.MathUtils.clamp(zoom * (e.deltaY < 0 ? 1.1 : .9), .6, 3); }, { passive: false });
const ray = new THREE.Raycaster();
function pick(e) { ray.setFromCamera(new THREE.Vector2(e.clientX / innerWidth * 2 - 1, -e.clientY / innerHeight * 2 + 1), cam); const vs = views.filter(isVisible); const hit = ray.intersectObjects(vs.map(o => o.body), true)[0];
  if (hit) return select(vs.find(o => o.body === hit.object || o.body === hit.object.parent));
  if (mode === 'city') { const bh = ray.intersectObjects(bgroups, true)[0]; if (bh) { let g = bh.object; while (g && !g.userData.cid) g = g.parent; if (g) enter(g.userData.cid); } } }

// ---------- interiores ----------
let mode = 'city'; // 'city' | 'inside'
bots.forEach(o => views.push(o));
const interior = new THREE.Group(); interior.visible = false; scene.add(interior);
const inLight = new THREE.HemisphereLight('#fff4e0', '#d9c4a5', 0); scene.add(inLight);
const UB = new THREE.BoxGeometry(1, 1, 1), matC = {};
const MC = (c, e) => matC[c + (e || '')] ||= new THREE.MeshStandardMaterial({ color: c, roughness: .8, emissive: e ? c : '#000', emissiveIntensity: e ? .9 : 0 });
function ib(p, w, h, d, c, x, y, z, e) { const m = new THREE.Mesh(UB, MC(c, e)); m.scale.set(w, h, d); m.position.set(x, y + h / 2, z); m.castShadow = !e && h > .15; m.receiveShadow = true; p.add(m); return m; }
const cylG = new THREE.CylinderGeometry(.5, .5, 1, 10), icoG = new THREE.IcosahedronGeometry(.5, 0), dodG = new THREE.DodecahedronGeometry(.5, 0);
function plant(p, x, z, s = 1) { const m = new THREE.Mesh(cylG, MC('#c98b5e')); m.scale.set(.35 * s, .35 * s, .35 * s); m.position.set(x, .17 * s, z); p.add(m); const l = new THREE.Mesh(icoG, MC('#5fae6e')); l.scale.setScalar(.6 * s); l.position.set(x, .6 * s, z); l.castShadow = true; p.add(l); }
function desk(p, x, z, r, dark) { const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = r; p.add(g);
  ib(g, 1.3, .06, .65, dark ? '#3a3f58' : '#c9a27a', 0, .72, 0); ib(g, .06, .72, .6, '#8a6a4f', -.6, 0, 0); ib(g, .06, .72, .6, '#8a6a4f', .6, 0, 0);
  ib(g, .55, .36, .04, '#2b2d42', 0, .8, -.22); ib(g, .5, .3, .02, dark ? '#39ff88' : '#9ad1ff', 0, .83, -.195, true);
  ib(g, .5, .08, .5, '#4a4e69', 0, .42, .55); ib(g, .5, .5, .07, '#4a4e69', 0, .45, .8); return g; }
function sofa(p, x, z, r, c = '#e07a5f') { const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = r; p.add(g); ib(g, 1.8, .4, .8, c, 0, 0, 0); ib(g, 1.8, .5, .2, c, 0, .4, -.3); ib(g, .2, .3, .8, c, -.9, .4, 0); ib(g, .2, .3, .8, c, .9, .4, 0); }
function shelf(p, x, z, r) { const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = r; p.add(g); ib(g, 1.6, 2, .35, '#a47551', 0, 0, 0);
  const cs = ['#ef476f', '#118ab2', '#ffd166', '#06d6a0', '#8338ec']; for (let k = 0; k < 3; k++) for (let j = 0; j < 5; j++) ib(g, .2, .4, .3, cs[(j + k) % 5], -.55 + j * .27, .2 + k * .6, .05); }
// layout de salas: até 4 por andar (14 x 11)
const W = 14, D = 11, SL = [[-3.5, -2.75], [3.5, -2.75], [-3.5, 2.75], [3.5, 2.75]];
function room(p, tipo, cx, cz, w, d) {
  const seats = [], walk = [[cx - 1.5, cz + 1], [cx + 1.5, cz + 1], [cx + 1.2, cz - .8], [cx - 1.2, cz - .5]];
  const fl = { codigo: '#2b2d42', zen: '#e8dcc0' }[tipo] || '#d8b48a';
  ib(p, w - .1, .04, d - .1, fl, cx, .1, cz);
  if (tipo === 'mesas') { for (const [dx, dz] of [[-1.6, -1], [0, -1], [1.6, -1], [-1.6, .9], [0, .9], [1.6, .9]]) { desk(p, cx + dx, cz + dz, 0); seats.push([cx + dx, cz + dz + .55]); } plant(p, cx + w / 2 - .5, cz - d / 2 + .5); ib(p, 1.6, 1, .06, '#ffffff', cx - 1, 1, cz - d / 2 + .1); }
  else if (tipo === 'codigo') { for (const dx of [-1.6, 0, 1.6]) { desk(p, cx + dx, cz - .6, 0, true); seats.push([cx + dx, cz - .05]); } for (let k = 0; k < 3; k++) { ib(p, .7, 1.8, .7, '#1b1d3a', cx - 2.4 + k * .9, .1, cz + 1.7); ib(p, .5, .05, .02, '#39ff88', cx - 2.4 + k * .9, 1.2, cz + 2.06, true); } }
  else if (tipo === 'lounge') { sofa(p, cx - .8, cz - 1.2, 0); sofa(p, cx + 1.6, cz + .3, -Math.PI / 2, '#81b29a'); ib(p, 1, .35, .6, '#c9a27a', cx - .8, .1, cz); plant(p, cx - 2.6, cz + 1.6, 1.3); plant(p, cx + 2.6, cz - 1.8); seats.push([cx - .8, cz - .9], [cx + 1.3, cz + .3]);
    ib(p, .5, 1.2, 2.6, '#ffd23f', cx + 2.9, .1, cz + 1.2).rotation.x = .4; /* escorregador */ }
  else if (tipo === 'reuniao') { ib(p, 2.6, .08, 1.2, '#a47551', cx, .72, cz); ib(p, .2, .72, .2, '#8a6a4f', cx, 0, cz); for (const dx of [-.9, 0, .9]) for (const s of [-1, 1]) { ib(p, .45, .45, .45, '#4a4e69', cx + dx, 0, cz + s * .95); seats.push([cx + dx, cz + s * .95]); }
    ib(p, 2.4, 1.3, .06, '#1b1d3a', cx, 1, cz - d / 2 + .12); ib(p, 2.2, 1.1, .02, '#7c5cff', cx, 1.1, cz - d / 2 + .16, true); }
  else if (tipo === 'zen') { ib(p, w - 1.2, .06, d - 1.4, '#efe3c8', cx, .12, cz); for (const [dx, dz, s] of [[-1, -.6, .7], [.8, .4, .5], [1.6, -1, .4]]) { const r = new THREE.Mesh(dodG, MC('#9a9a9a')); r.scale.setScalar(s); r.position.set(cx + dx, .3, cz + dz); r.castShadow = true; p.add(r); }
    ib(p, 1.4, .05, 1, '#7ec8e3', cx - 1.4, .14, cz + 1); plant(p, cx + 2.4, cz + 1.6, 1.6); const t = new THREE.Mesh(icoG, MC('#f4a6c1')); t.scale.setScalar(1.3); t.position.set(cx - 2.3, 1.6, cz - 1.5); t.castShadow = true; p.add(t); ib(p, .2, 1, .2, '#8a6a4f', cx - 2.3, 0, cz - 1.5); seats.push([cx, cz + .9]); }
  else if (tipo === 'biblioteca') { for (const dx of [-2, 0, 2]) shelf(p, cx + dx, cz - d / 2 + .4, 0); desk(p, cx, cz + .6, 0); seats.push([cx, cz + 1.15]); sofa(p, cx - 2, cz + 1.3, Math.PI / 2, '#3d405b'); plant(p, cx + 2.6, cz + 1.8); }
  else { desk(p, cx, cz - .2, 0); seats.push([cx, cz + .35]); shelf(p, cx - 2, cz - d / 2 + .4, 0); sofa(p, cx + 1.8, cz + 1.4, Math.PI, '#3d405b'); plant(p, cx + 2.6, cz - 1.8, 1.3); ib(p, 1.6, .02, 1.1, '#b56576', cx, .12, cz + 1.2); }
  return { seats, walk };
}
const AC = { gofluxo: 'coroa', mega: 'capacete', cote: 'cruz', dimas: 'oculos', valenlub: 'gota', conhecimento: 'oculos', tecnologia: 'oculos', qualidade: 'check', marketing: 'gota', comercial: 'capacete', processos: 'oculos', administracao: 'gota', pessoal: 'coroa', openbot: 'capacete' };
function makeAgent(d, parent, pos, helper, walk) {
  const g = new THREE.Group(); g.position.set(pos[0], .12, pos[1]); parent.add(g);
  const mat = new THREE.MeshStandardMaterial({ color: d.cor, roughness: .35, emissive: d.cor, emissiveIntensity: .15 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(.28, .3, 4, 12), mat); body.position.y = .62; body.castShadow = true; g.add(body);
  for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(.05, 6, 6), MC('#1b1d3a')); e.position.set(s * .1, .1, .26); body.add(e); }
  const a = AC[d.clienteId], am = MC(cli[d.clienteId].cor);
  if (a === 'capacete') { const h = new THREE.Mesh(new THREE.SphereGeometry(.3, 12, 6, 0, 6.3, 0, 1.6), MC('#ffb703')); h.position.y = .25; body.add(h); }
  else if (a === 'coroa') { const h = new THREE.Mesh(new THREE.CylinderGeometry(.18, .16, .14, 6), MC('#ffd23f')); h.position.y = .48; body.add(h); }
  else if (a === 'oculos') { const h = new THREE.Mesh(UB, MC('#1b1d3a')); h.scale.set(.42, .07, .05); h.position.set(0, .12, .28); body.add(h); }
  else if (a === 'check') { const h = new THREE.Mesh(new THREE.SphereGeometry(.12, 10, 8), MC('#34d399')); h.position.y = .48; body.add(h); }
  else { const h = new THREE.Mesh(new THREE.ConeGeometry(.12, .25, 8), am); h.position.y = .52; body.add(h); }
  const ring = new THREE.Mesh(new THREE.RingGeometry(.36, .45, 28), new THREE.MeshBasicMaterial({ color: '#fff', transparent: true, opacity: 0 })); ring.rotation.x = -Math.PI / 2; ring.position.y = .03; g.add(ring);
  const lab = document.createElement('div'); lab.className = 'lab in'; lab.style.setProperty('--c', d.cor); labels.appendChild(lab);
  const bub = document.createElement('div'); bub.className = 'bub hidden'; labels.appendChild(bub);
  const o = { d, g, body, ring, lab, bub, ph: rnd() * 6, helper, walk, wi: 0, floor: parent, home: pos }; views.push(o); renderBot(o); return o;
}
const builds = {}; let curB = null, curF = 0, floorAnim = false, tags = [];
function buildInterior(cid) {
  const c = cli[cid], floors = [];
  c.andares.forEach((an, fi) => {
    const f = new THREE.Group(); f.visible = false; interior.add(f);
    ib(f, W + .4, .2, D + .4, '#e9dcc6', 0, -.1, 0); // laje
    ib(f, .25, 2.6, D + .4, '#f3ead8', -W / 2 - .1, 0, 0); ib(f, W + .4, 2.6, .25, '#f3ead8', 0, 0, -D / 2 - .1); // paredes do fundo
    ib(f, W + .4, .12, .3, c.cor, 0, 2.6, -D / 2 - .1); ib(f, .3, .12, D + .4, c.cor, -W / 2 - .1, 2.6, 0);
    for (let k = -1; k < 2; k += 2) ib(f, .9, 1.3, .05, '#bde0fe', k * 3.5, 1, -D / 2 + .03, true); // janelas
    const n = an.salas.length, rects = n === 4 ? SL.map(s => [...s, 7, 5.5]) : n === 3 ? [[-3.5, -2.75, 7, 5.5], [3.5, -2.75, 7, 5.5], [0, 2.75, 14, 5.5]] : [[-3.5, 0, 7, 11], [3.5, 0, 7, 11]];
    ib(f, .12, .9, 4, '#f3ead8', 0, 0, -3.5); ib(f, .12, .9, n === 4 ? 4 : .1, '#f3ead8', 0, 0, 3.5); ib(f, 4.5, .9, .12, '#f3ead8', -4.75, 0, 0); ib(f, 4.5, .9, .12, '#f3ead8', 4.75, 0, 0);
    const spots = an.salas.map((s, i) => { const r = rects[i]; const sp = room(f, s.tipo, r[0], r[1], r[2], r[3]); tags.push({ el: mkTag(s.nome), f, p: new THREE.Vector3(r[0] - r[2] / 2 + 1.1, .2, r[1] + r[3] / 2 - .35) }); return sp; });
    an.agentes.forEach(a => { const b = data.bots.find(x => x.id === a.botId); const sp = spots[a.sala]; makeAgent(b, f, sp.seats.shift() || sp.walk[0], false); });
    an.ajudantes.forEach((h, k) => { const sp = spots[h.sala]; const d = { id: `${cid}-a${fi}-${k}`, nome: h.nome, clienteId: cid, cor: new THREE.Color(c.cor).offsetHSL(.04 * (k + 1), -.1, .12).getStyle(), papel: 'Ajudante (exemplo)', status: 'trabalhando', acao: h.acao, tarefa: h.acao.replace(/\.\.\.$/, ''), etapa: 1 + k % 2, totalEtapas: 3, timeline: [{ hora: '10:00', texto: 'Ajudante de exemplo iniciado' }] };
      makeAgent(d, f, h.anda ? sp.walk[0] : (sp.seats.shift() || sp.walk[1]), true, h.anda ? sp.walk : null); });
    floors.push(f);
  });
  return floors;
}
function mkTag(t) { const e = document.createElement('div'); e.className = 'roomtag'; e.textContent = t; labels.appendChild(e); return e; }
const isVisible = o => o.city ? mode === 'city' : (mode === 'inside' && !floorAnim && o.floor === builds[curB]?.[curF]);
// transições
const anims = []; const ease = t => 1 - Math.pow(1 - t, 3);
function anim(ms, fn, done) { anims.push({ t0: performance.now(), ms, fn, done }); }
let busy = false;
function enter(cid, focusId) {
  if (busy || mode === 'inside') return; busy = true; const c = cli[cid];
  panTo = new THREE.Vector3(c.pos[0], 0, c.pos[1]); zoom = 3.2;
  setTimeout(() => {
    if (!builds[cid]) builds[cid] = buildInterior(cid);
    mode = 'inside'; curB = cid; city.visible = false; interior.visible = true;
    let fi = 0; if (focusId) fi = Math.max(0, c.andares.findIndex(a => a.agentes.some(x => x.botId === focusId)));
    builds[cid].forEach((f, i) => { f.visible = i === fi; f.position.y = 0; }); curF = fi;
    target.set(0, 0, 0); panTo = null; cam.zoom = .5; zoom = innerHeight < 500 ? 1.55 : 1.45;
    document.body.classList.add('inside'); renderElev(); refreshUI(); busy = false;
    if (focusId) { const v = views.find(o => !o.city && o.d.id === focusId); if (v) setTimeout(() => select(v), 500); }
  }, 650);
}
function leave() {
  if (busy || mode !== 'inside') return; busy = true; zoom = .45; const c = cli[curB];
  setTimeout(() => { mode = 'city'; city.visible = true; interior.visible = false; document.body.classList.remove('inside');
    if (selected && !selected.city) { const p = selected; selected = null; renderBot(p); $('#card').classList.add('hidden'); }
    target.set(c.pos[0], 0, c.pos[1]); cam.zoom = 3; zoom = 1; panTo = new THREE.Vector3(0, 0, 0); refreshUI(); busy = false; }, 450);
}
function goFloor(n) {
  const fl = builds[curB]; if (n < 0 || n >= fl.length || n === curF || floorAnim) return;
  const old = fl[curF], nf = fl[n], dir = n > curF ? 1 : -1; floorAnim = true; curF = n; nf.visible = true; renderElev();
  if (selected && !selected.city) { const p = selected; selected = null; renderBot(p); $('#card').classList.add('hidden'); }
  anim(700, t => { const e = ease(t); old.position.y = -dir * 9 * e; nf.position.y = dir * 9 * (1 - e); }, () => { old.visible = false; old.position.y = 0; floorAnim = false; });
  target.set(0, 0, 0); zoom = innerHeight < 500 ? 1.55 : 1.45;
}
function renderElev() {
  const c = cli[curB]; $('#bname').textContent = c.predio; $('#bname').style.color = c.cor;
  $('#elevF').innerHTML = c.andares.map((a, i) => `<button data-f="${i}" class="${i === curF ? 'on' : ''}" title="${a.nome}">${i + 1}</button>`).reverse().join('');
  $('#elevF').querySelectorAll('button').forEach(b => b.onclick = () => goFloor(+b.dataset.f));
  $('#fname').textContent = `${curF + 1}º andar · ${c.andares[curF].nome}`;
}
$('#up').onclick = () => goFloor(curF + 1); $('#down').onclick = () => goFloor(curF - 1); $('#back').onclick = leave;
function selectById(id) {
  const v = views.find(o => isVisible(o) && o.d.id === id);
  if (v) return select(v);
  const b = data.bots.find(x => x.id === id);
  if (mode === 'inside') { if (b.clienteId === curB) { const f = cli[curB].andares.findIndex(a => a.agentes.some(x => x.botId === id)); goFloor(f); setTimeout(() => selectById(id), 800); } else { leave(); setTimeout(() => selectById(id), 600); } return; }
  select(bots.find(o => o.d.id === id));
}
window.__app = { enter, leave, goFloor, selectById };

// ---------- loop ----------
const v = new THREE.Vector3(), ln = $('#ln'); let last = performance.now();
bots.forEach(renderBot); refreshUI();
function proj(p) { v.copy(p).project(cam); return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight]; }
const wp = new THREE.Vector3();
renderer.setAnimationLoop(t => {
  const dt = Math.min((t - last) / 1000, .05); last = t;
  applyLight(1 - Math.pow(.02, dt)); inLight.intensity += ((mode === 'inside' ? 1.1 : 0) - inLight.intensity) * Math.min(1, dt * 4);
  for (let i = anims.length - 1; i >= 0; i--) { const a = anims[i], k = Math.min(1, (t - a.t0) / a.ms); a.fn(k); if (k >= 1) { anims.splice(i, 1); a.done && a.done(); } }
  if (panTo) { target.lerp(panTo, 1 - Math.pow(.01, dt)); if (target.distanceTo(panTo) < .02) panTo = null; }
  cam.zoom += (zoom - cam.zoom) * Math.min(1, dt * 6); cam.updateProjectionMatrix();
  cam.position.copy(target).add(camOff); cam.lookAt(target);
  const s = t / 1000;
  if (mode === 'city') cars.forEach(c => { const p = ((s * 3 * c.dir + c.off) % 52 + 52) % 52 - 26; if (c.axis) { c.g.position.set(c.dir > 0 ? .6 : -.6, 0, p); c.g.rotation.y = Math.PI / 2; } else { c.g.position.set(p, 0, c.dir > 0 ? .6 : -.6); c.g.rotation.y = 0; } });
  for (const o of views) {
    const vis = isVisible(o); if (o._v !== vis) { o._v = vis; o.lab.style.display = vis ? '' : 'none'; o.bub.style.display = vis ? '' : 'none'; }
    if (!vis) continue;
    const st = o.d.status, base = o.city ? 1 : .62;
    if (o.walk) { const tg = o.walk[o.wi % o.walk.length]; const dx = tg[0] - o.g.position.x, dz = tg[1] - o.g.position.z, L = Math.hypot(dx, dz);
      if (L < .05) o.wi++; else { const sp = Math.min(L, dt * 1.1); o.g.position.x += dx / L * sp; o.g.position.z += dz / L * sp; o.body.rotation.y = Math.atan2(dx, dz); }
      o.body.position.y = base + Math.abs(Math.sin(s * 8 + o.ph)) * .06;
    } else o.body.position.y = base + Math.sin(s * (st === 'trabalhando' ? (o.city ? 3 : 14) : (st === 'aguardando' ? 0.7 : 1.6)) + o.ph) * (o.city ? (st === 'erro' ? .04 : st === 'aguardando' ? .03 : .12) : .025);
    if (!o.city && !o.walk) o.body.rotation.y = Math.PI;
    o.body.rotation.z = st === 'erro' ? Math.sin(s * 14) * .06 : 0; o.ring.scale.setScalar(1 + Math.sin(s * 4) * .08);
    o.g.getWorldPosition(wp); const [x, y] = proj(wp.setY(wp.y + o.body.position.y + (o.city ? .9 : .5)));
    o.lab.style.left = x + 'px'; o.lab.style.top = y + 'px';
    if (!o.bub.classList.contains('hidden')) { o.bub.style.left = x + 'px'; o.bub.style.top = (y - (o.city ? 38 : 48)) + 'px'; }
  }
  for (const tg of tags) { const vis = mode === 'inside' && !floorAnim && tg.f === builds[curB]?.[curF]; if (tg._v !== vis) { tg._v = vis; tg.el.style.display = vis ? '' : 'none'; } if (vis) { const [x, y] = proj(wp.copy(tg.p)); tg.el.style.left = x + 'px'; tg.el.style.top = y + 'px'; } }
  if (selected && isVisible(selected)) { const [x, y] = proj(selected.g.getWorldPosition(wp).setY(wp.y + .6)); const r = $('#card').getBoundingClientRect(); ln.setAttribute('x1', r.right); ln.setAttribute('y1', r.top + 20); ln.setAttribute('x2', x); ln.setAttribute('y2', y); ln.style.opacity = .8; ln.style.stroke = selected.d.cor; } else ln.style.opacity = 0;
  // handoff token
  if (mode === 'city' && openingDone) {
    const A = bots.find(o => o.d.id === HANDOFF[hFrom % HANDOFF.length]);
    const B = bots.find(o => o.d.id === HANDOFF[(hFrom + 1) % HANDOFF.length]);
    if (A && B) {
      hT += dt * 0.28;
      if (hT >= 1) { hT = 0; hFrom++; }
      const t = hT * hT * (3 - 2 * hT);
      token.position.lerpVectors(A.g.position, B.g.position, t);
      token.position.y = 1.45 + Math.sin(t * Math.PI) * 1.05;
      token.rotation.y = s * 2;
      token.visible = true; tokenLab.style.display = 'block';
      const [tx, ty] = proj(wp.copy(token.position).setY(token.position.y + .25));
      tokenLab.style.left = tx + 'px'; tokenLab.style.top = ty + 'px';
    }
  } else { token.visible = false; tokenLab.style.display = 'none'; }
  for (const bl of bLabs) {
    const vis = mode === 'city';
    if (bl._v !== vis) { bl._v = vis; bl.el.style.display = vis ? '' : 'none'; }
    if (vis) {
      const c = cli[bl.cid];
      const [x, y] = proj(wp.set(c.pos[0], bl.y, c.pos[1]));
      bl.el.style.left = x + 'px'; bl.el.style.top = y + 'px';
    }
  }
  renderer.render(scene, cam);
});
window.__ready = true;

