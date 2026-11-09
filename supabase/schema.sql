-- ============================================================
-- 《英汉语言对比数据工程》第三章《形合与意合》实验室
-- Supabase 建表脚本（Postgres）
-- 用法：Supabase Dashboard → SQL Editor → 粘贴本文件 → Run（只需执行一次）
-- 区域建议：建项目时选 Singapore（ap-southeast-1），国内访问延时最低
-- ============================================================

-- ---------- 1. 学生动手分析结果提交 ----------
create table if not exists public.submissions (
  id bigint generated always as identity primary key,
  nickname text not null default '匿名',
  text_lang text not null check (text_lang in ('en', 'zh')),
  word_count integer not null check (word_count >= 0),
  connective_count integer not null check (connective_count >= 0),
  density numeric(6, 2) not null default 0,
  avg_sentence_length numeric(6, 2),
  created_at timestamptz not null default now()
);
comment on table public.submissions is '学生动手：粘贴文本分析后提交的结果';

-- ---------- 2. 假设验证投票 ----------
create table if not exists public.votes (
  id bigint generated always as identity primary key,
  hypothesis text not null check (hypothesis in ('H1', 'H2', 'H3')),
  choice text not null check (choice in ('confirm', 'refute', 'unsure')),
  created_at timestamptz not null default now()
);
comment on table public.votes is '验证环节：H1/H2/H3 假设投票（证实/证伪/存疑）';

-- ---------- 3. 小测得分 ----------
create table if not exists public.quiz_results (
  id bigint generated always as identity primary key,
  nickname text not null default '匿名',
  score integer not null check (score >= 0 and score <= 3),
  answers jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
comment on table public.quiz_results is '课堂小测得分提交（满分 3 分，answers 存每题所选选项）';

-- ---------- 4. 索引 ----------
create index if not exists idx_submissions_created_at on public.submissions (created_at desc);
create index if not exists idx_votes_created_at on public.votes (created_at desc);
create index if not exists idx_quiz_created_at on public.quiz_results (created_at desc);

-- ---------- 5. 行级安全 RLS ----------
alter table public.submissions enable row level security;
alter table public.votes enable row level security;
alter table public.quiz_results enable row level security;

-- 匿名用户：只允许写入（insert）和读取（select），不给 update / delete。
-- 教师清空走 service_role（天然绕过 RLS），经 /api/clear + TEACHER_PIN 验证。
grant usage on schema public to anon;
grant select, insert on public.submissions to anon;
grant select, insert on public.votes to anon;
grant select, insert on public.quiz_results to anon;

create policy "anon_insert_submissions" on public.submissions
  for insert to anon with check (true);
create policy "anon_select_submissions" on public.submissions
  for select to anon using (true);

create policy "anon_insert_votes" on public.votes
  for insert to anon with check (true);
create policy "anon_select_votes" on public.votes
  for select to anon using (true);

create policy "anon_insert_quiz" on public.quiz_results
  for insert to anon with check (true);
create policy "anon_select_quiz" on public.quiz_results
  for select to anon using (true);
