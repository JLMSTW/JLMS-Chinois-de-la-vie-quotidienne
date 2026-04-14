import { GAS_ENDPOINT, SHEETS, ACCESS_ENDPOINT } from "../js/config.js";
import { shuffle, sample } from "../js/shared/shuffle.js";
import { formatTime } from "../js/shared/timer.js";
import { adaptMemoryItem } from "../js/shared/dataAdapter.js";

// ═══════════════════════════════════════════════
//  ROUND CONFIG
// ═══════════════════════════════════════════════
const ROUND_DEF = [
  { icon: '🔤', type: 'vocab-match',  qCount: 10, pts: 0.5,
    en: { name: 'Vocabulary Match',      desc: 'Tap the Chinese word to hear it, then choose the correct meaning.' },
    fr: { name: 'Association de mots',   desc: "Appuyez sur le mot pour l'entendre, puis choisissez la bonne signification." } },

  { icon: '✏️', type: 'fill-blank',   qCount: 5,  pts: 1,
    en: { name: 'Fill in the Blank',     desc: 'Pick the correct word for each sentence. 3 words are extra — use only what fits!' },
    fr: { name: 'Complétez les phrases', desc: 'Choisissez le bon mot pour chaque phrase. 3 mots sont en trop !' } },

  { icon: '🧩', type: 'sentence-build', qCount: 5,  pts: 1,
    en: { name: 'Sentence Building',     desc: 'Arrange the word blocks in the correct order. Tap a block to hear it.' },
    fr: { name: 'Construction de phrases', desc: 'Arrangez les blocs dans le bon ordre. Appuyez sur un bloc pour l\'entendre.' } },

  { icon: '🔊', type: 'listening',    qCount: 10, pts: 0.5,
    en: { name: 'Listening',            desc: 'Part 1: Hear a word → choose its meaning. Part 2: Hear a sentence → choose its meaning.' },
    fr: { name: 'Compréhension orale',  desc: 'Partie 1 : Écoutez un mot → choisissez sa signification. Partie 2 : Écoutez une phrase → choisissez sa signification.' } },

  { icon: '🎵', type: 'pinyin',       qCount: 5,  pts: 1,
    en: { name: 'Pinyin Quiz',          desc: 'Look at the character and its meaning, then choose the correct pinyin (with tones).' },
    fr: { name: 'Quiz de pinyin',       desc: 'Regardez le caractère et sa signification, puis choisissez le bon pinyin (avec les tons).' } },
];

// Q counter: global Q index start per round
// R1:0-9  R2:10-14  R3:15-19  R4:20-29  R5:30-34
const Q_START  = [0, 10, 15, 20, 30];
const TOTAL_Q  = 35;
const MAX_PTS  = 25;

const LESSON_MAP = { B1:[1,5], B2:[6,10], B3:[11,15], B4:[16,20], B5:[21,25] };

// ═══════════════════════════════════════════════
//  STATE
// ═══════════════════════════════════════════════
const S = {
  lang: 'fr', book: 'B1', lesson: 'all',
  vocab: [], sents: [],
  _allVocab: [], _allSents: [],
  rounds: [],          // array of 5, each is array of question objects
  ri: 0, qi: 0,        // current round & question index
  answers: new Array(TOTAL_Q).fill(null),
  scores:  [0, 0, 0, 0, 0],
  timerSec: 0, _tid: null, totalTime: 0,
  fillState:  null,    // runtime state for fill-blank round
  buildState:  null,    // runtime state for sentence-build round
  speechRate:  1.0,     // listening speed (0.5 – 1.5)
  studentName: '',      // fetched from access API on load
};

// ═══════════════════════════════════════════════
//  DOM HELPERS
// ═══════════════════════════════════════════════
const $   = id => document.getElementById(id);
const sh  = id => $(id).classList.remove('hidden');
const hd  = id => $(id).classList.add('hidden');

function showScreen(name) {
  ['filter','intro','question','results'].forEach(s =>
    document.getElementById('screen-' + s).classList.toggle('hidden', s !== name)
  );
}

// ═══════════════════════════════════════════════
//  TIMER
// ═══════════════════════════════════════════════
function startTimer() {
  if (S._tid) return;
  S._tid = setInterval(() => {
    S.timerSec++;
    const t = formatTime(S.timerSec);
    $('timerDisplay').textContent = t;
    $('introTimer').textContent   = t;
  }, 1000);
}
function pauseTimer() { clearInterval(S._tid); S._tid = null; }

// ═══════════════════════════════════════════════
//  DATA FETCH
// ═══════════════════════════════════════════════
async function fetchSheet(sheet) {
  const r = await fetch(`${GAS_ENDPOINT}?sheet=${encodeURIComponent(sheet)}`, { credentials: 'omit' });
  return (await r.json()).items || [];
}

// ═══════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════
const meaning     = v => v.meaning?.[S.lang] || '';
const sentMeaning = s => s[S.lang === 'fr' ? 'french_tr' : 'english_tr'] || '';

function mc4(correct, pool, getFn) {
  const distractors = sample(pool.filter(v => getFn(v) && getFn(v) !== correct), 3).map(getFn);
  while (distractors.length < 3) distractors.push('—');
  return shuffle([correct, ...distractors]);
}

function groupBy(arr, fn) {
  return arr.reduce((m, x) => { const k = fn(x); (m[k] = m[k]||[]).push(x); return m; }, {});
}

