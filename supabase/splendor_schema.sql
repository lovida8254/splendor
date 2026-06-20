-- ============================================================================
-- Splendor 온라인 멀티플레이용 스키마 (다른 프로젝트와 분리: schema = splendor)
-- 이 SQL을 Supabase 대시보드 > SQL Editor 에 붙여넣고 실행하세요.
-- 프로젝트: fgywbfeeangvtuhazdmc
-- ============================================================================

create schema if not exists splendor;

-- API 역할에 스키마 사용 권한 부여 (anon = 비로그인 클라이언트)
grant usage on schema splendor to anon, authenticated;

-- 방(룸) 테이블: 액션 소싱 방식(설정+seed+actions[])으로 전체 게임 상태를 재구성
create table if not exists splendor.rooms (
  code        text primary key,                         -- 공유용 방 코드(링크 키)
  config      jsonb       not null,                      -- { players:[{name,isAI,aiLevel,seat}], seed }
  actions     jsonb       not null default '[]'::jsonb,  -- 적용된 Action[] (append-only)
  seats       jsonb       not null default '{}'::jsonb,  -- { "<seatIndex>": "<clientId>" } 사람 좌석 점유
  status      text        not null default 'lobby',      -- lobby | playing | finished
  host        text        not null,                      -- 호스트 clientId (AI 구동 권한)
  updated_at  timestamptz not null default now(),
  created_at  timestamptz not null default now()
);

grant select, insert, update on splendor.rooms to anon, authenticated;

-- RLS 필수: 활성화 + 정책(방 코드를 아는 사람만 접근하는 캐주얼 모델)
alter table splendor.rooms enable row level security;

drop policy if exists "rooms_read"   on splendor.rooms;
drop policy if exists "rooms_insert" on splendor.rooms;
drop policy if exists "rooms_update" on splendor.rooms;

create policy "rooms_read"   on splendor.rooms for select using (true);
create policy "rooms_insert" on splendor.rooms for insert with check (true);
create policy "rooms_update" on splendor.rooms for update using (true) with check (true);
-- 참고: delete 정책은 두지 않음(방 삭제 차단). 코드가 사실상 접근키 역할.

-- updated_at 자동 갱신
create or replace function splendor.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

drop trigger if exists rooms_touch on splendor.rooms;
create trigger rooms_touch before update on splendor.rooms
  for each row execute function splendor.touch_updated_at();

-- Realtime: rooms 변경을 클라이언트에 실시간 전파
alter publication supabase_realtime add table splendor.rooms;

-- ============================================================================
-- 실행 후 대시보드에서 한 가지 더:
--   Settings > API > "Exposed schemas" 에 `splendor` 를 추가(저장)해야
--   supabase-js 가 splendor 스키마에 접근할 수 있습니다. (기본은 public 만 노출)
-- ============================================================================
