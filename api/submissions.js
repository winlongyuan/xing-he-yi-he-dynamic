'use strict';

// POST /api/submissions — 提交一条学生分析结果
// GET  /api/submissions — 班级数据墙：列表 + 人数 + 平均密度
var supa = require('./_supabase');
var util = require('./_util');

module.exports = async function handler(req, res) {
  util.cors(res);
  if (!util.methodGuard(req, res, ['GET', 'POST'])) return;
  try {
    if (req.method === 'GET') {
      var rows = await supa.rest('submissions', {
        key: supa.anonKey(),
        query: '?select=*&order=created_at.desc&limit=200'
      });
      var count = rows.length;
      var avgDensity = count
        ? Math.round((rows.reduce(function (s, r) { return s + Number(r.density || 0); }, 0) / count) * 100) / 100
        : 0;
      return util.send(res, 200, { ok: true, count: count, avgDensity: avgDensity, items: rows });
    }

    var b = util.readJson(req);
    var row = {
      nickname: String(b.nickname || '匿名').slice(0, 20),
      text_lang: b.text_lang === 'zh' ? 'zh' : 'en',
      word_count: Math.max(0, Math.floor(Number(b.word_count) || 0)),
      connective_count: Math.max(0, Math.floor(Number(b.connective_count) || 0)),
      density: Math.max(0, Number(b.density) || 0),
      avg_sentence_length: b.avg_sentence_length === undefined || b.avg_sentence_length === null
        ? null
        : Math.max(0, Number(b.avg_sentence_length) || 0)
    };
    if (!row.word_count) {
      return util.send(res, 400, { ok: false, error: 'word_count 必须大于 0（请先分析一段文本）' });
    }
    var inserted = await supa.rest('submissions', { method: 'POST', key: supa.anonKey(), body: row });
    var item = Array.isArray(inserted) ? inserted[0] : inserted;
    return util.send(res, 201, { ok: true, item: item });
  } catch (err) {
    return util.handleError(res, err);
  }
};