// ── Tone variant generator (Round 5) ─────────────────────────────────────────
const TONE_MAP = {
  'ā':['ā','á','ǎ','à'], 'á':['ā','á','ǎ','à'], 'ǎ':['ā','á','ǎ','à'], 'à':['ā','á','ǎ','à'],
  'ē':['ē','é','ě','è'], 'é':['ē','é','ě','è'], 'ě':['ē','é','ě','è'], 'è':['ē','é','ě','è'],
  'ī':['ī','í','ǐ','ì'], 'í':['ī','í','ǐ','ì'], 'ǐ':['ī','í','ǐ','ì'], 'ì':['ī','í','ǐ','ì'],
  'ō':['ō','ó','ǒ','ò'], 'ó':['ō','ó','ǒ','ò'], 'ǒ':['ō','ó','ǒ','ò'], 'ò':['ō','ó','ǒ','ò'],
  'ū':['ū','ú','ǔ','ù'], 'ú':['ū','ú','ǔ','ù'], 'ǔ':['ū','ú','ǔ','ù'], 'ù':['ū','ú','ǔ','ù'],
  'ǖ':['ǖ','ǘ','ǚ','ǜ'], 'ǘ':['ǖ','ǘ','ǚ','ǜ'], 'ǚ':['ǖ','ǘ','ǚ','ǜ'], 'ǜ':['ǖ','ǘ','ǚ','ǜ'],
};

function toneVariants(pinyin) {
  for (const [toned, variants] of Object.entries(TONE_MAP)) {
    if (pinyin.includes(toned)) {
      return shuffle(variants.map(v => pinyin.replace(toned, v)));
    }
  }
  return null; // no tone mark — fall back to mc4
}

function globalQ(ri, qi) { return Q_START[ri] + qi; }

// Strip tone marks and spaces → bare letters only (for position matching)
function normPinyin(s) {
  return s.normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')   // remove diacritics (tones)
    .replace(/ü/g, 'u')
    .toLowerCase()
    .replace(/[^a-z]/g, '');           // keep only a-z letters
}

// Mask the answer word's pinyin inside a sentence pinyin string.
// Works even when tone marks or spacing differ between vocab and sentence data.
function maskPinyin(sentPinyin, answerPinyin) {
  if (!sentPinyin || !answerPinyin) return sentPinyin;

  const normSent = normPinyin(sentPinyin);
  const normAns  = normPinyin(answerPinyin);
  if (!normAns) return sentPinyin;

  const matchIdx = normSent.indexOf(normAns);
  if (matchIdx === -1) return sentPinyin; // couldn't locate — show as-is

  // Build a mapping: normSent index → sentPinyin index (letter positions only)
  const mapping = [];
  for (let i = 0; i < sentPinyin.length; i++) {
    const bare = sentPinyin[i].normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/ü/g, 'u').toLowerCase();
    if (/[a-z]/.test(bare)) mapping.push(i);
  }

  const startSent = mapping[matchIdx];
  const endSent   = mapping[matchIdx + normAns.length - 1] + 1;
  if (startSent === undefined || endSent === undefined) return sentPinyin;

  return sentPinyin.slice(0, startSent) + '___' + sentPinyin.slice(endSent);
}

// ═══════════════════════════════════════════════
//  QUESTION GENERATORS
// ═══════════════════════════════════════════════
function genR1(vocab) {
  const items = sample(vocab, Math.min(10, vocab.length));
  return items.map((item, idx) => {
    if (idx < 5) {
      // Forward: show Chinese → choose meaning
      return {
        type: 'vocab-match',
        item,
        answer:  meaning(item),
        choices: mc4(meaning(item), vocab.filter(v => v !== item), meaning),
      };
    } else {
      // Reverse: show meaning → choose Chinese
      const distractors = sample(vocab.filter(v => v !== item), 3);
      const choiceItems = shuffle([item, ...distractors]);
      return {
        type:        'vocab-match-reverse',
        item,
        answer:      item.hanzi,
        choiceItems,
        choices:     choiceItems.map(v => v.hanzi), // kept for review/grading compat
      };
    }
  });
}

function genR2(vocab, sents) {
  // Find (sentence, vocab) pairs where the vocab word appears in the sentence
  const pairs = [];
  for (const s of sents) {
    if (!s.chinese_tr) continue;
    for (const v of vocab) {
      if (v.hanzi?.length >= 2 && s.chinese_tr.includes(v.hanzi)) {
        pairs.push({ s, v });
        break;
      }
    }
  }

  let selected;
  if (S.lesson === 'all' && pairs.length > 0) {
    const byLesson = groupBy(pairs, p => p.s.lesson);
    selected = [];
    for (const l of shuffle(Object.keys(byLesson))) {
      if (selected.length >= 5) break;
      selected.push(sample(byLesson[l], 1)[0]);
    }
    const usedSet = new Set(selected);
    const rest = shuffle(pairs.filter(p => !usedSet.has(p)));
    while (selected.length < 5 && rest.length) selected.push(rest.pop());
  } else {
    selected = sample(pairs, Math.min(5, pairs.length));
  }

  if (!selected.length) return []; // no data available

  const answerHanzis = new Set(selected.map(p => p.v.hanzi));
  const distractors  = sample(vocab.filter(v => !answerHanzis.has(v.hanzi)), 3);
  const bank = shuffle([...selected.map(p => p.v), ...distractors]);

  return [{
    type: 'fill-blank',
    pts: selected.length,   // each slot is worth 1pt; maxPts = total slots
    slots: selected.map(p => ({
      text:        p.s.chinese_tr,
      pinyin:      p.s.pinyin_tw || '',
      answer:      p.v.hanzi,
      answerPinyin: p.v.pinyin || '',
      filled:      null,
    })),
    bank: bank.map(v => ({ hanzi: v.hanzi, pinyin: v.pinyin || '', used: false })),
  }];
}

function genR3(sents) {
  // Filter sentences that have segment data (split by '/')
  const pool = sents.filter(s => s.segments_tr && s.segments_tr.includes('/'));

  let selected = [];
  if (pool.length > 0) {
    if (S.lesson === 'all') {
      // One sentence per grammar point, then fill up to 5
      const byGram = groupBy(pool, s => s.gram_no || s.phrase_id || s.set_id);
      for (const group of shuffle(Object.values(byGram))) {
        if (selected.length >= 5) break;
        selected.push(sample(group, 1)[0]);
      }
      const usedSet = new Set(selected);
      const rest = shuffle(pool.filter(s => !usedSet.has(s)));
      while (selected.length < 5 && rest.length) selected.push(rest.shift());
    } else {
      selected = sample(pool, Math.min(5, pool.length));
    }
  }

  return selected.map(s => {
    const segHanzi  = s.segments_tr.split('/').map(h => h.trim()).filter(Boolean);
    const segPinyin = (s.segments_pinyin_tw || '').split('/').map(p => p.trim());
    return {
      type:     'sentence-build',
      pts:      1,
      sentence: s,
      segments: segHanzi.map((hanzi, i) => ({ hanzi, pinyin: segPinyin[i] || '' })),
    };
  });
}

