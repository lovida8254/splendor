-- ============================================================================
-- Splendor 온라인 전적 결과 테이블 (schema = splendor) — 글로벌 리더보드용
-- Supabase 대시보드 > SQL Editor 에 붙여넣고 실행하세요. (한 번만)
-- 각 클라이언트가 온라인 게임 종료 시 자기 결과 1행을 upsert(중복방지).
-- ============================================================================

create table if not exists splendor.results (
  game_id    text        not null,   -- room:seed (게임별 고유)
  client     text        not null,   -- 기기/브라우저 식별자
  name       text        not null,
  won        boolean     not null,
  prestige   int         not null default 0,
  cards      int         not null default 0,
  nobles     int         not null default 0,
  players    int         not null default 0,
  turns      int         not null default 0,
  created_at timestamptz not null default now(),
  primary key (game_id, client)
);

create index if not exists results_created_idx on splendor.results (created_at desc);

grant select, insert on splendor.results to anon, authenticated;

alter table splendor.results enable row level security;

drop policy if exists "results_read" on splendor.results;
drop policy if exists "results_insert" on splendor.results;
create policy "results_read"   on splendor.results for select using (true);
create policy "results_insert" on splendor.results for insert with check (true);
