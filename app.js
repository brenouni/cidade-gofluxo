const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

const STATUS = {
  trabalhando: 'Trabalhando',
  aprovacao: 'Aprovação',
  aguardando_frente: 'Aguardando frente',
  disponivel: 'Disponível',
  urgente: 'Urgente',
  concluido: 'Concluído'
};
const STATUS_MAP = {
  trabalhando: 'Trabalhando',
  aprovacao: 'Aprovação',
  aguardando_frente: 'Aguardando',
  disponivel: 'Disponível',
  urgente: 'Urgente',
  concluido: 'Concluído'
};

const AREAS = {
  diretoria: 'dir', conhecimento: 'con', qualidade: 'qlt', pessoal: 'pes',
  tecnologia: 'tec', marketing: 'mkt', comercial: 'com',
  clientes: 'cli', administracao: 'adm', openbot: 'opb', reuniao: 'reu'
};

let data = null;
let filtro = 'todos';
let busca = '';
let selecionado = null;
let zoom = 1;
let openingDone = false;

const fuso = () => data?.meta?.fuso || 'America/Fortaleza';
const rotuloEx = () => data?.meta?.rotuloExemplo || 'dados de exemplo';

const ATLAS_COR = '#1084FE';

function roboSVG(color = ATLAS_COR, { size = 80, look = 0, blink = false } = {}) {
  const by = blink ? 0.1 : 1;
  const lx = look * 4;
  return `<svg class="robo" viewBox="0 0 80 80" width="${size}" height="${size}" aria-hidden="true">
    <circle cx="40" cy="40" r="38" fill="${color}"/>
    <ellipse cx="30" cy="26" rx="16" ry="11" fill="#fff" opacity="0.13"/>
    <g transform="translate(51, 28) rotate(-32) translate(${lx},0)">
      <g class="eyes-look">
        <g class="eyes-blink" transform="scale(1 ${by})">
          <ellipse cx="-7.5" cy="0" rx="5.7" ry="9.6" fill="#fff"/>
          <ellipse cx="7.5" cy="0" rx="5.7" ry="9.6" fill="#fff"/>
        </g>
      </g>
    </g>
  </svg>`;
}

function roboWrap(a, size) {
  const dark = (a.corId === 'black' || a.cor === '#000' || a.cor === '#000000') ? ' dark' : '';
  return `<span class="robo-wrap${dark}" style="--c:${a.cor}">${roboSVG(a.cor, { size })}<i class="dot"></i></span>`;
}

function playOpening() {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const preview = /(?:^|[?&])preview=1(?:&|$)/.test(location.search);
  const hero = $('#hero');
  if (!hero || reduced || preview) { finishOpening(); return; }
  hero.innerHTML = roboSVG(ATLAS_COR, { size: 180, look: 0 });
  const box = $('#stars');
  if (box && !box.childElementCount) {
    for (let i = 0; i < 36; i++) {
      const s = document.createElement('i'); s.className = 'star';
      s.style.left = Math.random() * 100 + '%'; s.style.top = Math.random() * 100 + '%';
      s.style.animationDelay = (Math.random() * 3) + 's';
      box.appendChild(s);
    }
  }
  requestAnimationFrame(() => { hero.classList.add('fall'); $('#oshadow')?.classList.add('on'); });
  setTimeout(() => { hero.classList.remove('fall'); hero.classList.add('land'); $('#oshock')?.classList.add('go'); $('#odust')?.classList.add('go'); }, 900);
  setTimeout(() => { hero.classList.remove('land'); hero.classList.add('idle'); hero.innerHTML = roboSVG(ATLAS_COR, { size: 180, look: 1 }); }, 1650);
  setTimeout(() => { hero.innerHTML = roboSVG(ATLAS_COR, { size: 180, look: 1, blink: true }); }, 2000);
  setTimeout(() => { hero.innerHTML = roboSVG(ATLAS_COR, { size: 180, look: 0 }); $('#openCopy')?.classList.add('show'); }, 2300);
  setTimeout(() => finishOpening(), 3400);
}
function finishOpening() {
  if (openingDone) return; openingDone = true;
  $('#opening')?.classList.add('gone');
}
$('#skip')?.addEventListener('click', finishOpening);