function genR4(vocab, sents) {
  // ── Part 1: 5 vocab listening (1 pt each) ────────────────────────────────
  const usedInR1 = new Set((S.rounds[0] || []).map(q => q.item?.hanzi));
  const vocabPool = vocab.filter(v => !usedInR1.has(v.hanzi));
  const vocabItems = sample(vocabPool.length >= 5 ? vocabPool : vocab, Math.min(5, vocab.length));
  const vocabQs = vocabItems.map(item => ({
    type: 'listening-vocab',
    pts:  0.5,
    item,
    answer:  meaning(item),
    choices: mc4(meaning(item), vocab.filter(v => v !== item), meaning),
  }));

  // ── Part 2: 5 sentence listening (0.5 pt each) ───────────────────────────
  const sentPool = sents.filter(s => sentMeaning(s));

  // One sentence per grammar point (gram_no), then fill up to 5
  let selectedSents = [];
  if (sentPool.length > 0) {
    const byGram = groupBy(sentPool, s => s.gram_no || s.phrase_id || s.set_id);
    for (const group of shuffle(Object.values(byGram))) {
      if (selectedSents.length >= 5) break;
      selectedSents.push(sample(group, 1)[0]);
    }
    // Fill remaining slots if fewer than 5 grammar points
    const usedSet = new Set(selectedSents);
    const rest = shuffle(sentPool.filter(s => !usedSet.has(s)));
    while (selectedSents.length < 5 && rest.length) selectedSents.push(rest.shift());
  }

  const sentQs = selectedSents.map(s => ({
    type:     'listening-sent',
    pts:      0.5,
    sentence: s,
    answer:   sentMeaning(s),
    choices:  mc4(sentMeaning(s), sentPool.filter(x => x !== s), sentMeaning),
  }));

  return [...vocabQs, ...sentQs];
}

function genR5(vocab) {
  const usedR1 = new Set((S.rounds[0] || []).map(q => q.item?.hanzi));
  // R4 now has mixed types; only vocab questions have .item
  const usedR4 = new Set((S.rounds[3] || []).filter(q => q.item).map(q => q.item.hanzi));
  const pool = vocab.filter(v => v.pinyin && !usedR1.has(v.hanzi) && !usedR4.has(v.hanzi));
  const items = sample(pool.length >= 5 ? pool : vocab.filter(v => v.pinyin), Math.min(5, vocab.length));
  return items.map(item => ({
    type: 'pinyin',
    item,
    answer:  item.pinyin,
    choices: toneVariants(item.pinyin) ||
             mc4(item.pinyin, vocab.filter(v => v !== item && v.pinyin), v => v.pinyin),
  }));
}

// ═══════════════════════════════════════════════
//  FILTER UI
// ═══════════════════════════════════════════════
function updateLessonSel() {
  const [a, b] = LESSON_MAP[$('filterBook').value];
  const sel = $('filterLesson');
  sel.innerHTML = `<option value="all">All lessons in this book</option>`;
  for (let i = a; i <= b; i++) sel.innerHTML += `<option value="L${i}">Lesson ${i}</option>`;
}

// ═══════════════════════════════════════════════
//  INIT & START
// ═══════════════════════════════════════════════
async function fetchStudentName() {
  try {
    const email = sessionStorage.getItem('jlmsUserEmail');
    if (!email) return;
    const res  = await fetch(`${ACCESS_ENDPOINT}?email=${encodeURIComponent(email)}`);
    const data = await res.json();
    if (data.name) S.studentName = data.name;
  } catch (_) { /* silent — name optional */ }
}

async function init() {
  fetchStudentName(); // fire-and-forget; will be ready long before quiz ends
  updateLessonSel();
  $('filterBook').addEventListener('change', updateLessonSel);
  $('startBtn').addEventListener('click', startQuiz);
  $('introBtn').addEventListener('click', onIntroStart);
  $('nextBtn').addEventListener('click', onNext);
  $('submitBtn').addEventListener('click', onSubmit);
  $('reviewBtn').addEventListener('click', toggleReview);
  $('retryBtn').addEventListener('click', () => showScreen('filter'));

  try {
    const [rawVocab, rawSents] = await Promise.all([
      fetchSheet(SHEETS.memory),
      fetchSheet(SHEETS.sentence),
    ]);
    S._allVocab = rawVocab.map(x => adaptMemoryItem(x));
    S._allSents = rawSents;
    $('loadStatus').textContent = '';
    $('startBtn').disabled = false;
    $('startBtn').textContent = 'Start Quiz →';
  } catch(e) {
    $('loadStatus').textContent = '❌ Failed to load data. Please refresh.';
    console.error(e);
  }
}

function startQuiz() {
  S.lang   = $('filterLang').value;
  S.book   = $('filterBook').value;
  S.lesson = $('filterLesson').value;

  S.vocab = S._allVocab.filter(v =>
    v.active && v.book === S.book && meaning(v) &&
    (S.lesson === 'all' || v.lesson === S.lesson)
  );
  S.sents = S._allSents.filter(s =>
    String(s.active||'').toUpperCase() === 'TRUE' &&
    s.book === S.book &&
    (S.lesson === 'all' || s.lesson === S.lesson)
  );

  if (S.vocab.length < 5) {
    alert('Not enough vocabulary data for this selection. Please try a different book or lesson.');
    return;
  }

  // Reset state
  S.timerSec = 0; S._tid = null;
  S.scores   = [0, 0, 0, 0, 0];
  S.answers  = new Array(TOTAL_Q).fill(null);
  S.ri = 0; S.qi = 0;

  // Generate all rounds
  S.rounds    = new Array(5).fill(null);
  S.rounds[0] = genR1(S.vocab);
  S.rounds[1] = genR2(S.vocab, S.sents);
  S.rounds[2] = genR3(S.sents);
  S.rounds[3] = genR4(S.vocab, S.sents);
  S.rounds[4] = genR5(S.vocab);

  showRoundIntro(0);
}

