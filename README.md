# 形合与意合 · 课堂数据互动实验室（动态版）

《英汉语言对比数据工程》第三章《形合与意合》课堂互动实验室的动态版：供 80 位学生在线填写、互动，并实时统计全班数据。

- **前端**：纯 HTML/CSS/JS 单页（`public/`），连接词分析在浏览器内完成，不依赖后端。
- **后端**：Vercel Serverless Functions（Node.js 24，`api/`），零依赖，直接调 Supabase PostgREST。
- **数据库**：Supabase Postgres（免费版，新加坡区），三张表 + RLS。
- **域名**：`translation-engineering.goip.de`（GoIP.de 免费动态域名），A 记录指向 Vercel。

## 目录结构

```
xing-he-yi-he-dynamic/
├── README.md                 本文件
├── package.json              项目信息与 npm test / vercel dev 脚本（零依赖）
├── vercel.json               Vercel 配置：api/*.js 用 Node.js 24 运行时
├── .env.example              环境变量模板（复制为 .env.local；不要提交真实 key）
├── public/
│   ├── index.html            课堂互动页（8 个模块，见下）
│   └── analyze.js            连接词统计算法（浏览器与 Node 共用）
├── api/
│   ├── _util.js              公共工具：CORS、JSON 响应、方法守卫
│   ├── _supabase.js          Supabase PostgREST 直调（anon / service_role）
│   ├── submissions.js        POST/GET /api/submissions（提交分析结果 / 班级数据墙）
│   ├── votes.js              POST/GET /api/votes（H1–H3 投票 / 票数分布）
│   ├── quiz.js               POST /api/quiz（提交小测得分）
│   ├── stats.js              GET /api/stats（教师统计）
│   └── clear.js              POST /api/clear（教师清空，需 TEACHER_PIN）
├── supabase/
│   └── schema.sql            建表 + 索引 + RLS 策略（执行一次即可）
└── test/
    └── smoke.mjs             本地冒烟测试：npm test（无需部署、无需真实 Supabase）
```

## 页面 8 个模块

1. **理论导读**：形合 Hypotactic / 意合 Paratactic 定义与 73 页定义例句、三条可验证预测、73 页 mini 对照（"Because it is late, I must leave." vs "It is late, I must leave."，密度 14.3→0，实时计算）。
2. **数据实验室**：4 组平行语料（前三组自编短句 + 第四组教材原句 74 页例 1），每组一键分析六项指标（词数/字数、句子数、连接词数、连接词密度、平均句长、逗号数）与柱状对比图；连接词词表可展开；统计口径写明；含第一组"就"的反例教学提示与三组汇总均值（实时计算）。
3. **学生动手**：粘贴任意中/英文文本分析并与样本均值对比；填昵称提交到班级汇总；班级数据墙从 API 取全班提交（人数 + 平均密度 + 明细表）；教师清空按钮（输 PIN）。
4. **验证环节**：H1–H3 各配"数据怎么说"与投票按钮（证实/证伪/存疑），计数条从 API 实时取数；附"程度之别"引导总结。
5. **课堂讨论**：三道讨论题（显化、机器翻译、"汉语没有逻辑"吗），各配讨论提示。
6. **小测**：三道选择题，即时判对错 + 解析，答完显示得分与鼓励语，可把得分提交到后端。
7. **教师指南**（可折叠）：45 分钟流程、教学提示（含"就"反例、第四组只看密度）、课后作业（74 页例 2）。
8. **教师统计视图**：班级平均密度、提交人数与语言分布、投票分布、小测得分分布与平均分，从 `GET /api/stats` 取数。

顶部有 **中文/EN 切换**按钮（切换导航、标题与按钮文字）；大字体、高对比、投影友好、手机自适应。本地分析不依赖后端；提交、投票、数据墙、统计需要联网。

## 部署步骤（按顺序做）

### 第 1 步：Supabase（数据库）

