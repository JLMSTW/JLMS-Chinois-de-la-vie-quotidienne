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
         5: { msg: 'Perfect! 完美！',      sub: 'You have mastered all the classifiers — 你全對了！' },
         4: { msg: 'Excellent! 優秀！',     sub: 'Very good command of Chinese classifiers.' },
         3: { msg: 'Good job! 不錯！',      sub: 'Keep practising — a few classifiers to review.' },
         2: { msg: 'Keep going! 加油！',    sub: 'Review your notes and try again — you can do better!' },
         1: { msg: 'Persevere! 繼續努力！', sub: 'Classifiers require practice — don\'t give up!' },
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
       explanation: {
         fr: '「<strong>條 tiáo</strong>」 Généralement utilisé pour des objets en forme de bande. Un pantalon est long → <em>條</em>.',
         en: '「<strong>條 tiáo</strong>」 Generally used for objects that are strip-shaped. Trousers are long → <em>條</em>.',
       },
     },
     {
       sentence: '一_____蛇', answer: '條',
       category: { fr: 'Individuel 個別', en: 'Individual 個別' },
       translation: { fr: 'un serpent', en: 'a snake' },
       explanation: {
         fr: '「<strong>條 tiáo</strong>」 Généralement utilisé pour des objets en forme de bande. Un serpent est long → <em>條</em>.',
         en: '「<strong>條 tiáo</strong>」 Generally used for objects that are strip-shaped. A snake is long → <em>條</em>.',
       },
     },
     {
       sentence: '一_____魚', answer: '條',
       category: { fr: 'Individuel 個別', en: 'Individual 個別' },
       translation: { fr: 'un poisson', en: 'a fish' },
       explanation: {
         fr: '「<strong>條 tiáo</strong>」 Généralement utilisé pour des objets en forme de bande. Note : 隻 s\'utilise pour les animaux terrestres, pas les poissons.',
         en: '「<strong>條 tiáo</strong>」 Generally used for objects that are strip-shaped. Note: 隻 is used for land animals, not for fish.',
       },
     },
     {
       sentence: '這_____路', answer: '條',
       category: { fr: 'Individuel 個別', en: 'Individual 個別' },
       translation: { fr: 'cette route', en: 'this road' },
       explanation: {
         fr: '「<strong>條 tiáo</strong>」 Généralement utilisé pour des objets en forme de bande.',
         en: '「<strong>條 tiáo</strong>」 Generally used for objects that are strip-shaped.',
       },
     },

     // ── 2. 張 zhāng ─────────────────────────────────────────
     {
       sentence: '一_____紙', answer: '張',
       category: { fr: 'Individuel 個別', en: 'Individual 個別' },
       translation: { fr: 'une feuille de papier', en: 'a sheet of paper' },
       explanation: {
         fr: '「<strong>張 zhāng</strong>」 Utilisé pour les objets pouvant être dépliés ou qui sont plats.',
         en: '「<strong>張 zhāng</strong>」 Used for objects that can be unfolded or that are flat.',
       },
     },
     {
       sentence: '兩_____機票', answer: '張',
       category: { fr: 'Individuel 個別', en: 'Individual 個別' },
       translation: { fr: "deux billets d'avion", en: 'two plane tickets' },
       explanation: {
         fr: '「<strong>張 zhāng</strong>」 Utilisé pour les objets pouvant être dépliés ou qui sont plats.',
         en: '「<strong>張 zhāng</strong>」 Used for objects that can be unfolded or that are flat.',
       },
     },
     {
       sentence: '三_____車票', answer: '張',
       category: { fr: 'Individuel 個別', en: 'Individual 個別' },
       translation: { fr: 'trois billets de train', en: 'three train tickets' },
       explanation: {
         fr: '「<strong>張 zhāng</strong>」 Utilisé pour les objets pouvant être dépliés ou qui sont plats.',
         en: '「<strong>張 zhāng</strong>」 Used for objects that can be unfolded or that are flat.',
       },
     },
     {
       sentence: '一_____桌子', answer: '張',
       category: { fr: 'Individuel 個別', en: 'Individual 個別' },
       translation: { fr: 'une table', en: 'a table' },
       explanation: {
         fr: '「<strong>張 zhāng</strong>」 Utilisé pour les objets pouvant être dépliés ou qui sont plats.',
         en: '「<strong>張 zhāng</strong>」 Used for objects that can be unfolded or that are flat.',
       },
     },

     // ── 3. 顆 kē ────────────────────────────────────────────
     {
       sentence: '一_____葡萄', answer: '顆',
       category: { fr: 'Individuel 個別', en: 'Individual 個別' },
       translation: { fr: 'un raisin', en: 'a grape' },
       explanation: {
         fr: '「<strong>顆 kē</strong>」 Utilisé pour des objets petits et ronds.',
         en: '「<strong>顆 kē</strong>」 Used for small, round objects.',
       },
     },
     {
       sentence: '兩_____糖果', answer: '顆',
       category: { fr: 'Individuel 個別', en: 'Individual 個別' },
       translation: { fr: 'deux bonbons', en: 'two sweets' },
       explanation: {
         fr: '「<strong>顆 kē</strong>」 Utilisé pour des objets petits et ronds comme les bonbons.',
         en: '「<strong>顆 kē</strong>」 Used for small, round objects like sweets.',
       },
     },
     {
       sentence: '三_____星', answer: '顆',
       category: { fr: 'Individuel 個別', en: 'Individual 個別' },
       translation: { fr: 'trois étoiles (ex. Michelin)', en: 'three stars (e.g. Michelin)' },
       explanation: {
         fr: '「<strong>顆 kē</strong>」 Utilisé pour des objets petits et ronds. C\'est ainsi qu\'on dit "Trois étoiles Michelin" (米其林三顆星) !',
         en: '「<strong>顆 kē</strong>」 Used for small, round objects. That is how we say "Three Michelin Stars" (米其林三顆星)!',
       },
     },

     // ── 4. 個 ge ────────────────────────────────────────────
     {
       sentence: '一_____人', answer: '個',
       category: { fr: 'Individuel 個別', en: 'Individual 個別' },
       translation: { fr: 'une personne', en: 'a person' },
       explanation: {
         fr: '「<strong>個 ge</strong>」 Le classificateur le plus courant et polyvalent. Si vous ne connaissez pas bien les classificateurs, utilisez « 個 ge ».',
         en: '「<strong>個 ge</strong>」 The most common and versatile classifier. If you are not sure which classifier to use, use « 個 ge ».',
       },
     },
     {
       sentence: '一_____蘋果', answer: '個',
       category: { fr: 'Individuel 個別', en: 'Individual 個別' },
       translation: { fr: 'une pomme', en: 'an apple' },
       explanation: {
         fr: '「<strong>個 ge</strong>」 Le classificateur le plus courant et polyvalent. Si vous ne connaissez pas bien les classificateurs, utilisez « 個 ge ».',
         en: '「<strong>個 ge</strong>」 The most common and versatile classifier. If you are not sure which classifier to use, use « 個 ge ».',
       },
     },
     {
       sentence: '一_____月', answer: '個',
       category: { fr: 'Individuel 個別', en: 'Individual 個別' },
       translation: { fr: 'un mois', en: 'a month' },
       explanation: {
         fr: '「<strong>個 ge</strong>」 Le classificateur le plus courant et polyvalent. Si vous ne connaissez pas bien les classificateurs, utilisez « 個 ge ».',
         en: '「<strong>個 ge</strong>」 The most common and versatile classifier. If you are not sure which classifier to use, use « 個 ge ».',
       },
     },

     // ── 5. 隻 zhī ───────────────────────────────────────────
     {
       sentence: '一_____狗', answer: '隻',
       category: { fr: 'Individuel 個別', en: 'Individual 個別' },
       translation: { fr: 'un chien', en: 'a dog' },
       explanation: {
         fr: '「<strong>隻 zhī</strong>」 Utilisé pour les animaux.',
         en: '「<strong>隻 zhī</strong>」 Used for animals.',
       },
     },
     {
       sentence: '兩_____貓', answer: '隻',
       category: { fr: 'Individuel 個別', en: 'Individual 個別' },
       translation: { fr: 'deux chats', en: 'two cats' },
       explanation: {
         fr: '「<strong>隻 zhī</strong>」 Utilisé pour les animaux.',
         en: '「<strong>隻 zhī</strong>」 Used for animals.',
       },
     },
     {
       sentence: '三_____小豬', answer: '隻',
       category: { fr: 'Individuel 個別', en: 'Individual 個別' },
       translation: { fr: 'trois petits cochons', en: 'three little pigs' },
       explanation: {
         fr: '「<strong>隻 zhī</strong>」 Utilisé pour les animaux — comme dans l\'histoire célèbre "Les trois petits cochons" (三隻小豬) !',
         en: '「<strong>隻 zhī</strong>」 Used for animals — as in the famous story "The Three Little Pigs" (三隻小豬)!',
       },
     },

     // ── 6. 件 jiàn ──────────────────────────────────────────
     {
       sentence: '一_____衣服', answer: '件',
       category: { fr: 'Individuel 個別', en: 'Individual 個別' },
       translation: { fr: 'un vêtement', en: 'a garment' },
       explanation: {
         fr: '「<strong>件 jiàn</strong>」 Principalement utilisé pour les vêtements.',
         en: '「<strong>件 jiàn</strong>」 Mainly used for clothing.',
       },
     },
     {
       sentence: '三_____外套', answer: '件',
       category: { fr: 'Individuel 個別', en: 'Individual 個別' },
       translation: { fr: 'trois vestes', en: 'three jackets' },
       explanation: {
         fr: '「<strong>件 jiàn</strong>」 Principalement utilisé pour les vêtements.',
         en: '「<strong>件 jiàn</strong>」 Mainly used for clothing.',
       },
     },
     {
       sentence: '兩_____襯衫', answer: '件',
       category: { fr: 'Individuel 個別', en: 'Individual 個別' },
       translation: { fr: 'deux chemises', en: 'two shirts' },
       explanation: {
         fr: '「<strong>件 jiàn</strong>」 Principalement utilisé pour les vêtements.',
         en: '「<strong>件 jiàn</strong>」 Mainly used for clothing.',
       },
     },

     // ── 7. 台 tái ───────────────────────────────────────────
     {
       sentence: '這_____冷氣', answer: '台',
       category: { fr: 'Individuel 個別', en: 'Individual 個別' },
       translation: { fr: 'cet air conditionné', en: 'this air conditioner' },
       explanation: {
         fr: '「<strong>台 tái</strong>」 Utilisé pour les machines ou les appareils.',
         en: '「<strong>台 tái</strong>」 Used for machines or appliances.',
       },
     },
     {
       sentence: '四_____車', answer: '台',
       category: { fr: 'Individuel 個別', en: 'Individual 個別' },
       translation: { fr: 'quatre voitures', en: 'four cars' },
       explanation: {
         fr: '「<strong>台 tái</strong>」 Utilisé pour les machines ou les appareils.',
         en: '「<strong>台 tái</strong>」 Used for machines or appliances.',
       },
     },
     {
       sentence: '這_____電腦', answer: '台',
       category: { fr: 'Individuel 個別', en: 'Individual 個別' },
       translation: { fr: 'cet ordinateur', en: 'this computer' },
       explanation: {
         fr: '「<strong>台 tái</strong>」 Utilisé pour les machines ou les appareils.',
         en: '「<strong>台 tái</strong>」 Used for machines or appliances.',
       },
     },
     {
       sentence: '一_____冰箱', answer: '台',
       category: { fr: 'Individuel 個別', en: 'Individual 個別' },
       translation: { fr: 'un frigo', en: 'a fridge' },
       explanation: {
         fr: '「<strong>台 tái</strong>」 Utilisé pour les machines ou les appareils.',
         en: '「<strong>台 tái</strong>」 Used for machines or appliances.',
       },
     },

     // ── 8. 雙 shuāng ────────────────────────────────────────
     {
       sentence: '一_____筷子', answer: '雙',
       category: { fr: 'Collection 集合', en: 'Collection 集合' },
       translation: { fr: 'une paire de baguettes', en: 'a pair of chopsticks' },
       explanation: {
         fr: '「<strong>雙 shuāng</strong>」 Utilisé pour des objets qui vont par paires.',
         en: '「<strong>雙 shuāng</strong>」 Used for objects that come in pairs.',
       },
     },
     {
       sentence: '兩_____鞋子', answer: '雙',
       category: { fr: 'Collection 集合', en: 'Collection 集合' },
       translation: { fr: 'deux paires de chaussures', en: 'two pairs of shoes' },
       explanation: {
         fr: '「<strong>雙 shuāng</strong>」 Utilisé pour des objets qui vont par paires.',
         en: '「<strong>雙 shuāng</strong>」 Used for objects that come in pairs.',
       },
     },
     {
       sentence: '這_____襪子', answer: '雙',
       category: { fr: 'Collection 集合', en: 'Collection 集合' },
       translation: { fr: 'cette paire de chaussettes', en: 'this pair of socks' },
       explanation: {
         fr: '「<strong>雙 shuāng</strong>」 Utilisé pour des objets qui vont par paires.',
         en: '「<strong>雙 shuāng</strong>」 Used for objects that come in pairs.',
       },
     },
     {
       sentence: '一_____子女', answer: '雙',
       category: { fr: 'Collection 集合', en: 'Collection 集合' },
       translation: { fr: 'un garçon et une fille', en: 'a son and a daughter' },
       explanation: {
         fr: '「<strong>雙 shuāng</strong>」 Utilisé pour des objets qui vont par paires. Quand on dit 一雙子女, cela signifie qu\'une personne a deux enfants, un garçon et une fille.',
         en: '「<strong>雙 shuāng</strong>」 Used for objects that come in pairs. When we say 一雙子女, it means a person has two children, one boy and one girl.',
       },
     },

     // ── 9. 群 qún ───────────────────────────────────────────
     {
       sentence: '一_____年輕人', answer: '群',
       category: { fr: 'Collection 集合', en: 'Collection 集合' },
       translation: { fr: 'un groupe de jeunes gens', en: 'a group of young people' },
       explanation: {
         fr: '「<strong>群 qún</strong>」 Utilisé pour désigner des groupes de personnes ou d\'animaux.',
         en: '「<strong>群 qún</strong>」 Used to refer to groups of people or animals.',
       },
     },
     {
       sentence: '一_____小孩', answer: '群',
       category: { fr: 'Collection 集合', en: 'Collection 集合' },
       translation: { fr: "un groupe d'enfants", en: 'a group of children' },
       explanation: {
         fr: '「<strong>群 qún</strong>」 Utilisé pour désigner des groupes de personnes ou d\'animaux.',
         en: '「<strong>群 qún</strong>」 Used to refer to groups of people or animals.',
       },
     },
     {
       sentence: '一_____羊', answer: '群',
       category: { fr: 'Collection 集合', en: 'Collection 集合' },
       translation: { fr: 'un troupeau de moutons', en: 'a flock of sheep' },
       explanation: {
         fr: '「<strong>群 qún</strong>」 Utilisé pour désigner des groupes de personnes ou d\'animaux.',
         en: '「<strong>群 qún</strong>」 Used to refer to groups of people or animals.',
       },
     },
     {
       sentence: '一_____笨蛋', answer: '群',
       category: { fr: 'Collection 集合', en: 'Collection 集合' },
       translation: { fr: "un groupe d'idiots 😄", en: 'a group of idiots 😄' },
       explanation: {
         fr: '「<strong>群 qún</strong>」 Utilisé pour désigner des groupes de personnes ou d\'animaux. Quand vous travaillez avec un groupe de personnes et que vous trouvez qu\'elles agissent de manière insensée, vous pouvez vous plaindre ainsi ! 😄',
         en: '「<strong>群 qún</strong>」 Used to refer to groups of people or animals. When you are working with a group of people and find them acting in a foolish or stupid way, you can complain like this! 😄',
       },
     },

     // ── 10. 種 zhǒng ────────────────────────────────────────
     {
       sentence: '三_____咖啡', answer: '種',
       category: { fr: 'Collection 集合', en: 'Collection 集合' },
       translation: { fr: 'trois types de café', en: 'three types of coffee' },
       explanation: {
         fr: '「<strong>種 zhǒng</strong>」 Utilisé pour désigner des types ou des variétés.',
         en: '「<strong>種 zhǒng</strong>」 Used to refer to types or varieties.',
       },
     },
     {
       sentence: '四_____語言', answer: '種',
       category: { fr: 'Collection 集合', en: 'Collection 集合' },
       translation: { fr: 'quatre langues', en: 'four languages' },
       explanation: {
         fr: '「<strong>種 zhǒng</strong>」 Utilisé pour désigner des types ou des variétés.',
         en: '「<strong>種 zhǒng</strong>」 Used to refer to types or varieties.',
       },
     },
     {
       sentence: '哪一_____菜', answer: '種',
       category: { fr: 'Collection 集合', en: 'Collection 集合' },
       translation: { fr: 'quel type de plat', en: 'which type of dish' },
       explanation: {
         fr: '「<strong>種 zhǒng</strong>」 Utilisé pour désigner des types ou des variétés.',
         en: '「<strong>種 zhǒng</strong>」 Used to refer to types or varieties.',
       },
     },

     // ── 11. 些 xiē ──────────────────────────────────────────
     {
       sentence: '一_____問題', answer: '些',
       category: { fr: 'Indéfini 不定', en: 'Indefinite 不定' },
       translation: { fr: 'quelques questions', en: 'some questions' },
       explanation: {
         fr: '「<strong>些 xiē</strong>」 Utilisé pour désigner une quantité indéfinie.',
         en: '「<strong>些 xiē</strong>」 Used to refer to an indefinite quantity.',
       },
     },
     {
       sentence: '一_____時間', answer: '些',
       category: { fr: 'Indéfini 不定', en: 'Indefinite 不定' },
       translation: { fr: 'un peu de temps', en: 'some time' },
       explanation: {
         fr: '「<strong>些 xiē</strong>」 Utilisé pour désigner une quantité indéfinie.',
         en: '「<strong>些 xiē</strong>」 Used to refer to an indefinite quantity.',
       },
     },
     {
       sentence: '一_____情況', answer: '些',
       category: { fr: 'Indéfini 不定', en: 'Indefinite 不定' },
       translation: { fr: 'quelques situations', en: 'some situations' },
       explanation: {
         fr: '「<strong>些 xiē</strong>」 Utilisé pour désigner une quantité indéfinie.',
         en: '「<strong>些 xiē</strong>」 Used to refer to an indefinite quantity.',
       },
     },

     // ── 12. 年 nián ─────────────────────────────────────────
     {
       sentence: '一_____', answer: '年',
       category: { fr: 'Quasi-classif. 準量詞', en: 'Quasi-classifier 準量詞' },
       translation: { fr: 'un an', en: 'one year' },
       explanation: {
         fr: '「<strong>年 nián</strong>」 est un quasi-classificateur. Il n\'est pas nécessaire d\'ajouter un autre classificateur entre le nombre et 年.',
         en: '「<strong>年 nián</strong>」 is a quasi-classifier. It is not necessary to add another classifier between the number and 年.',
       },
     },
     {
       sentence: '兩_____', answer: '年',
       category: { fr: 'Quasi-classif. 準量詞', en: 'Quasi-classifier 準量詞' },
       translation: { fr: 'deux ans', en: 'two years' },
       explanation: {
         fr: '「<strong>年 nián</strong>」 est un quasi-classificateur. Il n\'est pas nécessaire d\'ajouter un autre classificateur entre le nombre et 年.',
         en: '「<strong>年 nián</strong>」 is a quasi-classifier. It is not necessary to add another classifier between the number and 年.',
       },
     },
     {
       sentence: '三_____', answer: '年',
       category: { fr: 'Quasi-classif. 準量詞', en: 'Quasi-classifier 準量詞' },
       translation: { fr: 'trois ans', en: 'three years' },
       explanation: {
         fr: '「<strong>年 nián</strong>」 est un quasi-classificateur. Il n\'est pas nécessaire d\'ajouter un autre classificateur entre le nombre et 年.',
         en: '「<strong>年 nián</strong>」 is a quasi-classifier. It is not necessary to add another classifier between the number and 年.',
       },
     },

     // ── 13. 天 tiān ─────────────────────────────────────────
     {
       sentence: '三_____', answer: '天',
       category: { fr: 'Quasi-classif. 準量詞', en: 'Quasi-classifier 準量詞' },
       translation: { fr: 'trois jours', en: 'three days' },
       explanation: {
         fr: '「<strong>天 tiān</strong>」 est un quasi-classificateur. Il n\'est pas nécessaire d\'ajouter un autre classificateur entre le nombre et 天.',
         en: '「<strong>天 tiān</strong>」 is a quasi-classifier. It is not necessary to add another classifier between the number and 天.',
       },
     },
     {
       sentence: '十_____', answer: '天',
       category: { fr: 'Quasi-classif. 準量詞', en: 'Quasi-classifier 準量詞' },
       translation: { fr: 'dix jours', en: 'ten days' },
       explanation: {
         fr: '「<strong>天 tiān</strong>」 est un quasi-classificateur. Il n\'est pas nécessaire d\'ajouter un autre classificateur entre le nombre et 天.',
         en: '「<strong>天 tiān</strong>」 is a quasi-classifier. It is not necessary to add another classifier between the number and 天.',
       },
     },
     {
       sentence: '十五_____', answer: '天',
       category: { fr: 'Quasi-classif. 準量詞', en: 'Quasi-classifier 準量詞' },
       translation: { fr: 'quinze jours', en: 'fifteen days' },
       explanation: {
         fr: '「<strong>天 tiān</strong>」 est un quasi-classificateur. Il n\'est pas nécessaire d\'ajouter un autre classificateur entre le nombre et 天.',
         en: '「<strong>天 tiān</strong>」 is a quasi-classifier. It is not necessary to add another classifier between the number and 天.',
       },
     },

     // ── 14. 國 guó ──────────────────────────────────────────
     {
       sentence: '兩_____', answer: '國',
       category: { fr: 'Quasi-classif. 準量詞', en: 'Quasi-classifier 準量詞' },
       translation: { fr: 'deux pays', en: 'two countries' },
       explanation: {
         fr: '「<strong>國 guó</strong>」 est un quasi-classificateur. Il n\'est pas nécessaire d\'ajouter un autre classificateur entre le nombre et 國.',
         en: '「<strong>國 guó</strong>」 is a quasi-classifier. It is not necessary to add another classifier between the number and 國.',
       },
     },
     {
       sentence: '四_____', answer: '國',
       category: { fr: 'Quasi-classif. 準量詞', en: 'Quasi-classifier 準量詞' },
       translation: { fr: 'quatre pays', en: 'four countries' },
       explanation: {
         fr: '「<strong>國 guó</strong>」 est un quasi-classificateur. Il n\'est pas nécessaire d\'ajouter un autre classificateur entre le nombre et 國.',
         en: '「<strong>國 guó</strong>」 is a quasi-classifier. It is not necessary to add another classifier between the number and 國.',
       },
     },

     // ── 15. 分鐘 fēnzhōng ───────────────────────────────────
     {
       sentence: '兩_____', answer: '分鐘',
       category: { fr: 'Quasi-classif. 準量詞', en: 'Quasi-classifier 準量詞' },
       translation: { fr: 'deux minutes', en: 'two minutes' },
       explanation: {
         fr: '「<strong>分鐘 fēnzhōng</strong>」 est un quasi-classificateur. Il n\'est pas nécessaire d\'ajouter un autre classificateur entre le nombre et 分鐘.',
         en: '「<strong>分鐘 fēnzhōng</strong>」 is a quasi-classifier. It is not necessary to add another classifier between the number and 分鐘.',
       },
     },
     {
       sentence: '十_____', answer: '分鐘',
       category: { fr: 'Quasi-classif. 準量詞', en: 'Quasi-classifier 準量詞' },
       translation: { fr: 'dix minutes', en: 'ten minutes' },
       explanation: {
         fr: '「<strong>分鐘 fēnzhōng</strong>」 est un quasi-classificateur. Il n\'est pas nécessaire d\'ajouter un autre classificateur entre le nombre et 分鐘.',
         en: '「<strong>分鐘 fēnzhōng</strong>」 is a quasi-classifier. It is not necessary to add another classifier between the number and 分鐘.',
       },
     },

     // ── 16. 杯 bēi ──────────────────────────────────────────
     {
       sentence: '兩_____啤酒', answer: '杯',
       category: { fr: 'Emprunté 借用', en: 'Borrowed 借用' },
       translation: { fr: 'deux verres de bière', en: 'two glasses of beer' },
       explanation: {
         fr: '「<strong>杯 bēi</strong>」 À l\'origine, 杯子 signifie une tasse. Lorsqu\'on utilise 杯 comme classificateur, cela signifie une tasse de quelque chose.',
         en: '「<strong>杯 bēi</strong>」 Originally, 杯子 means a cup. When used as a classifier, 杯 means a cup or glass of something.',
       },
     },
     {
       sentence: '這_____咖啡', answer: '杯',
       category: { fr: 'Emprunté 借用', en: 'Borrowed 借用' },
       translation: { fr: 'cette tasse de café', en: 'this cup of coffee' },
       explanation: {
         fr: '「<strong>杯 bēi</strong>」 À l\'origine, 杯子 signifie une tasse. Lorsqu\'on utilise 杯 comme classificateur, cela signifie une tasse de quelque chose.',
         en: '「<strong>杯 bēi</strong>」 Originally, 杯子 means a cup. When used as a classifier, 杯 means a cup or glass of something.',
       },
     },
     {
       sentence: '五_____水', answer: '杯',
       category: { fr: 'Emprunté 借用', en: 'Borrowed 借用' },
       translation: { fr: "cinq verres d'eau", en: 'five glasses of water' },
       explanation: {
         fr: '「<strong>杯 bēi</strong>」 À l\'origine, 杯子 signifie une tasse. Lorsqu\'on utilise 杯 comme classificateur, cela signifie une tasse de quelque chose.',
         en: '「<strong>杯 bēi</strong>」 Originally, 杯子 means a cup. When used as a classifier, 杯 means a cup or glass of something.',
       },
     },

     // ── 17. 碗 wǎn ──────────────────────────────────────────
     {
       sentence: '三_____飯', answer: '碗',
       category: { fr: 'Emprunté 借用', en: 'Borrowed 借用' },
       translation: { fr: 'trois bols de riz', en: 'three bowls of rice' },
       explanation: {
         fr: '「<strong>碗 wǎn</strong>」 À l\'origine, 碗 signifie un bol. Lorsqu\'on utilise 碗 comme classificateur, cela signifie un bol de quelque chose.',
         en: '「<strong>碗 wǎn</strong>」 Originally, 碗 means a bowl. When used as a classifier, 碗 means a bowl of something.',
       },
     },
     {
       sentence: '一_____麵', answer: '碗',
       category: { fr: 'Emprunté 借用', en: 'Borrowed 借用' },
       translation: { fr: 'un bol de nouilles', en: 'a bowl of noodles' },
       explanation: {
         fr: '「<strong>碗 wǎn</strong>」 À l\'origine, 碗 signifie un bol. Lorsqu\'on utilise 碗 comme classificateur, cela signifie un bol de quelque chose.',
         en: '「<strong>碗 wǎn</strong>」 Originally, 碗 means a bowl. When used as a classifier, 碗 means a bowl of something.',
       },
     },
     {
       sentence: '這_____湯', answer: '碗',
       category: { fr: 'Emprunté 借用', en: 'Borrowed 借用' },
       translation: { fr: 'ce bol de soupe', en: 'this bowl of soup' },
       explanation: {
         fr: '「<strong>碗 wǎn</strong>」 À l\'origine, 碗 signifie un bol. Lorsqu\'on utilise 碗 comme classificateur, cela signifie un bol de quelque chose.',
         en: '「<strong>碗 wǎn</strong>」 Originally, 碗 means a bowl. When used as a classifier, 碗 means a bowl of something.',
       },
     },

     // ── 18. 盤 pán ──────────────────────────────────────────
     {
       sentence: '一_____青菜', answer: '盤',
       category: { fr: 'Emprunté 借用', en: 'Borrowed 借用' },
       translation: { fr: 'une assiette de légumes verts', en: 'a plate of green vegetables' },
       explanation: {
         fr: '「<strong>盤 pán</strong>」 À l\'origine, 盤子 signifie une assiette. Lorsqu\'on utilise 盤 comme classificateur, cela signifie une assiette de quelque chose.',
         en: '「<strong>盤 pán</strong>」 Originally, 盤子 means a plate. When used as a classifier, 盤 means a plate of something.',
       },
     },
     {
       sentence: '一_____水果', answer: '盤',
       category: { fr: 'Emprunté 借用', en: 'Borrowed 借用' },
       translation: { fr: 'une assiette de fruits', en: 'a plate of fruit' },
       explanation: {
         fr: '「<strong>盤 pán</strong>」 À l\'origine, 盤子 signifie une assiette. Lorsqu\'on utilise 盤 comme classificateur, cela signifie une assiette de quelque chose.',
         en: '「<strong>盤 pán</strong>」 Originally, 盤子 means a plate. When used as a classifier, 盤 means a plate of something.',
       },
     },
     {
       sentence: '一_____起司', answer: '盤',
       category: { fr: 'Emprunté 借用', en: 'Borrowed 借用' },
       translation: { fr: 'une assiette de fromage', en: 'a plate of cheese' },
       explanation: {
         fr: '「<strong>盤 pán</strong>」 À l\'origine, 盤子 signifie une assiette. Lorsqu\'on utilise 盤 comme classificateur, cela signifie une assiette de quelque chose.',
         en: '「<strong>盤 pán</strong>」 Originally, 盤子 means a plate. When used as a classifier, 盤 means a plate of something.',
       },
     },

     // ── 19. 瓶 píng ─────────────────────────────────────────
     {
       sentence: '一_____牛奶', answer: '瓶',
       category: { fr: 'Emprunté 借用', en: 'Borrowed 借用' },
       translation: { fr: 'une bouteille de lait', en: 'a bottle of milk' },
       explanation: {
         fr: '「<strong>瓶 píng</strong>」 À l\'origine, 瓶子 signifie une bouteille. Lorsqu\'on utilise 瓶 comme classificateur, cela signifie une bouteille de quelque chose.',
         en: '「<strong>瓶 píng</strong>」 Originally, 瓶子 means a bottle. When used as a classifier, 瓶 means a bottle of something.',
       },
     },
     {
       sentence: '兩_____水', answer: '瓶',
       category: { fr: 'Emprunté 借用', en: 'Borrowed 借用' },
       translation: { fr: "deux bouteilles d'eau", en: 'two bottles of water' },
       explanation: {
         fr: '「<strong>瓶 píng</strong>」 À l\'origine, 瓶子 signifie une bouteille. Lorsqu\'on utilise 瓶 comme classificateur, cela signifie une bouteille de quelque chose.',
         en: '「<strong>瓶 píng</strong>」 Originally, 瓶子 means a bottle. When used as a classifier, 瓶 means a bottle of something.',
       },
     },
     {
       sentence: '六_____紅酒', answer: '瓶',
       category: { fr: 'Emprunté 借用', en: 'Borrowed 借用' },
       translation: { fr: 'six bouteilles de vin rouge', en: 'six bottles of red wine' },
       explanation: {
         fr: '「<strong>瓶 píng</strong>」 À l\'origine, 瓶子 signifie une bouteille. Lorsqu\'on utilise 瓶 comme classificateur, cela signifie une bouteille de quelque chose.',
         en: '「<strong>瓶 píng</strong>」 Originally, 瓶子 means a bottle. When used as a classifier, 瓶 means a bottle of something.',
       },
     },

     // ── 20. 次 cì ───────────────────────────────────────────
     {
       sentence: '這個電影我看了三_____', answer: '次',
       category: { fr: 'Action 動量', en: 'Action 動量' },
       translation: { fr: "J'ai regardé ce film trois fois", en: 'I watched this film three times' },
       explanation: {
         fr: '「<strong>次 cì</strong>」 représente le nombre de fois qu\'une action est répétée. Il est utilisé pour des événements qui se produisent plusieurs fois.',
         en: '「<strong>次 cì</strong>」 represents the number of times an action is repeated. It is used for events that occur multiple times.',
       },
     },
     {
       sentence: '我去過一_____中國', answer: '次',
       category: { fr: 'Action 動量', en: 'Action 動量' },
       translation: { fr: 'Je suis allé une fois en Chine', en: 'I have been to China once' },
       explanation: {
         fr: '「<strong>次 cì</strong>」 représente le nombre de fois qu\'une action est répétée. Il est utilisé pour des événements qui se produisent plusieurs fois.',
         en: '「<strong>次 cì</strong>」 represents the number of times an action is repeated. It is used for events that occur multiple times.',
       },
     },
     {
       sentence: '我一個星期上兩_____中文課', answer: '次',
       category: { fr: 'Action 動量', en: 'Action 動量' },
       translation: { fr: 'Je prends deux cours de chinois par semaine', en: 'I take Chinese class twice a week' },
       explanation: {
         fr: '「<strong>次 cì</strong>」 représente le nombre de fois qu\'une action est répétée. Il est utilisé pour des événements qui se produisent plusieurs fois.',
         en: '「<strong>次 cì</strong>」 represents the number of times an action is repeated. It is used for events that occur multiple times.',
       },
     },

     // ── 21. 趟 tàng ─────────────────────────────────────────
     {
       sentence: '我明天要去一_____紐約', answer: '趟',
       category: { fr: 'Action 動量', en: 'Action 動量' },
       translation: { fr: 'Demain je dois faire un aller-retour à New York', en: 'Tomorrow I need to make a round trip to New York' },
       explanation: {
         fr: '「<strong>趟 tàng</strong>」 Utilisé pour insister sur un aller-retour. Un aller et retour compte pour une 趟.',
         en: '「<strong>趟 tàng</strong>」 Used to emphasise a round trip. One round trip counts as one 趟.',
       },
     },
     {
       sentence: '我跑了三_____才買到這個東西', answer: '趟',
       category: { fr: 'Action 動量', en: 'Action 動量' },
       translation: { fr: "J'ai fait trois allers-retours avant d'acheter cet objet", en: 'I made three round trips before buying this item' },
       explanation: {
         fr: '「<strong>趟 tàng</strong>」 Utilisé pour insister sur un aller-retour. Un aller et retour compte pour une 趟.',
         en: '「<strong>趟 tàng</strong>」 Used to emphasise a round trip. One round trip counts as one 趟.',
       },
     },

     // ── 22. 遍 biàn ─────────────────────────────────────────
     {
       sentence: '這個電影我看了三_____', answer: '遍',
       category: { fr: 'Action 動量', en: 'Action 動量' },
       translation: { fr: "J'ai regardé ce film trois fois (du début à la fin)", en: 'I watched this film three times (from start to finish)' },
       explanation: {
         fr: '「<strong>遍 biàn</strong>」 met l\'accent sur l\'ensemble du processus d\'une action du début à la fin. Si vous utilisez 次, cela indique trois fois, mais pas nécessairement du début à la fin.',
         en: '「<strong>遍 biàn</strong>」 emphasises the entire process of an action from beginning to end. If you use 次, it indicates three times, but not necessarily from beginning to end.',
       },
     },

     // ── 23. 陣 zhèn ─────────────────────────────────────────
     {
       sentence: '剛剛突然下了一_____雨', answer: '陣',
       category: { fr: 'Action 動量', en: 'Action 動量' },
       translation: { fr: 'Il vient de pleuvoir soudainement un court moment', en: 'It suddenly rained for a short moment just now' },
       explanation: {
         fr: '「<strong>陣 zhèn</strong>」 Utilisé pour désigner quelque chose qui se produit soudainement et qui dure peu de temps. Souvent utilisé avec 突然 (soudain).',
         en: '「<strong>陣 zhèn</strong>」 Used to refer to something that happens suddenly and lasts a short time. Often used with 突然 (suddenly).',
       },
     },
     {
       sentence: '他們為什麼突然一_____歡呼', answer: '陣',
       category: { fr: 'Action 動量', en: 'Action 動量' },
       translation: { fr: 'Pourquoi ont-ils soudain poussé un cri de joie ?', en: 'Why did they suddenly cheer?' },
       explanation: {
         fr: '「<strong>陣 zhèn</strong>」 Utilisé pour désigner quelque chose qui se produit soudainement et qui dure peu de temps. Souvent utilisé avec 突然 (soudain).',
         en: '「<strong>陣 zhèn</strong>」 Used to refer to something that happens suddenly and lasts a short time. Often used with 突然 (suddenly).',
       },
     },

     // ── 24. 場 chǎng ────────────────────────────────────────
     {
       sentence: '一_____比賽', answer: '場',
       category: { fr: 'Action 動量', en: 'Action 動量' },
       translation: { fr: 'un match / une compétition', en: 'a match / a competition' },
       explanation: {
         fr: '「<strong>場 chǎng</strong>」 À l\'origine, 場地 signifie un lieu. Lorsqu\'une activité ou un événement est entièrement réalisé, on utilise 場. Souvent utilisé pour des spectacles ou des compétitions.',
         en: '「<strong>場 chǎng</strong>」 Originally, 場地 means a place or venue. When an activity or event is carried out in its entirety, 場 is used. Often used for performances or competitions.',
       },
     },
     {
       sentence: '一_____音樂會', answer: '場',
       category: { fr: 'Action 動量', en: 'Action 動量' },
       translation: { fr: 'un concert', en: 'a concert' },
       explanation: {
         fr: '「<strong>場 chǎng</strong>」 À l\'origine, 場地 signifie un lieu. Lorsqu\'une activité ou un événement est entièrement réalisé, on utilise 場. Souvent utilisé pour des spectacles ou des compétitions.',
         en: '「<strong>場 chǎng</strong>」 Originally, 場地 means a place or venue. When an activity or event is carried out in its entirety, 場 is used. Often used for performances or competitions.',
       },
     },
     {
       sentence: '這_____活動', answer: '場',
       category: { fr: 'Action 動量', en: 'Action 動量' },
       translation: { fr: 'cet événement', en: 'this event' },
       explanation: {
         fr: '「<strong>場 chǎng</strong>」 À l\'origine, 場地 signifie un lieu. Lorsqu\'une activité ou un événement est entièrement réalisé, on utilise 場. Souvent utilisé pour des spectacles ou des compétitions.',
         en: '「<strong>場 chǎng</strong>」 Originally, 場地 means a place or venue. When an activity or event is carried out in its entirety, 場 is used. Often used for performances or competitions.',
       },
     },

     // ── 25. 個 ge (action) ──────────────────────────────────
     {
       sentence: '吃_____飯', answer: '個',
       category: { fr: 'Action 動量', en: 'Action 動量' },
       translation: { fr: 'manger un repas (décontracté)', en: 'have a meal (casual)' },
       explanation: {
         fr: '「<strong>個 ge</strong>」 donne un ton plus décontracté, souvent utilisé pour décrire une action rapide ou informelle. 吃個飯 = manger un petit repas de façon décontractée.',
         en: '「<strong>個 ge</strong>」 gives a more casual tone, often used to describe a quick or informal action. 吃個飯 = having a casual meal.',
       },
     },
     {
       sentence: '洗_____澡', answer: '個',
       category: { fr: 'Action 動量', en: 'Action 動量' },
       translation: { fr: 'prendre une petite douche (décontracté)', en: 'take a quick shower (casual)' },
       explanation: {
         fr: '「<strong>個 ge</strong>」 donne un ton plus décontracté. 洗個澡 est plus courant dans les conversations quotidiennes et décrit une douche rapide ou informelle.',
         en: '「<strong>個 ge</strong>」 gives a more casual tone. 洗個澡 is more common in everyday conversation and describes a quick or informal shower.',
       },
     },
     {
       sentence: '打_____球', answer: '個',
       category: { fr: 'Action 動量', en: 'Action 動量' },
       translation: { fr: 'jouer un peu au ballon (décontracté)', en: 'play a bit of ball (casual)' },
       explanation: {
         fr: '「<strong>個 ge</strong>」 donne un ton plus décontracté, souvent utilisé pour décrire une action rapide ou informelle. 打個球 = jouer un peu au sport de façon décontractée.',
         en: '「<strong>個 ge</strong>」 gives a more casual tone, often used to describe a quick or informal action. 打個球 = playing a bit of sport casually.',
       },
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
     '七':'qī','八':'bā','九':'jiǔ','十':'shí',
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
     '文':'wén','週':'zhōu','鐘':'zhōng','分':'fēn','十':'shí','五':'wǔ',
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