// ═══════════════════════════════════════════════
//  ROUND INTRO
// ═══════════════════════════════════════════════
function showRoundIntro(ri) {
  S.ri = ri; S.qi = 0;
  pauseTimer();

  const def  = ROUND_DEF[ri];
  const lang = S.lang;

  $('introChip').textContent = `Round ${ri + 1} / 5`;
  $('introIcon').textContent = def.icon;
  $('introTitle').textContent = def[lang]?.name || def.en.name;
  $('introDesc').textContent  = def[lang]?.desc || def.en.desc;
  $('introTimer').textContent  = formatTime(S.timerSec);

  if (def.type === 'coming-soon') {
    $('introBtn').textContent = 'Skip →';
  } else {
    $('introBtn').textContent = 'Start Round →';
  }

  showScreen('intro');
}

function onIntroStart() {
  const def = ROUND_DEF[S.ri];
  if (def.type === 'coming-soon') {
    // Skip to next round
    advanceRound();
    return;
  }
  showScreen('question');
  startTimer();
  renderQuestion();
}

// ═══════════════════════════════════════════════
//  RENDER QUESTION
// ═══════════════════════════════════════════════
function renderQuestion() {
  const { ri, qi } = S;
  const def = ROUND_DEF[ri];
  const q   = S.rounds[ri][qi];

  // Update header
  if (def.type === 'fill-blank') {
    $('qCounter').textContent = `Q${Q_START[ri]+1}–${Q_START[ri]+5} / ${TOTAL_Q}`;
  } else {
    $('qCounter').textContent = `Q${globalQ(ri, qi) + 1} / ${TOTAL_Q}`;
  }
  $('roundChip').textContent = `Round ${ri + 1}`;

  hd('nextBtn'); hd('submitBtn');
  $('question-area').innerHTML = '';

  switch (q.type) {
    case 'vocab-match':
    case 'vocab-match-reverse': renderMC(q); break;
    case 'fill-blank':     renderFillBlank(q); break;
    case 'sentence-build': renderSentenceBuild(q); break;
    case 'listening-vocab':
    case 'listening-sent': renderListening(q); break;
    case 'pinyin':         renderPinyin(q); break;
  }
}

// ── Multiple Choice (vocab-match) ─────────────────────────────────────────────
function renderMC(q) {
  const area = $('question-area');

  if (q.type === 'vocab-match-reverse') {
    // Reverse: stem = meaning, choices = Chinese hanzi+pinyin
    const stem = el('div', 'mc-stem');
    const mText = el('div', 'meaning-display', meaning(q.item));
    stem.appendChild(mText);
    area.appendChild(stem);
    area.appendChild(buildChoicesReverse(q));
  } else {
    // Forward: stem = hanzi button + pinyin, choices = meaning text
    const stem = el('div', 'mc-stem');
    const hBtn = el('button', 'hanzi-btn', q.item.hanzi);
    hBtn.addEventListener('click', () => speak(q.item.hanzi));
    const pSub = el('div', 'pinyin-sub', q.item.pinyin);
    stem.append(hBtn, pSub);
    area.appendChild(stem);
    area.appendChild(buildChoices(q));
  }
}

function buildChoicesReverse(q) {
  const isLast = S.qi === ROUND_DEF[S.ri].qCount - 1;
  const grid   = el('div', 'choices choices--reverse');

  for (const item of q.choiceItems) {
    const btn = el('button', 'choice-btn choice-btn--reverse');
    btn.dataset.hanzi = item.hanzi;

    const pinyinSpan = el('span', 'rc-pinyin', item.pinyin);
    const hanziSpan  = el('span', 'rc-hanzi',  item.hanzi);
    btn.append(pinyinSpan, hanziSpan);

    btn.addEventListener('click', () => {
      speak(item.hanzi);
      if (btn.disabled) return;
      const correct = item.hanzi === q.answer;

      grid.querySelectorAll('.choice-btn--reverse').forEach(b => {
        b.disabled = true;
        if (b.dataset.hanzi === q.answer) b.classList.add('correct');
      });
      if (!correct) btn.classList.add('wrong');

      const gIdx = globalQ(S.ri, S.qi);
      S.answers[gIdx] = { correct, given: item.hanzi, expected: q.answer, item: q.item };
      if (correct) S.scores[S.ri] += q.pts ?? ROUND_DEF[S.ri].pts;

      if (isLast) sh('submitBtn');
      else        sh('nextBtn');
    });

    grid.appendChild(btn);
  }
  return grid;
}

// ── Listening ─────────────────────────────────────────────────────────────────
function renderListening(q) {
  const area = $('question-area');
  const isSent = q.type === 'listening-sent';
  const textToSpeak = isSent ? q.sentence.chinese_tr : q.item.hanzi;
  const fr = S.lang === 'fr';

  const wrap = el('div', 'listen-wrap');

  // Sentence: show pinyin above the play button as context
  if (isSent) {
    const badge = el('div', 'listen-badge',
      fr ? 'Écoutez la phrase' : 'Listen to the sentence');
    wrap.appendChild(badge);
  }

  const btn  = el('button', 'listen-btn', '🔊');
  const hint = el('div', 'listen-hint', fr ? 'Appuyez pour écouter' : 'Tap to listen');
  btn.addEventListener('click', () => speak(textToSpeak));

  // Speed control
  const speedWrap = el('div', 'speed-wrap');
  const speedLbl  = el('span', 'speed-label', fr ? 'Vitesse :' : 'Speed:');
  const slider    = document.createElement('input');
  slider.type = 'range'; slider.min = '0.5'; slider.max = '1.5';
  slider.step = '0.25'; slider.value = String(S.speechRate);
  slider.className = 'speed-slider';
  const valLbl = el('span', 'speed-val', S.speechRate + 'x');
  slider.addEventListener('input', () => {
    S.speechRate = parseFloat(slider.value);
    valLbl.textContent = S.speechRate + 'x';
  });
  speedWrap.append(speedLbl, slider, valLbl);

  wrap.append(btn, hint, speedWrap);
  area.appendChild(wrap);

  // Auto-play on load
  setTimeout(() => speak(textToSpeak), 400);

  area.appendChild(buildChoices(q));
}

