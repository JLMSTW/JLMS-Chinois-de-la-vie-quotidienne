import { GAS_ENDPOINT, SHEETS } from "../../js/config.js";
import { shuffle, sample } from "../../js/shared/shuffle.js";

// ═══════════════════════════════════════
//  CONFIG
// ═══════════════════════════════════════
const LESSON_MAP = { B1:[1,5], B2:[6,10], B3:[11,15], B4:[16,20], B5:[21,25] };
const Q_TOTAL = 5;

// ═══════════════════════════════════════
//  STATE
// ═══════════════════════════════════════
const S = {
  lang:       'fr',
  book:       'B1',
  lesson:     'all',
  _allSents:  [],
  questions:  [],   // 5 selected sentence objects
  qi:         0,
  results:    [],   // { pct, correct, sentence, arranged }
  buildState: null, // { q, arranged, pool, graded }
};

// ═══════════════════════════════════════
//  DOM HELPERS
// ═══════════════════════════════════════
const $   = id => document.getElementById(id);
const sh  = id => $(id).classList.remove('hidden');
const hd  = id => $(id).classList.add('hidden');

function showScreen(name) {
  ['filter','question','result','summary'].forEach(s =>
    document.getElementById('screen-' + s).classList.toggle('hidden', s !== name)
  );
}

// ═══════════════════════════════════════
//  DATA FETCH
// ═══════════════════════════════════════
async function fetchSheet(sheet) {
  const r = await fetch(`${GAS_ENDPOINT}?sheet=${encodeURIComponent(sheet)}`, { credentials: 'omit' });
  return (await r.json()).items || [];
}

// ═══════════════════════════════════════
//  FILTER / LESSON SELECT
// ═══════════════════════════════════════
function updateLessonSel() {
  const book = $('filterBook').value;
  const [min, max] = LESSON_MAP[book];
  const sel = $('filterLesson');
  sel.innerHTML = `<option value="all">All lessons in ${book}</option>`;
  for (let i = min; i <= max; i++) {
    sel.innerHTML += `<option value="L${i}">Lesson ${i}</option>`;
  }
}

function groupBy(arr, fn) {
  return arr.reduce((acc, x) => {
    const k = fn(x); (acc[k] = acc[k] || []).push(x); return acc;
  }, {});
}

// ═══════════════════════════════════════
//  QUESTION GENERATION
// ═══════════════════════════════════════
function genQuestions(sents, book, lesson, lang) {
  // Filter by book/lesson with valid segments
  const byBook = sents.filter(s => s.book === book);
  const byLesson = lesson === 'all'
    ? byBook
    : byBook.filter(s => s.lesson === lesson);

  const pool = byLesson.filter(s => s.segments_tr && s.segments_tr.includes('/'));

  let selected = [];
  if (lesson === 'all' && pool.length > 0) {
    const byGram = groupBy(pool, s => s.gram_no || s.phrase_id || s.set_id);
    for (const group of shuffle(Object.values(byGram))) {
      if (selected.length >= Q_TOTAL) break;
      selected.push(sample(group, 1)[0]);
    }
    const usedSet = new Set(selected);
    const rest = shuffle(pool.filter(s => !usedSet.has(s)));
    while (selected.length < Q_TOTAL && rest.length) selected.push(rest.shift());
  } else {
    selected = sample(pool, Math.min(Q_TOTAL, pool.length));
  }

  return selected.map(s => {
    const segHanzi  = s.segments_tr.split('/').map(h => h.trim()).filter(Boolean);
    const segPinyin = (s.segments_pinyin_tw || '').split('/').map(p => p.trim());
    const langKey   = lang === 'fr' ? 'french_tr' : 'english_tr';
    return {
      sentence: s,
      translation: s[langKey] || s.chinese_tr,
      segments: segHanzi.map((hanzi, i) => ({ hanzi, pinyin: segPinyin[i] || '' })),
    };
  });
}

// ═══════════════════════════════════════
//  SPEECH
// ═══════════════════════════════════════
function speak(text) {
  if (!text) return;
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = 'zh-TW'; utt.rate = 0.9;
  speechSynthesis.cancel();
  speechSynthesis.speak(utt);
}

