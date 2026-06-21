# Splendor 디지털 — 프로젝트 종합 문서

> 작성: 2026-06-21 · 최종 갱신: 2026-06-21(온라인 안정화·전적/리더보드·빠른매칭·모바일 반응형)
> 목적: 지금까지 개발된 전부를 한 곳에 정리하고, 다음 발전 아이디어를 brainstorming하기 위한 기준 문서.
> 배포: https://splendor-red.vercel.app · 저장소: https://github.com/lovida8254/splendor

---

## 0. 한눈에 요약

보드게임 *Splendor*(Marc André)의 디지털 구현. **순수 TS 게임 엔진 + Next.js UI + 휴리스틱 AI + 설치형 PWA + Supabase 온라인 멀티플레이**까지 완성된 풀 제품.

> 최신 추가(2026-06-21): 온라인 **재접속·턴 타임아웃·오프라인 AI 대행·호스트 자동 위임**, **채팅·관전·presence**,
> **전적/통계 + 글로벌 리더보드**, **빠른 매칭(2/3/4인)**, **인터랙티브 튜토리얼**, **OG 공유 이미지**, **일반 스마트폰 반응형 정밀 최적화**.

- **플레이 모드**: ① vs AI(난이도 3단계) ② 로컬 핫시트 2~4인 ③ **온라인 멀티(방/링크 공유, 실시간 동기화)**
- **플랫폼**: 웹(반응형) + **PWA 설치**(갤럭시 폴드 커버/펼침 최적화, 오프라인)
- **검증**: vitest 44+ (엔진 엣지케이스 + 수천 판 fuzz/AI 시뮬 + 스토어 통합) · Playwright(폴드 뷰포트·인터랙션·멀티 동기화·재접속)
- **상태**: 규칙 100% 구현, 라이브 배포·동작 확인 완료

---

## 1. 기술 스택

| 레이어 | 선택 | 비고 |
|---|---|---|
| 프레임워크 | Next.js 14 (App Router) | `output: 'export'` 정적 번들 |
| 언어 | TypeScript (strict) | 엔진은 순수 함수 |
| 상태관리 | Zustand | 단일 스토어 `useGame` |
| 스타일 | Tailwind CSS | 커스텀 벨벳/네이비/골드 테마 |
| 아이콘 | lucide-react | 텍스트 이모지 미사용 |
| 온라인 | Supabase (Postgres + Realtime) | 전용 `splendor` 스키마 |
| 배포 | Vercel | 푸시 시 자동 재배포 |
| 테스트 | vitest, Playwright | 헤드리스 검증 자동화 |
| 이미지 | sharp | 에셋 webp 최적화·아이콘·OG 생성 |

> **환경 메모**: 저장소가 exFAT 드라이브(`V:`)에 있어 로컬 `next build`가 `EISDIR`로 실패. 프로덕션 빌드는 Vercel(Linux)에 위임하고, 로컬 검증은 `tsc` + `vitest` + `next dev` + Playwright로 수행.

---

## 2. 게임 엔진 (`lib/engine/`) — 규칙의 단일 진실 공급원

순수 함수형. `applyAction(state, action, rng) → newState`. React/DOM 비의존, RNG(`mulberry32`) 주입으로 **결정적**(테스트·AI 시뮬·리플레이·온라인 재구성에 핵심).

| 파일 | 역할 |
|---|---|
| `types.ts` | 도메인 타입(GemColor/TokenPool/Card/Noble/Player/GameState/Action), 상수 |
| `data.ts` | 카드 90장/귀족 10장 시드 로드 + 무결성 검증(레벨 40/30/20, 귀족 prestige 3 등) |
| `setup.ts` | `newGame()`, 인원별 셋업(2인 토큰4·귀족3 / 3인 5·4 / 4인 7·5), 덱 셔플·보드 4×3 배치 |
| `payment.ts` | `deficit`/`canAfford`/`autoPayment`/`validatePayment`(보너스 상쇄→색토큰→골드) |
| `actions.ts` | `validate` + `applyAction` + 턴 종료 파이프라인 + 승자 산정(`computeWinner`/`standings`) |
| `moves.ts` | 합법 수 열거(`legalMainActions`/`realMainActions`) + `autoDiscard` |
| `nobles.ts` | `eligibleNobles` |
| `util.ts` | RNG, shuffle, 토큰 합계 등 |
| `testutil.ts` | 테스트용 상태 빌더 |

