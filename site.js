/* JHL STUDIO: 언어 바꾸기, 메일 주소 복사, 방문 통계 */
(() => {
  const KEY = 'jhl.lang';
  let lang = 'ko';
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === 'ko' || saved === 'en') lang = saved;
    else if (!(navigator.language || 'ko').toLowerCase().startsWith('ko')) lang = 'en';
  } catch (e) {}
  // 언어 버튼이 없는 페이지(한국어 글)는 그 페이지 언어 그대로 둬요
  if (!document.querySelector('[data-set-lang]')) lang = document.documentElement.lang || 'ko';

  function apply(l) {
    lang = l;
    document.documentElement.lang = l;
    document.querySelectorAll('[data-only]').forEach(n => { n.hidden = n.dataset.only !== l; });
    document.querySelectorAll('[data-set-lang]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.setLang === l)));
  }
  document.querySelectorAll('[data-set-lang]').forEach(b => b.addEventListener('click', () => {
    apply(b.dataset.setLang);
    try { localStorage.setItem(KEY, lang); } catch (e) {}
  }));
  apply(lang);

  // 메일 주소 복사
  const btn = document.getElementById('copyMail');
  const toast = document.getElementById('toast');
  let timer = 0;
  function say(msg) {
    toast.textContent = msg;
    toast.hidden = false;
    clearTimeout(timer);
    timer = setTimeout(() => { toast.hidden = true; }, 1800);
  }
  if (btn) btn.addEventListener('click', async () => {
    const mail = document.getElementById('mail').textContent.trim();
    try {
      await navigator.clipboard.writeText(mail);
      say(lang === 'en' ? 'Copied!' : '메일 주소를 복사했어요');
    } catch (e) {
      const r = document.createRange();
      r.selectNodeContents(document.getElementById('mail'));
      const s = getSelection(); s.removeAllRanges(); s.addRange(r);
      say(lang === 'en' ? 'Selected. Copy it with your keyboard.' : '주소를 선택했어요. 복사해서 써 주세요');
    }
  });

  // 안드로이드는 아직 앱이 없어서, 강조 버튼을 "웹에서 하기" 쪽으로 바꿔요
  if (/Android/i.test(navigator.userAgent)) document.querySelectorAll('[data-cta-pair]').forEach(g => {
    const a = g.querySelector('[data-cta="app"]'), w = g.querySelector('[data-cta="web"]');
    if (!a || !w) return;
    const c = a.className; a.className = w.className; w.className = c;
    g.insertBefore(w, a);
  });
  // 글 아래 "하러 가기" 버튼: 아이폰·아이패드는 App Store로, 나머지는 웹 게임으로 (/get/ 이 알아서 보내요)

  // 방문 통계(GoatCounter): 셈셈 놀이터와 구분되게 경로 앞에 /studio 를 붙여요.
  if (location.protocol.startsWith('http')) {
    window.goatcounter = { path: p => '/studio' + p };
    const gc = document.createElement('script');
    gc.async = true;
    gc.src = 'https://gc.zgo.at/count.js';
    gc.dataset.goatcounter = 'https://sumsum.goatcounter.com/count';
    document.body.appendChild(gc);
  }
})();
