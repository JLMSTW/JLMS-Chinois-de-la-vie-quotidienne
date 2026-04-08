import { GAS_ENDPOINT, SHEETS } from "../js/config.js";
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

  { icon: '🧩', type: 'coming-soon',  qCount: 0,  pts: 0,
    en: { name: 'Sentence Building',     desc: '🔧 Coming soon! This round will be available once the sentence data is ready.' },
    fr: { name: 'Construction de phrases', desc: '🔧 Bientôt disponible ! Ce round sera disponible une fois les données prêtes.' } },

  { icon: '🔊', type: 'listening',    qCount: 5,  pts: 1,
    en: { name: 'Listening',            desc: 'Tap the speaker to hear a word, then choose the correct meaning.' },
    fr: { name: 'Compréhension orale',  desc: 'Appuyez sur le haut-parleur, puis choisissez la bonne signification.' } },

  { icon: '🎵', type: 'pinyin',       qCount: 5,  pts: 1,
    en: { name: 'Pinyin Quiz',          desc: 'Look at the character and its meaning, then choose the correct pinyin (with tones).' },
    fr: { name: 'Quiz de pinyin',       desc: 'Regardez le caractère et sa signification, puis choisissez le bon pinyin (avec les tons).' } },
];

// Q counter: global Q index start per round (coming-soon has 0 questions)
// Active rounds: 0,1,3,4  → Q1-10, Q11-15, [skip], Q16-20, Q21-25
const Q_START  = [0, 10, -1, 15, 20]; // -1 = no questions
const TOTAL_Q  = 25;
const MAX_PTS  = 20;

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
  fillState: null,     // runtime state for fill-blank round
  speechRate: 1.0,     // listening speed (0.5 – 1.5)
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
const meaning = v => v.meaning?.[S.lang] || '';

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

// Mask the answer word's pinyin inside a sentence pinyin string
function maskPinyin(sentPinyin, answerPinyin) {
  if (!sentPinyin || !answerPinyin) return sentPinyin;
  // 1. Exact match
  if (sentPinyin.includes(answerPinyin))
    return sentPinyin.replace(answerPinyin, '___');
  // 2. Compact: remove spaces in answer (e.g. "suàn shì" → "suànshì")
  const compact = answerPinyin.replace(/\s+/g, '');
  if (sentPinyin.includes(compact))
    return sentPinyin.replace(compact, '___');
  // 3. Case-insensitive exact
  const reExact = new RegExp(answerPinyin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  const r1 = sentPinyin.replace(reExact, '___');
  if (r1 !== sentPinyin) return r1;
  // 4. Case-insensitive compact
  const reCompact = new RegExp(compact.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  return sentPinyin.replace(reCompact, '___');
}

// ═══════════════════════════════════════════════
//  QUESTION GENERATORS
// ═══════════════════════════════════════════════
function genR1(vocab) {
  const items = sample(vocab, Math.min(10, vocab.length));
  return items.map(item => ({
    type: 'vocab-match',
    item,
    answer:  meaning(item),
    choices: mc4(meaning(item), vocab.filter(v => v !== item), meaning),
  }));
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

// Round 3 = coming-soon, no questions generated

function genR4(vocab) {
  const usedInR1 = new Set((S.rounds[0] || []).map(q => q.item?.hanzi));
  const pool = vocab.filter(v => !usedInR1.has(v.hanzi));
  const items = sample(pool.length >= 5 ? pool : vocab, Math.min(5, vocab.length));
  return items.map(item => ({
    type: 'listening',
    item,
    answer:  meaning(item),
    choices: mc4(meaning(item), vocab.filter(v => v !== item), meaning),
  }));
}

function genR5(vocab) {
  const usedR1 = new Set((S.rounds[0] || []).map(q => q.item?.hanzi));
  const usedR4 = new Set((S.rounds[3] || []).map(q => q.item?.hanzi));
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
async function init() {
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
  S.rounds[2] = [];                         // coming-soon
  S.rounds[3] = genR4(S.vocab);
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
    case 'vocab-match': renderMC(q); break;
    case 'fill-blank':  renderFillBlank(q); break;
    case 'listening':   renderListening(q); break;
    case 'pinyin':      renderPinyin(q); break;
  }
}

// ── Multiple Choice (vocab-match) ─────────────────────────────────────────────
function renderMC(q) {
  const area = $('question-area');

  // Stem: hanzi button + pinyin
  const stem = el('div', 'mc-stem');
  const hBtn = el('button', 'hanzi-btn', q.item.hanzi);
  hBtn.addEventListener('click', () => speak(q.item.hanzi));
  const pSub = el('div', 'pinyin-sub', q.item.pinyin);
  stem.append(hBtn, pSub);
  area.appendChild(stem);

  // Choices
  area.appendChild(buildChoices(q));
}

// ── Listening ─────────────────────────────────────────────────────────────────
function renderListening(q) {
  const area = $('question-area');

  const wrap = el('div', 'listen-wrap');
  const btn  = el('button', 'listen-btn', '🔊');
  const hint = el('div', 'listen-hint', S.lang === 'fr' ? 'Appuyez pour écouter' : 'Tap to listen');
  btn.addEventListener('click', () => speak(q.item.hanzi));

  // Speed control
  const speedWrap  = el('div', 'speed-wrap');
  const speedLbl   = el('span', 'speed-label', S.lang === 'fr' ? 'Vitesse :' : 'Speed:');
  const slider     = document.createElement('input');
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
  setTimeout(() => speak(q.item.hanzi), 400);

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
      if (correct) S.scores[S.ri] += ROUND_DEF[S.ri].pts;

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
  if (total >= 18) title = '🏆 Excellent!';
  else if (total >= 14) title = '👍 Good job!';
  else if (total >= 10) title = '📚 Not bad!';

  $('resultsTitle').textContent = title;
  $('scoreDisplay').textContent = `${total.toFixed(1)} / ${MAX_PTS}`;
  $('timeDisplay').textContent  = `Time: ${formatTime(S.totalTime)}`;

  drawRadar();
  showScreen('results');
}

function drawRadar() {
  const maxPts = ROUND_DEF.map(d => d.qCount * d.pts); // [5,5,0,5,5]
  const pcts   = S.scores.map((s, i) => maxPts[i] > 0 ? Math.round((s / maxPts[i]) * 100) : 0);
  const labels = ROUND_DEF.map(d => d[S.lang]?.name || d.en.name);

  new Chart($('radarChart'), {
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
        grid:        { color: 'rgba(255,255,255,0.12)' },
        angleLines:  { color: 'rgba(255,255,255,0.12)' },
        pointLabels: { color: '#fff', font: { size: 11, family: 'ui-sans-serif, system-ui, sans-serif' } },
      }},
      plugins: { legend: { display: false } },
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
        item.innerHTML = `
          <span class="review-icon">${ans?.correct ? '✅' : '❌'}</span>
          <div class="review-text">
            <div>${q.item?.hanzi || ''} ${q.item?.pinyin ? `<span style="opacity:.6">(${q.item.pinyin})</span>` : ''}</div>
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