// ── Pinyin ────────────────────────────────────────────────────────────────────
function renderPinyin(q) {
  const area = $('question-area');

  const stem = el('div', 'mc-stem');
  const hDisp = el('div', 'hanzi-display', q.item.hanzi);
  const mSub  = el('div', 'meaning-sub', meaning(q.item));
  stem.append(hDisp, mSub);
  area.appendChild(stem);

  const grid = buildChoices(q);
  grid.classList.add('choices--pinyin');
  area.appendChild(grid);
}

// ── Sentence Building ─────────────────────────────────────────────────────────
function renderSentenceBuild(q) {
  const langKey = S.lang === 'fr' ? 'french_tr' : 'english_tr';
  S.buildState = {
    q,
    arranged: [],
    pool:     shuffle(q.segments.map((_, i) => i)),
    graded:   false,
  };

  const area = $('question-area');

  // Translation prompt
  const prompt = el('div', 'build-prompt', q.sentence[langKey] || '');
  area.appendChild(prompt);

  // Answer area
  const ansArea = el('div', 'build-answer-area');
  ansArea.id = 'build-answer-area';
  ansArea.addEventListener('dragover', e => {
    e.preventDefault(); ansArea.classList.add('drag-over');
  });
  ansArea.addEventListener('dragleave', () => ansArea.classList.remove('drag-over'));
  ansArea.addEventListener('drop', e => {
    e.preventDefault(); ansArea.classList.remove('drag-over');
    if (S.buildState.graded) return;
    const srcIdx  = parseInt(e.dataTransfer.getData('text/plain'), 10);
    const srcArea = e.dataTransfer.getData('src-area');
    if (!isNaN(srcIdx) && srcArea === 'pool') moveSegToAnswer(srcIdx);
  });
  area.appendChild(ansArea);

  // Pool area
  const poolEl = el('div', 'build-pool');
  poolEl.id = 'build-pool';
  poolEl.addEventListener('dragover', e => e.preventDefault());
  poolEl.addEventListener('drop', e => {
    e.preventDefault();
    if (S.buildState.graded) return;
    const srcIdx  = parseInt(e.dataTransfer.getData('text/plain'), 10);
    const srcArea = e.dataTransfer.getData('src-area');
    if (!isNaN(srcIdx) && srcArea === 'answer') {
      const pos = S.buildState.arranged.indexOf(srcIdx);
      if (pos !== -1) removeSegFromAnswer(pos);
    }
  });
  area.appendChild(poolEl);

  renderBuildState();
}

function makeBuildBlock(segIdx, srcArea) {
  const seg   = S.buildState.q.segments[segIdx];
  const block = el('div', 'build-block');
  block.dataset.segIdx = segIdx;
  block.dataset.area   = srcArea;
  block.append(el('span', 'block-hanzi', seg.hanzi), el('span', 'block-pinyin', seg.pinyin));

  block.addEventListener('click', () => {
    if (S.buildState.graded) { speak(seg.hanzi); return; }
    speak(seg.hanzi);
    if (srcArea === 'pool') {
      moveSegToAnswer(segIdx);
    } else {
      const pos = S.buildState.arranged.indexOf(segIdx);
      if (pos !== -1) removeSegFromAnswer(pos);
    }
  });

  block.draggable = true;
  block.addEventListener('dragstart', e => {
    if (S.buildState.graded) { e.preventDefault(); return; }
    e.dataTransfer.setData('text/plain', String(segIdx));
    e.dataTransfer.setData('src-area', srcArea);
    e.dataTransfer.effectAllowed = 'move';
  });

  // Allow reordering within the answer area by dragging over answer blocks
  if (srcArea === 'answer') {
    block.addEventListener('dragover', e => {
      e.preventDefault(); e.stopPropagation();
      if (S.buildState.graded) return;
      const rect   = block.getBoundingClientRect();
      const isLeft = e.clientX < rect.left + rect.width / 2;
      block.classList.toggle('drop-before', isLeft);
      block.classList.toggle('drop-after', !isLeft);
    });
    block.addEventListener('dragleave', () => {
      block.classList.remove('drop-before', 'drop-after');
    });
    block.addEventListener('drop', e => {
      e.preventDefault(); e.stopPropagation();
      block.classList.remove('drop-before', 'drop-after');
      if (S.buildState.graded) return;
      const dragSegIdx = parseInt(e.dataTransfer.getData('text/plain'), 10);
      const dragArea   = e.dataTransfer.getData('src-area');
      if (isNaN(dragSegIdx)) return;

      const { arranged, pool } = S.buildState;
      const targetPos = arranged.indexOf(segIdx);
      const rect   = block.getBoundingClientRect();
      const insertBefore = e.clientX < rect.left + rect.width / 2;
      const insertPos = insertBefore ? targetPos : targetPos + 1;

      if (dragArea === 'answer') {
        // Reorder within answer area
        const fromPos = arranged.indexOf(dragSegIdx);
        if (fromPos === -1 || fromPos === targetPos) return;
        arranged.splice(fromPos, 1);
        const newPos = fromPos < insertPos ? insertPos - 1 : insertPos;
        arranged.splice(newPos, 0, dragSegIdx);
      } else {
        // Move from pool into answer area at specific position
        const pi = pool.indexOf(dragSegIdx);
        if (pi === -1) return;
        pool.splice(pi, 1);
        arranged.splice(insertPos, 0, dragSegIdx);
      }
      renderBuildState();
    });
  }

  return block;
}