**구현된 규칙(전부)**: 4가지 턴 행동(서로 다른 3색 / 같은 색 2개[4개↑일 때만] / 예약[+골드, 최대 3장, 블라인드 가능] / 구매[보드·예약]), 골드 조커, **턴 종료 파이프라인**(토큰 10한도 초과→반환 → 귀족 판정[단일 자동·다중 선택, 턴당 1명] → 종료판정 → 턴 진행), 15점 도달 후 **현재 라운드 종료**, 동점 시 **구매 카드 수 적은 쪽 승**, 덱 소진 시 슬롯 빈 채 유지, **합법 수 0일 때만 강제 PASS**(데드락 처리).

대기 상태는 `pendingDiscard` / `pendingNoble`로 표현.

---

## 3. AI (`lib/ai/ai.ts`) — 휴리스틱 3단계

- **easy**: 근시안적 평가(점수·엔진만), 노이즈로 일부러 약하게
- **normal**: 종합 평가(명성·엔진·귀족 진척·토큰 경제·보드 근접도) 1-ply
- **hard**: normal 평가 + **3-ply 그리디 룩어헤드**(내 수 → 상대 최선 → 내 후속)

좌석교대 승률로 난이도 단조성 검증: **hard>normal 74% / normal>easy 89%**. (`scripts/headtohead.ts`)
온라인에서는 **호스트가 AI 좌석을 구동**.

---

## 4. UI / 컴포넌트 (`components/`, `app/`, `store/`)

### 화면 흐름 (`app/page.tsx`)
- 로컬: `SetupScreen` → `GameBoard`
- 온라인: `OnlineLobby`(메뉴/방) → `GameBoard`
- 진입 시 `?room=코드` 딥링크 / 마지막 방 자동 재접속

### 핵심 컴포넌트
| 컴포넌트 | 역할 |
|---|---|
| `SetupScreen` | 인원·좌석(사람/AI·난이도)·이름 설정, 시작/이어하기/온라인/게임방법, 프리미엄 메뉴 패널 |
| `GameBoard` | 레이아웃 조립: 상단 스코어보드 → 귀족+공급처 → 카드 3행 → 행동기록, 드로어/오버레이 |
| `PlayerPanel` | 상단 전체 플레이어 현황(색별 카드 수 ▭ + 코인 이미지 ● + 점수, 현재 차례 하이라이트, AI '생각 중' 버블) |
| `TokenBank` | 공급처 코인(가로형, 귀족 옆 배치), 토큰 선택/가져오기 |
| `NobleTile`/`NobleRow` | 귀족 타일(이미지 배경 or 모노그램, 요구치 핍), 공급처와 높이 통일 |
| `CardRow` | 레벨별 덱 뒷면(이미지) + 공개 카드 4장(가로 스크롤) |
| `DevCard` | 카드: 점수·보너스·비용원형(고딕 보석풍)·구매/예약 버튼, 풀배경 일러스트, 호버 떠오름+확대 |
| `PlayerDock` | 내 보유 상세(내 보석/내 카드[색별 실물 스택+개수]/보관 카드/내 귀족) |
| `DockDrawer` | 보유 도크를 **좌측 슬라이드 드로어**로 |
| `Modals` | 구매(수동 지불 플랜)·토큰 반환·귀족 선택·게임 종료(다시하기/리플레이/나가기) |
| `TurnBar` | 턴/라운드 표시, 되돌리기·속도·소리·리플레이·게임방법·새게임(온라인 시 방코드/나가기) |
| `LogPanel` | 행동 기록(맨 아래) |
| `ReplayBar` | 리플레이 스크럽/재생 컨트롤 |
| `Toasts` | 상단 팝업 멘트(점수 상승·AI 행동) |
| `FlyLayer` | 토큰/카드 플라이 애니메이션 오버레이 |
| `HowToPlay` | 게임 방법 오버레이(그레이 패널, 보석 이미지, portal 렌더) |
| `Chat` | 온라인 채팅 위젯(우하단, 미읽음 배지) |
| `OnlineLobby` | 빠른 매칭(2/3/4) + 방 만들기/참여/좌석/초대링크/presence |
| `StatsScreen` | 전적/통계 모달(내 전적 + 글로벌 리더보드 탭) |
| `TutorialCoach` | 인터랙티브 튜토리얼 코치(단계 안내·스포트라이트·행동 감지 자동진행) |
| `gems`/`PixelGem`/`PixelScene`/`CardArt` | 보석/코인 비주얼, 픽셀 일러스트, 이미지 폴백 |

