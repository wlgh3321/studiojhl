/*
 * 텐 타워 (TEN TOWER) — JHL STUDIO
 * 이어지는 칸끼리 이어서 합이 딱 10이 되면 터져요.
 *  - 면이 맞닿은 칸(위·아래·왼쪽·오른쪽)은 이어져요.
 *  - 같은 가로줄에서 사이가 모두 빈칸이면 멀리 떨어져 있어도 이어져요. (사이에 블록이 있으면 안 돼요)
 *    세로줄은 블록이 바닥부터 빈틈없이 쌓이니 늘 맞닿아 있어요.
 *  - ㄱ자·T자처럼 꺾이거나 갈라져도 돼요. 대각선은 안 돼요.
 * 아래에서 새 줄이 계속 올라오고, 탑이 꼭대기를 넘으면 끝나요.
 * 점수: 5 × (이은 칸 수)² × 콤보(3초 안에 연달아 터뜨리면 커져요, 최대 ×5)
 * 특수 블록: ★ 만능(모자란 만큼을 채워 줘요), 폭탄(누르면 주변 8칸까지 펑)
 * 모드: 기본(tower) / 오늘의 탑(tower-dYYYYMMDD, 그날은 모두 같은 숫자 순서) / 대전(vs)
 * 대전: 컴퓨터 또는 친구(초대 코드·링크)와 1:1. 콤보 3번째마다, 5칸 이상 이을 때, 폭탄을 터뜨릴 때
 *       상대 탑에 방해 줄을 보내요. 공격은 3초 예고 뒤에 올라오고, 그사이 내 공격으로 상쇄하거나 ★로 막을 수 있어요.
 */
