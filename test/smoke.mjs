// test/smoke.mjs — 本地冒烟测试（无需部署、无需真实 Supabase）
// 运行：npm test
// 验证：① 连接词统计算法与教材实测值一致；② 三组汇总均值；③ SQL 文件结构；
//       ④ 五个 API 处理函数在 mock fetch 下跑通（含 PIN 验证与方法守卫）。
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { analyzeText } = require(path.join(root, 'public/analyze.js'));

let pass = 0;
let fail = 0;
const failures = [];
function check(name, cond, extra) {
  if (cond) { pass++; console.log('  PASS ' + name); }
  else { fail++; failures.push(name); console.log('  FAIL ' + name + (extra ? ' — ' + extra : '')); }
}
function approx(a, b, tol) { return Math.abs(a - b) <= (tol === undefined ? 0.011 : tol); }

/* ---------- 1. 连接词统计（与教材实测值对照） ---------- */
console.log('\n[1] 连接词统计');
const cases = [
  // [文本, 语言, 期望 {units, connectives, density}]
  ['He was very tired, so he went to bed early.', 'en', { units: 10, connectives: 1, density: 10 }],
  ['他很累，早早就睡了。', 'zh', { units: 8, connectives: 1, density: 12.5 }],
  ['因为他很累，所以他很早就上床睡觉了。', 'zh', { units: 16, connectives: 3, density: 18.75 }],
  ['Although it was raining heavily, they continued to work because the deadline was approaching.', 'en', { units: 14, connectives: 2, density: 14.29 }],
  ['雨下得很大，他们照样干活，期限快到了。', 'zh', { units: 16, connectives: 0, density: 0 }],
  ['尽管雨下得很大，他们仍然继续工作，因为期限快到了。', 'zh', { units: 22, connectives: 2, density: 9.09 }],
  ['When I got home, I found that my mother had already cooked dinner. She smiled and said that I should wash my hands first, and then we could eat together.', 'en', { units: 30, connectives: 6, density: 20 }],
  ['我回到家，妈妈已经做好了饭。她笑着说，先洗手，然后一起吃饭。', 'zh', { units: 25, connectives: 1, density: 4 }],
  ['当我回到家的时候，我发现妈妈已经做好了晚饭。她笑着对我说，我应该先去洗手，然后我们就可以一起吃饭了。', 'zh', { units: 45, connectives: 2, density: 4.44 }],
  ['All was cleared up some time later when news came from a distant place that an earthquake was felt the very day the little copper ball fell.', 'en', { units: 27, connectives: 2, density: 7.41 }],
  ['过了一些时候，从远方传来了消息：在小铜球坠落的当天，确实发生了地震。这一切终于得到了澄清。', 'zh', { units: 40, connectives: 0, density: 0 }],
  ['Because it is late, I must leave.', 'en', { units: 7, connectives: 1, density: 14.29 }],
  ['It is late, I must leave.', 'en', { units: 6, connectives: 0, density: 0 }]
];
cases.forEach(function (c, i) {
  const r = analyzeText(c[0], c[1]);
  const e = c[2];
  check(
    '用例 ' + (i + 1) + '（' + c[1] + '）units=' + e.units + ' conn=' + e.connectives + ' density=' + e.density,
    r.units === e.units && r.connectives === e.connectives && approx(r.density, e.density),
    '实测 units=' + r.units + ' conn=' + r.connectives + ' density=' + r.density
  );
});

// 最长匹配：然而计 1 次（不拆成"然"+"而"）；"不但"里的"但"计 1 次
const r1 = analyzeText('然而他却来了。', 'zh');
check('最长匹配：然而=1、却=1，共 2', r1.connectives === 2, '实测 ' + r1.connectives);
const r2 = analyzeText('他不但来了，而且还带了礼物。', 'zh');
check('最长匹配：不但里的但=1、而且=1，共 2', r2.connectives === 2, '实测 ' + r2.connectives);

/* ---------- 2. 三组汇总均值（页面实时计算的同一口径） ---------- */
console.log('\n[2] 三组汇总均值');
const enD = [10, 14.29, 20];
const yiD = [12.5, 0, 4];
const xingD = [18.75, 9.09, 4.44];
const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;
console.log('  英文均值 ' + mean(enD).toFixed(2) + '（预期 14.76）');
console.log('  汉语意合均值 ' + mean(yiD).toFixed(2) + '（预期 5.5）');
console.log('  汉语形合化均值 ' + mean(xingD).toFixed(2) + '（预期 10.76）');
check('英文均值 ≈ 14.76', approx(mean(enD), 14.76));
check('汉语意合均值 ≈ 5.5', approx(mean(yiD), 5.5));
check('汉语形合化均值 ≈ 10.76', approx(mean(xingD), 10.76));
check('英文约为汉语意合的 2.7 倍（小测 Q3“约 3 倍”成立）', approx(mean(enD) / mean(yiD), 2.68, 0.05));

