'use strict';

// GET /api/stats — 教师统计：班级平均密度、各组提交数、投票分布、小测得分分布
var supa = require('./_supabase');
var util = require('./_util');

module.exports = async function handler(req, res) {
  util.cors(res);
  if (!util.methodGuard(req, res, ['GET'])) return;
  try {
    var key = supa.anonKey();
    var results = await Promise.all([
      supa.rest('submissions', { key: key, query: '?select=density,text_lang&limit=1000' }),
      supa.rest('votes', { key: key, query: '?select=hypothesis,choice&limit=1000' }),
      supa.rest('quiz_results', { key: key, query: '?select=score&limit=1000' })
    ]);
    var subs = results[0];
    var votes = results[1];
    var quiz = results[2];

    var submissionCount = subs.length;
    var avgDensity = submissionCount
      ? Math.round((subs.reduce(function (s, r) { return s + Number(r.density || 0); }, 0) / submissionCount) * 100) / 100
      : 0;
    var byLang = { en: 0, zh: 0 };
    subs.forEach(function (r) { if (r.text_lang === 'zh') byLang.zh++; else byLang.en++; });

    var voteDist = {
      H1: { confirm: 0, refute: 0, unsure: 0, total: 0 },
      H2: { confirm: 0, refute: 0, unsure: 0, total: 0 },
      H3: { confirm: 0, refute: 0, unsure: 0, total: 0 }
    };
    votes.forEach(function (r) {
      if (voteDist[r.hypothesis] && ['confirm', 'refute', 'unsure'].indexOf(r.choice) !== -1) {
        voteDist[r.hypothesis][r.choice]++;
        voteDist[r.hypothesis].total++;
      }
    });

    var scoreDist = { 0: 0, 1: 0, 2: 0, 3: 0 };
    quiz.forEach(function (r) {
      if (scoreDist[r.score] !== undefined) scoreDist[r.score]++;
    });
    var quizCount = quiz.length;
    var avgScore = quizCount
      ? Math.round((quiz.reduce(function (s, r) { return s + Number(r.score || 0); }, 0) / quizCount) * 100) / 100
      : 0;

    return util.send(res, 200, {
      ok: true,
      submissionCount: submissionCount,
      avgDensity: avgDensity,
      byLang: byLang,
      voteDist: voteDist,
      quizCount: quizCount,
      avgScore: avgScore,
      scoreDist: scoreDist
    });
  } catch (err) {
    return util.handleError(res, err);
  }
};