function renderBuildState() {
  const { q, arranged, pool } = S.buildState;
  const ansArea = document.getElementById('build-answer-area');
  const poolEl  = document.getElementById('build-pool');
  if (!ansArea || !poolEl) return;

  ansArea.innerHTML = '';
  poolEl.innerHTML  = '';

  if (arranged.length === 0) {
    const hint = el('div', 'build-hint',
      S.lang === 'fr' ? 'Placez les blocs ici →' : 'Place blocks here →');
    ansArea.appendChild(hint);
  } else {
    arranged.forEach(segIdx => ansArea.appendChild(makeBuildBlock(segIdx, 'answer')));
  }

  pool.forEach(segIdx => poolEl.appendChild(makeBuildBlock(segIdx, 'pool')));

  // Show submit only when all segments placed
  if (arranged.length === q.segments.length) {
    $('submitBtn').textContent = S.lang === 'fr' ? 'Soumettre ✓' : 'Submit ✓';
    sh('submitBtn');
  } else {
    hd('submitBtn');
  }
}

function moveSegToAnswer(segIdx) {
  const { arranged, pool } = S.buildState;
  const i = pool.indexOf(segIdx);
  if (i === -1) return;
  pool.splice(i, 1);
  arranged.push(segIdx);
  renderBuildState();
}

function removeSegFromAnswer(pos) {
  const { arranged, pool } = S.buildState;
  const [segIdx] = arranged.splice(pos, 1);
  pool.push(segIdx);
  renderBuildState();
}

function gradeSentenceBuild() {
  const { q, arranged } = S.buildState;
  S.buildState.graded = true;
  const gIdx = globalQ(S.ri, S.qi);

  const studentText = arranged.map(i => q.segments[i].hanzi).join('');
  const correctText = q.segments.map(s => s.hanzi).join('');
  const correct     = studentText === correctText;

  if (correct) S.scores[S.ri] += 1;
  S.answers[gIdx] = {
    correct,
    given:    studentText,
    expected: correctText,
    item:     { hanzi: q.sentence.chinese_tr, pinyin: '' },
  };

  // Per-block colour feedback (compare hanzi content, not segment index)
  const ansArea = document.getElementById('build-answer-area');
  ansArea?.querySelectorAll('.build-block').forEach((block, pos) => {
    const placed   = q.segments[arranged[pos]].hanzi;
    const expected = q.segments[pos].hanzi;
    block.classList.add(placed === expected ? 'correct' : 'wrong');
  });

  hd('submitBtn');
}

// ── Shared choice builder ─────────────────────────────────────────────────────
function buildChoices(q) {
  const isLast = S.qi === ROUND_DEF[S.ri].qCount - 1;
  const grid   = el('div', 'choices');

  for (const choice of q.choices) {
    const btn = el('button', 'choice-btn', choice);
    btn.addEventListener('click', () => {
      if (btn.disabled) return;
      const correct = choice === q.answer;

      // Visual feedback
      grid.querySelectorAll('.choice-btn').forEach(b => {
        b.disabled = true;
        if (b.textContent === q.answer) b.classList.add('correct');
      });
      if (!correct) btn.classList.add('wrong');

      // Record
      const gIdx = globalQ(S.ri, S.qi);
      S.answers[gIdx] = { correct, given: choice, expected: q.answer, item: q.item };
      if (correct) S.scores[S.ri] += q.pts ?? ROUND_DEF[S.ri].pts;

      if (isLast) sh('submitBtn');
      else        sh('nextBtn');
    });
    grid.appendChild(btn);
  }
  return grid;
}

// ── Fill-blank ────────────────────────────────────────────────────────────────
function renderFillBlank(q) {
  S.fillState = { q, selectedBankIdx: null };
  const area  = $('question-area');

  // Word bank
  const bank = el('div', 'word-bank');
  q.bank.forEach((w, i) => {
    const chip = el('div', 'word-chip');
    chip.dataset.i = i;
    chip.draggable = true;
    const hanziSpan  = el('span', 'chip-hanzi', w.hanzi);
    const pinyinSpan = el('span', 'chip-pinyin', w.pinyin);
    chip.append(hanziSpan, pinyinSpan);

    // Click: select
    chip.addEventListener('click', () => onBankClick(i));

    // Drag: source
    chip.addEventListener('dragstart', e => {
      if (q.bank[i].used) { e.preventDefault(); return; }
      e.dataTransfer.setData('text/plain', String(i));
      e.dataTransfer.effectAllowed = 'move';
    });

    bank.appendChild(chip);
  });
  area.appendChild(bank);

  // Sentences
  const sentsDiv = el('div', 'fill-sentences');
  q.slots.forEach((slot, si) => {
    const row   = el('div', 'fill-row');
    const parts = slot.text.split(slot.answer);

    row.appendChild(document.createTextNode(parts[0]));

    const blank = el('span', 'fill-blank');
    blank.dataset.si = si;

    // Click: place selected chip
    blank.addEventListener('click', () => onBlankClick(si));

    // Drag: target
    blank.addEventListener('dragover', e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      blank.classList.add('drag-over');
    });
    blank.addEventListener('dragleave', () => blank.classList.remove('drag-over'));
    blank.addEventListener('drop', e => {
      e.preventDefault();
      blank.classList.remove('drag-over');
      const idx = parseInt(e.dataTransfer.getData('text/plain'), 10);
      if (!isNaN(idx)) dropOnBlank(si, idx);
    });

    row.appendChild(blank);
    if (parts[1]) row.appendChild(document.createTextNode(parts[1]));

    // Pinyin line inside the box, below the Chinese sentence
    if (slot.pinyin) {
      const pyDiv = el('div', 'fill-pinyin', maskPinyin(slot.pinyin, slot.answerPinyin));
      row.appendChild(pyDiv);
    }

    sentsDiv.appendChild(row);
  });
  area.appendChild(sentsDiv);

  sh('submitBtn');
}

