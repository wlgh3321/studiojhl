/* JHL STUDIO — AI 비용 계산기: 토큰·구독·영상·음성 비용을 바로 계산해요 */
(() => {
  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));
  let lang = (document.documentElement.lang || 'ko').toLowerCase().startsWith('ko') ? 'ko' : 'en';
  const L = (ko, en) => (lang === 'en' ? en : ko);

  /* 단가는 2026-11-21에 각 서비스 공식 가격 페이지에서 확인했어요. 100만 토큰(1M)당 달러예요. */
  const MODELS = [
    { id: 'gpt-6.2-sol', vendor: 'OpenAI', name: 'GPT-6.2 Sol', inp: 2, out: 10, cache: 0.10 },
    { id: 'gpt-6.2-astra', vendor: 'OpenAI', name: 'GPT-6.2 Astra', inp: 8, out: 40, cache: 0.40 },
    { id: 'gpt-6.1-sol', vendor: 'OpenAI', name: 'GPT-6.1 Sol', inp: 2, out: 10, cache: 0.10 },
    { id: 'gpt-6.1-terra', vendor: 'OpenAI', name: 'GPT-6.1 Terra', inp: 1, out: 5, cache: 0.05 },
    { id: 'gpt-6-luna', vendor: 'OpenAI', name: 'GPT-6 Luna', inp: 0.10, out: 0.50, cache: 0.01 },
    { id: 'gpt-5.6-sol', vendor: 'OpenAI', name: 'GPT-5.6 Sol', inp: 4, out: 20, cache: 0.40 },
    { id: 'gpt-5.6-terra', vendor: 'OpenAI', name: 'GPT-5.6 Terra', inp: 2, out: 12, cache: 0.20 },
    { id: 'gpt-5.6-luna', vendor: 'OpenAI', name: 'GPT-5.6 Luna', inp: 0.20, out: 1.20, cache: 0.02 },
    { id: 'gpt-5.4', vendor: 'OpenAI', name: 'GPT-5.4', inp: 2.50, out: 15, cache: 0.25 },
    { id: 'gpt-5.4-mini', vendor: 'OpenAI', name: 'GPT-5.4 mini', inp: 0.75, out: 4.50, cache: 0.075 },
    { id: 'gpt-4o', vendor: 'OpenAI', name: 'GPT-4o', inp: 2.50, out: 10, cache: 1.25 },

    { id: 'claude-fable-5.2', vendor: 'Anthropic', name: 'Claude Fable 5.2', inp: 8, out: 40, cache: 0.20 },
    { id: 'claude-opus-5.5', vendor: 'Anthropic', name: 'Claude Opus 5.5', inp: 4, out: 20, cache: 0.20 },
    { id: 'claude-sonnet-5.5', vendor: 'Anthropic', name: 'Claude Sonnet 5.5', inp: 2, out: 10, cache: 0.10 },
    { id: 'claude-sonnet-4.6', vendor: 'Anthropic', name: 'Claude Sonnet 4.6', inp: 3, out: 15, cache: 0.30 },
    { id: 'claude-haiku-5.5', vendor: 'Anthropic', name: 'Claude Haiku 5.5', inp: 0.10, out: 0.50, cache: 0.01 },
    { id: 'claude-haiku-4.5', vendor: 'Anthropic', name: 'Claude Haiku 4.5', inp: 1, out: 5, cache: 0.10 },

    { id: 'gemini-4-carbon', vendor: 'Google', name: 'Gemini 4 Carbon', inp: 2, out: 10, cache: 0.10 },
    { id: 'gemini-4-argon', vendor: 'Google', name: 'Gemini 4 Argon', inp: 2, out: 10, cache: 0.10 },
    { id: 'gemini-4-neon', vendor: 'Google', name: 'Gemini 4 Neon', inp: 3, out: 15, cache: 0.15 },
    { id: 'gemini-4-hydrogen', vendor: 'Google', name: 'Gemini 4 Hydrogen', inp: 1.50, out: 7.50, cache: 0.075 },
    { id: 'gemini-3.8-flash', vendor: 'Google', name: 'Gemini 3.8 Flash', inp: 0.75, out: 3.75, cache: 0.075 },
    { id: 'gemini-3.5-flash-lite', vendor: 'Google', name: 'Gemini 3.5 Flash-Lite', inp: 0.30, out: 2.50, cache: 0.03 }
  ];

  const VIDEO_RATE = { '360p': 0.023, '720p': 0.07, '1080p': 0.104, '4k': 0.209 };

  /* ElevenLabs: 글자 1개 = 1크레딧 (V2 멀티링구얼 기준), 월 결제 가격 */
  const TTS_PLANS = [
    { name: 'Free', credits: 10000, price: 0 },
    { name: 'Starter', credits: 30000, price: 6 },
    { name: 'Creator', credits: 121000, price: 22 },
    { name: 'Pro', credits: 600000, price: 99 },
    { name: 'Scale', credits: 1800000, price: 299 },
    { name: 'Business', credits: 6000000, price: 990 }
  ];

  const els = {
    model: $('#model'), req: $('#req'), tin: $('#tin'), tout: $('#tout'),
    cached: $('#cached'), batch: $('#batch'), rate: $('#rate'),
    apiCost: $('#apiCost'), apiKrw: $('#apiKrw'), apiPerReq: $('#apiPerReq'), hint: $('#hint'),
    cmpBody: $('#cmpBody'), subCost: $('#subCost'), subKrw: $('#subKrw'),
    videoMin: $('#videoMin'), videoQ: $('#videoQ'), videoCost: $('#videoCost'), videoKrw: $('#videoKrw'),
    chars: $('#chars'), ttsCost: $('#ttsCost'), ttsKrw: $('#ttsKrw'), ttsLine: $('#ttsLine'),
    totalUsd: $('#totalUsd'), totalKrw: $('#totalKrw'),
    sumApi: $('#sumApi'), sumMedia: $('#sumMedia'), sumSub: $('#sumSub'),
    toast: $('#toast')
  };
  if (!els.model) return;

  const N = (el, d = 0) => {
    const v = parseFloat(String(el.value).replace(/,/g, ''));
    return Number.isFinite(v) && v >= 0 ? v : d;
  };
  const rate = () => N(els.rate, 1331) || 1331;

  function fmtUsd(v) {
    v = Number(v) || 0;
    if (v <= 0) return '$0';
    if (v < 0.01) return '$' + v.toFixed(4);
    if (v < 1) return '$' + v.toFixed(3);
    if (v < 1000) return '$' + v.toFixed(2);
    return '$' + group(v);
  }
  function group(n) {
    return String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
  function fmtKrw(usd) {
    const v = Math.round(usd * rate());
    if (v <= 0) return '₩0';
    return '₩' + group(v);
  }
  function fmtTokens(n) {
    if (!Number.isFinite(n) || n <= 0) return '0';
    if (n >= 1e6) {
      const v = n / 1e6;
      return (v >= 100 ? Math.round(v) : Math.round(v * 10) / 10).toString().replace(/\.0$/, '') + 'M';
    }
    if (n >= 1000) return group(n / 1000) + 'K';
    return String(Math.round(n));
  }

  function monthlyCost(m, req, tin, tout, cachedPct, batch) {
    const share = Math.min(100, Math.max(0, cachedPct)) / 100;
    const inTok = req * tin;
    const outTok = req * tout;
    const cachedTok = inTok * share;
    const freshTok = inTok - cachedTok;
    const cacheRate = m.cache == null ? m.inp : m.cache;
    let c = (freshTok * m.inp + cachedTok * cacheRate + outTok * m.out) / 1e6;
    if (batch) c *= 0.5;
    return c;
  }

  // 모델 목록 채우기
  const vendors = Array.from(new Set(MODELS.map(m => m.vendor)));
  els.model.innerHTML = vendors.map(v =>
    `<optgroup label="${v}">` + MODELS.filter(m => m.vendor === v).map(m =>
      `<option value="${m.id}">${m.name} — $${m.inp} / $${m.out}</option>`
    ).join('') + '</optgroup>'
  ).join('');
  els.model.value = 'gpt-6.2-sol';

  function renderApi() {
    const m = MODELS.find(x => x.id === els.model.value) || MODELS[0];
    const req = N(els.req);
    const tin = N(els.tin);
    const tout = N(els.tout);
    const cached = N(els.cached);
    const batch = !!els.batch.checked;

    const cost = monthlyCost(m, req, tin, tout, cached, batch);
    els.apiCost.textContent = fmtUsd(cost);
    els.apiKrw.textContent = fmtKrw(cost);
    els.apiPerReq.textContent = req > 0
      ? L(`요청 1건당 ${fmtUsd(cost / req)} · 월 ${fmtTokens(req * (tin + tout))} 토큰`,
          `${fmtUsd(cost / req)} per request · ${fmtTokens(req * (tin + tout))} tokens a month`)
      : L('요청 수를 넣으면 바로 계산돼요', 'Add your usage to see the number');

    const rows = MODELS.map(x => ({ m: x, cost: monthlyCost(x, req, tin, tout, cached, batch) }))
      .sort((a, b) => a.cost - b.cost);

    els.cmpBody.innerHTML = rows.map((r, i) => {
      const picked = r.m.id === m.id;
      const badge = i === 0 ? ` <span class="cheap">${L('최저', 'LOWEST')}</span>` : '';
      return `<tr class="${picked ? 'is-picked' : ''}">`
        + `<td>${r.m.name}${badge}<span class="vendor">${r.m.vendor}</span></td>`
        + `<td>$${r.m.inp.toFixed(2)}</td>`
        + `<td>$${r.m.out.toFixed(2)}</td>`
        + `<td class="cost">${fmtUsd(r.cost)}</td></tr>`;
    }).join('');

    if (req > 0 && rows.length) {
      const best = rows[0];
      const saving = cost - best.cost;
      els.hint.textContent = (best.m.id !== m.id && saving > 0.005)
        ? L(`같은 사용량을 ${best.m.name}에 넣으면 월 ${fmtUsd(best.cost)}, 지금보다 ${fmtUsd(saving)} 아껴요.`,
            `The same workload on ${best.m.name} costs ${fmtUsd(best.cost)} a month, saving ${fmtUsd(saving)}.`)
        : L(`이 사용량에서는 지금 고른 모델(${m.name})이 가장 저렴해요.`,
            `${m.name} is already the cheapest for this workload.`);
      els.hint.hidden = false;
    } else {
      els.hint.hidden = true;
    }
    return cost;
  }

  function renderSubs() {
    let total = 0;
    $$('.sub-check').forEach(c => {
      const row = c.closest('.sub-row');
      const seats = row.querySelector('.sub-seats');
      seats.disabled = !c.checked;
      if (c.checked) {
        const n = Math.max(1, Math.min(99, parseInt(seats.value, 10) || 1));
        total += parseFloat(c.dataset.price || '0') * n;
      }
    });
    els.subCost.textContent = fmtUsd(total);
    els.subKrw.textContent = fmtKrw(total);
    return total;
  }

  function renderMedia() {
    const minutes = N(els.videoMin);
    const vRate = VIDEO_RATE[els.videoQ.value] || VIDEO_RATE['720p'];
    const video = minutes * 60 * vRate;
    els.videoCost.textContent = fmtUsd(video);
    els.videoKrw.textContent = fmtKrw(video);

    const chars = N(els.chars);
    let tts = 0;
    let label = '';
    if (chars <= 0) {
      label = L('글자 수를 넣어 주세요', 'Enter the number of characters');
    } else {
      const plan = TTS_PLANS.find(p => chars <= p.credits);
      if (plan) {
        tts = plan.price;
        label = plan.price === 0
          ? L('Free — 무료 플랜으로 충분해요', 'Free — the free plan covers it')
          : `${plan.name} (${fmtUsd(plan.price)}/${L('월', 'mo')})`;
      } else {
        const units = Math.ceil(chars / 6000000);
        tts = units * 990;
        label = `Business × ${units} (${L('그 이상은 Enterprise 상담', 'Enterprise above that')})`;
      }
    }
    els.ttsCost.textContent = fmtUsd(tts);
    els.ttsKrw.textContent = fmtKrw(tts);
    els.ttsLine.innerHTML = L(
      `필요 크레딧 <b>${fmtTokens(chars)}</b> · 추천 플랜 <b>${label}</b>`,
      `Credits needed <b>${fmtTokens(chars)}</b> · Suggested plan <b>${label}</b>`
    );
    return { video, tts, media: video + tts };
  }

  let last = { api: 0, video: 0, tts: 0, sub: 0 };

  function renderAll() {
    const api = renderApi();
    const sub = renderSubs();
    const media = renderMedia();
    last = { api, video: media.video, tts: media.tts, sub };
    const total = api + media.media + sub;
    els.totalUsd.textContent = fmtUsd(total);
    els.totalKrw.textContent = fmtKrw(total);
    els.sumApi.textContent = fmtUsd(api);
    els.sumMedia.textContent = fmtUsd(media.media);
    els.sumSub.textContent = fmtUsd(sub);
  }

  // 예시 사용량 채우기
  const PRESETS = {
    chat: { req: 30000, tin: 1000, tout: 300, chars: 60000 },
    summary: { req: 5000, tin: 8000, tout: 800, chars: 0 },
    agent: { req: 20000, tin: 20000, tout: 2000, chars: 0 }
  };
  $$('[data-preset]').forEach(btn => btn.addEventListener('click', () => {
    const p = PRESETS[btn.dataset.preset];
    if (!p) return;
    els.req.value = p.req;
    els.tin.value = p.tin;
    els.tout.value = p.tout;
    if (p.chars) els.chars.value = p.chars;
    renderAll();
  }));

  $$('input, select').forEach(el => {
    el.addEventListener('input', renderAll);
    el.addEventListener('change', renderAll);
  });

  // 결과 복사
  const copyBtn = $('#copyBtn');
  let toastTimer = 0;
  function say(msg) {
    if (!els.toast) return;
    els.toast.textContent = msg;
    els.toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { els.toast.hidden = true; }, 1900);
  }
  function summaryText() {
    const m = MODELS.find(x => x.id === els.model.value) || MODELS[0];
    const total = last.api + last.video + last.tts + last.sub;
    const lines = [
      L('JHL STUDIO AI 비용 계산기', 'JHL STUDIO AI cost calculator'),
      `${L('모델', 'Model')}: ${m.name}`,
      `${L('사용량', 'Usage')}: ${group(N(els.req))} ${L('요청/월', 'requests/month')}, ${group(N(els.tin))} in / ${group(N(els.tout))} out ${L('토큰', 'tokens')}`,
      `API: ${fmtUsd(last.api)} (${fmtKrw(last.api)})`,
      `${L('영상·음성', 'Video & voice')}: ${fmtUsd(last.video + last.tts)}`,
      `${L('구독', 'Subscriptions')}: ${fmtUsd(last.sub)}`,
      `${L('월 예상 비용', 'Estimated monthly')}: ${fmtUsd(total)} (${fmtKrw(total)})`,
      'https://studiojhl.com/tools/ai-cost-calculator/'
    ];
    return lines.join('\n');
  }
  if (copyBtn) copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(summaryText());
      say(L('계산 결과를 복사했어요', 'Result copied'));
    } catch (e) {
      say(L('복사가 안 됐어요. 화면의 숫자를 직접 옮겨 주세요', 'Could not copy — please copy the numbers manually'));
    }
  });

  // 언어를 바꾸면 계산 결과 문구도 같이 바꿔요
  new MutationObserver(() => {
    const l = (document.documentElement.lang || 'ko').toLowerCase().startsWith('ko') ? 'ko' : 'en';
    if (l !== lang) { lang = l; renderAll(); }
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });

  renderAll();
})();
