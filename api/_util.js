'use strict';

// API 公共工具：CORS、JSON 响应、请求体解析、错误处理
function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function send(res, status, obj) {
  res.status(status);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.json(obj);
}

// Vercel 会自动解析 JSON 请求体；这里同时兼容字符串体与未解析体
function readJson(req) {
  var b = req.body;
  if (b === undefined || b === null || b === '') return {};
  if (typeof b === 'string') {
    try { return JSON.parse(b); } catch (e) { return {}; }
  }
  return b;
}

function handleError(res, err) {
  console.error(err);
  send(res, err.status || 500, { ok: false, error: err.message || 'Internal error' });
}

// 返回 false 表示请求已处理完毕（OPTIONS 预检或方法不允许），调用方直接 return
function methodGuard(req, res, allowed) {
  if (req.method === 'OPTIONS') {
    res.status(204);
    res.end();
    return false;
  }
  if (allowed.indexOf(req.method) === -1) {
    send(res, 405, { ok: false, error: 'Method ' + req.method + ' not allowed' });
    return false;
  }
  return true;
}

module.exports = { cors, send, readJson, handleError, methodGuard };