function agentesDo(setorId, zona) {
  return data.agentes.filter(a => a.setorId === setorId && (zona ? a.zona === zona : !a.zona));
}
function setorBy(id) { return data.setores.find(s => s.id === id); }
function agenteBy(id) { return data.agentes.find(a => a.id === id); }

function visivel(a) {
  if (filtro === 'precisa') return a.status === 'aprovacao' || a.status === 'urgente';
  if (filtro !== 'todos' && a.setorId !== filtro) return false;
  if (busca) {
    const q = busca.toLowerCase();
    const s = setorBy(a.setorId);
    return [a.nome, a.curto, a.papel, s?.nome, s?.sala].some(x => (x || '').toLowerCase().includes(q));
  }
  return true;
}

function kpis() {
  const A = data.agentes;
  const concluidos = (data.eventos || []).filter(e => e.tipo === 'entrega').length;
  return [
    { n: A.length, l: 'Integrantes' },
    { n: A.filter(a => a.status === 'trabalhando').length, l: 'Em atividade' },
    { n: A.filter(a => a.status === 'aguardando_frente').length, l: 'Aguardando frente' },
    { n: A.filter(a => a.status === 'aprovacao').length, l: 'Aguardando aprovação', warn: true },
    { n: A.filter(a => a.status === 'urgente').length, l: 'Urgente', warn: true },
    { n: concluidos, l: 'Concluídos hoje', ok: true }
  ];
}

function renderKpis() {
  $('#kpis').innerHTML = kpis().map(k => {
    const cls = k.warn && k.n ? ' warn' : k.ok && k.n ? ' ok' : k.n === 0 ? ' dim' : '';
    return `<div class="kpi${cls}"><b>${k.n}</b><span>${k.l}</span></div>`;
  }).join('');
}

function renderFilters() {
  const chips = [{ id: 'todos', nome: 'Todos' }, { id: 'precisa', nome: 'Precisa de você' }, ...data.setores.filter(s => !s.semAgentes)];
  $('#filters').innerHTML = chips.map(s =>
    `<button type="button" data-f="${s.id}" class="${filtro === s.id ? 'on' : ''}">${s.nome}</button>`
  ).join('');
  $$('#filters button').forEach(b => b.onclick = () => { filtro = b.dataset.f; renderAll(); });
}

function renderPrecisa() {
  const pend = data.agentes.filter(a => a.aguardandoBreno);
  const el = $('#precisa');
  if (!pend.length) { el.classList.add('hidden'); el.innerHTML = ''; return; }
  el.classList.remove('hidden');
  const a = pend[0];
  const mais = pend.length > 1 ? ` e mais ${pend.length - 1}` : '';
  el.innerHTML = `<strong>Precisa de você</strong><span>${a.nome}: ${a.aguardandoBreno.titulo} <em style="opacity:.6">· ${rotuloEx()}</em>${mais}</span><button type="button">Ver</button>`;
  el.querySelector('button').onclick = () => abrirAgente(a.id);
}

function avatar(a, mini = false, i = 0) {
  const vis = visivel(a);
  const on = selecionado === a.id;
  const cls = `agent s-${a.status}${mini ? ' mini' : ''}${on ? ' on' : ''}${!vis ? ' hidden' : ''}`;
  return `<button type="button" class="${cls}" data-id="${a.id}" style="--c:${a.cor};--i:${i}" title="${a.nome} · ${STATUS[a.status]}">
    ${roboWrap(a, mini ? 36 : 48)}
    <span class="nm">${a.curto}</span>
    <span class="pill ${a.status}">${STATUS_MAP[a.status]}</span>
  </button>`;
}