// ═══════════════════════════════════════
//  BUILD BLOCKS
// ═══════════════════════════════════════
function makeBuildBlock(segIdx, srcArea) {
  const seg   = S.buildState.q.segments[segIdx];
  const block = document.createElement('div');
  block.className = 'build-block';
  block.dataset.segIdx = segIdx;
  block.dataset.area   = srcArea;

  const hanziSpan  = document.createElement('span');
  hanziSpan.className = 'block-hanzi';
  hanziSpan.textContent = seg.hanzi;
  const pinyinSpan = document.createElement('span');
  pinyinSpan.className = 'block-pinyin';
  pinyinSpan.textContent = seg.pinyin;
  block.append(hanziSpan, pinyinSpan);

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

  // Answer-area blocks: support drag-to-reorder
  if (srcArea === 'answer') {
    block.addEventListener('dragover', e => {
      e.preventDefault(); e.stopPropagation();
      if (S.buildState.graded) return;
      const rect = block.getBoundingClientRect();
      block.classList.toggle('drop-before', e.clientX < rect.left + rect.width / 2);
      block.classList.toggle('drop-after',  e.clientX >= rect.left + rect.width / 2);
    });
    block.addEventListener('dragleave', () =>
      block.classList.remove('drop-before', 'drop-after'));
    block.addEventListener('drop', e => {
      e.preventDefault(); e.stopPropagation();
      block.classList.remove('drop-before', 'drop-after');
      if (S.buildState.graded) return;
      const dragIdx  = parseInt(e.dataTransfer.getData('text/plain'), 10);
      const dragArea = e.dataTransfer.getData('src-area');
      if (isNaN(dragIdx)) return;
      const { arranged, pool } = S.buildState;
      const targetPos   = arranged.indexOf(segIdx);
      const insertBefore = e.clientX < block.getBoundingClientRect().left + block.getBoundingClientRect().width / 2;
      const insertPos   = insertBefore ? targetPos : targetPos + 1;
      if (dragArea === 'answer') {
        const fromPos = arranged.indexOf(dragIdx);
        if (fromPos === -1 || fromPos === targetPos) return;
        arranged.splice(fromPos, 1);
        arranged.splice(fromPos < insertPos ? insertPos - 1 : insertPos, 0, dragIdx);
      } else {
        const pi = pool.indexOf(dragIdx);
        if (pi === -1) return;
        pool.splice(pi, 1);
        arranged.splice(insertPos, 0, dragIdx);
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
    const hint = document.createElement('div');
    hint.className = 'build-hint';
    hint.textContent = S.lang === 'fr' ? 'Placez les blocs ici →' : 'Place blocks here →';
    ansArea.appendChild(hint);
  } else {
    arranged.forEach(segIdx => ansArea.appendChild(makeBuildBlock(segIdx, 'answer')));
  }

  pool.forEach(segIdx => poolEl.appendChild(makeBuildBlock(segIdx, 'pool')));

  const submitBtn = $('submitBtn');
  if (arranged.length === q.segments.length) {
    submitBtn.textContent = S.lang === 'fr' ? 'Soumettre ✓' : 'Submit ✓';
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

// ═══════════════════════════════════════
//  RENDER QUESTION
// ═══════════════════════════════════════
function renderQuestion(qi) {
  const q = S.questions[qi];
  S.buildState = { q, arranged: [], pool: shuffle(q.segments.map((_, i) => i)), graded: false };

  $('qCounter').textContent = `${qi + 1} / ${S.questions.length}`;
  $('submitBtn').textContent = S.lang === 'fr' ? 'Soumettre ✓' : 'Submit ✓';
  hd('submitBtn');

  const area = $('question-area');
  area.innerHTML = '';

  // Translation prompt
  const prompt = document.createElement('div');
  prompt.className = 'build-prompt';
  prompt.textContent = q.translation;
  area.appendChild(prompt);

  // Answer area
  const ansArea = document.createElement('div');
  ansArea.className = 'build-answer-area';
  ansArea.id = 'build-answer-area';
  ansArea.addEventListener('dragover', e => {
    e.preventDefault(); ansArea.classList.add('drag-over');
  });
  ansArea.addEventListener('dragleave', () => ansArea.classList.remove('drag-over'));
  ansArea.addEventListener('drop', e => {
    e.preventDefault(); ansArea.classList.remove('drag-over');
    if (S.buildState.graded) return;
    const dragIdx  = parseInt(e.dataTransfer.getData('text/plain'), 10);
    const dragArea = e.dataTransfer.getData('src-area');
    if (!isNaN(dragIdx) && dragArea === 'pool') moveSegToAnswer(dragIdx);
  });
  area.appendChild(ansArea);

  // Pool area
  const poolEl = document.createElement('div');
  poolEl.className = 'build-pool';
  poolEl.id = 'build-pool';
  poolEl.addEventListener('dragover', e => e.preventDefault());
  poolEl.addEventListener('drop', e => {
    e.preventDefault();
    if (S.buildState.graded) return;
    const dragIdx  = parseInt(e.dataTransfer.getData('text/plain'), 10);
    const dragArea = e.dataTransfer.getData('src-area');
    if (!isNaN(dragIdx) && dragArea === 'answer') {
      const pos = S.buildState.arranged.indexOf(dragIdx);
      if (pos !== -1) removeSegFromAnswer(pos);
    }
  });
  area.appendChild(poolEl);

  renderBuildState();
  showScreen('question');
}

// ═══════════════════════════════════════
//  GRADING & RESULT
// ═══════════════════════════════════════
function gradeAndShowResult() {
  const { q, arranged } = S.buildState;
  S.buildState.graded = true;
  hd('submitBtn');

  const segments  = q.segments;
  const correctCount = arranged.filter((segIdx, pos) =>
    segments[segIdx].hanzi === segments[pos].hanzi
  ).length;
  const pct = Math.round(correctCount / segments.length * 100);
  const allCorrect = correctCount === segments.length;

  // Color feedback on answer area
  const ansArea = document.getElementById('build-answer-area');
  ansArea?.querySelectorAll('.build-block').forEach((block, pos) => {
    block.classList.add(
      segments[arranged[pos]].hanzi === segments[pos].hanzi ? 'correct' : 'wrong'
    );
  });

  // Save result
  S.results.push({ pct, allCorrect, q });

  // Show result screen after brief pause
  setTimeout(() => {
    const fr = S.lang === 'fr';
    const s  = q.sentence;

    // Percentage display
    const pctEl = $('resultPct');
    pctEl.innerHTML = '';
    const pctNum  = document.createElement('span');
    pctNum.className = 'pct-number ' + (pct === 100 ? 'pct-perfect' : pct >= 60 ? 'pct-good' : 'pct-low');
    pctNum.textContent = `${pct}%`;
    const pctSub  = document.createElement('span');
    pctSub.className = 'pct-sub';
    pctSub.textContent = `${correctCount} / ${segments.length} ${fr ? 'blocs corrects' : 'correct blocks'}`;
    pctEl.append(pctNum, pctSub);

    // Source info
    const lessonVal = s.lesson || s.Lesson || '';
    const gramNo    = s.gram_no || '';
    $('resultSource').textContent =
      `📖 Book ${String(s.book || '').replace('B','')} — ${fr ? 'Leçon' : 'Lesson'} ${lessonVal}` +
      (gramNo ? ` — ${fr ? 'Grammaire nº' : 'Grammar #'}${gramNo}` : '');

    // Sentence display (correct order with pinyin)
    const sentEl = $('resultSentence');
    sentEl.innerHTML = '';
    segments.forEach((seg, pos) => {
      const blk = document.createElement('div');
      blk.className = 'result-block ' + (arranged[pos] !== undefined && segments[arranged[pos]].hanzi === seg.hanzi ? 'correct' : 'wrong');
      blk.innerHTML = `<span class="block-hanzi">${seg.hanzi}</span><span class="block-pinyin">${seg.pinyin}</span>`;
      blk.addEventListener('click', () => speak(seg.hanzi));
      sentEl.appendChild(blk);
    });

    // Correct answer (if wrong)
    const correctEl = $('resultCorrect');
    if (!allCorrect) {
      correctEl.textContent = `✓ ${segments.map(s => s.hanzi).join('')}`;
      sh('resultCorrect');
    } else {
      hd('resultCorrect');
    }

    // Next button label
    const isLast = S.qi === S.questions.length - 1;
    $('nextBtn').textContent = isLast
      ? (fr ? 'Voir le résumé →' : 'See Summary →')
      : (fr ? 'Suivant →' : 'Next →');

    showScreen('result');
  }, 800);
}

// ═══════════════════════════════════════
//  SUMMARY
// ═══════════════════════════════════════
function showSummary() {
  const fr = S.lang === 'fr';
  const list = $('summary-list');
  list.innerHTML = '';

  S.results.forEach((r, i) => {
    const s   = r.q.sentence;
    const row = document.createElement('div');
    row.className = 'summary-row';
    const lessonVal = s.lesson || s.Lesson || '';
    const gramNo    = s.gram_no || '';
    row.innerHTML = `
      <span class="sum-num">${i + 1}</span>
      <div class="sum-info">
        <div class="sum-sentence">${r.q.segments.map(sg => sg.hanzi).join('')}</div>
        <div class="sum-source">Book ${String(s.book || '').replace('B','')} · ${fr ? 'Leçon' : 'Lesson'} ${lessonVal}${gramNo ? ` · G${gramNo}` : ''}</div>
      </div>
      <span class="sum-pct ${r.pct === 100 ? 'pct-perfect' : r.pct >= 60 ? 'pct-good' : 'pct-low'}">${r.pct}%</span>
    `;
    list.appendChild(row);
  });

  $('replayBtn').textContent  = fr ? '🔄 Rejouer' : '🔄 Play again';
  $('changeBtn').textContent  = fr ? '← Changer de leçon' : '← Change lesson';
  showScreen('summary');
}

// ═══════════════════════════════════════
//  GAME FLOW
// ═══════════════════════════════════════
function startGame() {
  S.book   = $('filterBook').value;
  S.lesson = $('filterLesson').value;
  S.lang   = $('filterLang').value;

  S.questions = genQuestions(S._allSents, S.book, S.lesson, S.lang);
  if (!S.questions.length) {
    alert('Aucune phrase trouvée pour cette leçon. / No sentences found for this lesson.');
    return;
  }

  S.qi      = 0;
  S.results = [];
  renderQuestion(0);
}

function onNext() {
  if (S.qi >= S.questions.length - 1) {
    showSummary();
  } else {
    S.qi++;
    renderQuestion(S.qi);
  }
}

function onSkip() {
  // Grade as 0% then advance
  const { q } = S.buildState;
  S.buildState.graded = true;
  S.results.push({ pct: 0, allCorrect: false, q });
  if (S.qi >= S.questions.length - 1) {
    showSummary();
  } else {
    S.qi++;
    renderQuestion(S.qi);
  }
}

// ═══════════════════════════════════════
//  INIT
// ═══════════════════════════════════════
async function init() {
  updateLessonSel();
  $('filterBook').addEventListener('change', updateLessonSel);
  $('startBtn').addEventListener('click', startGame);
  $('submitBtn').addEventListener('click', gradeAndShowResult);
  $('nextBtn').addEventListener('click', onNext);
  $('skipBtn').addEventListener('click', onSkip);
  $('replayBtn').addEventListener('click', startGame);
  $('changeBtn').addEventListener('click', () => showScreen('filter'));

  try {
    const raw = await fetchSheet(SHEETS.sentence);
    S._allSents = raw;
    $('loadStatus').textContent = `${raw.length} sentences loaded.`;
    $('startBtn').disabled = false;
  } catch (e) {
    $('loadStatus').textContent = 'Loading failed. Please refresh.';
    console.error(e);
  }
}

init();
