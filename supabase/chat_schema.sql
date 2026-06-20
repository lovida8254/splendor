-- ============================================================================
-- Splendor 온라인 채팅용 테이블 (schema = splendor)
-- Supabase 대시보드 > SQL Editor 에 붙여넣고 실행하세요. (한 번만)
-- ============================================================================

create table if not exists splendor.messages (
  id         bigint generated always as identity primary key,
  room       text        not null,
  client     text        not null,
  name       text        not null,
  text       text        not null,
  created_at timestamptz not null default now()
);

create index if not exists messages_room_id_idx on splendor.messages (room, id);

grant select, insert on splendor.messages to anon, authenticated;

alter table splendor.messages enable row level security;

drop policy if exists "msg_read" on splendor.messages;
drop policy if exists "msg_insert" on splendor.messages;
create policy "msg_read"   on splendor.messages for select using (true);
create policy "msg_insert" on splendor.messages for insert with check (true);

-- Realtime (선택: 폴링 폴백이 있어 없어도 동작)
alter publication supabase_realtime add table splendor.messages;