function renderFloor() {
  const floor = $('#floor');
  floor.innerHTML = data.setores.map(s => {
    const ativa = s.frente === 'ativa';
    const cls = `room${ativa ? ' ativa' : s.semAgentes ? '' : ' espera'}${s.portao ? ' portao' : ''}`;
    const area = AREAS[s.id] || s.id;
    if (s.semAgentes) {
      return `<article class="${cls}" style="--c:${s.cor};grid-area:${area}" data-setor="${s.id}">
        <div class="room-h"><h3>${s.nome}</h3><span class="sala">${s.sala}</span></div>
        <div class="livre"><div class="table" aria-hidden="true"></div><em>Livre</em></div>
      </article>`;
    }
    if (s.zonaExtra) {
      const lead = agentesDo(s.id).map((a, i) => avatar(a, false, i)).join('');
      const lab = agentesDo(s.id, s.zonaExtra.id).map((a, i) => avatar(a, true, i)).join('');
      return `<article class="${cls}" style="--c:${s.cor};grid-area:${area}" data-setor="${s.id}">
        <div class="room-h"><h3>${s.nome}</h3><span class="sala">${s.sala}</span></div>
        <div class="tec-body">
          <div class="lead">${lead}</div>
          <div class="zona"><h4>${s.zonaExtra.nome}</h4><div class="agents">${lab}</div></div>
        </div>
      </article>`;
    }
    const people = agentesDo(s.id).map((a, i) => avatar(a, false, i)).join('');
    return `<article class="${cls}" style="--c:${s.cor};grid-area:${area}" data-setor="${s.id}">
      <div class="room-h"><h3>${s.nome}</h3><span class="sala">${s.sala}</span></div>
      <div class="agents">${people}</div>
    </article>`;
  }).join('');
  $$('.agent', floor).forEach(b => b.onclick = () => abrirAgente(b.dataset.id));
  aplicarDestaque();
}

function renderLista() {
  const el = $('#lista');
  el.innerHTML = data.setores.filter(s => !s.semAgentes).map(s => {
    const ags = data.agentes.filter(a => a.setorId === s.id && visivel(a));
    if (!ags.length) return '';
    const espera = ags.length && ags.every(a => a.status === 'aguardando_frente');
    return `<div class="sg">${s.nome}${espera ? ' · aguardando' : s.frente === 'ativa' ? ' · frente ativa' : ''}</div>` +
      ags.map((a, i) => `<button type="button" class="row s-${a.status}" data-id="${a.id}" style="--i:${i}">
        ${roboWrap(a, 40)}
        <span class="meta"><span class="nm">${a.nome}</span><div class="agora">${STATUS[a.status]} · ${a.agora}</div></span>
        <span class="pill ${a.status}">${STATUS_MAP[a.status]}</span>
      </button>`).join('');
  }).join('') || '<p class="sala" style="padding:16px">Nenhum agente neste filtro.</p>';
  $$('#lista .row').forEach(b => b.onclick = () => abrirAgente(b.dataset.id));
}

function renderOffice() {
  const e = data.escritorio;
  const ativas = (e.frentesAtivas || []).map(id => setorBy(id)?.nome).filter(Boolean);
  const quando = formatarQuando(data.meta.atualizadoEm);
  $('#officeCard').innerHTML = `<header class="ch"><h2>Status do escritório</h2><span class="sim sm">${rotuloEx()}</span></header>
    <p>${e.frase}</p>
    <div class="tags">${ativas.map(n => `<i>${n}</i>`).join('')}</div>
    <p style="margin:10px 0 0;font-size:11px;color:var(--muted)">Atualizado ${quando}</p>`;
}

