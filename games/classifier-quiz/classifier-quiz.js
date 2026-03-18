/* ============================================================
   classifier-quiz.js
   Bilingual (FR / EN) Chinese Classifier Quiz
   ============================================================ */

   'use strict';

   // ── UI STRINGS ────────────────────────────────────────────────
   const UI = {
     fr: {
       subtitle:     'Choisissez le bon classificateur · 選出正確的量詞',
       questionOf:   (n, t) => `Question ${n} / ${t}`,
       correctTitle: '✓ Correct ! 正確 !',
       wrongTitle:   (ans) => `✗ Incorrect — La bonne réponse est : ${ans}`,
       nextBtn:      'Suivant → 下一題',
       replayBtn:    '↺ Rejouer · 再玩一次',
       changeLang:   '🌐 Changer de langue',
       results: {
         total: (t) => `/ ${t} questions`,
         5: { msg: '完美 ! Parfait !',       sub: 'Vous maîtrisez tous les classificateurs — 你全對了 !' },
         4: { msg: '優秀 ! Excellent !',      sub: 'Très bonne maîtrise des classificateurs chinois.' },
         3: { msg: '不錯 ! Bien !',           sub: 'Continuez à pratiquer — quelques classificateurs à revoir.' },
         2: { msg: '加油 ! Courage !',        sub: 'Relisez vos notes et réessayez — vous pouvez faire mieux !' },
         1: { msg: '繼續努力 ! Persévérez !', sub: 'Les classificateurs demandent de la pratique — ne lâchez pas !' },
       },
     },
     en: {
       subtitle:     'Choose the correct classifier · 選出正確的量詞',
       questionOf:   (n, t) => `Question ${n} / ${t}`,
       correctTitle: '✓ Correct! 正確！',
       wrongTitle:   (ans) => `✗ Wrong — The correct answer is: ${ans}`,
       nextBtn:      'Next → 下一題',
       replayBtn:    '↺ Play Again · 再玩一次',
       changeLang:   '🌐 Change Language',
       results: {
         total: (t) => `/ ${t} questions`,
         5: { msg: 'Perfect! 完美！',      sub: 'You nailed every classifier — 你全對了！' },
         4: { msg: 'Excellent! 優秀！',     sub: 'Great command of Chinese classifiers!' },
         3: { msg: 'Good job! 不錯！',      sub: 'Keep practising — a few classifiers need review.' },
         2: { msg: 'Keep going! 加油！',    sub: 'Review your notes and try again — you can do it!' },
         1: { msg: 'Persevere! 繼續努力！', sub: "Classifiers take practice — don't give up!" },
       },
     },
   };
   
   // ── QUESTION DATA ─────────────────────────────────────────────
   const ALL_QUESTIONS = [
     {
       sentence:    '一_____褲子',
       answer:      '條',
       distractors: ['件', '雙', '隻'],
       category:    { fr: 'Individuel 個別', en: 'Individual 個別' },
       translation: { fr: 'un pantalon',     en: 'a pair of trousers' },
       explanation: {
         fr: '「<strong>條 tiáo</strong>」 s\'utilise pour les objets en forme de bande ou allongés. Un pantalon (褲子) est long et étroit → <em>條</em>.<br>× 件 = vêtements du haut. × 雙 = paires. × 隻 = animaux.',
         en: '「<strong>條 tiáo</strong>」 is used for long, strip-shaped objects. Trousers (褲子) are long and narrow → <em>條</em>.<br>× 件 = upper-body garments. × 雙 = pairs. × 隻 = animals.',
       },
     },
     {
       sentence:    '一_____魚',
       answer:      '條',
       distractors: ['隻', '個', '尾'],
       category:    { fr: 'Individuel 個別', en: 'Individual 個別' },
       translation: { fr: 'un poisson',      en: 'a fish' },
       explanation: {
         fr: 'Les poissons (魚) sont longs et étroits → on utilise <em>條 tiáo</em>.<br>Note : 隻 s\'utilise pour les animaux terrestres ou les oiseaux, pas pour les poissons.',
         en: 'Fish (魚) are long and slender → use <em>條 tiáo</em>.<br>Note: 隻 is for land animals and birds, not fish.',
       },
     },
     {
       sentence:    '兩_____機票',
       answer:      '張',
       distractors: ['個', '件', '份'],
       category:    { fr: 'Individuel 個別', en: 'Individual 個別' },
       translation: { fr: "deux billets d'avion", en: 'two plane tickets' },
       explanation: {
         fr: '「<strong>張 zhāng</strong>」 s\'utilise pour les objets plats et dépliables (papier, billets, tables). Un billet (機票) est une feuille plate → <em>張</em>.',
         en: '「<strong>張 zhāng</strong>」 is used for flat, spreadable objects (paper, tickets, tables). A plane ticket (機票) is flat → <em>張</em>.',
       },
     },
     {
       sentence:    '三_____星',
       answer:      '顆',
       distractors: ['個', '條', '粒'],
       category:    { fr: 'Individuel 個別', en: 'Individual 個別' },
       translation: { fr: 'trois étoiles (ex. Michelin)', en: 'three stars (e.g. Michelin)' },
       explanation: {
         fr: '「<strong>顆 kē</strong>」 désigne les objets petits et ronds. Les étoiles (星) sont rondes → <em>顆</em>.<br>D\'où 米其林三顆星 (trois étoiles Michelin) !',
         en: '「<strong>顆 kē</strong>」 is for small, round objects. Stars (星) are round → <em>顆</em>.<br>Hence 米其林三顆星 (three Michelin stars)!',
       },
     },
     {
       sentence:    '一_____蘋果',
       answer:      '個',
       distractors: ['顆', '條', '張'],
       category:    { fr: 'Individuel 個別', en: 'Individual 個別' },
       translation: { fr: 'une pomme', en: 'an apple' },
       explanation: {
         fr: '「<strong>個 ge</strong>」 est le classificateur universel, le plus polyvalent. Pour une pomme entière → <em>個</em> est le plus naturel.',
         en: '「<strong>個 ge</strong>」 is the all-purpose classifier. For a whole apple → <em>個</em> is the most natural choice.',
       },
     },
     {
       sentence:    '兩_____貓',
       answer:      '隻',
       distractors: ['個', '條', '群'],
       category:    { fr: 'Individuel 個別', en: 'Individual 個別' },
       translation: { fr: 'deux chats', en: 'two cats' },
       explanation: {
         fr: '「<strong>隻 zhī</strong>」 s\'utilise pour les animaux (chiens, chats, oiseaux…).<br>× 個 = personnes / objets génériques. × 群 = un groupe entier.',
         en: '「<strong>隻 zhī</strong>」 is used for animals (dogs, cats, birds…).<br>× 個 = generic people / things. × 群 = a whole group.',
       },
     },
     {
       sentence:    '三_____外套',
       answer:      '件',
       distractors: ['條', '個', '雙'],
       category:    { fr: 'Individuel 個別', en: 'Individual 個別' },
       translation: { fr: 'trois vestes', en: 'three jackets' },
       explanation: {
         fr: '「<strong>件 jiàn</strong>」 s\'utilise pour les vêtements portés sur le haut du corps (chemises, vestes, manteaux…).<br>× 條 = vêtements longs (pantalons, jupes).',
         en: '「<strong>件 jiàn</strong>」 is used for upper-body garments (shirts, jackets, coats…).<br>× 條 = long garments (trousers, skirts).',
       },
     },
     {
       sentence:    '這_____電腦',
       answer:      '台',
       distractors: ['個', '件', '張'],
       category:    { fr: 'Individuel 個別', en: 'Individual 個別' },
       translation: { fr: 'cet ordinateur', en: 'this computer' },
       explanation: {
         fr: '「<strong>台 tái</strong>」 s\'utilise pour les machines et appareils (ordinateur 電腦, frigo 冰箱, voiture 車, climatiseur 冷氣…).',
         en: '「<strong>台 tái</strong>」 is used for machines and appliances (computer 電腦, fridge 冰箱, car 車, air-conditioner 冷氣…).',
       },
     },
     {
       sentence:    '一_____筷子',
       answer:      '雙',
       distractors: ['條', '根', '個'],
       category:    { fr: 'Collection 集合', en: 'Collection 集合' },
       translation: { fr: 'une paire de baguettes', en: 'a pair of chopsticks' },
       explanation: {
         fr: '「<strong>雙 shuāng</strong>」 désigne les objets qui vont naturellement par paires (baguettes, chaussures, chaussettes…).<br>Note : 根 s\'utilise pour UNE seule baguette.',
         en: '「<strong>雙 shuāng</strong>」 is for objects that naturally come in pairs (chopsticks, shoes, socks…).<br>Note: 根 is used for a SINGLE chopstick.',
       },
     },
     {
       sentence:    '一_____年輕人',
       answer:      '群',
       distractors: ['個', '雙', '種'],
       category:    { fr: 'Collection 集合', en: 'Collection 集合' },
       translation: { fr: 'un groupe de jeunes gens', en: 'a group of young people' },
       explanation: {
         fr: '「<strong>群 qún</strong>」 désigne un groupe de personnes ou d\'animaux.<br>Fun fact : 一群笨蛋 = « un groupe d\'idiots » — pratique pour se plaindre des collègues ! 😄',
         en: '「<strong>群 qún</strong>」 designates a group of people or animals.<br>Fun fact: 一群笨蛋 = "a group of idiots" — handy for complaining about colleagues! 😄',
       },
     },
     {
       sentence:    '三_____咖啡',
       answer:      '種',
       distractors: ['杯', '個', '碗'],
       category:    { fr: 'Collection 集合', en: 'Collection 集合' },
       translation: { fr: 'trois types de café', en: 'three types of coffee' },
       explanation: {
         fr: '「<strong>種 zhǒng</strong>」 désigne des types ou variétés. Trois types de café = trois variétés → <em>種</em>.<br>× 杯 = tasses de café (unité de volume).',
         en: '「<strong>種 zhǒng</strong>」 is used for types or varieties. Three types of coffee → <em>種</em>.<br>× 杯 = cups of coffee (unit of volume).',
       },
     },
     {
       sentence:    '一_____問題',
       answer:      '些',
       distractors: ['個', '種', '群'],
       category:    { fr: 'Indéfini 不定',  en: 'Indefinite 不定' },
       translation: { fr: 'quelques questions', en: 'some questions' },
       explanation: {
         fr: '「<strong>些 xiē</strong>」 exprime une quantité indéfinie (quelques, un peu de). 一些問題 = quelques questions (nombre non précisé).<br>× 個 indique une unité précise.',
         en: '「<strong>些 xiē</strong>」 expresses an indefinite quantity (some, a few). 一些問題 = some questions (unspecified number).<br>× 個 indicates a precise unit.',
       },
     },
     {
       sentence:    '兩_____啤酒',
       answer:      '杯',
       distractors: ['瓶', '碗', '個'],
       category:    { fr: 'Emprunté 借用',  en: 'Borrowed 借用' },
       translation: { fr: 'deux verres de bière', en: 'two glasses of beer' },
       explanation: {
         fr: '「<strong>杯 bēi</strong>」 (emprunté de 杯子 = verre/tasse) = une tasse ou un verre de quelque chose.<br>× 瓶 = bouteille. × 碗 = bol.',
         en: '「<strong>杯 bēi</strong>」 (borrowed from 杯子 = cup/glass) = a cup or glass of something.<br>× 瓶 = bottle. × 碗 = bowl.',
       },
     },
     {
       sentence:    '一_____麵',
       answer:      '碗',
       distractors: ['盤', '杯', '份'],
       category:    { fr: 'Emprunté 借用',  en: 'Borrowed 借用' },
       translation: { fr: 'un bol de nouilles', en: 'a bowl of noodles' },
       explanation: {
         fr: '「<strong>碗 wǎn</strong>」 (de 碗 = bol) = un bol de quelque chose. Les nouilles se servent dans un bol → <em>碗</em>.<br>× 盤 = assiette. × 杯 = verre.',
         en: '「<strong>碗 wǎn</strong>」 (from 碗 = bowl) = a bowl of something. Noodles are served in a bowl → <em>碗</em>.<br>× 盤 = plate. × 杯 = glass.',
       },
     },
     {
       sentence:    '一_____水果',
       answer:      '盤',
       distractors: ['碗', '杯', '份'],
       category:    { fr: 'Emprunté 借用',  en: 'Borrowed 借用' },
       translation: { fr: 'une assiette de fruits', en: 'a plate of fruit' },
       explanation: {
         fr: '「<strong>盤 pán</strong>」 (de 盤子 = assiette) = une assiette de quelque chose. Des fruits en assiette → <em>盤</em>.',
         en: '「<strong>盤 pán</strong>」 (from 盤子 = plate/dish) = a plate of something. Fruit served on a plate → <em>盤</em>.',
       },
     },
     {
       sentence:    '六_____紅酒',
       answer:      '瓶',
       distractors: ['杯', '碗', '盤'],
       category:    { fr: 'Emprunté 借用',  en: 'Borrowed 借用' },
       translation: { fr: 'six bouteilles de vin rouge', en: 'six bottles of red wine' },
       explanation: {
         fr: '「<strong>瓶 píng</strong>」 (de 瓶子 = bouteille) = une bouteille de quelque chose. Six bouteilles de vin rouge → <em>瓶</em>.',
         en: '「<strong>瓶 píng</strong>」 (from 瓶子 = bottle) = a bottle of something. Six bottles of red wine → <em>瓶</em>.',
       },
     },
     {
       sentence:    '這個電影我看了三_____',
       answer:      '遍',
       distractors: ['次', '趟', '場'],
       category:    { fr: 'Action 動量',    en: 'Action 動量' },
       translation: { fr: "J'ai regardé ce film trois fois (du début à la fin)", en: 'I watched this film three times (start to finish)' },
       explanation: {
         fr: '「<strong>遍 biàn</strong>」 insiste sur le processus COMPLET du début à la fin.<br>× 次 = simplement « trois fois », sans insister sur le visionnage complet.',
         en: '「<strong>遍 biàn</strong>」 emphasises the COMPLETE process from start to finish.<br>× 次 = simply "three times", without implying you watched the whole thing.',
       },
     },
     {
       sentence:    '我去過一_____中國',
       answer:      '次',
       distractors: ['遍', '趟', '陣'],
       category:    { fr: 'Action 動量',    en: 'Action 動量' },
       translation: { fr: 'Je suis allé une fois en Chine', en: 'I have been to China once' },
       explanation: {
         fr: '「<strong>次 cì</strong>」 compte le nombre de fois qu\'une action se répète.<br>× 趟 insiste sur un aller-retour complet. × 遍 = processus entier.',
         en: '「<strong>次 cì</strong>」 counts how many times an action is repeated.<br>× 趟 emphasises a round trip. × 遍 = complete process from start to finish.',
       },
     },
     {
       sentence:    '我明天要去一_____紐約',
       answer:      '趟',
       distractors: ['次', '遍', '場'],
       category:    { fr: 'Action 動量',    en: 'Action 動量' },
       translation: { fr: 'Demain, je dois faire un aller-retour à New York', en: 'Tomorrow I need to make a round trip to New York' },
       explanation: {
         fr: '「<strong>趟 tàng</strong>」 souligne un aller-retour complet. Aller à New York et revenir = un 趟.<br>× 次 = « une fois » sans préciser l\'aller-retour.',
         en: '「<strong>趟 tàng</strong>」 highlights a complete round trip. Going to New York and coming back = one 趟.<br>× 次 = "once" without implying a return trip.',
       },
     },
     {
       sentence:    '一_____比賽',
       answer:      '場',
       distractors: ['次', '遍', '趟'],
       category:    { fr: 'Action 動量',    en: 'Action 動量' },
       translation: { fr: 'un match / une compétition', en: 'a match / a competition' },
       explanation: {
         fr: '「<strong>場 chǎng</strong>」 (de 場地 = lieu) s\'utilise pour des événements entiers : matches, concerts, activités.<br>× 次 = simple répétition sans événement structuré.',
         en: '「<strong>場 chǎng</strong>」 (from 場地 = venue) is used for complete events: matches, concerts, activities.<br>× 次 = simple repetition with no sense of a structured event.',
       },
     },
   ];
   
   // ── PINYIN TABLES ─────────────────────────────────────────────
   const CLASSIFIER_PINYIN = {
     '條':'tiáo', '張':'zhāng', '顆':'kē',  '粒':'lì',   '個':'ge',   '隻':'zhī',
     '件':'jiàn', '台':'tái',   '雙':'shuāng','群':'qún', '種':'zhǒng','些':'xiē',
     '年':'nián', '天':'tiān',  '國':'guó',  '分鐘':'fēnzhōng',
     '杯':'bēi',  '碗':'wǎn',   '盤':'pán',  '瓶':'píng',
     '次':'cì',   '趟':'tàng',  '遍':'biàn', '陣':'zhèn', '場':'chǎng',
     '份':'fèn',  '根':'gēn',   '尾':'wěi',
   };
   
   const CHAR_PINYIN = {
     '一':'yī',  '二':'èr',  '三':'sān', '四':'sì',  '五':'wǔ',  '六':'liù',
     '兩':'liǎng','這':'zhè','哪':'nǎ',
     '褲':'kù',  '子':'zi',  '魚':'yú',  '蛇':'shé', '路':'lù',  '紙':'zhǐ',
     '機':'jī',  '票':'piào','車':'chē', '桌':'zhuō','葡':'pú',  '萄':'táo',
     '糖':'táng','果':'guǒ', '星':'xīng','人':'rén', '蘋':'píng','狗':'gǒu',
     '貓':'māo', '豬':'zhū', '衣':'yī',  '服':'fú',  '外':'wài', '套':'tào',
     '襯':'chèn','衫':'shān','冷':'lěng','氣':'qì',  '腦':'nǎo', '冰':'bīng',
     '箱':'xiāng','筷':'kuài','鞋':'xié','襪':'wà',  '輕':'qīng','咖':'kā',
     '啡':'fēi', '問':'wèn', '題':'tí',  '啤':'pí',  '酒':'jiǔ', '麵':'miàn',
     '水':'shuǐ','紅':'hóng','電':'diàn','影':'yǐng','我':'wǒ',  '看':'kàn',
     '了':'le',  '去':'qù',  '過':'guò', '中':'zhōng','明':'míng','天':'tiān',
     '要':'yào', '紐':'niǔ', '約':'yuē', '比':'bǐ',  '賽':'sài', '年':'nián',
     '群':'qún', '國':'guó', '跑':'pǎo', '才':'cái', '買':'mǎi', '到':'dào',
     '東':'dōng','西':'xī',  '個':'gè',  '的':'de',  '飯':'fàn', '湯':'tāng',
     '菜':'cài', '起':'qǐ',  '司':'sī',  '牛':'niú', '奶':'nǎi', '些':'xiē',
     '時':'shí', '間':'jiān','情':'qíng','況':'kuàng',
   };
   
   // ── HELPERS ───────────────────────────────────────────────────
   function $(id) { return document.getElementById(id); }
   
   function shuffle(arr) {
     const a = [...arr];
     for (let i = a.length - 1; i > 0; i--) {
       const j = Math.floor(Math.random() * (i + 1));
       [a[i], a[j]] = [a[j], a[i]];
     }
     return a;
   }
   
   function buildRubySentence(sentence) {
     const BLANK = '\u3010\u7a7a\u767d\u3011'; // 【空白】
     const s = sentence.replace('_____', BLANK);
     let html = '';
     let i = 0;
     while (i < s.length) {
       if (s.slice(i, i + BLANK.length) === BLANK) {
         html += `<span class="blank" id="blankSpan">＿</span>`;
         i += BLANK.length;
       } else {
         const ch = s[i];
         const py = CHAR_PINYIN[ch];
         html += py ? `<ruby>${ch}<rt>${py}</rt></ruby>` : ch;
         i++;
       }
     }
     return html;
   }
   
   // ── STATE ─────────────────────────────────────────────────────
   let currentLang = null;
   let questions   = [];
   let currentIdx  = 0;
   let score       = 0;
   let streak      = 0;
   let answered    = false;
   
   // ── SCREENS ───────────────────────────────────────────────────
   function showScreen(name) {
     $('langScreen').style.display = name === 'lang'    ? 'flex'  : 'none';
     $('quizArea').style.display   = name === 'quiz'    ? 'block' : 'none';
     $('results').style.display    = name === 'results' ? 'block' : 'none';
   }
   
   // ── LANGUAGE SELECTION ────────────────────────────────────────
   function selectLang(lang) {
     currentLang = lang;
     $('btnFR').classList.toggle('active', lang === 'fr');
     $('btnEN').classList.toggle('active', lang === 'en');
     $('startBtn').disabled = false;
   }
   
   function goToLangScreen() {
     showScreen('lang');
     $('btnFR').classList.toggle('active', currentLang === 'fr');
     $('btnEN').classList.toggle('active', currentLang === 'en');
     $('startBtn').disabled = false;
   }
   
   // ── GAME FLOW ─────────────────────────────────────────────────
   function startGame() {
     if (!currentLang) return;
     _initRound();
     showScreen('quiz');
     updateLangSwitcher();
     renderQuestion();
   }
   
   function replayGame() {
     _initRound();
     showScreen('quiz');
     renderQuestion();
   }
   
   function _initRound() {
     questions  = shuffle(ALL_QUESTIONS);
     currentIdx = 0;
     score      = 0;
     streak     = 0;
     $('scoreNum').textContent  = '0';
     $('streakNum').textContent = '0';
   }
   
   function switchLang(lang) {
     currentLang = lang;
     updateLangSwitcher();
     $('headerSubtitle').textContent = UI[lang].subtitle;
   
     if (!answered) {
       renderQuestion();        // safe — no answer selected yet
     } else {
       // Swap translatable text only, keep answer highlight intact
       const q  = questions[currentIdx];
       const ui = UI[lang];
       $('qCategory').textContent    = q.category[lang];
       $('qTranslation').textContent = '→ ' + q.translation[lang];
       $('nextBtn').textContent      = ui.nextBtn;
       const fb = $('feedback');
       if (fb.classList.contains('show')) {
         $('feedbackText').innerHTML    = q.explanation[lang];
         $('feedbackTitle').textContent = fb.classList.contains('wrong-fb')
           ? ui.wrongTitle(q.answer)
           : ui.correctTitle;
       }
     }
   }
   
   function updateLangSwitcher() {
     $('swFR').classList.toggle('active-lang', currentLang === 'fr');
     $('swEN').classList.toggle('active-lang', currentLang === 'en');
   }
   
   // ── RENDER QUESTION ───────────────────────────────────────────
   function renderQuestion() {
     answered = false;
     const q     = questions[currentIdx];
     const lang  = currentLang;
     const ui    = UI[lang];
     const total = questions.length;
   
     $('qCategory').textContent    = q.category[lang];
     $('qNumber').textContent      = '#' + String(currentIdx + 1).padStart(2, '0');
     $('progressFill').style.width = ((currentIdx / total) * 100) + '%';
     $('progressText').textContent = ui.questionOf(currentIdx + 1, total);
     $('qSentence').innerHTML      = buildRubySentence(q.sentence);
     $('qTranslation').textContent = '→ ' + q.translation[lang];
   
     // Render choices
     const allChoices = shuffle([q.answer, ...q.distractors]);
     const grid = $('choicesGrid');
     grid.innerHTML = '';
     allChoices.forEach(ch => {
       const py  = CLASSIFIER_PINYIN[ch] || '';
       const btn = document.createElement('button');
       btn.className = 'choice-btn';
       btn.innerHTML = `<span class="char">${ch}</span><span class="romanization">${py}</span>`;
       btn.addEventListener('click', () => handleAnswer(ch, btn));
       grid.appendChild(btn);
     });
   
     // Reset card UI
     $('questionCard').className   = 'card';
     $('feedback').className       = 'feedback';
     const nb = $('nextBtn');
     nb.style.display = 'none';
     nb.textContent   = ui.nextBtn;
   }
   
   // ── HANDLE ANSWER ─────────────────────────────────────────────
   function handleAnswer(chosen, btn) {
     if (answered) return;
     answered = true;
   
     const q         = questions[currentIdx];
     const ui        = UI[currentLang];
     const isCorrect = chosen === q.answer;
     const card      = $('questionCard');
     const btns      = document.querySelectorAll('.choice-btn');
     const fb        = $('feedback');
   
     btns.forEach(b => { b.disabled = true; });
   
     // Fill blank with correct answer + pinyin
     const blank = $('blankSpan');
     if (blank) {
       blank.innerHTML = `<ruby>${q.answer}<rt>${CLASSIFIER_PINYIN[q.answer] || ''}</rt></ruby>`;
       blank.classList.add('filled');
     }
   
     if (isCorrect) {
       score++;
       streak++;
       $('scoreNum').textContent  = score;
       $('streakNum').textContent = streak;
       btn.classList.add('correct-ans');
       card.classList.add('correct');
       fb.className = 'feedback show';
       $('feedbackTitle').textContent = ui.correctTitle;
       $('feedbackText').innerHTML    = q.explanation[currentLang];
     } else {
       streak = 0;
       $('streakNum').textContent = '0';
       btn.classList.add('wrong-ans');
       card.classList.add('wrong');
       btns.forEach(b => {
         const charEl = b.querySelector('.char');
         if (charEl && charEl.textContent === q.answer) b.classList.add('correct-ans');
         else if (b !== btn) b.classList.add('dimmed');
       });
       fb.className = 'feedback wrong-fb show';
       $('feedbackTitle').textContent = ui.wrongTitle(q.answer);
       $('feedbackText').innerHTML    = q.explanation[currentLang];
     }
   
     const nb = $('nextBtn');
     nb.style.display  = 'block';
     nb.style.animation = 'fadeIn .25s .1s both';
   }
   
   // ── NEXT / RESULTS ────────────────────────────────────────────
   document.addEventListener('DOMContentLoaded', () => {
     $('nextBtn').addEventListener('click', () => {
       currentIdx++;
       if (currentIdx >= questions.length) showResults();
       else renderQuestion();
     });
   });
   
   function showResults() {
     showScreen('results');
   
     const ui    = UI[currentLang];
     const total = questions.length;
     const pct   = score / total;
     const tier  = pct === 1 ? 5 : pct >= 0.8 ? 4 : pct >= 0.6 ? 3 : pct >= 0.4 ? 2 : 1;
     const STARS = ['', '★☆☆☆☆', '★★☆☆☆', '★★★☆☆', '★★★★☆', '★★★★★'];
   
     $('starsDisplay').textContent  = STARS[tier];
     $('finalTotal').textContent    = ui.results.total(total);
     $('resultMsg').textContent     = ui.results[tier].msg;
     $('resultSub').textContent     = ui.results[tier].sub;
     $('replayBtn').textContent     = ui.replayBtn;
     $('changeLangBtn').textContent = ui.changeLang;
   
     // Animated score counter
     let n = 0;
     const el = $('finalScore');
     el.textContent = '0';
     const tick = setInterval(() => {
       n++;
       el.textContent = n;
       if (n >= score) clearInterval(tick);
     }, 55);
   }
   
   // ── EXPOSE to HTML onclick ────────────────────────────────────
   window.selectLang    = selectLang;
   window.startGame     = startGame;
   window.replayGame    = replayGame;
   window.switchLang    = switchLang;
   window.goToLangScreen = goToLangScreen;
   