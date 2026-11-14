'use strict';

// POST /api/gate — 课堂口令验证（学生进入实验室前）
// 需在请求体中提供 { pin }，与环境变量 STUDENT_PIN 做等长恒时比较；
// STUDENT_PIN 未设置时返回 503（fail closed），避免未设口令时实验室裸奔。
// 口令值只存在于 Vercel 环境变量中，绝不能写进代码仓库。
var crypto = require('node:crypto');
var util = require('./_util');

function pinOk(pin) {
  var expected = process.env.STUDENT_PIN || '';
  if (!expected || typeof pin !== 'string') return false;
  var a = Buffer.from(pin);
  var b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

module.exports = async function handler(req, res) {
  util.cors(res);
  if (!util.methodGuard(req, res, ['POST'])) return;
  try {
    if (!process.env.STUDENT_PIN) {
      return util.send(res, 503, { ok: false, error: '课堂口令尚未设置，请联系老师' });
    }
    var b = util.readJson(req);
    if (!pinOk(b.pin)) {
      return util.send(res, 403, { ok: false, error: '口令不对，请重新输入' });
    }
    return util.send(res, 200, { ok: true });
  } catch (err) {
    return util.handleError(res, err);
  }
};
