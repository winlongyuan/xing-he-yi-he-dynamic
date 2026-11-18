/**
* 第四章《繁复与简短》分析核心（浏览器与 Node 共用，UMD 形式）
* 浏览器：<script src="./fanfu-analyze.js"></script> 后使用 window.FanfuAnalyze
* Node：const { analyzeText} = require('./public/fanfu-analyze.js')
*
* 统计口径（摘要第 11 节，严格执行）：
* - 英文：按.!? 切句；词数按空格分词，连字符词计 1 词
* （token 正则形如 [A-Za-z]+(?:['-][A-Za-z]+)* ，如 link-lighted 计 1 词）；
* 平均句长 = 总词数 ÷ 句数
* - 中文：按 。？！；切句；字数按汉字数（U+4E00–U+9FFF，不计标点与空格）；
* 平均句长 = 总字数 ÷ 句数
* - 从属标记密度：英文统计 that/which/who/whom/whose/when/where/because/
* although/if/as/while 出现次数 ÷ 总词数 × 100；中文统计 因为、所以、虽然、
* 但是、如果、而且、然而、于是、由于、尽管 出现次数 ÷ 总字数 × 100；
* 中文按最长匹配扫描（沿用 analyze.js 的做法）
* - 长句占比：英文长句 = 词数 ≥25 词的句子，占比 = 长句数 ÷ 总句数 × 100；
* 中文长句 = 字数 ≥30 字的句子，同理
* - 分支扩展率：英文统计关系从句后置结构（名词 + that/which/who 引导的从句，
* 向后扩展）出现次数 ÷ 总句数；中文统计“的”字前置定语结构（汉字 + 的 + 汉字，
* 向前扩展）出现次数 ÷ 总句数
* 英文分支扩展是近似统计：只看 that/which/who 前一个词，
* 若前一个词是常见动词（如 said/know/think/see/find/demonstrate 等，
* 含 be 动词）则视为宾语从句等非后置定语结构，不计；其余计 1 次。
* 这样会把 "is that" 这类结构也排除在外，但仍可能把个别 that 宾语从句
* 误计在内，课堂上可据此讨论“近似口径”的局限。
* - 通用连接词密度沿用 analyze.js 的中英文连接词表；中文表在原有 24 个
* 基础上加“由于”（“尽管”原表已有，不重复计入），共 25 个。
* - 空文本返回全 0；所有数值保留两位小数（round2）。
*
* 繁复指数模型（第 9 节 complexityIndex，2026-11-18 建）：
* 把三项指标合成 0–100 的繁复指数，用来检测一段文本有多繁复、
* 或对照一对译文验证化繁为简 / 化简为繁。
* 归一化锚点（教材参照值）：句长分英文 (avgLen - 8) / 22 * 100
* （Flesch 表：对话 8 词 = 0 分，科技英语 30 词 = 100 分），
* 中文 (avgLen - 4) / 26 * 100（最佳 4 字 = 0 分，长句线 30 字 = 100 分）；
* 从属密度分 = subordDensity / 8 * 100；长句占比分 = longRatio 本身。
* 权重：句长 45%、从属密度 30%、长句占比 25%。
* 分档：index < 40 简短；<= 70 适中；> 70 繁复。
* 分支扩展分 = postExpRate / 2 * 100，只作“分支方向”展示，不计入总分：
* 它只数 that/which/who 引导的关系从句，B 组 6 句英译里一句也没有
* （用的是分词和介词短语），得分是 0；放进总分会把英译拉低、连方向都反了
* （实测：含分支分时 B 组英译 43.77 < B 组中文 47.67，去掉后 51.06 > 47.6，方向才对）。
* 去噪：每项分值封顶 100 分，极端长句（如 A1 parody 221 词）不会把指数冲爆；
* 即使去掉 A1，A 组指数仍为 94.74，仍在繁复档。
* 实测参照（test/ch4.mjs 复核）：A 组英文 92.79 繁复；B 组中文 47.6 适中；
* B 组英译 51.06 适中；C1 英文原文 44.62 适中；C1 汉译 25.61 简短。
*/
(function (root, factory) {
var api = factory();
if (typeof module!== 'undefined' && module.exports) {
module.exports = api;
}
root.FanfuAnalyze = api;
})(typeof window!== 'undefined'? window: globalThis, function () {
'use strict';

var EN_CONNECTIVES = [
'and', 'but', 'or', 'so', 'because', 'although', 'though', 'if',
'when', 'while', 'since', 'as', 'that', 'which', 'who', 'however',
'therefore', 'thus', 'moreover', 'furthermore', 'nevertheless',
'meanwhile', 'then', 'after', 'before', 'until', 'unless',
'whereas', 'despite'
];

// 原表 24 个 + 新增“由于”（“尽管”原表已有，不重复计入），共 25 个
var ZH_CONNECTIVES = [
'因为', '所以', '但是', '但', '然而', '可是', '不过', '虽然', '尽管',
'即使', '如果', '假如', '而且', '并且', '或者', '还是', '于是',
'然后', '接着', '同时', '此外', '就', '才', '却', '而', '由于'
];

var EN_SUBORD = [
'that', 'which', 'who', 'whom', 'whose', 'when', 'where',
'because', 'although', 'if', 'as', 'while'
];

var ZH_SUBORD = [
'因为', '所以', '虽然', '但是', '如果', '而且', '然而', '于是', '由于', '尽管'
];

// 分支扩展近似口径：that/which/who 前一个词若是这些常见动词则不计
var VERB_BEFORE_REL = {
said: 1, say: 1, says: 1, know: 1, knows: 1, knew: 1,
think: 1, thinks: 1, thought: 1, see: 1, sees: 1, saw: 1,
find: 1, finds: 1, found: 1, believe: 1, believes: 1, believed: 1,
feel: 1, feels: 1, felt: 1, hope: 1, hopes: 1, hoped: 1,
wish: 1, wishes: 1, ask: 1, asks: 1, asked: 1,
tell: 1, tells: 1, told: 1, show: 1, shows: 1, showed: 1,
mean: 1, means: 1, meant: 1, suggest: 1, suggests: 1,
claim: 1, claims: 1, hear: 1, hears: 1, heard: 1,
demonstrate: 1, demonstrates: 1, prove: 1, proves: 1,
explain: 1, explains: 1, realize: 1, realizes: 1,
is: 1, was: 1, are: 1, were: 1, be: 1, been: 1, being: 1
};

var REL_WORDS = { that: 1, which: 1, who: 1};

function round2(n) {
return Math.round(n * 100) / 100;
}

function sortedHits(hits) {
return Object.keys(hits)
.map(function (word) { return { word: word, count: hits[word]};})
.sort(function (a, b) { return b.count - a.count || a.word.localeCompare(b.word);});
}

// 最长匹配扫描（中文）：返回命中表与总次数
function longestMatchScan(text, wordList) {
var sorted = wordList.slice().sort(function (a, b) { return b.length - a.length;});
var hits = {};
var count = 0;
var i = 0;
while (i < text.length) {
var matched = null;
for (var k = 0; k < sorted.length; k++) {
if (text.indexOf(sorted[k], i) === i) { matched = sorted[k]; break;}
}
if (matched) {
count++;
hits[matched] = (hits[matched] || 0) + 1;
i += matched.length;
} else {
i++;
}
}
return { count: count, hits: hits};
}

function analyzeEn(text) {
// 连字符词计 1 词：link-lighted、hackney-coach-jostling 等各计 1 词
var words = text.match(/[A-Za-z]+(?:['-][A-Za-z]+)*/g) || [];
var units = words.length;
var lowerWords = words.map(function (w) { return w.toLowerCase();});

var connSet = {};
EN_CONNECTIVES.forEach(function (w) { connSet[w] = true;});
var subSet = {};
EN_SUBORD.forEach(function (w) { subSet[w] = true;});
var hits = {};
var conn = 0;
var subord = 0;
lowerWords.forEach(function (lw) {
if (connSet[lw]) {
conn++;
hits[lw] = (hits[lw] || 0) + 1;
}
if (subSet[lw]) subord++;
});

var rawSentences = text.split(/[.!?]+/).map(function (s) { return s.trim();}).filter(Boolean);
var sentences = rawSentences.length;

// 长句：词数 ≥25 词的句子
var longCount = 0;
rawSentences.forEach(function (s) {
var w = s.match(/[A-Za-z]+(?:['-][A-Za-z]+)*/g) || [];
if (w.length >= 25) longCount++;
});

// 分支扩展率（近似口径）：逐句扫描 that/which/who，前一词为常见动词则不计
var postExp = 0;
rawSentences.forEach(function (s) {
var ws = (s.match(/[A-Za-z]+(?:['-][A-Za-z]+)*/g) || []).map(function (w) { return w.toLowerCase();});
for (var i = 1; i < ws.length; i++) {
if (REL_WORDS[ws[i]] &&!VERB_BEFORE_REL[ws[i - 1]]) postExp++;
}
});

var commas = (text.match(/,/g) || []).length;

return {
units: units,
sentences: sentences,
connectives: conn,
density: units? round2((conn / units) * 100): 0,
avgLen: sentences? round2(units / sentences): 0,
commas: commas,
hits: sortedHits(hits),
subordCount: subord,
subordDensity: units? round2((subord / units) * 100): 0,
longCount: longCount,
longRatio: sentences? round2((longCount / sentences) * 100): 0,
postExpCount: postExp,
postExpRate: sentences? round2(postExp / sentences): 0
};
}

function analyzeZh(text) {
var chars = text.match(/[\u4e00-\u9fff]/g) || [];
var units = chars.length;

var connScan = longestMatchScan(text, ZH_CONNECTIVES);
var subScan = longestMatchScan(text, ZH_SUBORD);

var rawSentences = text.split(/[。？！；]+/).map(function (s) { return s.trim();}).filter(Boolean);
var sentences = rawSentences.length;

// 长句：字数 ≥30 字的句子
var longCount = 0;
rawSentences.forEach(function (s) {
var c = s.match(/[\u4e00-\u9fff]/g) || [];
if (c.length >= 30) longCount++;
});

// “的”字前置定语结构：汉字 + 的 + 汉字
var deMatches = text.match(/[\u4e00-\u9fff]的[\u4e00-\u9fff]/g) || [];
var postExp = deMatches.length;

var commas = (text.match(/[,，、]/g) || []).length;

return {
units: units,
sentences: sentences,
connectives: connScan.count,
density: units? round2((connScan.count / units) * 100): 0,
avgLen: sentences? round2(units / sentences): 0,
commas: commas,
hits: sortedHits(connScan.hits),
subordCount: subScan.count,
subordDensity: units? round2((subScan.count / units) * 100): 0,
longCount: longCount,
longRatio: sentences? round2((longCount / sentences) * 100): 0,
postExpCount: postExp,
postExpRate: sentences? round2(postExp / sentences): 0
};
}

function emptyResult() {
return {
units: 0, sentences: 0, connectives: 0, density: 0, avgLen: 0,
commas: 0, hits: [], subordCount: 0, subordDensity: 0,
longCount: 0, longRatio: 0, postExpCount: 0, postExpRate: 0
};
}

function analyzeText(raw, lang) {
var text = (raw || '').replace(/\s+/g, ' ').trim();
if (!text) return emptyResult();
return lang === 'zh'? analyzeZh(text): analyzeEn(text);
}

function clamp100(n) {
return Math.max(0, Math.min(100, n));
}

// 繁复指数模型：输入 analyzeText 的结果对象与语言，返回各分项与总指数。
// 分项先 round2 再加权，使页面上显示的分项与总指数能互相验算。
function complexityIndex(r, lang) {
var lenScore = round2(lang === 'zh'
? clamp100((r.avgLen - 4) / 26 * 100)
: clamp100((r.avgLen - 8) / 22 * 100));
var subScore = round2(clamp100(r.subordDensity / 8 * 100));
var longScore = round2(clamp100(r.longRatio));
var branchScore = round2(clamp100(r.postExpRate / 2 * 100));
var index = round2(lenScore * 0.45 + subScore * 0.30 + longScore * 0.25);
var level = index < 40 ? '简短' : (index <= 70 ? '适中' : '繁复');
return {
lenScore: lenScore,
subScore: subScore,
longScore: longScore,
branchScore: branchScore,
index: index,
level: level
};
}

return {
EN_CONNECTIVES: EN_CONNECTIVES,
ZH_CONNECTIVES: ZH_CONNECTIVES,
EN_SUBORD: EN_SUBORD,
ZH_SUBORD: ZH_SUBORD,
analyzeText: analyzeText,
complexityIndex: complexityIndex
};
});