function chipEls()  { return document.querySelectorAll('.word-chip'); }
function blankEls() { return document.querySelectorAll('.fill-blank'); }

function selectChip(idx) {
  const chips = chipEls();
  chips.forEach(c => c.classList.remove('selected'));
  S.fillState.selectedBankIdx = idx;
  chips[idx]?.classList.add('selected');
}

function placeWord(si, bankIdx) {
  const { q } = S.fillState;
  const slot   = q.slots[si];
  const chips  = chipEls();
  const blanks = blankEls();

  // Return old word first
  if (slot.filled !== null) {
    const prev = slot.filled;
    q.bank[prev].used = false;
    chips[prev]?.classList.remove('used');
  }

  q.bank[bankIdx].used = true;
  chips[bankIdx]?.classList.remove('selected');
  chips[bankIdx]?.classList.add('used');
  slot.filled = bankIdx;
  blanks[si].textContent = q.bank[bankIdx].hanzi;
  blanks[si].classList.add('filled');
  S.fillState.selectedBankIdx = null;
}

function onBankClick(idx) {
  const { q } = S.fillState;
  if (q.bank[idx].used) return;

  if (S.fillState.selectedBankIdx === idx) {
    // Deselect
    chipEls()[idx]?.classList.remove('selected');
    S.fillState.selectedBankIdx = null;
    return;
  }
  selectChip(idx);
}

function onBlankClick(si) {
  const { q } = S.fillState;
  const slot   = q.slots[si];
  const blanks = blankEls();
  const chips  = chipEls();

  const sel = S.fillState.selectedBankIdx;

  if (sel !== null && !q.bank[sel].used) {
    // Place selected chip into blank
    placeWord(si, sel);
    return;
  }

  // No chip selected — if blank is filled, return it to bank
  if (slot.filled !== null) {
    const prev = slot.filled;
    q.bank[prev].used = false;
    chips[prev]?.classList.remove('used');
    slot.filled = null;
    blanks[si].textContent = '';
    blanks[si].classList.remove('filled');
  }
}

function dropOnBlank(si, bankIdx) {
  const { q } = S.fillState;
  if (q.bank[bankIdx].used) return;

  // Deselect any selection
  chipEls().forEach(c => c.classList.remove('selected'));
  S.fillState.selectedBankIdx = null;

  placeWord(si, bankIdx);
}

function gradeFillBlank() {
  const { q } = S.fillState;
  const blanks = blankEls();
  const chips  = chipEls();

  q.slots.forEach((slot, si) => {
    const gIdx   = globalQ(S.ri, si);
    const filled = slot.filled !== null ? q.bank[slot.filled].hanzi : null;
    const correct = filled === slot.answer;
    S.answers[gIdx] = { correct, given: filled, expected: slot.answer };
    if (correct) S.scores[S.ri] += 1;

    if (blanks[si]) {
      blanks[si].classList.add(correct ? 'correct' : 'wrong');
      if (!correct) blanks[si].textContent = slot.answer;
    }
  });

  chips.forEach(c => { c.style.pointerEvents = 'none'; c.draggable = false; });
  blanks.forEach(b => b.style.cursor = 'default');
  hd('submitBtn');
}

// ═══════════════════════════════════════════════
//  NAV HANDLERS
// ═══════════════════════════════════════════════
function onNext() {
  S.qi++;
  hd('nextBtn'); hd('submitBtn');
  renderQuestion();
}

function onSubmit() {
  const q = S.rounds[S.ri][S.qi];

  if (q.type === 'fill-blank') {
    gradeFillBlank();
    setTimeout(() => advanceRound(), 1600);
    return;
  }

  if (q.type === 'sentence-build') {
    gradeSentenceBuild();
    const isLastQ = S.qi === ROUND_DEF[S.ri].qCount - 1;
    setTimeout(() => {
      if (isLastQ) advanceRound();
      else { S.qi++; hd('submitBtn'); renderQuestion(); }
    }, 1500);
    return;
  }

  // MC types: answer already recorded, just advance round
  advanceRound();
}

function advanceRound() {
  if (S.ri < 4) {
    showRoundIntro(S.ri + 1);
  } else {
    endQuiz();
  }
}

// ═══════════════════════════════════════════════
//  END QUIZ & RESULTS
// ═══════════════════════════════════════════════
function endQuiz() {
  pauseTimer();
  S.totalTime = S.timerSec;

  const total = S.scores.reduce((a, b) => a + b, 0);

  let title = '💪 Keep going!';
  if (total >= 22) title = '🏆 Excellent!';
  else if (total >= 17) title = '👍 Good job!';
  else if (total >= 12) title = '📚 Not bad!';

  $('resultsTitle').textContent = title;
  $('scoreDisplay').textContent = `${total.toFixed(1)} / ${MAX_PTS}`;
  $('timeDisplay').textContent  = `Time: ${formatTime(S.totalTime)}`;

  // Populate print header
  const now = new Date();
  const dateStr = `${now.getFullYear()}/${String(now.getMonth()+1).padStart(2,'0')}/${String(now.getDate()).padStart(2,'0')}`;
  const lessonStr = S.lesson === 'all'
    ? (S.lang === 'fr' ? 'Toutes les leçons' : 'All lessons')
    : `Lesson ${S.lesson}`;
  $('ph-date').textContent    = dateStr;
  $('ph-student').textContent = S.studentName || sessionStorage.getItem('jlmsUserEmail') || '';
  $('ph-book').textContent    = `Book ${S.book.replace('B','')} — ${lessonStr} | ${S.lang.toUpperCase()}`;
  $('ph-score').textContent   = `${total.toFixed(1)} / ${MAX_PTS}  ·  ${formatTime(S.totalTime)}`;

  $('printBtn').onclick = () => {
    buildReview();
    $('review-panel').classList.remove('hidden');
    drawRadar(true);                   // redraw with print-friendly (dark) colors
    setTimeout(() => {
      window.print();
      setTimeout(() => drawRadar(false), 500); // restore screen colors after print
    }, 120);                           // wait for canvas to re-render
  };

  drawRadar();
  showScreen('results');
}