1. 打开 [supabase.com](https://supabase.com)，用邮箱 `winlongyuan@gmail.com` 注册并登录。
2. New project：名字如 `xing-he-yi-he-lab`，**Region 选 Singapore（ap-southeast-1）**，设一个数据库密码（记好）。
3. 左侧 **SQL Editor → New query**，粘贴 `supabase/schema.sql` 全部内容，点 **Run**。看到 "Success. No rows returned" 即完成。
4. 左侧 **Settings → API**，记下三样东西：**Project URL**、**anon public key**、**service_role key**（点 Reveal 才看得到）。

### 第 2 步：把代码放进 GitHub

1. 在 GitHub（同一邮箱注册）新建一个仓库，如 `xing-he-yi-he-dynamic`（Public 或 Private 均可）。
2. 把本项目所有文件传上去（网页上传或 `git push` 均可）。**不要把 `.env.local` 或真实 key 传上去**。

### 第 3 步：Vercel（部署）

1. 打开 [vercel.com](https://vercel.com)，用 GitHub 账号登录（Add New → Project → Import 上一步的仓库）。
2. **Settings → Environment Variables**，逐项添加（四个，缺一不可）：
   - `SUPABASE_URL` = 第 1 步的 Project URL
   - `SUPABASE_ANON_KEY` = anon public key
   - `SUPABASE_SERVICE_ROLE_KEY` = service_role key
   - `TEACHER_PIN` = 教师清空 PIN（自己定，4–8 位数字，例如 `2026`）
3. 点 **Deploy**。成功后会得到一个 `https://<项目名>.vercel.app` 地址，先打开测试：分析、提交、投票、小测、统计都走一遍。

> 注意：`vercel.json` 指定 Node.js 24 运行时（`nodejs24.x`，Vercel 当前默认 LTS，支持到 2028 年 4 月）。不要改回 18 或 20：Node.js 18 已于 2025 年 9 月 1 日起停用于 Vercel 新部署，Node.js 20 也已于 2026 年 10 月 1 日起停用于新部署；代码零依赖、只用全局 `fetch`，在 Node 24 下无需改动。

### 第 4 步：绑定域名（GoIP A 记录）

域名：`translation-engineering.goip.de`（GoIP.de 免费动态域名）。

1. 先在 Vercel 项目里：**Settings → Domains → Add**，输入 `translation-engineering.goip.de`。添加后 Vercel 会显示一张 domain card，上面有该项目专用的 **A 记录 IP**（多数项目是 `76.76.21.21`，新项目也可能是 `216.198.79.1` 这类地址——**以 card 上显示的为准，不要照抄教程里的数字**）。
2. 再到 GoIP 面板（https://www.goip.it/dashboard/index）：打开子域名 `translation-engineering`，把 **current IP address (IPv4)** 改成第 1 步 card 上的 IP，保存。
   - GoIP 是动态 DNS 服务，只能指向 IP 地址，所以必须用 A 记录方式接 Vercel，不能用 CNAME。
   - 面板上"Show on GoIP.de homepage"不用管；"IPv6 interface"保持 disabled；**不要添加 AAAA 记录**（Vercel 对第三方 DNS 的域名不支持 IPv6，留着会拖慢证书签发）。
   - 如果之前装过 GoIP 的 IP 更新客户端或路由器自动更新，记得关掉，否则 IP 会被改回原来的地址。
3. 等 DNS 生效（GoIP 的 TTL 只有 40 秒，通常几分钟内生效；可用 `nslookup translation-engineering.goip.de` 检查）。Vercel 确认 DNS 指向正确后会自动签发 HTTPS 证书。
4. 打开 `https://translation-engineering.goip.de` 测试一遍全流程。

## 本地开发与测试

```bash
npm test          # 冒烟测试：统计算法、均值、SQL 结构、五个 API（mock，不联网）
npx vercel dev    # 本地开发服务器（需先复制 .env.example 为 .env.local 并填真实值）
```

## 教师使用说明

- **清空数据**：页面"学生动手"区底部输入 PIN → 点"清空班级数据"。每节课开始前清一次即可。
- **Supabase 休眠**：免费项目闲置 7 天会暂停。上课前一天打开一次本页（或点一次"刷新数据墙"）即可唤醒；首次唤醒加载会慢几秒，属正常现象。每周都上课的话一般不会休眠。
- **80 人并发**：提交、投票、小测都是单条小写入，Vercel 免费版每月 100 万次函数调用、Supabase 免费版 500MB 库，80 人一节课的量级远远够用。
- **断网也不怕**：本地分析（数据实验室、学生动手分析、小测判分）不依赖后端；只有提交、投票、数据墙、统计需要联网。

## API 一览

| 方法与路径 | 作用 | 鉴权 |
|---|---|---|
| `POST /api/submissions` | 提交一条学生分析结果 | anon key（RLS：仅 insert） |
| `GET /api/submissions` | 班级数据墙：列表 + 人数 + 平均密度 | anon key（RLS：仅 select） |
| `POST /api/votes` | 提交一票（H1–H3 × 证实/证伪/存疑） | anon key |
| `GET /api/votes` | 各假设的票数分布 | anon key |
| `POST /api/quiz` | 提交小测得分（0–3 分） | anon key |
| `GET /api/stats` | 教师统计：平均密度、提交分布、投票分布、得分分布 | anon key |
| `POST /api/clear` | 清空三张表（需 `{ pin }`） | service_role + TEACHER_PIN |

## 数据表

| 表 | 字段 |
|---|---|
| `submissions` | id, nickname, text_lang('en'/'zh'), word_count, connective_count, density, avg_sentence_length, created_at |
| `votes` | id, hypothesis('H1'/'H2'/'H3'), choice('confirm'/'refute'/'unsure'), created_at |
| `quiz_results` | id, nickname, score(0–3), answers(json), created_at |

## 安全注意

- `SUPABASE_SERVICE_ROLE_KEY` 只在服务端（`api/clear.js`）使用，**绝不能出现在前端代码、公开仓库或发给学生**。它绕过 RLS，能删全库。
- `TEACHER_PIN` 只告诉授课教师；换学期或怀疑泄露时，在 Vercel 环境变量里改掉并重新部署。
- RLS 策略：匿名用户只能 insert / select，不能 update / delete；删除只能走 service_role + PIN。
- 隐私：页面只收集昵称 / 学号后两位与分析结果，不收集真实姓名、学号全号等个人信息。

## 常见问题

- **打开页面显示"未连接后端"**：先看 Vercel 环境变量是否四项齐全、部署是否成功；再看 Supabase 项目是否休眠（打开 Supabase Dashboard 唤醒）；最后检查 `schema.sql` 是否执行过。
- **提交后数据墙看不到**：点"刷新数据墙"；确认浏览器没有拦截请求；确认 Supabase 的表和 RLS 策略已建好。
- **域名打不开**：先确认 `https://<项目名>.vercel.app` 能打开（能打开说明部署没问题，问题在 DNS）；再用 `nslookup translation-engineering.goip.de` 查 IP 是否已是 Vercel card 上的值。
- **GoIP 的 IP 被改回去了**：关掉 GoIP 更新客户端 / 路由器上的动态 DNS 更新，只保留面板上手填的固定 IP。