/* ---------- 3. SQL 文件结构 ---------- */
console.log('\n[3] supabase/schema.sql');
const sql = readFileSync(path.join(root, 'supabase/schema.sql'), 'utf8');
['public.submissions', 'public.votes', 'public.quiz_results'].forEach((t) => {
  check('建表 ' + t, sql.includes('create table if not exists ' + t));
});
const rlsCount = (sql.match(/enable row level security/g) || []).length;
check('三张表都启用 RLS', rlsCount === 3, '实测 ' + rlsCount + ' 处');
check('匿名可 insert', (sql.match(/for insert to anon/g) || []).length === 3);
check('匿名可 select', (sql.match(/for select to anon/g) || []).length === 3);
check('没有给 anon 开 update/delete', !/for (update|delete) to anon/.test(sql));
const open = (sql.match(/\(/g) || []).length;
const close = (sql.match(/\)/g) || []).length;
check('括号配对', open === close, '左 ' + open + ' 右 ' + close);

/* ---------- 4. vercel.json 与 .env.example ---------- */
console.log('\n[4] 配置文件');
const vercelJson = JSON.parse(readFileSync(path.join(root, 'vercel.json'), 'utf8'));
check('vercel.json 指定 Node 24 运行时', vercelJson.functions && vercelJson.functions['api/*.js'].runtime === 'nodejs24.x');
const envExample = readFileSync(path.join(root, '.env.example'), 'utf8');
['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'TEACHER_PIN'].forEach((k) => {
  check('.env.example 含 ' + k, envExample.includes(k));
});

/* ---------- 5. API 处理函数（mock fetch，不联网） ---------- */
console.log('\n[5] API 处理函数（mock Supabase）');
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_ANON_KEY = 'anon-test-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-test-key';
process.env.TEACHER_PIN = '1234';

const fetchCalls = [];
const sampleSubs = [
  { id: 1, nickname: '小林', text_lang: 'en', word_count: 10, connective_count: 1, density: 10, avg_sentence_length: 10, created_at: '2026-11-08T00:00:00Z' },
  { id: 2, nickname: '07', text_lang: 'zh', word_count: 8, connective_count: 1, density: 12.5, avg_sentence_length: 8, created_at: '2026-11-08T00:01:00Z' }
];
const sampleVotes = [
  { hypothesis: 'H1', choice: 'confirm' },
  { hypothesis: 'H1', choice: 'confirm' },
  { hypothesis: 'H1', choice: 'refute' },
  { hypothesis: 'H2', choice: 'unsure' }
];
const sampleQuiz = [{ score: 3 }, { score: 2 }, { score: 2 }];

globalThis.fetch = async (url, opts) => {
  fetchCalls.push({ url, method: (opts && opts.method) || 'GET', body: opts && opts.body });
  const u = String(url);
  let data = [];
  if (u.includes('/submissions')) {
    data = (opts && opts.method === 'POST') ? [{ id: 99, ...(JSON.parse(opts.body || '{}')) }] : sampleSubs;
  } else if (u.includes('/votes')) {
    data = (opts && opts.method === 'POST') ? [{ id: 99, ...(JSON.parse(opts.body || '{}')) }] : sampleVotes;
  } else if (u.includes('/quiz_results')) {
    data = (opts && opts.method === 'POST') ? [{ id: 99, ...(JSON.parse(opts.body || '{}')) }] : sampleQuiz;
  }
  return { ok: true, status: 200, text: async () => JSON.stringify(data) };
};

function mockReq({ method = 'GET', body = undefined } = {}) {
  return { method, body, headers: {}, query: {} };
}
function mockRes() {
  const res = { statusCode: 200, headers: {}, body: '' };
  res.status = (c) => { res.statusCode = c; return res; };
  res.setHeader = (k, v) => { res.headers[k] = v; return res; };
  res.json = (o) => { res.body = JSON.stringify(o); return res; };
  res.end = (t) => { if (t !== undefined) res.body = t; return res; };
  return res;
}
const json = (res) => JSON.parse(res.body);

