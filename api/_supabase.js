'use strict';

// Supabase PostgREST 直调（零依赖，不装 @supabase/supabase-js）
// 读/写用 anon key（受 RLS 约束：只允许 insert/select）；
// 教师清空用 service_role key（绕过 RLS），只在服务端使用。
// 密钥有两种格式都要兼容：旧格式 JWT（eyJ...，放 apikey + Authorization: Bearer），
// 新格式 sb_publishable_/sb_secret_（不是 JWT，只能放 apikey，放进 Bearer 会被网关拒绝）。
function isJwt(key) {
  return key.slice(0, 4) === 'eyJ.';
}
function config() {
  var url = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
  var anonKey = process.env.SUPABASE_ANON_KEY || '';
  var serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!url || !anonKey) {
    var e = new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY');
    e.status = 500;
    throw e;
  }
  return { url: url, anonKey: anonKey, serviceKey: serviceKey };
}

function anonKey() {
  return config().anonKey;
}

function serviceKey() {
  var key = config().serviceKey;
  if (!key) {
    var e = new Error('Missing SUPABASE_SERVICE_ROLE_KEY');
    e.status = 500;
    throw e;
  }
  return key;
}

async function rest(path, opts) {
  opts = opts || {};
  var method = opts.method || 'GET';
  var key = opts.key;
  var body = opts.body;
  var query = opts.query || '';
  var cfg = config();
  var headers = {
    apikey: key,
    'Content-Type': 'application/json',
    Prefer: 'return=representation'
  };
  if (isJwt(key)) {
    headers.Authorization = 'Bearer ' + key;
  }
  var res = await fetch(cfg.url + '/rest/v1/' + path + query, {
    method: method,
    headers: headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  var text = await res.text();
  var data = null;
  try { data = text ? JSON.parse(text) : null; } catch (e) { data = { raw: text }; }
  if (!res.ok) {
    var err = new Error('Supabase ' + method + ' ' + path + ' failed: ' + res.status + ' ' + String(text).slice(0, 300));
    err.status = res.status;
    throw err;
  }
  return data;
}

module.exports = { config: config, anonKey: anonKey, serviceKey: serviceKey, rest: rest };
