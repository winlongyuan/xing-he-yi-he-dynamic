'use strict';

// POST /api/quiz — 提交小测得分（满分 3 分）
var supa = require('./_supabase');
var util = require('./_util');

module.exports = async function handler(req, res) {
  util.cors(res);
  if (!util.methodGuard(req, res, ['POST'])) return;
  try {
    var b = util.readJson(req);
    var score = Math.floor(Number(b.score));
    if (!Number.isInteger(score) || score < 0 || score > 3) {
      return util.send(res, 400, { ok: false, error: 'score 须为 0–3 的整数' });
    }
    var answers = Array.isArray(b.answers) ? b.answers.slice(0, 3) : [];
    var inserted = await supa.rest('quiz_results', {
      method: 'POST',
      key: supa.anonKey(),
      body: {
        nickname: String(b.nickname || '匿名').slice(0, 20),
        score: score,
        answers: answers
      }
    });
    var item = Array.isArray(inserted) ? inserted[0] : inserted;
    return util.send(res, 201, { ok: true, item: item });
  } catch (err) {
    return util.handleError(res, err);
  }
};
