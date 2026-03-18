/* ============================================================
   classifier-quiz.js
   Bilingual (FR / EN) Chinese Classifier Quiz
   ~75 questions · auto distractors · selectable quiz length
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
       selectCount:  'Nombre de questions · 題數',
       startBtn:     '▶ Commencer · 開始',
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
       selectCount:  'Number of questions · 題數',
       startBtn:     '▶ Start · 開始',
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
   
   // ── FULL QUESTION BANK (~75 questions) ───────────────────────
   const QUESTION_BANK = [
   
     // ── 1. 條 tiáo ──────────────────────────────────────────
     {
       sentence: '一_____褲子', answer: '條',
       category: { fr: 'Individuel 個別', en: 'Individual 個別' },
       translation: { fr: 'un pantalon', en: 'a pair of trousers' },
       explanation: { fr: '「<strong>條 tiáo</strong>」 pour les objets longs et étroits. Un pantalon est long → <em>條</em>.', en: '「<strong>條 tiáo</strong>」 for long, strip-shaped objects. Trousers are long and narrow → <em>條</em>.' },
     },
     {
       sentence: '一_____蛇', answer: '條',
       category: { fr: 'Individuel 個別', en: 'Individual 個別' },
       translation: { fr: 'un serpent', en: 'a snake' },
       explanation: { fr: '「<strong>條 tiáo</strong>」 pour les objets longs. Un serpent est long → <em>條</em>.', en: '「<strong>條 tiáo</strong>」 for long objects. A snake is long and slender → <em>條</em>.' },
     },
     {
       sentence: '一_____魚', answer: '條',
       category: { fr: 'Individuel 個別', en: 'Individual 個別' },
       translation: { fr: 'un poisson', en: 'a fish' },
       explanation: { fr: '「<strong>條 tiáo</strong>」 pour les poissons. Note : 隻 s\'utilise pour les animaux terrestres, pas les poissons.', en: '「<strong>條 tiáo</strong>」 for fish. Note: 隻 is for land animals, not fish.' },
     },
     {
       sentence: '這_____路', answer: '條',
       category: { fr: 'Individuel 個別', en: 'Individual 個別' },
       translation: { fr: 'cette route', en: 'this road' },
       explanation: { fr: '「<strong>條 tiáo</strong>」 pour les routes et rivières (longues et étroites).', en: '「<strong>條 tiáo</strong>」 for roads and rivers (long and narrow).' },
     },
   
     // ── 2. 張 zhāng ─────────────────────────────────────────
     {
       sentence: '一_____紙', answer: '張',
       category: { fr: 'Individuel 個別', en: 'Individual 個別' },
       translation: { fr: 'une feuille de papier', en: 'a sheet of paper' },
       explanation: { fr: '「<strong>張 zhāng</strong>」 pour les objets plats et dépliables.', en: '「<strong>張 zhāng</strong>」 for flat, spreadable objects.' },
     },
     {
       sentence: '兩_____機票', answer: '張',
       category: { fr: 'Individuel 個別', en: 'Individual 個別' },
       translation: { fr: "deux billets d'avion", en: 'two plane tickets' },
       explanation: { fr: '「<strong>張 zhāng</strong>」 pour les billets et documents plats.', en: '「<strong>張 zhāng</strong>」 for flat tickets and documents.' },
     },
     {
       sentence: '三_____車票', answer: '張',
       category: { fr: 'Individuel 個別', en: 'Individual 個別' },
       translation: { fr: 'trois billets de train', en: 'three train tickets' },
       explanation: { fr: '「<strong>張 zhāng</strong>」 pour les billets de transport (plats).', en: '「<strong>張 zhāng</strong>」 for transport tickets (flat objects).' },
     },
     {
       sentence: '一_____桌子', answer: '張',
       category: { fr: 'Individuel 個別', en: 'Individual 個別' },
       translation: { fr: 'une table', en: 'a table' },
       explanation: { fr: '「<strong>張 zhāng</strong>」 pour les tables (surfaces plates).', en: '「<strong>張 zhāng</strong>」 for tables (flat surfaces).' },
     },
   
     // ── 3. 顆 kē ────────────────────────────────────────────
     {
       sentence: '一_____葡萄', answer: '顆',
       category: { fr: 'Individuel 個別', en: 'Individual 個別' },
       translation: { fr: 'un raisin', en: 'a grape' },
       explanation: { fr: '「<strong>顆 kē</strong>」 pour les petits objets ronds. Un raisin → <em>顆</em>.', en: '「<strong>顆 kē</strong>」 for small round objects. A grape → <em>顆</em>.' },
     },
     {
       sentence: '兩_____糖果', answer: '顆',
       category: { fr: 'Individuel 個別', en: 'Individual 個別' },
       translation: { fr: 'deux bonbons', en: 'two sweets' },
       explanation: { fr: '「<strong>顆 kē</strong>」 pour les petits objets ronds comme les bonbons.', en: '「<strong>顆 kē</strong>」 for small round objects like sweets.' },
     },
     {
       sentence: '三_____星', answer: '顆',
       category: { fr: 'Individuel 個別', en: 'Individual 個別' },
       translation: { fr: 'trois étoiles (ex. Michelin)', en: 'three stars (e.g. Michelin)' },
       explanation: { fr: '「<strong>顆 kē</strong>」 pour les étoiles rondes. D\'où 米其林三顆星 !', en: '「<strong>顆 kē</strong>」 for round stars. Hence 米其林三顆星 (Michelin stars)!' },
     },
   
     // ── 4. 個 ge ────────────────────────────────────────────
     {
       sentence: '一_____人', answer: '個',
       category: { fr: 'Individuel 個別', en: 'Individual 個別' },
       translation: { fr: 'une personne', en: 'a person' },
       explanation: { fr: '「<strong>個 ge</strong>」 classificateur universel. Pour les personnes → <em>個</em>.', en: '「<strong>個 ge</strong>」 all-purpose classifier. For people → <em>個</em>.' },
     },
     {
       sentence: '一_____蘋果', answer: '個',
       category: { fr: 'Individuel 個別', en: 'Individual 個別' },
       translation: { fr: 'une pomme', en: 'an apple' },
       explanation: { fr: '「<strong>個 ge</strong>」 classificateur universel. Pour une pomme → <em>個</em>.', en: '「<strong>個 ge</strong>」 all-purpose classifier. For an apple → <em>個</em>.' },
     },
     {
       sentence: '一_____月', answer: '個',
       category: { fr: 'Individuel 個別', en: 'Individual 個別' },
       translation: { fr: 'un mois', en: 'a month' },
       explanation: { fr: '「<strong>個 ge</strong>」 pour les unités de temps abstraites comme les mois.', en: '「<strong>個 ge</strong>」 for abstract time units like months.' },
     },
   
     // ── 5. 隻 zhī ───────────────────────────────────────────
     {
       sentence: '一_____狗', answer: '隻',
       category: { fr: 'Individuel 個別', en: 'Individual 個別' },
       translation: { fr: 'un chien', en: 'a dog' },
       explanation: { fr: '「<strong>隻 zhī</strong>」 pour les animaux.', en: '「<strong>隻 zhī</strong>」 for animals.' },
     },
     {
       sentence: '兩_____貓', answer: '隻',
       category: { fr: 'Individuel 個別', en: 'Individual 個別' },
       translation: { fr: 'deux chats', en: 'two cats' },
       explanation: { fr: '「<strong>隻 zhī</strong>」 pour les animaux (chiens, chats, oiseaux…).', en: '「<strong>隻 zhī</strong>」 for animals (dogs, cats, birds…).' },
     },
     {
       sentence: '三_____小豬', answer: '隻',
       category: { fr: 'Individuel 個別', en: 'Individual 個別' },
       translation: { fr: 'trois petits cochons', en: 'three little pigs' },
       explanation: { fr: '「<strong>隻 zhī</strong>」 pour les animaux. Les trois petits cochons → 三隻小豬 !', en: '「<strong>隻 zhī</strong>」 for animals. The three little pigs → 三隻小豬!' },
     },
   
     // ── 6. 件 jiàn ──────────────────────────────────────────
     {
       sentence: '一_____衣服', answer: '件',
       category: { fr: 'Individuel 個別', en: 'Individual 個別' },
       translation: { fr: 'un vêtement', en: 'a garment' },
       explanation: { fr: '「<strong>件 jiàn</strong>」 pour les vêtements du haut (chemises, vestes…).', en: '「<strong>件 jiàn</strong>」 for upper-body garments (shirts, jackets…).' },
     },
     {
       sentence: '三_____外套', answer: '件',
       category: { fr: 'Individuel 個別', en: 'Individual 個別' },
       translation: { fr: 'trois vestes', en: 'three jackets' },
       explanation: { fr: '「<strong>件 jiàn</strong>」 pour les vêtements du haut. × 條 = vêtements longs (pantalons).', en: '「<strong>件 jiàn</strong>」 for upper-body garments. × 條 = long garments (trousers).' },
     },
     {
       sentence: '兩_____襯衫', answer: '件',
       category: { fr: 'Individuel 個別', en: 'Individual 個別' },
       translation: { fr: 'deux chemises', en: 'two shirts' },
       explanation: { fr: '「<strong>件 jiàn</strong>」 pour les chemises.', en: '「<strong>件 jiàn</strong>」 for shirts.' },
     },
   
     // ── 7. 台 tái ───────────────────────────────────────────
     {
       sentence: '這_____冷氣', answer: '台',
       category: { fr: 'Individuel 個別', en: 'Individual 個別' },
       translation: { fr: 'cet air conditionné', en: 'this air conditioner' },
       explanation: { fr: '「<strong>台 tái</strong>」 pour les machines et appareils.', en: '「<strong>台 tái</strong>」 for machines and appliances.' },
     },
     {
       sentence: '四_____車', answer: '台',
       category: { fr: 'Individuel 個別', en: 'Individual 個別' },
       translation: { fr: 'quatre voitures', en: 'four cars' },
       explanation: { fr: '「<strong>台 tái</strong>」 pour les véhicules et machines.', en: '「<strong>台 tái</strong>」 for vehicles and machines.' },
     },
     {
       sentence: '這_____電腦', answer: '台',
       category: { fr: 'Individuel 個別', en: 'Individual 個別' },
       translation: { fr: 'cet ordinateur', en: 'this computer' },
       explanation: { fr: '「<strong>台 tái</strong>」 pour les appareils électroniques.', en: '「<strong>台 tái</strong>」 for electronic devices.' },
     },
     {
       sentence: '一_____冰箱', answer: '台',
       category: { fr: 'Individuel 個別', en: 'Individual 個別' },
       translation: { fr: 'un frigo', en: 'a fridge' },
       explanation: { fr: '「<strong>台 tái</strong>」 pour les électroménagers.', en: '「<strong>台 tái</strong>」 for household appliances.' },
     },
   
     // ── 8. 雙 shuāng ────────────────────────────────────────
     {
       sentence: '一_____筷子', answer: '雙',
       category: { fr: 'Collection 集合', en: 'Collection 集合' },
       translation: { fr: 'une paire de baguettes', en: 'a pair of chopsticks' },
       explanation: { fr: '「<strong>雙 shuāng</strong>」 pour les paires. Note : 根 = une seule baguette.', en: '「<strong>雙 shuāng</strong>」 for pairs. Note: 根 = a single chopstick.' },
     },
     {
       sentence: '兩_____鞋子', answer: '雙',
       category: { fr: 'Collection 集合', en: 'Collection 集合' },
       translation: { fr: 'deux paires de chaussures', en: 'two pairs of shoes' },
       explanation: { fr: '「<strong>雙 shuāng</strong>」 pour les paires de chaussures.', en: '「<strong>雙 shuāng</strong>」 for pairs of shoes.' },
     },
     {
       sentence: '這_____襪子', answer: '雙',
       category: { fr: 'Collection 集合', en: 'Collection 集合' },
       translation: { fr: 'cette paire de chaussettes', en: 'this pair of socks' },
       explanation: { fr: '「<strong>雙 shuāng</strong>」 pour les paires de chaussettes.', en: '「<strong>雙 shuāng</strong>」 for pairs of socks.' },
     },
     {
       sentence: '一_____子女', answer: '雙',
       category: { fr: 'Collection 集合', en: 'Collection 集合' },
       translation: { fr: 'un garçon et une fille', en: 'a son and a daughter' },
       explanation: { fr: '「<strong>雙 shuāng</strong>」 peut désigner une paire d\'enfants (un garçon + une fille).', en: '「<strong>雙 shuāng</strong>」 can mean a pair of children (one boy + one girl).' },
     },
   
     // ── 9. 群 qún ───────────────────────────────────────────
     {
       sentence: '一_____年輕人', answer: '群',
       category: { fr: 'Collection 集合', en: 'Collection 集合' },
       translation: { fr: 'un groupe de jeunes gens', en: 'a group of young people' },
       explanation: { fr: '「<strong>群 qún</strong>」 pour un groupe de personnes.', en: '「<strong>群 qún</strong>」 for a group of people.' },
     },
     {
       sentence: '一_____小孩', answer: '群',
       category: { fr: 'Collection 集合', en: 'Collection 集合' },
       translation: { fr: "un groupe d'enfants", en: 'a group of children' },
       explanation: { fr: '「<strong>群 qún</strong>」 pour un groupe d\'enfants.', en: '「<strong>群 qún</strong>」 for a group of children.' },
     },
     {
       sentence: '一_____羊', answer: '群',
       category: { fr: 'Collection 集合', en: 'Collection 集合' },
       translation: { fr: 'un troupeau de moutons', en: 'a flock of sheep' },
       explanation: { fr: '「<strong>群 qún</strong>」 pour un troupeau d\'animaux.', en: '「<strong>群 qún</strong>」 for a flock or herd of animals.' },
     },
     {
       sentence: '一_____笨蛋', answer: '群',
       category: { fr: 'Collection 集合', en: 'Collection 集合' },
       translation: { fr: "un groupe d'idiots 😄", en: 'a group of idiots 😄' },
       explanation: { fr: '「<strong>群 qún</strong>」 pour un groupe. Utile pour se plaindre des collègues ! 😄', en: '「<strong>群 qún</strong>」 for a group. Handy for complaining about colleagues! 😄' },
     },
   
     // ── 10. 種 zhǒng ────────────────────────────────────────
     {
       sentence: '三_____咖啡', answer: '種',
       category: { fr: 'Collection 集合', en: 'Collection 集合' },
       translation: { fr: 'trois types de café', en: 'three types of coffee' },
       explanation: { fr: '「<strong>種 zhǒng</strong>」 pour les types ou variétés. × 杯 = tasses (volume).', en: '「<strong>種 zhǒng</strong>」 for types or varieties. × 杯 = cups (volume).' },
     },
     {
       sentence: '四_____語言', answer: '種',
       category: { fr: 'Collection 集合', en: 'Collection 集合' },
       translation: { fr: 'quatre langues', en: 'four languages' },
       explanation: { fr: '「<strong>種 zhǒng</strong>」 pour les types de langues.', en: '「<strong>種 zhǒng</strong>」 for types of languages.' },
     },
     {
       sentence: '哪一_____菜', answer: '種',
       category: { fr: 'Collection 集合', en: 'Collection 集合' },
       translation: { fr: 'quel type de plat', en: 'which type of dish' },
       explanation: { fr: '「<strong>種 zhǒng</strong>」 pour demander quel type de quelque chose.', en: '「<strong>種 zhǒng</strong>」 to ask which type of something.' },
     },
   
     // ── 11. 些 xiē ──────────────────────────────────────────
     {
       sentence: '一_____問題', answer: '些',
       category: { fr: 'Indéfini 不定', en: 'Indefinite 不定' },
       translation: { fr: 'quelques questions', en: 'some questions' },
       explanation: { fr: '「<strong>些 xiē</strong>」 quantité indéfinie. × 個 = unité précise.', en: '「<strong>些 xiē</strong>」 indefinite quantity. × 個 = precise unit.' },
     },
     {
       sentence: '一_____時間', answer: '些',
       category: { fr: 'Indéfini 不定', en: 'Indefinite 不定' },
       translation: { fr: 'un peu de temps', en: 'some time' },
       explanation: { fr: '「<strong>些 xiē</strong>」 quantité non précisée de temps.', en: '「<strong>些 xiē</strong>」 unspecified amount of time.' },
     },
     {
       sentence: '一_____情況', answer: '些',
       category: { fr: 'Indéfini 不定', en: 'Indefinite 不定' },
       translation: { fr: 'quelques situations', en: 'some situations' },
       explanation: { fr: '「<strong>些 xiē</strong>」 pour une quantité non précisée.', en: '「<strong>些 xiē</strong>」 for an unspecified number.' },
     },
   
     // ── 12. 年 nián ─────────────────────────────────────────
     {
       sentence: '一_____', answer: '年',
       category: { fr: 'Quasi-classif. 準量詞', en: 'Quasi-classifier 準量詞' },
       translation: { fr: 'un an', en: 'one year' },
       explanation: { fr: '「<strong>年 nián</strong>」 quasi-classificateur : pas besoin d\'autre classificateur entre le nombre et 年.', en: '「<strong>年 nián</strong>」 quasi-classifier: no extra classifier needed between number and 年.' },
     },
     {
       sentence: '兩_____', answer: '年',
       category: { fr: 'Quasi-classif. 準量詞', en: 'Quasi-classifier 準量詞' },
       translation: { fr: 'deux ans', en: 'two years' },
       explanation: { fr: '「<strong>年 nián</strong>」 quasi-classificateur. On dit directement 兩年.', en: '「<strong>年 nián</strong>」 quasi-classifier. Say 兩年 directly.' },
     },
     {
       sentence: '三_____', answer: '年',
       category: { fr: 'Quasi-classif. 準量詞', en: 'Quasi-classifier 準量詞' },
       translation: { fr: 'trois ans', en: 'three years' },
       explanation: { fr: '「<strong>年 nián</strong>」 quasi-classificateur pour les années.', en: '「<strong>年 nián</strong>」 quasi-classifier for years.' },
     },
   
     // ── 13. 天 tiān ─────────────────────────────────────────
     {
       sentence: '三_____', answer: '天',
       category: { fr: 'Quasi-classif. 準量詞', en: 'Quasi-classifier 準量詞' },
       translation: { fr: 'trois jours', en: 'three days' },
       explanation: { fr: '「<strong>天 tiān</strong>」 quasi-classificateur pour les jours.', en: '「<strong>天 tiān</strong>」 quasi-classifier for days.' },
     },
     {
       sentence: '十_____', answer: '天',
       category: { fr: 'Quasi-classif. 準量詞', en: 'Quasi-classifier 準量詞' },
       translation: { fr: 'dix jours', en: 'ten days' },
       explanation: { fr: '「<strong>天 tiān</strong>」 quasi-classificateur. On dit 十天 directement.', en: '「<strong>天 tiān</strong>」 quasi-classifier. Say 十天 directly.' },
     },
     {
       sentence: '十五_____', answer: '天',
       category: { fr: 'Quasi-classif. 準量詞', en: 'Quasi-classifier 準量詞' },
       translation: { fr: 'quinze jours', en: 'fifteen days' },
       explanation: { fr: '「<strong>天 tiān</strong>」 quasi-classificateur pour les jours.', en: '「<strong>天 tiān</strong>」 quasi-classifier for days.' },
     },
   
     // ── 14. 國 guó ──────────────────────────────────────────
     {
       sentence: '兩_____', answer: '國',
       category: { fr: 'Quasi-classif. 準量詞', en: 'Quasi-classifier 準量詞' },
       translation: { fr: 'deux pays', en: 'two countries' },
       explanation: { fr: '「<strong>國 guó</strong>」 quasi-classificateur pour les pays.', en: '「<strong>國 guó</strong>」 quasi-classifier for countries.' },
     },
     {
       sentence: '四_____', answer: '國',
       category: { fr: 'Quasi-classif. 準量詞', en: 'Quasi-classifier 準量詞' },
       translation: { fr: 'quatre pays', en: 'four countries' },
       explanation: { fr: '「<strong>國 guó</strong>」 quasi-classificateur pour les pays.', en: '「<strong>國 guó</strong>」 quasi-classifier for countries.' },
     },
   
     // ── 15. 分鐘 fēnzhōng ───────────────────────────────────
     {
       sentence: '兩_____', answer: '分鐘',
       category: { fr: 'Quasi-classif. 準量詞', en: 'Quasi-classifier 準量詞' },
       translation: { fr: 'deux minutes', en: 'two minutes' },
       explanation: { fr: '「<strong>分鐘 fēnzhōng</strong>」 quasi-classificateur pour les minutes.', en: '「<strong>分鐘 fēnzhōng</strong>」 quasi-classifier for minutes.' },
     },
     {
       sentence: '十_____', answer: '分鐘',
       category: { fr: 'Quasi-classif. 準量詞', en: 'Quasi-classifier 準量詞' },
       translation: { fr: 'dix minutes', en: 'ten minutes' },
       explanation: { fr: '「<strong>分鐘 fēnzhōng</strong>」 quasi-classificateur. On dit 十分鐘 directement.', en: '「<strong>分鐘 fēnzhōng</strong>」 quasi-classifier. Say 十分鐘 directly.' },
     },
   
     // ── 16. 杯 bēi ──────────────────────────────────────────
     {
       sentence: '兩_____啤酒', answer: '杯',
       category: { fr: 'Emprunté 借用', en: 'Borrowed 借用' },
       translation: { fr: 'deux verres de bière', en: 'two glasses of beer' },
       explanation: { fr: '「<strong>杯 bēi</strong>」 (de 杯子 = verre) = un verre de quelque chose. × 瓶 = bouteille.', en: '「<strong>杯 bēi</strong>」 (from 杯子 = cup) = a glass of something. × 瓶 = bottle.' },
     },
     {
       sentence: '這_____咖啡', answer: '杯',
       category: { fr: 'Emprunté 借用', en: 'Borrowed 借用' },
       translation: { fr: 'cette tasse de café', en: 'this cup of coffee' },
       explanation: { fr: '「<strong>杯 bēi</strong>」 pour une tasse de café.', en: '「<strong>杯 bēi</strong>」 for a cup of coffee.' },
     },
     {
       sentence: '五_____水', answer: '杯',
       category: { fr: 'Emprunté 借用', en: 'Borrowed 借用' },
       translation: { fr: "cinq verres d'eau", en: 'five glasses of water' },
       explanation: { fr: '「<strong>杯 bēi</strong>」 pour les verres d\'eau.', en: '「<strong>杯 bēi</strong>」 for glasses of water.' },
     },
   
     // ── 17. 碗 wǎn ──────────────────────────────────────────
     {
       sentence: '三_____飯', answer: '碗',
       category: { fr: 'Emprunté 借用', en: 'Borrowed 借用' },
       translation: { fr: 'trois bols de riz', en: 'three bowls of rice' },
       explanation: { fr: '「<strong>碗 wǎn</strong>」 (de 碗 = bol) = un bol de quelque chose.', en: '「<strong>碗 wǎn</strong>」 (from 碗 = bowl) = a bowl of something.' },
     },
     {
       sentence: '一_____麵', answer: '碗',
       category: { fr: 'Emprunté 借用', en: 'Borrowed 借用' },
       translation: { fr: 'un bol de nouilles', en: 'a bowl of noodles' },
       explanation: { fr: '「<strong>碗 wǎn</strong>」 pour les nouilles.', en: '「<strong>碗 wǎn</strong>」 for noodles.' },
     },
     {
       sentence: '這_____湯', answer: '碗',
       category: { fr: 'Emprunté 借用', en: 'Borrowed 借用' },
       translation: { fr: 'ce bol de soupe', en: 'this bowl of soup' },
       explanation: { fr: '「<strong>碗 wǎn</strong>」 pour la soupe.', en: '「<strong>碗 wǎn</strong>」 for soup.' },
     },
   
     // ── 18. 盤 pán ──────────────────────────────────────────
     {
       sentence: '一_____青菜', answer: '盤',
       category: { fr: 'Emprunté 借用', en: 'Borrowed 借用' },
       translation: { fr: 'une assiette de légumes verts', en: 'a plate of green vegetables' },
       explanation: { fr: '「<strong>盤 pán</strong>」 (de 盤子 = assiette) = une assiette de quelque chose.', en: '「<strong>盤 pán</strong>」 (from 盤子 = plate) = a plate of something.' },
     },
     {
       sentence: '一_____水果', answer: '盤',
       category: { fr: 'Emprunté 借用', en: 'Borrowed 借用' },
       translation: { fr: 'une assiette de fruits', en: 'a plate of fruit' },
       explanation: { fr: '「<strong>盤 pán</strong>」 pour les fruits en assiette.', en: '「<strong>盤 pán</strong>」 for fruit on a plate.' },
     },
     {
       sentence: '一_____起司', answer: '盤',
       category: { fr: 'Emprunté 借用', en: 'Borrowed 借用' },
       translation: { fr: 'une assiette de fromage', en: 'a plate of cheese' },
       explanation: { fr: '「<strong>盤 pán</strong>」 pour le fromage en assiette.', en: '「<strong>盤 pán</strong>」 for cheese on a plate.' },
     },
   
     // ── 19. 瓶 píng ─────────────────────────────────────────
     {
       sentence: '一_____牛奶', answer: '瓶',
       category: { fr: 'Emprunté 借用', en: 'Borrowed 借用' },
       translation: { fr: 'une bouteille de lait', en: 'a bottle of milk' },
       explanation: { fr: '「<strong>瓶 píng</strong>」 (de 瓶子 = bouteille) = une bouteille de quelque chose.', en: '「<strong>瓶 píng</strong>」 (from 瓶子 = bottle) = a bottle of something.' },
     },
     {
       sentence: '兩_____水', answer: '瓶',
       category: { fr: 'Emprunté 借用', en: 'Borrowed 借用' },
       translation: { fr: "deux bouteilles d'eau", en: 'two bottles of water' },
       explanation: { fr: '「<strong>瓶 píng</strong>」 pour les bouteilles d\'eau.', en: '「<strong>瓶 píng</strong>」 for bottles of water.' },
     },
     {
       sentence: '六_____紅酒', answer: '瓶',
       category: { fr: 'Emprunté 借用', en: 'Borrowed 借用' },
       translation: { fr: 'six bouteilles de vin rouge', en: 'six bottles of red wine' },
       explanation: { fr: '「<strong>瓶 píng</strong>」 pour les bouteilles de vin.', en: '「<strong>瓶 píng</strong>」 for bottles of wine.' },
     },
   
     // ── 20. 次 cì ───────────────────────────────────────────
     {
       sentence: '這個電影我看了三_____', answer: '次',
       category: { fr: 'Action 動量', en: 'Action 動量' },
       translation: { fr: "J'ai regardé ce film trois fois", en: 'I watched this film three times' },
       explanation: { fr: '「<strong>次 cì</strong>」 compte le nombre de fois. × 遍 = processus complet.', en: '「<strong>次 cì</strong>」 counts repetitions. × 遍 = complete process.' },
     },
     {
       sentence: '我去過一_____中國', answer: '次',
       category: { fr: 'Action 動量', en: 'Action 動量' },
       translation: { fr: 'Je suis allé une fois en Chine', en: 'I have been to China once' },
       explanation: { fr: '「<strong>次 cì</strong>」 pour le nombre de fois. × 趟 = aller-retour.', en: '「<strong>次 cì</strong>」 for number of times. × 趟 = round trip.' },
     },
     {
       sentence: '我一個星期上兩_____中文課', answer: '次',
       category: { fr: 'Action 動量', en: 'Action 動量' },
       translation: { fr: 'Je prends deux cours de chinois par semaine', en: 'I take Chinese class twice a week' },
       explanation: { fr: '「<strong>次 cì</strong>」 pour la fréquence par semaine.', en: '「<strong>次 cì</strong>」 for weekly frequency.' },
     },
   
     // ── 21. 趟 tàng ─────────────────────────────────────────
     {
       sentence: '我明天要去一_____紐約', answer: '趟',
       category: { fr: 'Action 動量', en: 'Action 動量' },
       translation: { fr: 'Demain je dois faire un aller-retour à New York', en: 'Tomorrow I need to make a round trip to New York' },
       explanation: { fr: '「<strong>趟 tàng</strong>」 aller-retour complet. × 次 = simplement "une fois".', en: '「<strong>趟 tàng</strong>」 complete round trip. × 次 = simply "once".' },
     },
     {
       sentence: '我跑了三_____才買到這個東西', answer: '趟',
       category: { fr: 'Action 動量', en: 'Action 動量' },
       translation: { fr: "J'ai fait trois allers-retours avant d'acheter cet objet", en: 'I made three round trips before buying this item' },
       explanation: { fr: '「<strong>趟 tàng</strong>」 chaque aller-retour effectué.', en: '「<strong>趟 tàng</strong>」 each complete round trip made.' },
     },
   
     // ── 22. 遍 biàn ─────────────────────────────────────────
     {
       sentence: '這個電影我看了三_____', answer: '遍',
       category: { fr: 'Action 動量', en: 'Action 動量' },
       translation: { fr: "J'ai regardé ce film trois fois (du début à la fin)", en: 'I watched this film three times (start to finish)' },
       explanation: { fr: '「<strong>遍 biàn</strong>」 processus COMPLET du début à la fin. × 次 = "trois fois" sans préciser si complet.', en: '「<strong>遍 biàn</strong>」 COMPLETE process start to finish. × 次 = "three times" without implying completeness.' },
     },
   
     // ── 23. 陣 zhèn ─────────────────────────────────────────
     {
       sentence: '剛剛突然下了一_____雨', answer: '陣',
       category: { fr: 'Action 動量', en: 'Action 動量' },
       translation: { fr: 'Il vient de pleuvoir soudainement un court moment', en: 'It suddenly rained briefly just now' },
       explanation: { fr: '「<strong>陣 zhèn</strong>」 pour quelque chose de soudain et bref. Souvent avec 突然.', en: '「<strong>陣 zhèn</strong>」 for something sudden and brief. Often used with 突然.' },
     },
     {
       sentence: '他們為什麼突然一_____歡呼', answer: '陣',
       category: { fr: 'Action 動量', en: 'Action 動量' },
       translation: { fr: 'Pourquoi ont-ils soudain poussé un cri de joie ?', en: 'Why did they suddenly cheer?' },
       explanation: { fr: '「<strong>陣 zhèn</strong>」 pour une action soudaine et courte.', en: '「<strong>陣 zhèn</strong>」 for a sudden, short burst of action.' },
     },
   
     // ── 24. 場 chǎng ────────────────────────────────────────
     {
       sentence: '一_____比賽', answer: '場',
       category: { fr: 'Action 動量', en: 'Action 動量' },
       translation: { fr: 'un match / une compétition', en: 'a match / a competition' },
       explanation: { fr: '「<strong>場 chǎng</strong>」 pour les événements entiers. × 次 = simple répétition.', en: '「<strong>場 chǎng</strong>」 for complete events. × 次 = simple repetition.' },
     },
     {
       sentence: '一_____音樂會', answer: '場',
       category: { fr: 'Action 動量', en: 'Action 動量' },
       translation: { fr: 'un concert', en: 'a concert' },
       explanation: { fr: '「<strong>場 chǎng</strong>」 pour les spectacles et concerts.', en: '「<strong>場 chǎng</strong>」 for performances and concerts.' },
     },
     {
       sentence: '這_____活動', answer: '場',
       category: { fr: 'Action 動量', en: 'Action 動量' },
       translation: { fr: 'cet événement', en: 'this event' },
       explanation: { fr: '「<strong>場 chǎng</strong>」 pour les activités structurées.', en: '「<strong>場 chǎng</strong>」 for structured activities.' },
     },
   
     // ── 25. 個 ge (action) ──────────────────────────────────
     {
       sentence: '吃_____飯', answer: '個',
       category: { fr: 'Action 動量', en: 'Action 動量' },
       translation: { fr: 'manger un repas (décontracté)', en: 'have a meal (casual)' },
       explanation: { fr: '「<strong>個 ge</strong>」 dans les expressions d\'action = ton décontracté. 吃個飯 = manger un petit repas.', en: '「<strong>個 ge</strong>」 in action expressions = casual tone. 吃個飯 = grab a casual meal.' },
     },
     {
       sentence: '洗_____澡', answer: '個',
       category: { fr: 'Action 動量', en: 'Action 動量' },
       translation: { fr: 'prendre une petite douche (décontracté)', en: 'take a quick shower (casual)' },
       explanation: { fr: '「<strong>個 ge</strong>」 donne un ton décontracté. 洗個澡 = petite douche rapide.', en: '「<strong>個 ge</strong>」 gives a casual tone. 洗個澡 = take a quick shower.' },
     },
     {
       sentence: '打_____球', answer: '個',
       category: { fr: 'Action 動量', en: 'Action 動量' },
       translation: { fr: 'jouer un peu au ballon (décontracté)', en: 'play a bit of ball (casual)' },
       explanation: { fr: '「<strong>個 ge</strong>」 ton informel. 打個球 = jouer un peu au sport.', en: '「<strong>個 ge</strong>」 informal tone. 打個球 = play a bit of sport.' },
     },
   ];
   
   // ── ALL UNIQUE CLASSIFIERS (for auto distractors) ─────────────
   const ALL_CLASSIFIERS = [
     '條','張','顆','個','隻','件','台','雙','群','種','些',
     '年','天','國','分鐘','杯','碗','盤','瓶','次','趟','遍','陣','場',
   ];
   
   // ── PINYIN TABLES ─────────────────────────────────────────────
   const CLASSIFIER_PINYIN = {
     '條':'tiáo','張':'zhāng','顆':'kē','粒':'lì','個':'ge','隻':'zhī',
     '件':'jiàn','台':'tái','雙':'shuāng','群':'qún','種':'zhǒng','些':'xiē',
     '年':'nián','天':'tiān','國':'guó','分鐘':'fēnzhōng',
     '杯':'bēi','碗':'wǎn','盤':'pán','瓶':'píng',
     '次':'cì','趟':'tàng','遍':'biàn','陣':'zhèn','場':'chǎng',
     '份':'fèn','根':'gēn','尾':'wěi',
   };
   
   const CHAR_PINYIN = {
     '一':'yī','二':'èr','三':'sān','四':'sì','五':'wǔ','六':'liù',
     '七':'qī','八':'bā','九':'jiǔ','十':'shí','十五':'shíwǔ',
     '兩':'liǎng','這':'zhè','哪':'nǎ','吃':'chī','洗':'xǐ','打':'dǎ',
     '褲':'kù','子':'zi','魚':'yú','蛇':'shé','路':'lù','紙':'zhǐ',
     '機':'jī','票':'piào','車':'chē','桌':'zhuō','葡':'pú','萄':'táo',
     '糖':'táng','果':'guǒ','星':'xīng','人':'rén','蘋':'píng','狗':'gǒu',
     '貓':'māo','豬':'zhū','衣':'yī','服':'fú','外':'wài','套':'tào',
     '襯':'chèn','衫':'shān','冷':'lěng','氣':'qì','腦':'nǎo','冰':'bīng',
     '箱':'xiāng','筷':'kuài','鞋':'xié','襪':'wà','輕':'qīng','咖':'kā',
     '啡':'fēi','問':'wèn','題':'tí','啤':'pí','酒':'jiǔ','麵':'miàn',
     '水':'shuǐ','紅':'hóng','電':'diàn','影':'yǐng','我':'wǒ','看':'kàn',
     '了':'le','去':'qù','過':'guò','中':'zhōng','明':'míng','天':'tiān',
     '要':'yào','紐':'niǔ','約':'yuē','比':'bǐ','賽':'sài','年':'nián',
     '群':'qún','國':'guó','跑':'pǎo','才':'cái','買':'mǎi','到':'dào',
     '東':'dōng','西':'xī','個':'gè','的':'de','飯':'fàn','湯':'tāng',
     '菜':'cài','起':'qǐ','司':'sī','牛':'niú','奶':'nǎi','些':'xiē',
     '時':'shí','間':'jiān','情':'qíng','況':'kuàng','語':'yǔ','言':'yán',
     '小':'xiǎo','孩':'hái','羊':'yáng','笨':'bèn','蛋':'dàn','月':'yuè',
     '澡':'zǎo','球':'qiú','音':'yīn','樂':'yuè','會':'huì','活':'huó',
     '動':'dòng','歡':'huān','呼':'hū','突':'tū','然':'rán','剛':'gāng',
     '雨':'yǔ','青':'qīng','女':'nǚ','期':'qī','課':'kè','上':'shàng',
     '文':'wén','星':'xīng','週':'zhōu','鐘':'zhōng','分':'fēn',
     '四':'sì','子':'zi','女':'nǚ','衣':'yī','笨':'bèn',
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
   
   function getDistractors(answer) {
     const pool = ALL_CLASSIFIERS.filter(c => c !== answer);
     return shuffle(pool).slice(0, 3);
   }
   
   function buildRubySentence(sentence) {
     const BLANK = '\u3010\u7a7a\u767d\u3011';
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
   let currentLang  = null;
   let quizLength   = 15;
   let questions    = [];
   let currentIdx   = 0;
   let score        = 0;
   let streak       = 0;
   let answered     = false;
   
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
     updateLangScreen();
   }
   
   function updateLangScreen() {
     if (!currentLang) return;
     const ui = UI[currentLang];
     $('startBtn').disabled = false;
     $('startBtn').textContent = ui.startBtn;
     $('countLabel').textContent = ui.selectCount;
   }
   
   function goToLangScreen() {
     showScreen('lang');
     $('btnFR').classList.toggle('active', currentLang === 'fr');
     $('btnEN').classList.toggle('active', currentLang === 'en');
     if (currentLang) updateLangScreen();
   }
   
   // ── GAME FLOW ─────────────────────────────────────────────────
   function startGame() {
     if (!currentLang) return;
     quizLength = parseInt($('countSelect').value, 10) || 15;
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
     questions  = shuffle(QUESTION_BANK).slice(0, quizLength);
     currentIdx = 0;
     score      = 0;
     streak     = 0;
     $('scoreNum').textContent  = '0';
     $('streakNum').textContent = '0';
   }
   
   function switchLang(lang) {
     currentLang = lang;
     updateLangSwitcher();
     if (!answered) {
       renderQuestion();
     } else {
       const q  = questions[currentIdx];
       const ui = UI[lang];
       $('qCategory').textContent    = q.category[lang];
       $('qTranslation').textContent = '→ ' + q.translation[lang];
       $('nextBtn').textContent      = ui.nextBtn;
       const fb = $('feedback');
       if (fb.classList.contains('show')) {
         $('feedbackText').innerHTML    = q.explanation[lang];
         $('feedbackTitle').textContent = fb.classList.contains('wrong-fb')
           ? ui.wrongTitle(q.answer) : ui.correctTitle;
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
   
     const distractors = getDistractors(q.answer);
     const allChoices  = shuffle([q.answer, ...distractors]);
   
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
   
     $('questionCard').className = 'card';
     $('feedback').className     = 'feedback';
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
     const STARS = ['','★☆☆☆☆','★★☆☆☆','★★★☆☆','★★★★☆','★★★★★'];
   
     $('starsDisplay').textContent  = STARS[tier];
     $('finalTotal').textContent    = ui.results.total(total);
     $('resultMsg').textContent     = ui.results[tier].msg;
     $('resultSub').textContent     = ui.results[tier].sub;
     $('replayBtn').textContent     = ui.replayBtn;
     $('changeLangBtn').textContent = ui.changeLang;
   
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
   window.selectLang     = selectLang;
   window.startGame      = startGame;
   window.replayGame     = replayGame;
   window.switchLang     = switchLang;
   window.goToLangScreen = goToLangScreen;
   