### 구현된 기능(클라이언트)
- **수동 지불 UI**: 색 토큰↔골드 배분 + 구매 후 잔여 프리뷰
- **되돌리기/리플레이**: action-sourced(actions[]+history[]), 처음부터 step/play/스크럽
- **속도 튜닝**(느림/보통/빠름) + **사운드**(Web Audio 합성, 음소거 토글) + **마이크로 애니메이션**
- **플라이 애니메이션**: 코인/카드가 출발점에서 **호버(카드 1.5s/코인 0.9s) 후** 플레이어로 비행, **AI는 애니메이션 완료까지 대기**
- **저장/이어하기**(localStorage, action-sourced)

---

## 5. 비주얼 / 디자인 시스템

- **테마**: 르네상스 벨벳+골드. 메인 메뉴=프리미엄 보라 패널, 인게임 패널=네이비 그라데이션(#161B2F→#0F1220)+골드 보더/글로우. 전체 배경=damask 이미지+스크림.
- **골드 프레임 유틸**(`.gold-frame`/`.gold-pill`/`.panel-glass`/`.menu-panel`/`.menu-inset`/`.btn-gold`), 다층 그림자, 카드 호버 떠오름+scale.
- **보석/코인**: 사용자 제공 골드테 보석 코인 이미지(공급처·보유·플라이) + 비용 원형은 색 그라데이션(고딕 보석풍, 스페큘러+금테+세리프).
- **카드 일러스트**: 사용자 제공 풀카드 이미지(레벨×색 15종) + 폴백용 오리지널 **픽셀 일러스트 24종**(인물 흉상/풍경, 색별 리컬러).
- **OG 이미지**: `public/og.png`(링크 공유 미리보기).

---

## 6. 사용자 이미지 에셋 파이프라인

`public/cards`·`public/nobles`·`public/gem`에 이미지를 넣으면 자동 연결, 없으면 도트/모노그램 폴백.
- 명명: 카드 `L{1-3}_{Color}_*` 또는 카드ID `L1-001`, 덱 `CardBack_Level{n}`, 귀족 `N-01`/`Noble_Tile_Background`, 코인 `Gem_{Color}_*`.
- `scripts/process-art.mjs`/`process-gems.mjs`: 원본(~2MB)을 webp로 최적화, 원본은 `art_src/`(gitignore) 백업.
- `scripts/gen-assets.mjs`: 폴더 스캔 → `lib/assets.ts` 매니페스트 자동 생성(`predev`/`prebuild` 자동 실행) → 누락 이미지 404 없음.

---

## 7. PWA / 반응형 (갤럭시 폴드 + 일반 스마트폰)

- `manifest.webmanifest`(standalone, 아이콘 192/512/maskable), `public/sw.js`(오프라인 런타임 캐시), `PWARegister`.
- **반응형 범위**: 폴드 커버(~280–360) · **일반 폰(360–430)** · 폴드 펼침(~768–900) · 데스크톱. `safe-area`, `100dvh`.
- **모바일 카드(2026-06-21 최적화)**: 카드 줄 유동 그리드(`minmax(0,1fr)`)로 가로 스크롤 없이 덱+4장 맞춤,
  비용코인·점수·버튼 모바일 축소(`Pip "cost"`, 버튼 스택), 공급처 코인 1줄(`useIsMobile`), **카드 높이 통일**(≥360 고정 `h-[172px]`, 커버 `min-h`).
- 커스텀 브레이크포인트: `cm:360px`, `xs:400px`(`tailwind.config.ts`).
- 설치: HTTPS(배포)에서 Chrome "홈 화면에 추가". 회귀: `npm run fold-test`(9개 뷰포트 overflow 0).

---

## 8. 온라인 멀티플레이 (Supabase)

- **DB**: 전용 `splendor` 스키마, 전부 RLS 활성(코드 기반 캐주얼 접근).
  - `rooms`(code, config{players,seed,turnSeconds,aiTakeover,quick}, actions[](액션소싱), seats{seat→client}, status, host)
  - `messages`(채팅), `presence`(접속 하트비트), `results`(전적/리더보드).
  - SQL: `supabase/splendor_schema.sql`, `chat_schema.sql`, `presence_schema.sql`, `results_schema.sql`.
- **기본 동기화**: 방 만들기/참여/좌석/시작/나가기 + 초대 링크·코드·딥링크 `?room=`. **Realtime + 1.2초 폴링 폴백**(actions로 전체 상태 재구성). 현재 좌석만 행동.
- **연결 안정화(presence 기반 통합 driver `driveAutomation`)**:
  - **턴 타임아웃 + AI 대행**(30/60/120/무제한, on/off 토글) + 카운트다운.
  - **오프라인 좌석 즉시 AI 대행**(≈8초 감지) · **호스트 자동 위임**(호스트 이탈 시 접속 중 최저 좌석이 `rooms.host` 인수).
- **소셜**: **채팅**(미읽음 배지) · **관전 모드**(좌석 미점유 시 읽기전용) · **presence 표시**(좌석/패널 접속 점, 접속 수).
- **재게임/재접속**: 같은 인원 재게임(시드만 새로) · 재접속 자동복귀(방코드 localStorage).
- **빠른 매칭**: 공개방(`config.quick`) 자동 탐색→입장, 없으면 생성, 인원 차면 호스트 자동 시작. **2/3/4인 선택**.
- **전적/리더보드**: 온라인 종료 시 각 클라이언트가 `results`에 자기 결과 upsert(중복방지) → 클라이언트별 집계로 **글로벌 리더보드**(StatsScreen 탭).
- **운영 주의**: 익명·방코드 모델(서버측 규칙검증 없음), 방/메시지/presence row 미삭제(누적, TTL 정리 미구현), NEXT_PUBLIC 키 필요(설정 완료).

---

## 8b. 전적 / 통계 / 리더보드

- **로컬 전적**(기기, localStorage `lib/stats.ts`): 모든 모드(vs AI/핫시트/온라인) 종료 시 자동 기록(승패·명성·카드·귀족·턴), 시그니처 중복방지.
- **통계 화면**(`components/StatsScreen.tsx`, 메인 메뉴): "내 전적"(총게임/승률/최고점/모드별/최근기록/초기화) + "글로벌 리더보드"(서버, 메달·내 순위 강조).
- **글로벌 집계**(`lib/leaderboard.ts`): `results`를 클라이언트별로 묶어 승/판/승률/최고점 정렬.
- **정체성**: 계정 없이 clientId(기기) 기준 → 기기별 누적. 크로스기기 통합은 추후 로그인(Auth) 도입 시.

---

## 9. 테스트 / 검증 자동화

- **vitest**: `lib/engine/*.test.ts`(엣지케이스 PRD 11장 + 2~4인 **fuzz/AI 시뮬레이션 수천 판**, 불변식 검사), `store/*.test.ts`(되돌리기·리플레이·수동지불·속도·예약구매·전원AI 완주), `lib/stats.test.ts`(집계/중복방지).
- **Playwright 스크립트**(`scripts/`):
  - 반응형: `fold-test`(9뷰포트 overflow0·에러0+스크린샷).
  - 로컬: `interact-test`, `hover/drawer/howto-check`, `stats-ui-test`, `stats-record-test`, `tutorial-test`.
  - 온라인: `mp-test`(동기화+재게임), `reconnect-test`, `timeout-test`, `spectator-test`, `presence-test`(라이브), `failover-test`(오프라인 대행+호스트 위임), `quickmatch-test`, `quickmatch3-test`, `leaderboard-live-test`(라이브 완주→리더보드).
- **CLI**: `simulate.ts`(AI 풀게임 요약), `headtohead.ts`(난이도 승률).

---

## 10. 배포

- GitHub 개인 계정(`lovida8254/splendor`, SSH 별칭) → 푸시 시 **Vercel 자동 재배포**(`https://splendor-red.vercel.app`).
- Vercel 환경변수: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`(설정 완료). 없으면 온라인 버튼 숨김(로컬만).
- `prebuild`에서 에셋 매니페스트 자동 생성.

---

## 11. 디렉터리 맵 (요약)

```
app/            layout(메타/OG/PWA), page(라우팅), globals.css(테마)
lib/engine/     순수 게임 엔진 + 테스트
lib/ai/         휴리스틱 AI
lib/            supabase, stats, leaderboard, assets(자동생성), effects, flyTrigger, sound
store/          gameStore(로컬+온라인+채팅+presence+전적), flyStore, toastStore + 테스트
components/     UI 전체(위 표) + Chat, DockDrawer, StatsScreen, OnlineLobby, TutorialCoach
public/         cards/ nobles/ gem/ icons/ + background.webp og.png manifest sw.js
supabase/       splendor_schema.sql, chat_schema.sql, presence_schema.sql, results_schema.sql
scripts/        에셋/아이콘/OG 생성, 시뮬, Playwright 검증(온라인/반응형/전적 포함)
docs/           PRD, DEVLOG, 본 문서, 카드 프롬프트
art_src/        원본 이미지 백업(gitignore)
```

---

## 12. 알려진 한계 / 기술 부채

- 온라인: **서버측 규칙 검증 없음**(클라 신뢰 — 치팅 가능), 방/메시지/presence/results row 미삭제(TTL 정리 미구현), 폴링 1.2초 지연, 동시 append 희박한 경합 가능.
- 호스트 위임은 **접속 중인 다른 사람이 있을 때만** 동작(혼자 남으면 AI 좌석 진행 정지 가능).
- 전적/리더보드 정체성은 **기기(clientId) 단위** — 크로스기기 통합은 계정(Auth) 필요. 닉네임 중복 가능.
- 카드 일러스트는 레벨+색 공유(카드별 고유 아님).
- 빌드는 exFAT에서 로컬 불가(Vercel 의존). i18n 없음(한국어 전용), 접근성(키보드/스크린리더) 미흡.

---

## 13. 더 발전시킬 아이디어 (Backlog / Brainstorming)

### ✅ 완료됨 (2026-06-21)
- [x] 관전 모드 + presence(접속 표시) · 턴 타임아웃→AI 대행 · 오프라인 좌석 즉시 대행 · 호스트 자동 위임
- [x] 재접속 자동복귀 · 채팅 · 같은 인원 재게임 · OG 공유 이미지
- [x] 전적/통계(로컬) + 글로벌 리더보드(서버) · 빠른 매칭(2/3/4인)
- [x] 일반 스마트폰 반응형 최적화(카드 유동/높이 통일, 공급처 1줄)
- [x] **인터랙티브 튜토리얼**(1인 샌드박스 + 코치 오버레이 + 스포트라이트 + 행동 감지 자동진행)

### A. 온라인/소셜 강화 (남은 것)
- [ ] **서버측 규칙 검증**(Supabase Edge Function/RPC로 `append_action` 원자화 + 합법성 검사) → 부정행위 방지(가장 중요)
- [ ] **방/데이터 자동 정리**(만료 TTL cron) · 공개 방 목록/관전 링크 분리
- [ ] **채팅 고도화**: 이모트/퀵챗, 시스템 메시지(행동 로그→채팅), 관전자 채팅 구분, 욕설 필터
- [ ] **시즌/기간별 리더보드**, 닉네임 고정·프로필

### B. 게임성/모드
- [ ] **확장팩**(Cities/Orient/Trade Routes) 규칙 모듈
- [ ] **일일/주간 퍼즐**(고정 시드 최적 수 챌린지), 타임어택
- [ ] **튜토리얼/연습 모드**(단계별 가이드, 추천 수 힌트)
- [ ] **난이도 추가**: RL(self-play) 기반 고급 AI, 또는 MCTS
- [ ] **변형 룰 토글**(승점·인원·시드 지정), 핸디캡

### C. UX/접근성/표현
- [ ] **애니메이션 고도화**: 귀족 방문/승리 연출, 카드 구매 시 덱→손 트랜지션 정교화
- [ ] **사운드 팩**: 합성음 대신 고품질 효과음/BGM 토글, 볼륨 슬라이더
- [ ] **접근성**: 키보드 내비게이션, ARIA, 색맹 모드 강화(이미 색+모양+숫자), 폰트 크기
- [ ] **다국어(i18n)**: 영어 등, 문자열 추출
- [ ] **테마 선택**: 벨벳/네이비/라이트 등 사용자 선택
- [ ] **반응형 추가 최적화**: 태블릿/초대형 화면 레이아웃, 가로/세로 전환

### D. 메타/지속성
- [ ] **계정 로그인**(Supabase Auth) → 크로스기기 통합 전적/리더보드(현재는 기기 단위)
- [ ] **리플레이 공유**(시드+액션 로그 URL), 관전용 리플레이 뷰어
- [ ] **이어하기 강화**: 온라인 게임 영속(현재도 actions로 복원 가능), 진행 중 게임 목록

### E. 기술/품질
- [ ] **Edge Function**으로 액션 원자 append + 검증(경합/치팅 해결)
- [ ] **컴포넌트/E2E 테스트 확충**(RTL, Playwright 시나리오), CI(GitHub Actions)에서 typecheck+vitest
- [ ] **빌드 의존성 정리**(playwright/sharp를 빌드에서 분리), Lighthouse PWA/성능 점검
- [ ] **방 데이터 정리 작업**(cron으로 오래된 rooms/messages 삭제)
- [ ] **카드별 고유 일러스트**(90종) 또는 레벨×색 변형 다양화
- [ ] **TWA 패키징**으로 실제 APK(스토어 배포) — Android SDK 필요

### F. 빠른 효과 큰 후보 (우선순위 제안 — 갱신)
1. **서버측 액션 검증(Edge Function)** — 멀티 신뢰성/치팅 방지의 근본 해결(남은 최대 과제)
2. **계정 로그인** — 크로스기기 통합 전적/리더보드, 닉네임 고정
3. **방 데이터 TTL 정리** — 누적 방지(운영 위생)
4. **시즌 리더보드 / 리플레이 공유** — 재방문 동기
5. **튜토리얼 확장** — 토큰 한도·종료조건 등 심화 단계 추가(기본은 완료)
