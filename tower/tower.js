/*
 * 텐 타워 (TEN TOWER) — JHL STUDIO
 * 이웃한(위·아래·왼쪽·오른쪽) 숫자를 이어서 합이 딱 10이 되면 터져요.
 * 아래에서 새 줄이 계속 올라오고, 탑이 꼭대기를 넘으면 끝나요.
 * 점수: 5 × (이은 칸 수)² × 콤보(3초 안에 연달아 터뜨리면 커져요, 최대 ×5)
 */
(() => {
  const $ = id => document.getElementById(id);
  const COLS = 6;
  const ROWS = 10;
  const START_ROWS = 4;
  const MODE = 'tower';
  const KEY = { best: 'tower:best', name: 'tower:name', lang: 'tower:lang', sound: 'tower:sound' };

  /* ---------- 저장소 (막혀 있어도 게임은 돼요) ---------- */
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, String(v)); } catch (e) {} },
  };

  /* ---------- 글자 (한국어 / English) ---------- */
  const DICT = {
    ko: {
      studio: '◀ JHL STUDIO', nameKo: '텐 타워',
      rule1: '이웃한 숫자를 이어서 <b>합 10</b>을 만들면 펑!',
      rule2: '탑이 꼭대기에 닿으면 끝나요. 길게 이을수록 점수가 커져요.',
      start: '게임 시작', myBest: '내 최고 기록', hof: '명예의 전당',
      loading: '불러오는 중…', hofEmpty: '아직 기록이 없어요. 첫 1등이 되어 보세요!',
      hofOff: '지금은 순위표를 불러올 수 없어요',
      sumsum: '셈셈 놀이터', privacy: '개인정보처리방침',
      score: '점수', level: '레벨', best: '최고',
      hint: '손가락으로 숫자를 이어 그어 보세요',
      pauseNote: '시간이 멈췄어요. 준비되면 계속하세요.',
      resume: '계속하기', restart: '처음부터 다시', quit: '그만하기',
      pops: '터뜨린 횟수', chain: '최장 연결', combo: '최대 콤보',
      rankEnter: 'TOP 10 진입! 이름을 남겨 주세요', rankPh: '닉네임 (8글자까지)', save: '등록',
      rankHint: '실명 대신 닉네임을 써 주세요. 모두에게 보여요.',
      again: '다시 하기', share: '점수 자랑하기', home: '처음 화면',
      newBest: '🎉 내 최고 기록!', levelUp: 'LEVEL {n}', allClear: 'ALL CLEAR +500',
      errEmpty: '이름을 적어 주세요', errLong: '8글자까지 쓸 수 있어요',
      errChars: '한글, 영문, 숫자만 쓸 수 있어요', errBad: '다른 이름을 써 주세요',
      errSave: '저장하지 못했어요. 잠시 뒤 다시 눌러 주세요', saved: '{n}위로 등록됐어요!',
      shareText: '텐 타워에서 {s}점 쌓았어! 🔥 나보다 높이 갈 수 있어?',
      copied: '복사했어요! 친구에게 붙여 넣어 보내 주세요', pause: '일시정지', up: '한 줄 올리기',
    },
    en: {
      studio: '◀ JHL STUDIO', nameKo: 'Make 10. Pop the tower.',
      rule1: 'Connect neighboring numbers that <b>add up to 10</b> to pop them!',
      rule2: "It's over when the tower hits the top. Longer chains score more.",
      start: 'Start', myBest: 'My best', hof: 'Hall of Fame',
      loading: 'Loading…', hofEmpty: 'No scores yet. Be the first!',
      hofOff: "Can't load the rankings right now",
      sumsum: 'SumSum Playground', privacy: 'Privacy',
      score: 'Score', level: 'Level', best: 'Best',
      hint: 'Drag across numbers to connect them',
      pauseNote: "Time is stopped. Continue when you're ready.",
      resume: 'Resume', restart: 'Restart', quit: 'Quit',
      pops: 'Pops', chain: 'Longest', combo: 'Max combo',
      rankEnter: 'Top 10! Leave your name', rankPh: 'Nickname (up to 8)', save: 'Save',
      rankHint: 'Use a nickname, not your real name. Everyone can see it.',
      again: 'Play again', share: 'Share score', home: 'Title',
      newBest: '🎉 New best!', levelUp: 'LEVEL {n}', allClear: 'ALL CLEAR +500',
      errEmpty: 'Enter a name', errLong: 'Up to 8 characters',
      errChars: 'Letters and numbers only', errBad: 'Please pick another name',
      errSave: "Couldn't save. Try again in a moment", saved: 'Saved at #{n}!',
      shareText: 'I scored {s} in TEN TOWER! 🔥 Can you build higher?',
      copied: 'Copied! Paste it to a friend', pause: 'Pause', up: 'Raise a row',
    },
  };
  let lang = store.get(KEY.lang, '') || ((navigator.language || 'ko').toLowerCase().startsWith('ko') ? 'ko' : 'en');
  const qs = new URLSearchParams(location.search).get('lang');
  if (qs === 'ko' || qs === 'en') lang = qs;

  function t(k, vars) {
    let s = (DICT[lang] && DICT[lang][k]) || DICT.ko[k] || k;
    if (vars) for (const [a, b] of Object.entries(vars)) s = s.replace(`{${a}}`, b);
    return s;
  }
  function applyLang() {
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-t]').forEach(n => { n.innerHTML = t(n.dataset.t); });
    document.querySelectorAll('[data-t-ph]').forEach(n => { n.placeholder = t(n.dataset.tPh); });
    $('langBtn').textContent = lang === 'ko' ? 'EN' : '한국어';
    $('pauseBtn').setAttribute('aria-label', t('pause'));
    $('upBtn').setAttribute('aria-label', t('up'));
  }

  /* ---------- 소리 ---------- */
  let soundOn = store.get(KEY.sound, '1') === '1';
  let ac = null;
  function tone(freq, dur = 0.08, type = 'square', vol = 0.04, delay = 0) {
    if (!soundOn) return;
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      if (ac.state === 'suspended') ac.resume();
      const t0 = ac.currentTime + delay;
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, t0);
      g.gain.setValueAtTime(vol, t0);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g).connect(ac.destination);
      o.start(t0);
      o.stop(t0 + dur + 0.02);
    } catch (e) {}
  }
  const sfx = {
    pick: n => tone(300 + n * 60, 0.05, 'square', 0.025),
    pop: (n, combo) => {
      const base = 520 + Math.min(combo, 5) * 60;
      for (let i = 0; i < Math.min(n, 5); i++) tone(base + i * 110, 0.09, 'square', 0.04, i * 0.04);
    },
    bad: () => tone(140, 0.15, 'sawtooth', 0.04),
    rise: () => tone(220, 0.06, 'triangle', 0.05),
    level: () => [660, 880, 1100].forEach((f, i) => tone(f, 0.1, 'square', 0.04, i * 0.08)),
    over: () => [440, 330, 220, 150].forEach((f, i) => tone(f, 0.18, 'square', 0.05, i * 0.14)),
  };
  function setSound(on) {
    soundOn = on;
    store.set(KEY.sound, on ? '1' : '0');
    $('soundBtn').textContent = on ? '♪ ON' : '♪ OFF';
    $('soundBtn').setAttribute('aria-pressed', String(on));
  }

  /* ---------- 방문 통계 ---------- */
  function track(path) {
    try { if (window.goatcounter && window.goatcounter.count) window.goatcounter.count({ path: '/studio/tower-' + path, event: true }); } catch (e) {}
  }
  if (location.protocol.startsWith('http')) {
    window.goatcounter = { path: p => '/studio' + p };
    const gc = document.createElement('script');
    gc.async = true;
    gc.src = 'https://gc.zgo.at/count.js';
    gc.dataset.goatcounter = 'https://sumsum.goatcounter.com/count';
    document.body.appendChild(gc);
  }

  /* ---------- 화면 ---------- */
  function show(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.toggle('active', s.id === id));
    window.scrollTo(0, 0);
  }
  let toastTimer = 0;
  function toast(msg) {
    const n = $('toast');
    n.textContent = msg;
    n.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { n.hidden = true; }, 2000);
  }

  /* ---------- 판 크기 ---------- */
  let CELL = 56;
  function layout() {
    const vh = (window.visualViewport && window.visualViewport.height) || window.innerHeight;
    const byW = (window.innerWidth - 30) / COLS;
    const byH = (vh - 200) / ROWS;
    CELL = Math.max(30, Math.floor(Math.min(byW, byH, 64)));
    document.documentElement.style.setProperty('--cell', CELL + 'px');
  }

  /* ---------- 게임 상태 ---------- */
  let S = null;
  let raf = 0;
  let lastTs = 0;
  let idSeq = 0;
  const els = new Map(); // 칸 id → 화면 요소

  const riseTime = level => Math.max(2.2, 8 - 0.5 * (level - 1));
  const randNum = () => 1 + Math.floor(Math.random() * 9);
  const getBest = () => Number(store.get(KEY.best, '0')) || 0;

  function newState() {
    return {
      cols: Array.from({ length: COLS }, () => []),
      score: 0, level: 1, pops: 0, maxChain: 0, combo: 0, maxCombo: 0, lastPopAt: -99,
      riseMax: riseTime(1), riseIn: riseTime(1), elapsed: 0,
      running: false, paused: false, over: false,
      path: [], dragging: false, timers: [],
    };
  }

  // 아래에 새 줄을 넣어요. 어느 줄이든 꼭대기를 넘으면 false.
  function pushRow() {
    for (let c = 0; c < COLS; c++) S.cols[c].unshift({ v: randNum(), id: ++idSeq, c, fresh: true });
    return !S.cols.some(col => col.length > ROWS);
  }

  const rowOf = cell => S.cols[cell.c].indexOf(cell);
  function adjacent(a, b) {
    const dr = Math.abs(rowOf(a) - rowOf(b));
    const dc = Math.abs(a.c - b.c);
    return dr + dc === 1;
  }
  const pathSum = () => S.path.reduce((s, x) => s + x.v, 0);

  /* ---------- 그리기 ---------- */
  function render() {
    const board = $('board');
    const alive = new Set();
    for (let c = 0; c < COLS; c++) {
      S.cols[c].forEach((cell, r) => {
        alive.add(cell.id);
        let el = els.get(cell.id);
        if (!el) {
          el = document.createElement('div');
          el.className = 'cell';
          el.innerHTML = `<i class="b n${cell.v}">${cell.v}</i>`;
          board.appendChild(el);
          els.set(cell.id, el);
        }
        if (cell.fresh) {
          el.classList.add('new');
          cell.fresh = false;
          setTimeout(() => el.classList.remove('new'), 200);
        }
        el.style.transform = `translate(${c * CELL}px, ${(ROWS - 1 - r) * CELL}px)`;
      });
    }
    for (const [id, el] of els) {
      if (!alive.has(id) && !el.classList.contains('pop')) { el.remove(); els.delete(id); }
    }
    renderPath();
    $('board').classList.toggle('danger', S.cols.some(col => col.length >= ROWS));
    renderHud();
  }

  function renderPath() {
    const sum = pathSum();
    const state = sum === 10 ? 'ok' : sum > 10 ? 'over' : '';
    for (const el of els.values()) el.classList.remove('sel', 'ok', 'over');
    for (const cell of S.path) {
      const el = els.get(cell.id);
      if (el) { el.classList.add('sel'); if (state) el.classList.add(state); }
    }
    const bubble = $('sumBubble');
    if (!S.path.length) { bubble.hidden = true; return; }
    bubble.hidden = false;
    bubble.className = 'sum-bubble' + (state ? ' ' + state : '');
    bubble.textContent = `${S.path.map(x => x.v).join('+')} = ${sum}`;
  }

  let lastHud = '';
  function renderHud() {
    const key = `${S.score}|${S.level}`;
    if (key !== lastHud) {
      lastHud = key;
      $('hudScore').textContent = S.score;
      $('hudLevel').textContent = S.level;
      $('hudBest').textContent = Math.max(getBest(), S.score);
    }
  }

  function fxAt(x, y, text, big) {
    const n = document.createElement('div');
    n.className = 'fx-pt' + (big ? ' big' : '');
    n.style.left = x + 'px';
    n.style.top = y + 'px';
    n.textContent = text;
    $('fx').appendChild(n);
    setTimeout(() => n.remove(), 950);
  }
  function fxCenter(text) {
    const r = $('board').getBoundingClientRect();
    fxAt(r.left + r.width / 2, r.top + r.height * 0.4, text, true);
  }

  /* ---------- 입력: 끌어서 잇기 + 하나씩 눌러 잇기 ---------- */
  function hit(e, inner) {
    const r = $('board').getBoundingClientRect();
    const x = e.clientX - r.left - 3;
    const y = e.clientY - r.top - 3;
    const c = Math.floor(x / CELL);
    const top = Math.floor(y / CELL);
    if (c < 0 || c >= COLS || top < 0 || top >= ROWS) return null;
    if (inner) {
      // 끌 때는 칸 가운데쪽을 지나야 들어가요(대각선으로 스치면 옆 칸이 잘못 잡히지 않게).
      const fx = x / CELL - c;
      const fy = y / CELL - top;
      if (fx < 0.2 || fx > 0.8 || fy < 0.2 || fy > 0.8) return null;
    }
    return S.cols[c][ROWS - 1 - top] || null;
  }

  function extend(cell) {
    const path = S.path;
    const last = path[path.length - 1];
    if (!last) { path.push(cell); sfx.pick(cell.v); return; }
    if (cell === last) return;
    const back = path[path.length - 2];
    if (cell === back) { path.pop(); return; }
    if (path.includes(cell)) return;
    if (pathSum() < 10 && adjacent(last, cell)) { path.push(cell); sfx.pick(cell.v); }
  }

  function check() {
    const sum = pathSum();
    if (sum === 10 && S.path.length >= 2) {
      popPath();
      S.dragging = false; // 터진 뒤에는 손가락을 다시 대야 새로 이어요
    } else {
      renderPath();
    }
  }

  function onDown(e) {
    if (!S || !S.running) return;
    e.preventDefault();
    const cell = hit(e, false);
    if (!cell) { S.path = []; renderPath(); return; }
    try { $('board').setPointerCapture(e.pointerId); } catch (err) {}
    const path = S.path;
    const last = path[path.length - 1];
    const i = path.indexOf(cell);
    if (path.length === 1 && cell === last) {
      S.path = []; // 하나만 고른 칸을 다시 누르면 취소
    } else if (i >= 0) {
      S.path = path.slice(0, i + 1); // 고른 길 중간을 누르면 거기까지로 줄여요
    } else if (last && pathSum() < 10 && adjacent(last, cell)) {
      path.push(cell);
      sfx.pick(cell.v);
    } else {
      S.path = [cell];
      sfx.pick(cell.v);
    }
    S.dragging = true;
    check();
  }

  function onMove(e) {
    if (!S || !S.running || !S.dragging) return;
    e.preventDefault();
    const cell = hit(e, true);
    if (!cell) return;
    const before = S.path.length;
    extend(cell);
    if (S.path.length !== before) check();
  }

  function onUp() {
    if (!S || !S.dragging) return;
    S.dragging = false;
    if (pathSum() > 10) {
      sfx.bad();
      S.path = [];
      renderPath();
    }
  }

  /* ---------- 터뜨리기 ---------- */
  function popPath() {
    const path = S.path;
    const n = path.length;
    S.combo = S.elapsed - S.lastPopAt <= 3 ? S.combo + 1 : 1;
    S.lastPopAt = S.elapsed;
    const mult = Math.min(S.combo, 5);
    const pts = 5 * n * n * mult;
    S.score += pts;
    S.pops += 1;
    S.maxChain = Math.max(S.maxChain, n);
    S.maxCombo = Math.max(S.maxCombo, S.combo);

    // 점수 글자는 터진 칸들의 가운데에 띄워요.
    let sx = 0, sy = 0;
    for (const cell of path) {
      const r = els.get(cell.id).getBoundingClientRect();
      sx += r.left + r.width / 2;
      sy += r.top + r.height / 2;
    }
    fxAt(sx / n, sy / n, mult > 1 ? `+${pts} ×${mult}` : `+${pts}`, n >= 4 || mult >= 3);

    for (const cell of path) {
      const el = els.get(cell.id);
      el.classList.remove('sel', 'ok', 'over');
      el.classList.add('pop');
      els.delete(cell.id);
      setTimeout(() => el.remove(), 300);
      const col = S.cols[cell.c];
      col.splice(col.indexOf(cell), 1);
    }
    S.path = [];
    sfx.pop(n, S.combo);

    const lv = 1 + Math.floor(S.pops / 8);
    if (lv > S.level) {
      S.level = lv;
      S.riseMax = riseTime(lv);
      S.riseIn = Math.min(S.riseIn, S.riseMax);
      sfx.level();
      fxCenter(t('levelUp', { n: lv }));
    }
    if (S.cols.every(col => col.length === 0)) {
      S.score += 500;
      fxCenter(t('allClear'));
    }
    render();
  }

  /* ---------- 줄 올리기 ---------- */
  function rise(manual) {
    if (!S || !S.running) return;
    if (manual) {
      S.score += 5;
      const r = $('upBtn').getBoundingClientRect();
      fxAt(r.left + r.width / 2, r.top, '+5');
    }
    const ok = pushRow();
    S.riseMax = riseTime(S.level);
    S.riseIn = S.riseMax;
    sfx.rise();
    render();
    if (!ok) gameOver();
  }

  /* ---------- 흐름 ---------- */
  function loop(ts) {
    const real = Math.max(0, (ts - lastTs) / 1000);
    lastTs = ts;
    if (!S || S.over) return;
    if (S.running) {
      const dt = Math.min(real, 0.25);
      S.elapsed += dt;
      S.riseIn -= dt;
      if (S.riseIn <= 0) rise(false);
      if (S.over) return;
      const fill = Math.min(1, Math.max(0, 1 - S.riseIn / S.riseMax));
      $('riseFill').style.width = (fill * 100).toFixed(1) + '%';
      $('riseFill').parentElement.classList.toggle('hurry', S.riseIn < 1.5);
    }
    raf = requestAnimationFrame(loop);
  }

  function clearTimers() {
    cancelAnimationFrame(raf);
    if (S) S.timers.forEach(clearTimeout);
  }

  function startGame() {
    clearTimers();
    $('pauseBox').hidden = true;
    $('overBox').hidden = true;
    for (const el of els.values()) el.remove();
    els.clear();
    show('game');
    layout();
    S = newState();
    for (let i = 0; i < START_ROWS; i++) pushRow();
    lastHud = '';
    $('riseFill').style.width = '0%';
    render();
    track('start');

    const steps = ['3', '2', '1', 'GO!'];
    const box = $('countdown');
    const num = $('countNum');
    box.hidden = false;
    steps.forEach((s, i) => {
      S.timers.push(setTimeout(() => {
        num.textContent = s;
        num.style.animation = 'none';
        void num.offsetWidth;
        num.style.animation = '';
        tone(i < 3 ? 440 : 880, 0.1, 'square', 0.04);
      }, i * 600));
    });
    S.timers.push(setTimeout(() => {
      box.hidden = true;
      S.running = true;
      lastTs = performance.now();
    }, steps.length * 600));
    lastTs = performance.now();
    raf = requestAnimationFrame(loop);
  }

  function pause() {
    if (!S || S.over) return;
    if (!S.running) {
      if (!S.paused) toTitle(); // 카운트다운 중에는 처음 화면으로
      return;
    }
    S.running = false;
    S.paused = true;
    S.dragging = false;
    $('pauseBox').hidden = false;
  }
  function resume() {
    if (!S || !S.paused) return;
    $('pauseBox').hidden = true;
    S.paused = false;
    S.running = true;
    lastTs = performance.now();
  }
  function toTitle() {
    clearTimers();
    if (S) { S.over = true; S.running = false; }
    $('pauseBox').hidden = true;
    $('overBox').hidden = true;
    $('countdown').hidden = true;
    show('title');
    $('titleBest').textContent = getBest();
    loadHof();
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && S && S.running && !S.over) pause();
  });

  function gameOver() {
    S.over = true;
    S.running = false;
    S.path = [];
    clearTimers();
    renderPath();
    sfx.over();
    track('over');
    $('board').classList.add('danger');

    const prev = getBest();
    const isBest = S.score > prev;
    if (isBest) store.set(KEY.best, S.score);

    setTimeout(() => {
      $('board').classList.remove('danger');
      $('overScore').textContent = S.score;
      $('overBadge').hidden = !isBest || S.score === 0;
      $('overBadge').textContent = t('newBest');
      $('stPops').textContent = S.pops;
      $('stChain').textContent = S.maxChain;
      $('stCombo').textContent = S.maxCombo;
      $('rankForm').hidden = true;
      $('shareBtn').hidden = S.score === 0;
      $('overBox').hidden = false;
      offerRank(S.score);
    }, 900);
  }

  /* ---------- 명예의 전당 (Firebase) ---------- */
  const BAD = ['시발', '씨발', 'ㅅㅂ', '병신', 'ㅂㅅ', '개새', '좆', '존나', '니미', '느금', '섹스', 'fuck', 'shit', 'bitch', 'sex', 'dick'];
  let db = null;
  try {
    if (window.firebase && firebase.firestore) {
      db = firebase.initializeApp({
        apiKey: 'AIzaSyCHoe0sEZjp-gDg1IOXLh5a7SLIkdSxSUA',
        authDomain: 'sumsum-adec0.firebaseapp.com',
        projectId: 'sumsum-adec0',
        storageBucket: 'sumsum-adec0.firebasestorage.app',
        messagingSenderId: '522580224299',
        appId: '1:522580224299:web:bccb40a0ccf40d07547d6e',
      }).firestore();
    }
  } catch (e) { db = null; }
  const scores = () => db.collection('boards').doc(MODE).collection('scores');

  let hofRows = null;
  let myId = null;
  async function fetchTop() {
    if (!db) throw new Error('no db');
    const snap = await scores().orderBy('score', 'desc').limit(10).get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }
  const esc = s => String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

  async function loadHof() {
    const list = $('hofList');
    try {
      hofRows = await fetchTop();
      if (!hofRows.length) { list.innerHTML = `<li class="hof-msg">${t('hofEmpty')}</li>`; return; }
      list.innerHTML = hofRows.map((r, i) =>
        `<li class="${r.id === myId ? 'me' : ''}"><span class="rk">${i + 1}</span><span class="nm">${esc(r.name)}</span><span class="sc">${r.score}</span></li>`
      ).join('');
    } catch (e) {
      hofRows = null;
      list.innerHTML = `<li class="hof-msg">${t('hofOff')}</li>`;
    }
  }

  async function offerRank(score) {
    if (!db || score <= 0) return;
    try {
      const rows = await fetchTop();
      hofRows = rows;
      if (rows.length >= 10 && score <= rows[rows.length - 1].score) return;
      $('rankName').value = store.get(KEY.name, '');
      $('rankHint').textContent = t('rankHint');
      $('rankHint').classList.remove('err');
      $('rankSave').disabled = false;
      $('rankForm').hidden = false;
    } catch (e) {}
  }

  function cleanName(raw) {
    const n = String(raw || '').replace(/\s+/g, ' ').trim();
    if (!n) return { err: 'errEmpty' };
    if ([...n].length > 8) return { err: 'errLong' };
    if (!/^[가-힣A-Za-z0-9_ ]+$/.test(n)) return { err: 'errChars' };
    const low = n.toLowerCase().replace(/\s/g, '');
    if (BAD.some(w => low.includes(w))) return { err: 'errBad' };
    return { name: n };
  }

  async function saveRank(e) {
    e.preventDefault();
    const hint = $('rankHint');
    const r = cleanName($('rankName').value);
    if (r.err) { hint.textContent = t(r.err); hint.classList.add('err'); return; }
    const btn = $('rankSave');
    btn.disabled = true;
    try {
      const ref = await scores().add({
        name: r.name, score: S.score, at: firebase.firestore.FieldValue.serverTimestamp(), v: 1,
      });
      myId = ref.id;
      store.set(KEY.name, r.name);
      const rows = await fetchTop().catch(() => []);
      const place = rows.findIndex(x => x.id === myId) + 1;
      $('rankForm').hidden = true;
      toast(place > 0 ? t('saved', { n: place }) : '✓');
      track('rank');
    } catch (err) {
      hint.textContent = t('errSave');
      hint.classList.add('err');
      btn.disabled = false;
    }
  }

  /* ---------- 자랑하기 ---------- */
  async function share() {
    if (!S) return;
    const url = 'https://studiojhl.com/tower/' + (lang === 'en' ? '?lang=en' : '');
    const text = `${t('shareText', { s: S.score })}\n${url}`;
    track('share');
    if (navigator.share) {
      try { await navigator.share({ title: 'TEN TOWER', text }); return; } catch (e) { if (e && e.name === 'AbortError') return; }
    }
    try { await navigator.clipboard.writeText(text); toast(t('copied')); }
    catch (e) { window.prompt('', text); }
  }

  /* ---------- 연결 ---------- */
  const board = $('board');
  board.addEventListener('pointerdown', onDown);
  board.addEventListener('pointermove', onMove);
  board.addEventListener('pointerup', onUp);
  board.addEventListener('pointercancel', onUp);
  board.addEventListener('lostpointercapture', onUp);

  $('startBtn').addEventListener('click', startGame);
  $('upBtn').addEventListener('click', () => rise(true));
  $('pauseBtn').addEventListener('click', pause);
  $('resumeBtn').addEventListener('click', resume);
  $('restartBtn').addEventListener('click', startGame);
  $('quitBtn').addEventListener('click', toTitle);
  $('againBtn').addEventListener('click', startGame);
  $('homeBtn').addEventListener('click', toTitle);
  $('shareBtn').addEventListener('click', share);
  $('rankForm').addEventListener('submit', saveRank);
  $('soundBtn').addEventListener('click', () => setSound(!soundOn));
  $('langBtn').addEventListener('click', () => {
    lang = lang === 'ko' ? 'en' : 'ko';
    store.set(KEY.lang, lang);
    applyLang();
    loadHof();
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && S && !S.over && $('game').classList.contains('active')) {
      e.preventDefault();
      if (S.paused) resume(); else pause();
    }
  });

  const onResize = () => { if (S && $('game').classList.contains('active')) { layout(); render(); } };
  window.addEventListener('resize', onResize);
  if (window.visualViewport) window.visualViewport.addEventListener('resize', onResize);

  // 게임 화면에서 화면이 위아래로 끌려 다니지 않게 해요(아이폰).
  document.addEventListener('touchmove', e => {
    if ($('game').classList.contains('active')) e.preventDefault();
  }, { passive: false });

  applyLang();
  setSound(soundOn);
  $('titleBest').textContent = getBest();
  loadHof();

  // 테스트용 (자동 검사에서만 써요)
  window.__tower = { get state() { return S; }, popPath, rise };
})();