let _radarChart = null;

function drawRadar(printMode = false) {
  if (_radarChart) { _radarChart.destroy(); _radarChart = null; }

  // Compute actual max per round; exclude Coming Soon (maxPts = 0)
  const maxPts = S.rounds.map((qs, ri) => {
    if (!qs || !qs.length) return 0;
    return qs.reduce((sum, q) => sum + (q.pts ?? ROUND_DEF[ri].pts), 0);
  });

  // Only include rounds that have questions (exclude Coming Soon)
  const activeIdx = ROUND_DEF.map((_d, i) => i).filter(i => maxPts[i] > 0);
  const labels = activeIdx.map(i => ROUND_DEF[i][S.lang]?.name || ROUND_DEF[i].en.name);
  const pcts   = activeIdx.map(i => Math.round((S.scores[i] / maxPts[i]) * 100));

  const gridColor  = printMode ? 'rgba(0,0,0,0.18)' : 'rgba(255,255,255,0.12)';
  const labelColor = printMode ? '#1a1a2e'           : '#fff';

  _radarChart = new Chart($('radarChart'), {
    type: 'radar',
    data: {
      labels,
      datasets: [{
        data: pcts,
        backgroundColor: 'rgba(86,111,184,0.3)',
        borderColor: '#566fb8',
        borderWidth: 2,
        pointBackgroundColor: '#566fb8',
        pointRadius: 4,
      }],
    },
    options: {
      scales: { r: {
        min: 0, max: 100,
        ticks: { display: false },
        grid:        { color: gridColor },
        angleLines:  { color: gridColor },
        pointLabels: { color: labelColor, font: { size: 11, family: 'ui-sans-serif, system-ui, sans-serif' } },
      }},
      plugins: { legend: { display: false } },
      animation: { duration: printMode ? 0 : 400 }, // no animation when printing
    },
  });
}

// ═══════════════════════════════════════════════
//  REVIEW
// ═══════════════════════════════════════════════
function toggleReview() {
  const panel = $('review-panel');
  if (!panel.classList.contains('hidden')) {
    panel.classList.add('hidden');
    $('reviewBtn').textContent = S.lang === 'fr' ? 'Voir les réponses' : 'Review Answers';
    return;
  }
  buildReview();
  panel.classList.remove('hidden');
  $('reviewBtn').textContent = S.lang === 'fr' ? 'Masquer' : 'Hide Review';
}

function buildReview() {
  const panel = $('review-panel');
  panel.innerHTML = '';

  S.rounds.forEach((questions, ri) => {
    const def     = ROUND_DEF[ri];
    const section = el('div', 'review-round');
    section.innerHTML = `<h3>${def[S.lang]?.name || def.en.name}</h3>`;

    if (def.type === 'coming-soon') {
      section.innerHTML += `<div style="color:rgba(255,255,255,.35);font-size:.85rem">🔧 Coming soon</div>`;
      panel.appendChild(section);
      return;
    }

    if (def.type === 'sentence-build') {
      questions.forEach((q, qi) => {
        const gIdx = globalQ(ri, qi);
        const ans  = S.answers[gIdx];
        const item = el('div', `review-item ${ans?.correct ? 'correct' : 'wrong'}`);
        item.innerHTML = `
          <span class="review-icon">${ans?.correct ? '✅' : '❌'}</span>
          <div class="review-text">
            <div>${q.sentence?.chinese_tr || ''}</div>
            <div class="sub">${ans?.correct
              ? 'Correct!'
              : `Expected: ${ans?.expected || '—'} | Your answer: ${ans?.given || '—'}`
            }</div>
          </div>`;
        section.appendChild(item);
      });
      panel.appendChild(section);
      return;
    }

    if (def.type === 'fill-blank') {
      const q = questions[0];
      if (!q) { panel.appendChild(section); return; }
      q.slots.forEach((slot, si) => {
        const gIdx = globalQ(ri, si);
        const ans  = S.answers[gIdx];
        const item = el('div', `review-item ${ans?.correct ? 'correct' : 'wrong'}`);
        item.innerHTML = `
          <span class="review-icon">${ans?.correct ? '✅' : '❌'}</span>
          <div class="review-text">
            <div>${slot.text.replace(slot.answer, `<strong>${slot.answer}</strong>`)}</div>
            <div class="sub">${!ans?.correct ? `Your answer: ${ans?.given || '—'}` : 'Correct!'}</div>
          </div>`;
        section.appendChild(item);
      });
    } else {
      questions.forEach((q, qi) => {
        const gIdx = globalQ(ri, qi);
        const ans  = S.answers[gIdx];
        const item = el('div', `review-item ${ans?.correct ? 'correct' : 'wrong'}`);

        // Vocab / pinyin questions have .item; sentence listening has .sentence
        const mainText = q.type === 'listening-sent'
          ? q.sentence?.chinese_tr || ''
          : `${q.item?.hanzi || ''} ${q.item?.pinyin ? `<span style="opacity:.6">(${q.item.pinyin})</span>` : ''}`;

        item.innerHTML = `
          <span class="review-icon">${ans?.correct ? '✅' : '❌'}</span>
          <div class="review-text">
            <div>${mainText}</div>
            <div class="sub">
              ${ans?.correct ? 'Correct!' : `Expected: ${ans?.expected || '—'} | Your answer: ${ans?.given || '—'}`}
            </div>
          </div>`;
        section.appendChild(item);
      });
    }

    panel.appendChild(section);
  });
}

// ═══════════════════════════════════════════════
//  UTILS
// ═══════════════════════════════════════════════
function el(tag, cls = '', text = '') {
  const e = document.createElement(tag);
  if (cls)  e.className   = cls;
  if (text) e.textContent = text;
  return e;
}

function speak(text) {
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'zh-TW'; u.rate = S.speechRate;
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
}

// ═══════════════════════════════════════════════
//  BOOT
// ═══════════════════════════════════════════════
init();
