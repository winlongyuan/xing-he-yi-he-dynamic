'use strict';

// POST /api/clear — 教师清空班级数据（submissions / votes / quiz_results 全清）
// 需在请求体中提供 { pin }，与环境变量 TEACHER_PIN 做等长恒时比较；
// 使用 SUPABASE_SERVICE_ROLE_KEY 调用（绕过 RLS），该 key 只存在于服务端。
var crypto = require('node:crypto');
var supa = require('./_supabase');
var util = require('./_util');

function pinOk(pin) {
  var expected = process.env.TEACHER_PIN || '';
  if (!expected || typeof pin !== 'string') return false;
  var a = Buffer.from(pin);
  var b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

module.exports = async function handler(req, res) {
  util.cors(res);
  if (!util.methodGuard(req, res, ['POST'])) return;
  try {
    var b = util.readJson(req);
    if (!pinOk(b.pin)) {
      return util.send(res, 403, { ok: false, error: 'PIN 不正确' });
    }
    var key = supa.serviceKey();
    var tables = ['submissions', 'votes', 'quiz_results'];
    for (var i = 0; i < tables.length; i++) {
      // PostgREST 的 DELETE 必须带过滤条件；id > 0 即全部行
      await supa.rest(tables[i], { method: 'DELETE', key: key, query: '?id=gt.0' });
    }
    return util.send(res, 200, { ok: true, cleared: true });
  } catch (err) {
    return util.handleError(res, err);
  }
};