function formatarQuando(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleString('pt-BR', { timeZone: fuso(), day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  } catch { return iso; }
}

function renderEventos() {
  $('#eventList').innerHTML = (data.eventos || []).map(ev => {
    const a = agenteBy(ev.agenteId);
    return `<button type="button" class="ev" data-id="${ev.agenteId}">
      <span class="hora">${ev.hora}</span>
      <div><b>${a?.curto || ev.agenteId}</b><span>${ev.texto}</span>${ev.exemplo ? `<small>${rotuloEx()}</small>` : ''}</div>
    </button>`;
  }).join('') || '<p style="opacity:.6;font-size:12px">Sem eventos.</p>';
  $$('#eventList .ev').forEach(b => b.onclick = () => abrirAgente(b.dataset.id));
}

function abrirAgente(id) {
  const a = agenteBy(id);
  if (!a) return;
  selecionado = id;
  const s = setorBy(a.setorId);
  const ex = (a.exemplo || data.meta.exemplo) ? `<span class="sim sm">${rotuloEx()}</span>` : '';
  const prog = a.progresso
    ? `<div class="blk"><div class="lbl">Progresso</div>
        <div class="bar"><i style="width:${Math.round((a.progresso.etapa / Math.max(1, a.progresso.total)) * 100)}%"></i></div>
        <div class="del">Etapa ${a.progresso.etapa} de ${a.progresso.total} · ${a.progresso.rotulo}</div></div>`
    : `<div class="blk"><div class="lbl">Progresso</div><p class="del">Sem etapa em curso — aguardando abertura da frente.</p></div>`;
  const entregas = (a.entregas && a.entregas.length)
    ? `<ul class="tl">${a.entregas.map(t => `<li><b>${t.hora}</b>${t.texto}</li>`).join('')}</ul>`
    : `<p class="del">Ainda não há entregas. Este agente está configurado, aguardando abertura da frente.</p>`;
  const espera = a.aguardandoBreno
    ? `<div class="blk"><div class="lbl">Aguarda o Breno</div>
        <div class="espera-box">
          <strong>${a.aguardandoBreno.titulo}</strong>
          <p>${a.aguardandoBreno.texto}</p>
          <div class="ops">${(a.aguardandoBreno.opcoes || []).map((o, i) =>
            `<button type="button" class="${i ? 'sec' : ''}" data-op="${o}">${o}</button>`).join('')}</div>
        </div></div>`
    : `<div class="blk"><div class="lbl">Aguarda o Breno</div><p class="del">Nada aguardando o Breno neste momento.</p></div>`;
  const panel = $('#agentPanel');
  panel.classList.remove('hidden');
  panel.innerHTML = `<div class="px"><h2>Agente</h2><button type="button" class="x" aria-label="Fechar">✕</button></div>
    <div class="who">
      ${roboWrap(a, 56)}
      <div><h3>${a.nome}</h3><div class="papel">${a.papel} · ${s?.nome || ''} ${ex}</div>
        <div style="margin-top:6px"><span class="pill ${a.status}">${STATUS_MAP[a.status]}</span></div>
      </div>
    </div>
    <div class="blk"><div class="lbl">O que está fazendo agora</div><p>${a.agora}</p></div>
    ${prog}
    <div class="blk"><div class="lbl">Últimas entregas</div>${entregas}</div>
    ${espera}
    <a class="chat-btn" href="${a.chatUrl || '#chat/' + a.id}">Abrir chat</a>`;
  panel.querySelector('.x').onclick = fecharAgente;
  panel.querySelectorAll('.ops button').forEach(b => b.onclick = () => simularResposta(a, b.dataset.op));
  panel.querySelector('.chat-btn').onclick = ev => {
    ev.preventDefault();
    toast('O chat será ligado depois. Este botão é um placeholder.');
  };
  $$('.agent').forEach(el => el.classList.toggle('on', el.dataset.id === id));
  destacarNoMapa(id);
  if (matchMedia('(max-width: 800px)').matches === false) {
    /* desktop: painel já está na lateral */
  }
}

function fecharAgente() {
  selecionado = null;
  $('#agentPanel').classList.add('hidden');
  $('#agentPanel').innerHTML = '';
  $$('.agent').forEach(el => el.classList.remove('on', 'hit'));
}

function simularResposta(a, op) {
  toast(`Simulação: “${op}”. Nada foi gravado — os dados reais virão em status.json.`);
}

function toast(msg) {
  $$('.toast').forEach(t => t.remove());
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}

function destacarNoMapa(id) {
  $$('.agent').forEach(el => el.classList.toggle('hit', el.dataset.id === id));
  $$('.room').forEach(r => r.classList.remove('hit'));
  const btn = $(`.agent[data-id="${id}"]`);
  const room = btn?.closest('.room');
  if (room) room.classList.add('hit');
  btn?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
}

function aplicarDestaque() {
  const filtering = filtro !== 'todos' || !!busca;
  $$('.room').forEach(r => {
    const sid = r.dataset.setor;
    const tem = data.agentes.some(a => a.setorId === sid && visivel(a));
    const reu = setorBy(sid)?.semAgentes;
    r.classList.toggle('dimmed', filtering && !tem && !reu);
    r.classList.toggle('hit', filtering && tem);
  });
}

function renderBusca() {
  const box = $('#qlist');
  const q = busca;
  if (!q) { box.classList.add('hidden'); box.innerHTML = ''; return; }
  const hits = data.agentes.filter(a => visivel(a) || (
    [a.nome, a.curto, a.papel].some(x => (x || '').toLowerCase().includes(q.toLowerCase()))
    && (filtro === 'todos' || filtro === 'precisa' || a.setorId === filtro)
  ));
  /* visivel already applies busca, so just use it */
  const list = data.agentes.filter(a => {
    const s = setorBy(a.setorId);
    const m = [a.nome, a.curto, a.papel, s?.nome].some(x => (x || '').toLowerCase().includes(q.toLowerCase()));
    if (!m) return false;
    if (filtro === 'precisa') return a.status === 'aprovacao' || a.status === 'urgente';
    if (filtro !== 'todos' && a.setorId !== filtro) return false;
    return true;
  });
  if (!list.length) { box.classList.remove('hidden'); box.innerHTML = `<div style="padding:8px 10px;font-size:12px;color:var(--muted)">Nenhum agente.</div>`; return; }
  box.classList.remove('hidden');
  box.innerHTML = list.map(a =>
    `<button type="button" role="option" data-id="${a.id}" class="s-${a.status}">${roboWrap(a, 24)}${a.nome}<span class="pill ${a.status}" style="margin-left:auto">${STATUS[a.status]}</span></button>`
  ).join('');
  $$('button', box).forEach(b => b.onclick = () => { abrirAgente(b.dataset.id); box.classList.add('hidden'); });
}

function renderAll() {
  renderKpis();
  renderFilters();
  renderPrecisa();
  renderFloor();
  renderLista();
  renderOffice();
  renderEventos();
  renderBusca();
  if (selecionado) {
    $$('.agent').forEach(el => el.classList.toggle('on', el.dataset.id === selecionado));
    destacarNoMapa(selecionado);
  }
}

function bind() {
  const input = $('#q');
  input.addEventListener('input', () => { busca = input.value.trim(); renderAll(); });
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const first = $('#qlist button');
      if (first) { abrirAgente(first.dataset.id); $('#qlist').classList.add('hidden'); }
    }
    if (e.key === 'Escape') { input.blur(); $('#qlist').classList.add('hidden'); }
  });
  document.addEventListener('click', e => {
    if (!e.target.closest('.search')) $('#qlist').classList.add('hidden');
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') fecharAgente(); });

  $('#zIn').onclick = () => setZoom(zoom + 0.12);
  $('#zOut').onclick = () => setZoom(zoom - 0.12);
  $('#zFit').onclick = () => setZoom(1);

  const isMobile = () => matchMedia('(max-width: 800px)').matches;
  function setView(mode) {
    document.body.classList.toggle('lista-on', mode === 'lista');
    document.body.classList.toggle('mapa-on', mode === 'mapa');
    $('#viewList').classList.toggle('on', mode === 'lista');
    $('#viewMap').classList.toggle('on', mode === 'mapa');
  }
  $('#viewList').onclick = () => setView('lista');
  $('#viewMap').onclick = () => setView('mapa');
  const applyDefault = () => setView(isMobile() ? 'lista' : 'mapa');
  applyDefault();
  matchMedia('(max-width: 800px)').addEventListener('change', applyDefault);
}

function setZoom(z) {
  zoom = Math.min(1.6, Math.max(0.75, z));
  $('#floor').style.transform = zoom === 1 ? 'none' : `scale(${zoom})`;
  $('#floor').style.width = zoom === 1 ? '' : (100 / zoom) + '%';
  $('#floor').style.height = zoom === 1 ? '' : (100 / zoom) + '%';
}

async function main() {
  playOpening();
  try {
    data = await (await fetch('status.json', { cache: 'no-store' })).json();
  } catch (err) {
    console.error(err);
    document.body.insertAdjacentHTML('beforeend', `<p class="toast">Não foi possível ler status.json.</p>`);
    return;
  }
  const logo = $('.logo');
  if (logo) logo.innerHTML = roboSVG(ATLAS_COR, { size: 36 });
  renderAll();
  bind();
  window.__ready = true;
  window.__app = { data, abrirAgente, fecharAgente };
}

main();
