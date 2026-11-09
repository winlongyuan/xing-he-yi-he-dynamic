'use strict';

// POST /api/votes — 提交一票（H1/H2/H3 × 证实/证伪/存疑）
// GET  /api/votes — 各假设的票数分布
var supa = require('./_supabase');
var util = require('./_util');

var HYPOTHESES = ['H1', 'H2', 'H3'];
var CHOICES = ['confirm', 'refute', 'unsure'];

function emptyTally() {
  var t = {};
  HYPOTHESES.forEach(function (h) {
    t[h] = { confirm: 0, refute: 0, unsure: 0, total: 0 };
  });
  return t;
}

module.exports = async function handler(req, res) {
  util.cors(res);
  if (!util.methodGuard(req, res, ['GET', 'POST'])) return;
  try {
    if (req.method === 'GET') {
      var rows = await supa.rest('votes', {
        key: supa.anonKey(),
        query: '?select=hypothesis,choice&limit=1000'
      });
      var tally = emptyTally();
      rows.forEach(function (r) {
        if (tally[r.hypothesis] && CHOICES.indexOf(r.choice) !== -1) {
          tally[r.hypothesis][r.choice]++;
          tally[r.hypothesis].total++;
        }
      });
      return util.send(res, 200, { ok: true, tally: tally });
    }

    var b = util.readJson(req);
    if (HYPOTHESES.indexOf(b.hypothesis) === -1 || CHOICES.indexOf(b.choice) === -1) {
      return util.send(res, 400, { ok: false, error: 'hypothesis 须为 H1/H2/H3，choice 须为 confirm/refute/unsure' });
    }
    var inserted = await supa.rest('votes', {
      method: 'POST',
      key: supa.anonKey(),
      body: { hypothesis: b.hypothesis, choice: b.choice }
    });
    var item = Array.isArray(inserted) ? inserted[0] : inserted;
    return util.send(res, 201, { ok: true, item: item });
  } catch (err) {
    return util.handleError(res, err);
  }
};