const submissions = require(path.join(root, 'api/submissions.js'));
const votes = require(path.join(root, 'api/votes.js'));
const quiz = require(path.join(root, 'api/quiz.js'));
const stats = require(path.join(root, 'api/stats.js'));
const clear = require(path.join(root, 'api/clear.js'));

// submissions GET
{
  const res = mockRes();
  await submissions(mockReq({ method: 'GET' }), res);
  const d = json(res);
  check('GET /api/submissions：count=2，avgDensity=11.25', res.statusCode === 200 && d.count === 2 && d.avgDensity === 11.25, res.body);
}
// submissions POST 正常
{
  const res = mockRes();
  await submissions(mockReq({ method: 'POST', body: { nickname: '小林', text_lang: 'en', word_count: 10, connective_count: 1, density: 10, avg_sentence_length: 10 } }), res);
  check('POST /api/submissions：201', res.statusCode === 201, res.body);
}
// submissions POST word_count=0 → 400
{
  const res = mockRes();
  await submissions(mockReq({ method: 'POST', body: { nickname: 'x', text_lang: 'en', word_count: 0, connective_count: 0, density: 0 } }), res);
  check('POST /api/submissions 空文本 → 400', res.statusCode === 400);
}
// votes GET tally
{
  const res = mockRes();
  await votes(mockReq({ method: 'GET' }), res);
  const d = json(res);
  check('GET /api/votes：H1 证实 2、证伪 1', res.statusCode === 200 && d.tally.H1.confirm === 2 && d.tally.H1.refute === 1 && d.tally.H1.total === 3, res.body);
}
// votes POST 非法 choice → 400
{
  const res = mockRes();
  await votes(mockReq({ method: 'POST', body: { hypothesis: 'H1', choice: 'maybe' } }), res);
  check('POST /api/votes 非法 choice → 400', res.statusCode === 400);
}
// votes POST 正常
{
  const res = mockRes();
  await votes(mockReq({ method: 'POST', body: { hypothesis: 'H3', choice: 'unsure' } }), res);
  check('POST /api/votes：201', res.statusCode === 201);
}
// quiz POST 正常 / 非法
{
  const res = mockRes();
  await quiz(mockReq({ method: 'POST', body: { nickname: '07', score: 3, answers: [1, 2, 1] } }), res);
  check('POST /api/quiz score=3：201', res.statusCode === 201);
  const res2 = mockRes();
  await quiz(mockReq({ method: 'POST', body: { nickname: '07', score: 5, answers: [] } }), res2);
  check('POST /api/quiz score=5 → 400', res2.statusCode === 400);
}
// stats GET
{
  const res = mockRes();
  await stats(mockReq({ method: 'GET' }), res);
  const d = json(res);
  check('GET /api/stats：提交 2 人、平均分 2.33、3 分 1 人', res.statusCode === 200 && d.submissionCount === 2 && d.avgScore === 2.33 && d.scoreDist['3'] === 1, res.body);
}
// clear：错误 PIN → 403；正确 PIN → 200 且调了 3 次 DELETE
{
  const res = mockRes();
  await clear(mockReq({ method: 'POST', body: { pin: '0000' } }), res);
  check('POST /api/clear 错误 PIN → 403', res.statusCode === 403);
  const before = fetchCalls.filter((c) => c.method === 'DELETE').length;
  const res2 = mockRes();
  await clear(mockReq({ method: 'POST', body: { pin: '1234' } }), res2);
  const after = fetchCalls.filter((c) => c.method === 'DELETE').length;
  check('POST /api/clear 正确 PIN → 200，三张表各删一次', res2.statusCode === 200 && after - before === 3, res2.body);
}
// 方法守卫：OPTIONS → 204；DELETE 到 submissions → 405
{
  const res = mockRes();
  await submissions(mockReq({ method: 'OPTIONS' }), res);
  check('OPTIONS 预检 → 204', res.statusCode === 204);
  const res2 = mockRes();
  await submissions(mockReq({ method: 'DELETE' }), res2);
  check('DELETE /api/submissions → 405', res2.statusCode === 405);
}

/* ---------- 汇总 ---------- */
console.log('\n========================================');
console.log('PASS ' + pass + ' / FAIL ' + fail);
if (fail) {
  console.log('失败项：' + failures.join('；'));
  process.exit(1);
} else {
  console.log('全部通过。');
}
