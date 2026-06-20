-- ============================================================================
-- Splendor presence(접속자) 테이블 (schema = splendor)
-- Supabase 대시보드 > SQL Editor 에 붙여넣고 실행하세요. (한 번만)
-- 각 클라이언트가 자기 행을 주기적으로 upsert, 다른 클라가 폴링으로 접속자 파악.
-- ============================================================================

create table if not exists splendor.presence (
  room       text        not null,
  client     text        not null,
  name       text        not null,
  seat       int,                       -- 점유 좌석(없으면 null = 관전자)
  last_seen  timestamptz not null default now(),
  primary key (room, client)
);

create index if not exists presence_room_idx on splendor.presence (room);

grant select, insert, update, delete on splendor.presence to anon, authenticated;

alter table splendor.presence enable row level security;

drop policy if exists "presence_read" on splendor.presence;
drop policy if exists "presence_write" on splendor.presence;
drop policy if exists "presence_update" on splendor.presence;
create policy "presence_read"   on splendor.presence for select using (true);
create policy "presence_write"  on splendor.presence for insert with check (true);
create policy "presence_update" on splendor.presence for update using (true) with check (true);
