/**
 * 连接词统计核心（浏览器与 Node 共用，UMD 形式）
 * 浏览器：<script src="./analyze.js"></script> 后使用 window.LabAnalyze
 * Node：const { analyzeText } = require('./public/analyze.js')
 *
 * 统计口径（与课堂讲授一致）：
 * - 英文按词计：单词 = 连续字母（含 's 这类缩写）；连接词按整词匹配（不区分大小写）
 * - 中文按字计：字 = 汉字（U+4E00–U+9FFF）；连接词按最长匹配扫描（"然而"计 1 次，不拆成"然"+"而"）
 * - 密度 = 连接词数 ÷ 总词数（字数）× 100；形合指数即连接词密度
 * - 平均句长 = 总词数（字数）÷ 句子数；句子按 。！？.!? 切分
 * - 逗号数 = , ， 、 的个数
 */
(function (root, factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  root.LabAnalyze = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  var EN_CONNECTIVES = [
    'and', 'but', 'or', 'so', 'because', 'although', 'though', 'if',
    'when', 'while', 'since', 'as', 'that', 'which', 'who', 'however',
    'therefore', 'thus', 'moreover', 'furthermore', 'nevertheless',
    'meanwhile', 'then', 'after', 'before', 'until', 'unless',
    'whereas', 'despite'
  ];

  var ZH_CONNECTIVES = [
    '因为', '所以', '但是', '但', '然而', '可是', '不过', '虽然', '尽管',
    '即使', '如果', '假如', '而且', '并且', '或者', '还是', '于是',
    '然后', '接着', '同时', '此外', '就', '才', '却', '而'
  ];

  function round2(n) {
    return Math.round(n * 100) / 100;
  }

  function sortedHits(hits) {
    return Object.keys(hits)
      .map(function (word) { return { word: word, count: hits[word] }; })
      .sort(function (a, b) { return b.count - a.count || a.word.localeCompare(b.word); });
  }

  function analyzeEn(text) {
    var words = text.match(/[A-Za-z]+(?:'[A-Za-z]+)?/g) || [];
    var set = {};
    EN_CONNECTIVES.forEach(function (w) { set[w] = true; });
    var hits = {};
    var conn = 0;
    words.forEach(function (w) {
      var lw = w.toLowerCase();
      if (set[lw]) {
        conn++;
        hits[lw] = (hits[lw] || 0) + 1;
      }
    });
    var sentences = text.split(/[.!?]+/).map(function (s) { return s.trim(); }).filter(Boolean).length;
    var commas = (text.match(/,/g) || []).length;
    var units = words.length;
    return {
      units: units,
      sentences: sentences,
      connectives: conn,
      density: units ? round2((conn / units) * 100) : 0,
      avgLen: sentences ? round2(units / sentences) : 0,
      commas: commas,
      hits: sortedHits(hits)
    };
  }

  function analyzeZh(text) {
    var chars = text.match(/[\u4e00-\u9fff]/g) || [];
    var units = chars.length;
    // 最长匹配优先：先排长词，避免"然而"被拆成"然"+"而"、"但是"被拆成"但"
    var sorted = ZH_CONNECTIVES.slice().sort(function (a, b) { return b.length - a.length; });
    var hits = {};
    var conn = 0;
    var i = 0;
    while (i < text.length) {
      var matched = null;
      for (var k = 0; k < sorted.length; k++) {
        if (text.indexOf(sorted[k], i) === i) { matched = sorted[k]; break; }
      }
      if (matched) {
        conn++;
        hits[matched] = (hits[matched] || 0) + 1;
        i += matched.length;
      } else {
        i++;
      }
    }
    var sentences = text.split(/[。！？.!?]+/).map(function (s) { return s.trim(); }).filter(Boolean).length;
    var commas = (text.match(/[,，、]/g) || []).length;
    return {
      units: units,
      sentences: sentences,
      connectives: conn,
      density: units ? round2((conn / units) * 100) : 0,
      avgLen: sentences ? round2(units / sentences) : 0,
      commas: commas,
      hits: sortedHits(hits)
    };
  }

  function analyzeText(raw, lang) {
    var text = (raw || '').replace(/\s+/g, ' ').trim();
    if (!text) {
      return { units: 0, sentences: 0, connectives: 0, density: 0, avgLen: 0, commas: 0, hits: [] };
    }
    return lang === 'zh' ? analyzeZh(text) : analyzeEn(text);
  }

  return {
    EN_CONNECTIVES: EN_CONNECTIVES,
    ZH_CONNECTIVES: ZH_CONNECTIVES,
    analyzeText: analyzeText
  };
});