(() => {
  const $ = id => document.getElementById(id);
  const COLS = 6;
  const ROWS = 10;
  const START_ROWS = 4;
  const KEY = { best: 'tower:best', name: 'tower:name', lang: 'tower:lang', sound: 'tower:sound', tut: 'tower:tutorial' };
  const WEIGHTS = [3, 3, 3, 3, 3, 2, 2, 1, 1]; // 1~9가 나오는 비율 (작은 수가 더 자주)
  const WEIGHT_SUM = WEIGHTS.reduce((a, b) => a + b, 0);
  const P_BOMB = 0.015;
  const P_STAR = 0.03;
  const HINT_AFTER = 5; // 이만큼(초) 못 터뜨리면 힌트
  const ICON = {
    star: '<svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round" d="M8 1.6l1.9 4 4.4.6-3.2 3 .8 4.4L8 11.5l-3.9 2.1.8-4.4-3.2-3 4.4-.6z"/></svg>',
    bomb: '<svg viewBox="0 0 16 16" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" d="M9.6 5.2c.4-1.6 1.4-2.6 3-2.8"/><circle cx="7.2" cy="9.6" r="5" fill="currentColor"/><circle cx="5.4" cy="7.8" r="1.3" fill="#fff" opacity=".85"/><circle cx="13.2" cy="2.2" r="1.2" fill="#ff6f6f"/></svg>',
  };
  // 오늘 날짜(한국 시간) — 오늘의 탑은 이 날짜로 숫자 순서가 정해져요.
  const todayKey = () => new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10).replace(/-/g, '');
  const dailyMode = () => 'tower-d' + todayKey();

  /* ---------- 저장소 (막혀 있어도 게임은 돼요) ---------- */
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, String(v)); } catch (e) {} },
  };

  /* ---------- 글자 (한국어 / English) ---------- */
  const DICT = {
    ko: {
      studio: '◀ JHL STUDIO', nameKo: '텐 타워',
      rule1: '숫자를 이어서 <b>합 10</b>을 만들면 펑!',
      rule2: '붙어 있는 숫자끼리 이어요.',
      rule2b: '사이가 비면 멀리서도 OK!',
      rule3: '꼭대기에 닿으면 끝!',
      nextRow: '다음 줄', upShort: '한 줄 올리기', sec: '초',
      modeSolo: '혼자 플레이', modeDaily: '오늘의 탑', modeCpu: '컴퓨터 대전', modeNet: '친구 대전',
      start: '게임 시작', daily: '오늘의 탑', dailySub: '오늘은 모두 같은 판',
      myBest: '내 최고 기록', hof: '탑 랭킹', tabAll: '전체 기록', tabDaily: '오늘의 탑',
      loading: '불러오는 중…', hofEmpty: '아직 기록이 없어요. 첫 1등이 되어 보세요!',
      hofOff: '지금은 순위표를 불러올 수 없어요',
      sumsum: '셈셈 놀이터', privacy: '개인정보처리방침',
      score: '점수', level: '레벨', best: '최고',
      hint: '숫자를 누르거나 그어서 이어요',
      hintTut: '반짝이는 숫자를 눌러 10을 만들어 보세요',
      shuffled: '섞었어요!', longChain: 'LONG CHAIN +200',
      pauseNote: '시간이 멈췄어요. 준비되면 계속하세요.',
      resume: '계속하기', restart: '처음부터 다시', quit: '그만하기',
      pops: '터뜨린 횟수', chain: '최장 연결', combo: '최대 콤보',
      rankEnter: 'TOP 10 진입! 이름을 남겨 주세요', rankPh: '닉네임 (8글자까지)', save: '등록',
      rankHint: '실명 대신 닉네임을 써 주세요. 모두에게 보여요.',
      again: '다시 하기', share: '점수 자랑하기', home: '처음 화면',
      newBest: '🎉 내 최고 기록!', levelUp: 'LEVEL {n}',
      errEmpty: '이름을 적어 주세요', errLong: '8글자까지 쓸 수 있어요',
      errChars: '한글, 영문, 숫자만 쓸 수 있어요', errBad: '다른 이름을 써 주세요',
      errSave: '저장하지 못했어요. 잠시 뒤 다시 눌러 주세요', saved: '{n}위로 등록됐어요!',
      shareText: '텐 타워에서 {s}점 쌓았어! 🔥 나보다 높이 갈 수 있어?',
      shareDaily: '텐 타워 오늘의 탑에서 {s}점! 🔥 같은 판으로 붙어 보자',
      copied: '복사했어요! 친구에게 붙여 넣어 보내 주세요', pause: '일시정지', up: '한 줄 올리기',
      vs: '대전하기', vsSub: '컴퓨터 · 친구와 1:1',
      vsNote: '콤보를 쌓아 상대에게 방해 줄을 보내요.<br>먼저 꼭대기에 닿으면 져요.',
      vsCpu: '컴퓨터와 대전', easy: '쉬움', normal: '보통', hard: '어려움',
      vsFriend: '친구와 대전', vsCreate: '방 만들기', vsCodePh: '초대 코드', vsJoin: '들어가기',
      vsInvite: '초대 링크 보내기', vsStart: '대전 시작', vsClose: '닫기', vsLeave: '방 나가기',
      vsWaitFriend: '친구에게 초대 링크나 코드를 보내 주세요.', vsReady: '친구가 들어왔어요! 시작해 보세요.',
      vsWaitHost: '방장이 시작하기를 기다리고 있어요.', vsEmpty: '기다리는 중…',
      vsNoRoom: '방을 찾을 수 없어요. 코드를 확인해 주세요', vsFull: '이미 두 명이 들어와 있어요',
      vsOff: '지금은 온라인 대전에 연결할 수 없어요', vsCodeBad: '초대 코드는 5글자예요',
      inviteText: '텐 타워 한 판 붙자! 🔥 초대 코드 {c}',
      incoming: '공격 예고', cpu: '컴퓨터', you: '나', win: 'YOU WIN!', lose: 'YOU LOSE',
      oppLeft: '상대가 나갔어요', attack: '공격 +{n}', blocked: '방어!', offset: '상쇄 -{n}',
      vsPause: '온라인 대전은 멈출 수 없어요. 게임은 계속 진행돼요.', rematch: '한 판 더',
    },
    en: {
      studio: '◀ JHL STUDIO', nameKo: 'Make 10. Pop the tower.',
      rule1: 'Connect numbers to make <b>10</b>. Pop!',
      rule2: 'Connect numbers that touch.',
      rule2b: 'Gaps in a row are OK!',
      rule3: "Don't let it reach the top!",
      nextRow: 'Next row', upShort: 'Raise a row', sec: 's',
      modeSolo: 'Solo', modeDaily: 'Daily Tower', modeCpu: 'vs CPU', modeNet: 'vs Friend',
      start: 'Start', daily: 'Daily Tower', dailySub: 'Same board for all',
      myBest: 'My best', hof: 'Tower Ranking', tabAll: 'All time', tabDaily: 'Daily Tower',
      loading: 'Loading…', hofEmpty: 'No scores yet. Be the first!',
      hofOff: "Can't load the rankings right now",
      sumsum: 'SumSum Playground', privacy: 'Privacy',
      score: 'Score', level: 'Level', best: 'Best',
      hint: 'Tap or drag to connect',
      hintTut: 'Tap the blinking numbers to make 10',
      shuffled: 'Shuffled!', longChain: 'LONG CHAIN +200',
      pauseNote: "Time is stopped. Continue when you're ready.",
      resume: 'Resume', restart: 'Restart', quit: 'Quit',
      pops: 'Pops', chain: 'Longest', combo: 'Max combo',
      rankEnter: 'Top 10! Leave your name', rankPh: 'Nickname (up to 8)', save: 'Save',
      rankHint: 'Use a nickname, not your real name. Everyone can see it.',
      again: 'Play again', share: 'Share score', home: 'Title',
      newBest: '🎉 New best!', levelUp: 'LEVEL {n}',
      errEmpty: 'Enter a name', errLong: 'Up to 8 characters',
      errChars: 'Letters and numbers only', errBad: 'Please pick another name',
      errSave: "Couldn't save. Try again in a moment", saved: 'Saved at #{n}!',
      shareText: 'I scored {s} in TEN TOWER! 🔥 Can you build higher?',
      shareDaily: "I scored {s} in today's TEN TOWER! 🔥 Same board — beat me",
      copied: 'Copied! Paste it to a friend', pause: 'Pause', up: 'Raise a row',
      vs: 'Versus', vsSub: 'vs CPU · vs a friend',
      vsNote: 'Build combos to send junk rows to your rival.<br>First to hit the top loses.',
      vsCpu: 'Play the computer', easy: 'Easy', normal: 'Normal', hard: 'Hard',
      vsFriend: 'Play a friend', vsCreate: 'Create room', vsCodePh: 'Invite code', vsJoin: 'Join',
      vsInvite: 'Send invite link', vsStart: 'Start match', vsClose: 'Close', vsLeave: 'Leave room',
      vsWaitFriend: 'Send the invite link or code to a friend.', vsReady: 'Your friend is here! Start the match.',
      vsWaitHost: 'Waiting for the host to start.', vsEmpty: 'Waiting…',
      vsNoRoom: "Room not found. Check the code", vsFull: 'This room already has two players',
      vsOff: "Can't connect to online play right now", vsCodeBad: 'Invite codes are 5 characters',
      inviteText: 'Play me at TEN TOWER! 🔥 Invite code {c}',
      incoming: 'Incoming', cpu: 'CPU', you: 'You', win: 'YOU WIN!', lose: 'YOU LOSE',
      oppLeft: 'Your rival left', attack: 'Attack +{n}', blocked: 'Blocked!', offset: 'Cancel -{n}',
      vsPause: "Online matches can't be paused. The game keeps running.", rematch: 'Rematch',
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
    hitme: () => { tone(110, 0.2, 'sawtooth', 0.06); tone(82, 0.25, 'square', 0.05, 0.08); },
    send: () => [520, 780].forEach((f, i) => tone(f, 0.07, 'square', 0.04, i * 0.05)),
    win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.14, 'square', 0.05, i * 0.1)),
    boom: () => { tone(90, 0.25, 'sawtooth', 0.06); tone(60, 0.3, 'square', 0.05, 0.05); },
    shuffle: () => [330, 392, 494].forEach((f, i) => tone(f, 0.07, 'triangle', 0.05, i * 0.05)),
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
    const inner = Math.min(window.innerWidth - 24, 420) - 30 - 8; // 판 안쪽 폭(판 테두리·빨간 틀 빼고)
    const byW = Math.floor((inner - 4) / COLS);
    const root = document.documentElement;
    const set = c => { CELL = Math.max(26, Math.min(c, byW, 62)); root.style.setProperty('--cell', CELL + 'px'); };
    set(Math.floor((vh - 262 - (isVs() ? 70 : 0)) / ROWS));
    const game = $('game');
    if (!game.classList.contains('active')) return;
    // 판을 뺀 나머지 높이를 실제로 재서, 남는 높이에 판을 꽉 맞춰요.
    const board = $('board');
    const cs = getComputedStyle(game);
    const pad = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
    const rest = game.firstElementChild.offsetHeight + pad + 4 - board.offsetHeight; // 4: 판 아래 그림자
    set(Math.floor((vh - rest - 2) / ROWS));
    for (let i = 0; i < 12 && CELL > 26 && game.scrollHeight > vh + 1; i++) set(CELL - 1);
  }



  /* ---------- 게임 상태 ---------- */
  let S = null;
  let raf = 0;
  let lastTs = 0;
  let idSeq = 0;
  const els = new Map(); // 칸 id → 화면 요소

  const riseTime = level => Math.max(3.2, 8 - 0.4 * (level - 1));
  const levelOf = cleared => 1 + Math.floor(cleared / 30);

  // 숫자 뽑기. 오늘의 탑은 날짜로 정해진 순서(mulberry32), 기본 모드는 그냥 무작위.
  let rng = Math.random;
  function seeded(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6D2B79F5) >>> 0;
      let x = a;
      x = Math.imul(x ^ (x >>> 15), x | 1);
      x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
      return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
  }
  function randNum(gen = rng) {
    let x = gen() * WEIGHT_SUM;
    for (let i = 0; i < 9; i++) { x -= WEIGHTS[i]; if (x < 0) return i + 1; }
    return 9;
  }
  // 한 칸 만들기. 난수는 늘 두 번 써요(오늘의 탑에서 순서가 어긋나지 않게).
  function makeCell(c, special, gen = rng) {
    const r = gen();
    const v = randNum(gen);
    let kind = 'n';
    if (special) { if (r < P_BOMB) kind = 'bomb'; else if (r < P_BOMB + P_STAR) kind = 'star'; }
    return { v: kind === 'n' ? v : 0, kind, id: ++idSeq, c, fresh: true };
  }

  let mode = 'tower';
  let vsCfg = null; // 대전 설정 { kind: 'cpu' | 'net', level, seed }
  const isVs = () => mode === 'vs';
  const isDaily = () => mode.startsWith('tower-d');
  const bestKey = () => (mode === 'tower' ? KEY.best : 'tower:best:' + mode);
  const getBest = () => Number(store.get(bestKey(), '0')) || 0;

  function newState() {
    return {
      cols: Array.from({ length: COLS }, () => []),
      score: 0, level: 1, pops: 0, cleared: 0, maxChain: 0, combo: 0, maxCombo: 0, lastPopAt: -99,
      lastActAt: 0, hint: null, tutorial: false, vs: null,
      riseMax: riseTime(1), riseIn: riseTime(1), elapsed: 0,
      running: false, paused: false, over: false,
      path: [], dragging: false, timers: [],
    };
  }

  // 아래에 새 줄을 넣어요. 어느 줄이든 꼭대기를 넘으면 false.
  function pushRow(special) {
    for (let c = 0; c < COLS; c++) S.cols[c].unshift(makeCell(c, special));
    return !S.cols.some(col => col.length > ROWS);
  }

  const rowOf = cell => S.cols[cell.c].indexOf(cell);
  // 면이 맞닿은 칸(위·아래·왼쪽·오른쪽)만 이어져요.
  // 두 칸이 이어지는지: 맞닿았거나, 같은 가로줄이고 사이가 모두 빈칸이면 돼요.
  function linked(cols, c1, r1, c2, r2) {
    if (c1 === c2) return Math.abs(r1 - r2) === 1;
    if (r1 !== r2) return false;
    const lo = Math.min(c1, c2);
    const hi = Math.max(c1, c2);
    for (let c = lo + 1; c < hi; c++) if (cols[c].length > r1) return false;
    return true;
  }
  function adjacent(a, b) {
    return a !== b && linked(S.cols, a.c, rowOf(a), b.c, rowOf(b));
  }
  const pathSum = () => S.path.reduce((s, x) => s + x.v, 0);
  const pathHasStar = () => S.path.some(x => x.kind === 'star');
  // '' 아직 모자람 / 'ok' 딱 10 / 'over' 넘침.  ★은 모자란 만큼을 채워 줘요.
  function pathState() {
    const sum = pathSum();
    const n = S.path.length;
    if (pathHasStar()) return sum > 9 ? 'over' : (n >= 2 && sum >= 1 ? 'ok' : '');
    return sum === 10 && n >= 2 ? 'ok' : sum > 10 ? 'over' : '';
  }
  function canExtend(cell) {
    if (!S.path.length || cell.kind === 'bomb' || S.path.includes(cell)) return false;
    if (cell.kind === 'star' && pathHasStar()) return false;
    const st = pathState();
    if (st === 'over' || (st === 'ok' && !pathHasStar())) return false;
    // 고른 칸 중 어느 하나와 이어지면 돼요(ㄱ자, T자 모양도 가능).
    return S.path.some(x => adjacent(x, cell));
  }
  // 선을 그릴 때: 이 칸이 붙어 있는 앞선 칸(바로 앞 칸을 먼저 봐요)
  function parentOf(i) {
    const cell = S.path[i];
    if (adjacent(S.path[i - 1], cell)) return S.path[i - 1];
    return S.path.slice(0, i).find(x => adjacent(x, cell)) || S.path[i - 1];
  }
  const center = cell => [cell.c * CELL + CELL / 2, (ROWS - 1 - rowOf(cell)) * CELL + CELL / 2];

  /* ---------- 이을 수 있는 조합 찾기 (힌트 · 막힘 검사) ---------- */
  // 가장 짧은 조합을 돌려줘요. 없으면 폭탄 한 칸, 그것도 없으면 null.
  function findMove(cols = S.cols) {
    const cells = [];
    cols.forEach((col, c) => col.forEach((cell, r) => cells.push({ cell, r, c })));
    const nums = cells.filter(x => x.cell.kind !== 'bomb');
    const nb = new Map(nums.map(a => [a, nums.filter(b => b !== a && linked(cols, a.c, a.r, b.c, b.r))]));
    let found = null;
    function dfs(path, sum, star, maxLen) {
      // 고른 칸 어디에서든 뻗을 수 있어요(면이 붙은 묶음).
      const cand = new Set();
      for (const p of path) for (const o of nb.get(p)) if (!path.includes(o)) cand.add(o);
      for (const o of cand) {
        const isStar = o.cell.kind === 'star';
        if (isStar && star) continue;
        const s = sum + o.cell.v;
        const st = star || isStar;
        if (st ? s > 9 : s > 10) continue;
        path.push(o);
        if (st ? s >= 1 : s === 10) { found = path.map(x => x.cell); path.pop(); return; }
        if (path.length < maxLen) { dfs(path, s, st, maxLen); if (found) { path.pop(); return; } }
        path.pop();
      }
    }
    for (let maxLen = 2; maxLen <= 6 && !found; maxLen++) {
      for (const a of nums) {
        dfs([a], a.cell.v, a.cell.kind === 'star', maxLen);
        if (found) break;
      }
    }
    if (found) return found;
    const bomb = cells.find(x => x.cell.kind === 'bomb');
    return bomb ? [bomb.cell] : null;
  }

  // 이을 게 하나도 없으면 판을 섞어요. 블록이 얼마 안 남았으면(3줄 미만) 섞는 대신 다음 줄을 바로 올려요.
  function ensureMoves() {
    if (!S || S.over) return;
    const all = S.cols.flat();
    if (all.length && findMove()) return;
    if (all.length < COLS * 3) { if (S.running) S.riseIn = Math.min(S.riseIn, 0.6); return; }
    S.path = [];
    clearHint();
    for (let tries = 0; tries < 30; tries++) {
      for (let i = all.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [all[i], all[j]] = [all[j], all[i]];
      }
      let k = 0;
      S.cols = S.cols.map((col, c) => col.map(() => { const cell = all[k++]; cell.c = c; return cell; }));
      if (findMove()) break;
    }
    if (!findMove()) { // 섞어도 안 되면(예: 큰 수만 남음) 한 칸을 ★로 바꿔 줘요
      const cell = all[Math.floor(Math.random() * all.length)];
      cell.kind = 'star'; cell.v = 0;
      const el = els.get(cell.id);
      if (el) { el.remove(); els.delete(cell.id); }
    }
    sfx.shuffle();
    fxCenter(t('shuffled'));
    S.lastActAt = S.elapsed;
    render();
  }
  function later(fn, ms) { if (S) S.timers.push(setTimeout(fn, ms)); }

  function clearHint() {
    if (!S || !S.hint) return;
    for (const cell of S.hint) { const el = els.get(cell.id); if (el) el.classList.remove('hinted'); }
    S.hint = null;
  }
  function showHint() {
    if (!S || S.hint || S.path.length) return;
    const move = findMove();
    if (!move) return;
    S.hint = move;
    for (const cell of move) { const el = els.get(cell.id); if (el) el.classList.add('hinted'); }
  }

  /* ---------- 그리기 ---------- */
  function render() {
    if (S.vs) S.vs.dirty = true; // 온라인 상대에게 바뀐 판을 보내요
    const board = $('board');
    const alive = new Set();
    for (let c = 0; c < COLS; c++) {
      S.cols[c].forEach((cell, r) => {
        alive.add(cell.id);
        let el = els.get(cell.id);
        if (!el) {
          el = document.createElement('div');
          el.className = 'cell';
          el.innerHTML = cell.kind === 'n'
            ? `<i class="b n${cell.v}">${cell.v}</i>`
            : `<i class="b ${cell.kind}">${ICON[cell.kind]}</i>`;
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
    const state = pathState();
    const sum = state === 'ok' ? 10 : pathSum();
    for (const el of els.values()) el.classList.remove('sel', 'ok', 'over');
    // 붙어 있는 칸끼리 선으로 이어서 보여 줘요.
    const link = $('link');
    link.setAttribute('class', 'link' + (state ? ' ' + state : ''));
    link.setAttribute('d', S.path.slice(1).map((x, i) => `M${center(parentOf(i + 1)).join(' ')}L${center(x).join(' ')}`).join(''));
    for (const cell of S.path) {
      const el = els.get(cell.id);
      if (el) { el.classList.add('sel'); if (state) el.classList.add(state); }
    }
    const bubble = $('sumBubble');
    $('hint').style.visibility = S.path.length ? 'hidden' : ''; // 합계가 뜨는 자리라 잠시 숨겨요
    if (!S.path.length) { bubble.hidden = true; return; }
    bubble.hidden = false;
    bubble.className = 'sum-bubble' + (state ? ' ' + state : '');
    bubble.textContent = `${S.path.map(x => (x.kind === 'star' ? '★' : x.v)).join('+')} = ${sum}`;
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
    if (cell.kind === 'bomb') return;
    if (!last) { path.push(cell); sfx.pick(cell.v || 5); return; }
    if (cell === last) return;
    const back = path[path.length - 2];
    if (cell === back) { path.pop(); return; }
    if (canExtend(cell)) { path.push(cell); sfx.pick(cell.v || 5); }
  }

  // ★이 든 길은 숫자 합이 9가 되거나 손가락을 뗄 때 터져요(더 길게 이을 수 있게).
  const waitStar = () => pathHasStar() && pathSum() < 9;
  function check() {
    if (pathState() === 'ok' && !waitStar()) {
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
    S.lastActAt = S.elapsed;
    if (!S.tutorial) clearHint();
    if (!cell) { S.path = []; renderPath(); return; }
    if (cell.kind === 'bomb') { S.path = []; explode(cell); return; }
    try { $('board').setPointerCapture(e.pointerId); } catch (err) {}
    const path = S.path;
    const last = path[path.length - 1];
    const i = path.indexOf(cell);
    if (path.length === 1 && cell === last) {
      S.path = []; // 하나만 고른 칸을 다시 누르면 취소
    } else if (i >= 0) {
      S.path = path.slice(0, i + 1); // 고른 길 중간을 누르면 거기까지로 줄여요
    } else if (canExtend(cell)) {
      path.push(cell);
      sfx.pick(cell.v || 5);
    } else {
      S.path = [cell];
      sfx.pick(cell.v || 5);
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
    const st = pathState();
    if (st === 'ok') popPath();
    else if (st === 'over') {
      sfx.bad();
      S.path = [];
      renderPath();
    }
  }

  /* ---------- 터뜨리기 ---------- */
  function popPath() {
    const path = S.path;
    const n = path.length;
    const usedStar = pathHasStar();
    S.combo = S.elapsed - S.lastPopAt <= 3 ? S.combo + 1 : 1;
    S.lastPopAt = S.elapsed;
    const mult = Math.min(S.combo, 5);
    const pts = 5 * n * n * mult;
    S.score += pts;
    S.pops += 1;
    S.cleared += n;
    S.lastActAt = S.elapsed;
    clearHint();
    if (S.tutorial) { S.tutorial = false; store.set(KEY.tut, '1'); $('hint').textContent = t('hint'); }
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

    if (n >= 5) { S.score += 200; later(() => fxCenter(t('longChain')), 250); }
    if (S.vs) {
      if (usedStar) vsShield();
      vsAttack((S.combo % 3 === 0 ? 1 : 0) + (n >= 5 ? 1 : 0));
    }
    afterClear();
  }

  // 칸이 지워진 뒤: 레벨 확인, 다시 그리기, 잠시 뒤 막힘 검사
  function afterClear() {
    const lv = levelOf(S.cleared);
    if (lv > S.level) {
      S.level = lv;
      S.riseMax = riseTime(lv);
      S.riseIn = Math.min(S.riseIn, S.riseMax);
      sfx.level();
      fxCenter(t('levelUp', { n: lv }));
    }
    render();
    later(ensureMoves, 320);
  }

  // 폭탄: 자기 자신과 주변 8칸을 지워요. 지운 칸 × 10점.
  function explode(bomb) {
    const r0 = rowOf(bomb);
    const hitCells = [];
    for (let c = bomb.c - 1; c <= bomb.c + 1; c++) {
      if (c < 0 || c >= COLS) continue;
      for (let r = r0 - 1; r <= r0 + 1; r++) { const cell = S.cols[c][r]; if (cell) hitCells.push(cell); }
    }
    const pts = hitCells.length * 10;
    S.score += pts;
    S.pops += 1;
    S.cleared += hitCells.length;
    S.lastActAt = S.elapsed;
    clearHint();
    const br = els.get(bomb.id).getBoundingClientRect();
    fxAt(br.left + br.width / 2, br.top + br.height / 2, `+${pts}`, true);
    for (const cell of hitCells) {
      const el = els.get(cell.id);
      el.classList.remove('sel', 'ok', 'over');
      el.classList.add('pop');
      els.delete(cell.id);
      setTimeout(() => el.remove(), 300);
      const col = S.cols[cell.c];
      col.splice(col.indexOf(cell), 1);
    }
    sfx.boom();
    if (S.vs) vsAttack(1);
    afterClear();
  }

  /* ---------- 줄 올리기 ---------- */
  function rise(manual) {
    if (!S || !S.running) return;
    if (manual) {
      S.score += 5;
      const r = $('upBtn').getBoundingClientRect();
      fxAt(r.left + r.width / 2, r.top, '+5');
    }
    const ok = pushRow(true);
    S.riseMax = riseTime(S.level);
    S.riseIn = S.riseMax;
    sfx.rise();
    render();
    if (!ok) gameOver();
    else later(ensureMoves, 200);
  }

  /* ---------- 흐름 ---------- */
  function loop(ts) {
    const real = Math.max(0, (ts - lastTs) / 1000);
    lastTs = ts;
    if (!S || S.over) return;
    if (S.running) {
      const dt = Math.min(real, 0.25);
      S.elapsed += dt;
      if (!S.tutorial) S.riseIn -= dt; // 처음 하는 사람은 첫 조합을 터뜨릴 때까지 기다려 줘요
      if (!S.hint && !S.path.length && S.elapsed - S.lastActAt >= HINT_AFTER) showHint();
      if (S.vs) { vsStep(dt); if (S.over) return; }
      if (S.riseIn <= 0) rise(false);
      if (S.over) return;
      const fill = Math.min(1, Math.max(0, 1 - S.riseIn / S.riseMax));
      $('riseFill').style.width = (fill * 100).toFixed(1) + '%';
      $('nextSeconds').textContent = Math.max(0, S.riseIn).toFixed(1) + t('sec');
      $('riseFill').parentElement.classList.toggle('hurry', S.riseIn < 1.5);
    }
    raf = requestAnimationFrame(loop);
  }

  function clearTimers() {
    cancelAnimationFrame(raf);
    if (S) S.timers.forEach(clearTimeout);
  }

  function startGame(nextMode) {
    if (typeof nextMode === 'string') mode = nextMode;
    rng = isVs() ? seeded(vsCfg.seed) : isDaily() ? seeded(Number(mode.replace(/\D/g, ''))) : Math.random;
    $('vsBox').hidden = true;
    $('vsStrip').hidden = !isVs();
    clearTimers();
    $('pauseBox').hidden = true;
    $('overBox').hidden = true;
    for (const el of els.values()) el.remove();
    els.clear();
    show('game');
    layout();
    S = newState();
    for (let i = 0; i < START_ROWS; i++) pushRow(false);
    S.tutorial = !isVs() && store.get(KEY.tut, '') !== '1';
    if (isVs()) vsBegin();
    $('hint').textContent = t(S.tutorial ? 'hintTut' : 'hint');
    $('link').setAttribute('d', '');
    lastHud = '';
    $('riseFill').style.width = '0%';
    $('nextSeconds').textContent = S.riseMax.toFixed(1) + t('sec');
    $('gameMode').textContent = t(isVs() ? (vsCfg.kind === 'cpu' ? 'modeCpu' : 'modeNet') : isDaily() ? 'modeDaily' : 'modeSolo');
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
      ensureMoves();
      if (S.tutorial) showHint();
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
    const net = S.vs && S.vs.kind === 'net';
    if (!net) { S.running = false; S.dragging = false; } // 온라인 대전은 멈추지 않아요
    S.paused = true;
    $('pauseNote').textContent = t(net ? 'vsPause' : 'pauseNote');
    $('restartBtn').hidden = net;
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
    roomLeave();
    $('vsBox').hidden = true;
    if (S) { S.over = true; S.running = false; }
    $('pauseBox').hidden = true;
    $('overBox').hidden = true;
    $('countdown').hidden = true;
    show('title');
    $('titleBest').textContent = Number(store.get(KEY.best, '0')) || 0;
    loadHof();
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && S && S.running && !S.over && !(S.vs && S.vs.kind === 'net')) pause();
  });

  function gameOver() {
    if (S.vs) { vsEnd(false); return; }
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
    if (isBest) store.set(bestKey(), S.score);

    setTimeout(() => {
      $('board').classList.remove('danger');
      $('overTitle').textContent = 'GAME OVER';
      $('againBtn').textContent = t('again');
      $('againBtn').hidden = false;
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
  const scores = m => db.collection('boards').doc(m || mode).collection('scores');
  let hofTab = 'all'; // 첫 화면 순위표: 'all' 전체 기록 / 'daily' 오늘의 탑
  const hofMode = () => (hofTab === 'daily' ? dailyMode() : 'tower');

  let hofRows = null;
  let myId = null;
  async function fetchTop(m) {
    if (!db) throw new Error('no db');
    const snap = await scores(m).orderBy('score', 'desc').limit(10).get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }
  const esc = s => String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

  function hofMsg(key) {
    $('podium').hidden = true;
    $('hofList').innerHTML = `<li class="hof-msg">${t(key)}</li>`;
  }
  // 1~3위는 높이가 다른 탑(가운데가 1위), 4~10위는 아래 줄로 보여 줘요.
  function renderHof(rows) {
    if (!rows.length) { hofMsg('hofEmpty'); return; }
    const pod = i => {
      const r = rows[i];
      return r
        ? `<div class="pod p${i + 1}${r.id === myId ? ' me' : ''}"><span class="pod-nm">${esc(r.name)}</span><span class="pod-sc">${r.score}</span><span class="pod-step">${i + 1}</span></div>`
        : `<div class="pod p${i + 1} empty"><span class="pod-nm">-</span><span class="pod-sc">&nbsp;</span><span class="pod-step">${i + 1}</span></div>`;
    };
    $('podium').innerHTML = pod(1) + pod(0) + pod(2);
    $('podium').hidden = false;
    $('hofList').innerHTML = rows.slice(3).map((r, i) =>
      `<li class="${r.id === myId ? 'me' : ''}"><span class="rk">${i + 4}</span><span class="nm">${esc(r.name)}</span><span class="sc">${r.score}</span></li>`
    ).join('');
  }

  async function loadHof() {
    const list = $('hofList');
    const want = hofMode();
    document.querySelectorAll('.hof-tab').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.tab === hofTab)));
    try {
      const rows = await fetchTop(want);
      if (want !== hofMode()) return; // 그 사이 다른 탭을 눌렀으면 버려요
      hofRows = rows;
      renderHof(rows);
    } catch (e) {
      if (want !== hofMode()) return;
      hofRows = null;
      hofMsg('hofOff');
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

  /* ---------- 대전: 공격 · 예고 · 상쇄 ---------- */
  const WARN = 3; // 공격이 올라오기까지 예고 시간(초)
  const snapshot = cols => cols.map(col => col.map(x => (x.kind === 'n' ? x.v : x.kind[0])).join('')).join('|');
  const parseBoard = str => String(str || '').split('|').map(col => [...col].map(ch => (ch === 's' ? { v: 0, kind: 'star' } : ch === 'b' ? { v: 0, kind: 'bomb' } : { v: Number(ch) || 1, kind: 'n' })));
  const overflow = cols => cols.some(col => col.length > ROWS);

  // 컴퓨터 상대: 화면 없이 같은 규칙으로 혼자 플레이해요. 숫자 순서는 나와 같아요.
  function makeBot(level, seed) {
    const gen = seeded(seed);
    const pace = { easy: 3.4, normal: 2.5, hard: 1.8 }[level] || 2.5;
    const B = { name: t('cpu'), alive: true, cols: Array.from({ length: COLS }, () => []), out: 0, pend: [], el: 0, cleared: 0, lvl: 1, riseIn: riseTime(1), actIn: pace + 1.5, combo: 0, lastPop: -99 };
    const push = (special, g) => { for (let c = 0; c < COLS; c++) B.cols[c].unshift(makeCell(c, special, g)); if (overflow(B.cols)) B.alive = false; };
    for (let i = 0; i < START_ROWS; i++) push(false, gen);
    const attack = k => {
      while (k > 0 && B.pend.length) { const p = B.pend[0]; const c = Math.min(k, p.n); p.n -= c; k -= c; if (!p.n) B.pend.shift(); }
      B.out += k;
    };
    function act() {
      const cells = B.cols.flat();
      const move = cells.length ? findMove(B.cols) : null;
      if (!move) {
        if (cells.length < COLS * 3) { B.riseIn = Math.min(B.riseIn, 0.6); return; }
        for (let i = cells.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [cells[i], cells[j]] = [cells[j], cells[i]]; }
        let k = 0;
        B.cols = B.cols.map(col => col.map(() => cells[k++]));
        return;
      }
      let gone = move;
      let lines = 0;
      if (move.length === 1) { // 폭탄
        const c0 = B.cols.findIndex(col => col.includes(move[0]));
        const r0 = B.cols[c0].indexOf(move[0]);
        gone = [];
        for (let c = c0 - 1; c <= c0 + 1; c++) for (let r = r0 - 1; r <= r0 + 1; r++) { const x = B.cols[c] && B.cols[c][r]; if (x) gone.push(x); }
        lines = 1;
      } else {
        B.combo = B.el - B.lastPop <= 3 ? B.combo + 1 : 1;
        B.lastPop = B.el;
        if (move.some(x => x.kind === 'star')) B.pend = [];
        lines = (B.combo % 3 === 0 ? 1 : 0) + (move.length >= 5 ? 1 : 0);
      }
      B.cols = B.cols.map(col => col.filter(x => !gone.includes(x)));
      B.cleared += gone.length;
      B.lvl = levelOf(B.cleared);
      attack(lines);
    }
    B.step = dt => {
      if (!B.alive) return;
      B.el += dt;
      B.riseIn -= dt;
      if (B.riseIn <= 0) { push(true, gen); B.riseIn = riseTime(B.lvl); }
      while (B.alive && B.pend.length && B.el >= B.pend[0].due) { const p = B.pend.shift(); for (let i = 0; i < p.n && B.alive; i++) push(false, Math.random); }
      B.actIn -= dt;
      if (B.alive && B.actIn <= 0) { B.actIn = pace * (0.7 + Math.random() * 0.6); act(); }
    };
    B.poll = () => { const k = B.out; B.out = 0; return k; };
    B.take = k => { B.pend.push({ n: k, due: B.el + WARN }); };
    return B;
  }

  // 온라인 상대: 방 문서에 올라오는 상대 상태를 그대로 보여 줘요.
  function makeNetOpp() {
    const O = { name: '', alive: true, cols: [], sent: 0, seen: 0, lastSeen: performance.now(), stamp: 0 };
    O.step = () => { if (performance.now() - O.lastSeen > 15000) { O.alive = false; O.left = true; } };
    O.poll = () => { const d = Math.max(0, O.sent - O.seen); O.seen += d; return d; };
    O.take = k => { S.vs.sent += k; S.vs.dirty = true; };
    return O;
  }

  function vsBegin() {
    const net = vsCfg.kind === 'net';
    S.vs = { kind: vsCfg.kind, opp: net ? makeNetOpp() : makeBot(vsCfg.level, vsCfg.seed), pend: [], sent: 0, dirty: true, syncIn: 0, drawIn: 0 };
    if (net) {
      const d = room.data && room.data['p' + (1 - room.me)];
      S.vs.opp.name = (d && d.n) || '?';
    }
    $('oppName').textContent = S.vs.opp.name;
    $('oppState').textContent = '';
    renderPend();
    drawOpp();
    if (net) roomSync(true);
  }

  function vsAttack(k) {
    if (!S.vs || k <= 0) return;
    let cancel = 0;
    while (k > 0 && S.vs.pend.length) { const p = S.vs.pend[0]; const c = Math.min(k, p.n); p.n -= c; k -= c; cancel += c; if (!p.n) S.vs.pend.shift(); }
    if (cancel) later(() => fxCenter(t('offset', { n: cancel })), 120);
    if (k > 0) { S.vs.opp.take(k); sfx.send(); later(() => fxCenter(t('attack', { n: k })), cancel ? 500 : 120); }
    renderPend();
  }
  function vsShield() {
    if (!S.vs || !S.vs.pend.length) return;
    S.vs.pend = [];
    later(() => fxCenter(t('blocked')), 120);
    renderPend();
  }
  // 방해 줄: 예고가 끝나면 아래에서 한꺼번에 올라와요(특수 블록 없음).
  function garbage(n) {
    let ok = true;
    for (let i = 0; i < n && ok; i++) { for (let c = 0; c < COLS; c++) S.cols[c].unshift(makeCell(c, false, Math.random)); ok = !overflow(S.cols); }
    sfx.hitme();
    $('board').classList.add('shake');
    setTimeout(() => $('board').classList.remove('shake'), 300);
    render();
    if (!ok) gameOver(); else later(ensureMoves, 200);
  }
  function renderPend() {
    if (!S || !S.vs) return;
    const total = S.vs.pend.reduce((a, p) => a + p.n, 0);
    const soon = S.vs.pend.length && S.vs.pend[0].due - S.elapsed < 1;
    $('vsPend').className = 'vs-pend' + (soon ? ' soon' : '');
    $('vsPend').innerHTML = total ? '<i></i>'.repeat(Math.min(total, 8)) + (total > 8 ? `<b>+${total - 8}</b>` : '') : '<span>-</span>';
  }
  const OPP_COLORS = ['', '#ffb9c2', '#f6e27f', '#b7e6df', '#d9c8f7', '#fffbea', '#9a72e2', '#4db6b2', '#f7862a', '#e2382f'];
  function drawOpp() {
    const cv = $('oppCv');
    const g = cv.getContext('2d');
    const u = cv.width / COLS;
    g.clearRect(0, 0, cv.width, cv.height);
    const cols = S.vs.opp.cols;
    let top = 0;
    for (let c = 0; c < COLS; c++) {
      const col = cols[c] || [];
      top = Math.max(top, col.length);
      for (let r = 0; r < Math.min(col.length, ROWS); r++) {
        const x = col[r];
        g.fillStyle = x.kind === 'star' ? '#ffffff' : x.kind === 'bomb' ? '#172957' : OPP_COLORS[x.v];
        g.fillRect(c * u + 1, (ROWS - 1 - r) * u + 1, u - 2, u - 2);
      }
    }
    $('oppState').textContent = S.vs.opp.alive ? `${Math.min(top, ROWS)}/${ROWS}` : 'KO';
    $('oppCv').classList.toggle('hot', top >= ROWS - 1);
  }
  function vsStep(dt) {
    const V = S.vs;
    V.opp.step(dt);
    const inc = V.opp.poll();
    if (inc > 0) { V.pend.push({ n: inc, due: S.elapsed + WARN }); renderPend(); }
    if (V.pend.length && S.elapsed >= V.pend[0].due) { const p = V.pend.shift(); renderPend(); garbage(p.n); if (S.over) return; }
    V.drawIn -= dt;
    if (V.drawIn <= 0) { V.drawIn = 0.25; drawOpp(); renderPend(); }
    if (V.kind === 'net') { V.syncIn -= dt; if (V.syncIn <= 0) roomSync(false); }
    if (!V.opp.alive) vsEnd(true);
  }
  function vsEnd(win) {
    if (!S || S.over) return;
    S.over = true;
    S.vs.won = win;
    S.running = false;
    S.path = [];
    clearTimers();
    renderPath();
    drawOpp();
    if (win) sfx.win(); else sfx.over();
    track(win ? 'vs-win' : 'vs-lose');
    if (S.vs.kind === 'net') roomSync(true, !win);
    const left = win && S.vs.opp.left;
    setTimeout(() => {
      $('overTitle').textContent = t(win ? 'win' : 'lose');
      $('overScore').textContent = S.score;
      $('overBadge').hidden = !left;
      $('overBadge').textContent = t('oppLeft');
      $('stPops').textContent = S.pops;
      $('stChain').textContent = S.maxChain;
      $('stCombo').textContent = S.maxCombo;
      $('rankForm').hidden = true;
      $('shareBtn').hidden = true;
      $('againBtn').textContent = t('rematch');
      $('againBtn').hidden = !!left;
      $('overBox').hidden = false;
    }, 700);
  }
  function startCpu(level) {
    vsCfg = { kind: 'cpu', level, seed: (Math.random() * 2 ** 31) | 0 };
    track('vs-cpu-' + level);
    startGame('vs');
  }
  function again() {
    $('againBtn').hidden = false;
    if (!isVs()) { startGame(); return; }
    if (vsCfg.kind === 'cpu') { startCpu(vsCfg.level); return; }
    roomStart();
  }

  /* ---------- 대전: 온라인 방 (Firestore 문서 하나를 둘이 같이 봐요) ---------- */
  // 방 문서: { v, seed, state: 'wait' | 'play', round, at, p0, p1 }
  // 선수 칸(p0/p1): { n 이름, b 판 모양, s 보낸 공격 줄 수(누적), a 살아 있음, t 보낸 시각, r 판 번호 }
  const mock = new URLSearchParams(location.search).get('mocknet') === '1'; // 자동 검사용(브라우저 탭끼리만 연결)
  const Net = mock ? (() => {
    const key = c => 'tower:room:' + c;
    const bc = new BroadcastChannel('tower-mock');
    const subs = new Map();
    const read = c => { try { return JSON.parse(localStorage.getItem(key(c))); } catch (e) { return null; } };
    const fire = c => (subs.get(c) || []).forEach(cb => cb(read(c)));
    bc.onmessage = e => fire(e.data);
    const last = {};
    setInterval(() => subs.forEach((_, c) => { const raw = localStorage.getItem(key(c)); if (raw !== last[c]) { last[c] = raw; fire(c); } }), 300);
    const write = (c, d) => { localStorage.setItem(key(c), JSON.stringify(d)); bc.postMessage(c); setTimeout(() => fire(c), 0); };
    return {
      ok: () => true,
      get: async c => read(c),
      create: async (c, d) => write(c, { ...d, at: Date.now() }),
      update: async (c, patch) => write(c, { ...read(c), ...patch }),
      sub: (c, cb) => { subs.set(c, [...(subs.get(c) || []), cb]); setTimeout(() => cb(read(c)), 0); return () => subs.set(c, (subs.get(c) || []).filter(x => x !== cb)); },
    };
  })() : {
    ok: () => !!db,
    get: async c => { const d = await db.collection('towerRooms').doc(c).get(); return d.exists ? d.data() : null; },
    create: (c, d) => db.collection('towerRooms').doc(c).set({ ...d, at: firebase.firestore.FieldValue.serverTimestamp() }),
    update: (c, patch) => db.collection('towerRooms').doc(c).update(patch),
    sub: (c, cb) => db.collection('towerRooms').doc(c).onSnapshot(snap => cb(snap.exists ? snap.data() : null), () => cb(null)),
  };

  let room = null; // { code, me: 0 | 1, name, data, round, unsub, beat }
  const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const newCode = () => Array.from({ length: 5 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');
  const newSeed = () => 1 + Math.floor(Math.random() * 2000000000);
  const fresh = p => p && p.a !== false && Date.now() - (p.t || 0) < 20000;
  const inviteUrl = () => 'https://studiojhl.com/tower/?room=' + room.code + (lang === 'en' ? '&lang=en' : '');

  function myCard() {
    const playing = S && S.vs && S.vs.kind === 'net' && isVs();
    return {
      n: room.name,
      b: playing ? snapshot(S.cols) : '',
      s: playing ? S.vs.sent : 0,
      a: true,
      e: playing && S.over ? (S.vs.won ? 'w' : 'l') : '',
      t: Date.now(),
      r: room.round || 0,
    };
  }
  // 내 상태를 방에 올려요. 변화가 있을 때는 1.2초마다, 없을 때는 4초마다.
  function roomSync(force, dead) {
    if (!room) return;
    const V = S && S.vs;
    if (V) {
      if (!force && !V.dirty && (V.idle = (V.idle || 0) + 1) < 3) { V.syncIn = 1.2; return; }
      V.dirty = false; V.idle = 0; V.syncIn = 1.2;
    }
    const card = myCard();
    if (dead) card.a = false;
    Net.update(room.code, { ['p' + room.me]: card }).catch(() => {});
  }
  function roomErr(key) { const n = $('vsErr'); n.textContent = key ? t(key) : ''; }
  function roomName() {
    const r = cleanName($('vsName').value);
    if (r.err) { roomErr(r.err); return null; }
    store.set(KEY.name, r.name);
    return r.name;
  }
  async function roomCreate() {
    const name = roomName();
    if (!name) return;
    if (!Net.ok()) { roomErr('vsOff'); return; }
    const code = newCode();
    room = { code, me: 0, name, round: 0, data: null };
    try {
      await Net.create(code, { v: 1, seed: newSeed(), state: 'wait', round: 0, p0: myCard() });
      roomEnter();
    } catch (e) { room = null; roomErr('vsOff'); }
  }
  async function roomJoin() {
    const name = roomName();
    if (!name) return;
    const code = $('vsCode').value.trim().toUpperCase();
    if (!/^[A-Z0-9]{5}$/.test(code)) { roomErr('vsCodeBad'); return; }
    if (!Net.ok()) { roomErr('vsOff'); return; }
    try {
      const d = await Net.get(code);
      if (!d) { roomErr('vsNoRoom'); return; }
      const me = !fresh(d.p0) ? 0 : !fresh(d.p1) ? 1 : -1; // 빈자리에 앉아요
      if (me < 0) { roomErr('vsFull'); return; }
      room = { code, me, name, round: d.round || 0, data: d };
      await Net.update(code, { ['p' + me]: myCard() });
      roomEnter();
    } catch (e) { room = null; roomErr('vsOff'); }
  }
  function roomEnter() {
    roomErr('');
    track('vs-room');
    $('vsHome').hidden = true;
    $('vsRoom').hidden = false;
    $('vsRoomCode').textContent = room.code;
    room.unsub = Net.sub(room.code, roomUpdate);
    room.beat = setInterval(() => { if (room && !(S && S.vs && S.running && isVs())) roomSync(true); }, 4000);
  }
  function roomUpdate(d) {
    if (!room || !d) return;
    room.data = d;
    const mine = d['p' + room.me];
    const opp = d['p' + (1 - room.me)];
    const there = fresh(opp);
    $('vsP0').textContent = (mine && mine.n) || room.name;
    $('vsP1').textContent = there ? opp.n : t('vsEmpty');
    $('vsP1').classList.toggle('empty', !there);
    $('vsStart').hidden = room.me !== 0;
    $('vsStart').disabled = !there;
    $('vsRoomMsg').textContent = t(room.me !== 0 ? 'vsWaitHost' : there ? 'vsReady' : 'vsWaitFriend');
    // 새 판 시작 신호
    if (d.state === 'play' && d.round > room.round) {
      room.round = d.round;
      vsCfg = { kind: 'net', seed: d.seed };
      startGame('vs');
      return;
    }
    // 진행 중: 상대 상태 반영
    const V = S && !S.over && S.vs && S.vs.kind === 'net' ? S.vs : null;
    if (V && opp && opp.r === room.round) {
      const O = V.opp;
      if (opp.t !== O.stamp) { O.stamp = opp.t; O.lastSeen = performance.now(); }
      O.name = opp.n || O.name;
      O.sent = opp.s || 0;
      O.cols = parseBoard(opp.b);
      if (opp.a === false || opp.e === 'l') O.alive = false;
      if (opp.e === 'w' && !S.over) vsEnd(false); // 상대 쪽에서 이미 이겼다고 끝났어요(내 연결이 끊겼던 경우)
    }
  }
  function roomStart() {
    if (!room || !room.data) return;
    Net.update(room.code, { state: 'play', round: (room.data.round || 0) + 1, seed: newSeed() }).catch(() => roomErr('vsOff'));
  }
  function roomLeave() {
    if (!room) return;
    const r = room;
    room = null;
    clearInterval(r.beat);
    try { if (r.unsub) r.unsub(); } catch (e) {}
    Net.update(r.code, { ['p' + r.me]: { n: r.name, b: '', s: 0, a: false, t: Date.now(), r: r.round || 0 } }).catch(() => {});
  }
  function vsOpen(code) {
    roomErr('');
    $('vsHome').hidden = false;
    $('vsRoom').hidden = true;
    $('vsName').value = store.get(KEY.name, '');
    if (code) $('vsCode').value = code;
    $('vsBox').hidden = false;
  }
  function vsCloseBox() { roomLeave(); $('vsBox').hidden = true; }
  async function invite() {
    if (!room) return;
    const text = `${t('inviteText', { c: room.code })}\n${inviteUrl()}`;
    track('vs-invite');
    if (navigator.share) {
      try { await navigator.share({ title: 'TEN TOWER', text }); return; } catch (e) { if (e && e.name === 'AbortError') return; }
    }
    try { await navigator.clipboard.writeText(text); toast(t('copied')); }
    catch (e) { window.prompt('', text); }
  }

  /* ---------- 자랑하기 ---------- */
  async function share() {
    if (!S) return;
    const url = 'https://studiojhl.com/tower/' + (lang === 'en' ? '?lang=en' : '');
    const text = `${t(isDaily() ? 'shareDaily' : 'shareText', { s: S.score })}\n${url}`;
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

  $('startBtn').addEventListener('click', () => startGame('tower'));
  $('dailyBtn').addEventListener('click', () => startGame(dailyMode()));
  document.querySelectorAll('.hof-tab').forEach(b => b.addEventListener('click', () => {
    if (hofTab === b.dataset.tab) return;
    hofTab = b.dataset.tab;
    hofMsg('loading');
    loadHof();
  }));
  $('upBtn').addEventListener('click', () => rise(true));
  $('pauseBtn').addEventListener('click', pause);
  $('resumeBtn').addEventListener('click', resume);
  $('restartBtn').addEventListener('click', again);
  $('quitBtn').addEventListener('click', toTitle);
  $('againBtn').addEventListener('click', again);
  $('vsBtn').addEventListener('click', () => vsOpen());
  $('vsClose').addEventListener('click', vsCloseBox);
  $('vsLeave').addEventListener('click', vsCloseBox);
  document.querySelectorAll('[data-cpu]').forEach(b => b.addEventListener('click', () => startCpu(b.dataset.cpu)));
  $('vsCreate').addEventListener('click', roomCreate);
  $('vsJoinForm').addEventListener('submit', e => { e.preventDefault(); roomJoin(); });
  $('vsInvite').addEventListener('click', invite);
  $('vsStart').addEventListener('click', roomStart);
  window.addEventListener('pagehide', roomLeave);
  $('homeBtn').addEventListener('click', toTitle);
  $('shareBtn').addEventListener('click', share);
  $('rankForm').addEventListener('submit', saveRank);
  $('soundBtn').addEventListener('click', () => setSound(!soundOn));
  $('langBtn').addEventListener('click', () => {
    lang = lang === 'ko' ? 'en' : 'ko';
    store.set(KEY.lang, lang);
    applyLang();
    if (S && !S.over) $('hint').textContent = t(S.tutorial ? 'hintTut' : 'hint');
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
  $('todayNum').textContent = Number(todayKey().slice(6));
  loadHof();
  // 초대 링크(?room=코드)로 들어오면 바로 대전 창을 열어요.
  const invited = (new URLSearchParams(location.search).get('room') || '').toUpperCase();
  if (/^[A-Z0-9]{5}$/.test(invited)) vsOpen(invited);

  // 테스트용 (자동 검사에서만 써요)
  window.__tower = { get state() { return S; }, get room() { return room; }, vsAttack, renderHof, popPath, rise, findMove, ensureMoves, explode, showHint };
})();
