# CLAUDE.md

스플렌더(Splendor) 보드게임의 디지털 구현 프로젝트. 이 파일은 Claude Code가 이 저장소에서 작업할 때 따라야 할 지침이다.

## 프로젝트 현재 상태

플레이 가능한 MVP 완성 (P1 엔진 + P2 핫시트 UI + P3 AI). Next.js 14 앱으로 구현됨.

핵심 구조:
- `lib/engine/` — **순수 TS 게임 엔진** (UI 비의존, `applyAction(state, action, rng) → newState`). 모든 규칙·검증·종료 로직.
- `lib/ai/ai.ts` — 휴리스틱 AI (easy/normal/hard). hard는 3-ply 그리디 룩어헤드.
- `store/gameStore.ts` — Zustand 스토어. 엔진 래핑 + AI 자동 진행(setTimeout) + 토큰 선택 UI 상태 + localStorage 저장/이어하기.
- `components/`, `app/` — React/Tailwind UI (셋업 화면 + 게임 보드 + 모달들).
- `data/cards.json`, `data/nobles.json` — 엔진이 import하는 시드(루트의 동명 파일이 원본 소스).
- `scripts/simulate.ts`, `scripts/headtohead.ts` — AI 시뮬/밸런스 측정용 CLI.

기준 문서:
- `SPLENDOR_PRD.md` — **단일 진실 공급원(SSOT)**. 규칙·데이터모델·검증로직·로드맵. 규칙 변경/구현 시 항상 이 문서 기준.
- `splendor_demo.html` — 초기 단일파일 프로토타입(참조용, 빌드 비포함).

### PWA / 갤럭시 폴드 (Android 배포)
APK 대신 **설치형 PWA**로 안드로이드 배포. `output: 'export'` 정적 번들(`out/`) + `public/manifest.webmanifest` + `public/sw.js`(오프라인 런타임 캐시) + `components/PWARegister.tsx`. 아이콘은 `npm run icons`(sharp로 SVG→PNG). 레이아웃은 폴드 커버(~280–360px)/펼침(~768–900px) 반응형 + safe-area. **`next build`는 exFAT(`V:`)에서 실패하므로 `C:\`로 복사 후 빌드**(README 참고). 폴드 레이아웃은 `npm run fold-test`(Playwright, 가로 오버플로 0 검증)로 회귀 확인.

### 개발 명령어
- `npm run dev` — 개발 서버 (exFAT에서 정상). `.next/trace` EPERM 경고는 exFAT 탓, 무해.
- `npm run typecheck` — `tsc --noEmit`.
- `npm test` — vitest (엔진 엣지케이스 + 수천 판 fuzz/AI 시뮬레이션 + 스토어 통합).
- `npm run sim [games] [players]` / `npx tsx scripts/headtohead.ts [games]` — AI 검증.
- `npm run build` — **로컬 exFAT에서 실패**(아래 참고). Vercel/CI에서 검증.

### 테스트 전략 (자동 검증의 핵심)
규칙 무결성은 `lib/engine/simulation.test.ts`의 fuzz 하니스로 보장한다: 랜덤·AI 정책으로 2~4인 게임 수천 판을 완주시키며 매 턴 불변식(토큰/카드 보존, 한도, 음수 금지, 종료/승자 규칙)을 검사. 엔진 로직을 바꾸면 이 테스트가 회귀를 잡는다.

## 핵심 규칙: PRD가 기준이다

이 게임은 규칙 정확도가 100%여야 한다. 어떤 게임 로직을 작성/수정하든:

1. `SPLENDOR_PRD.md` **2장(규칙 명세)**, **6장(검증·처리 로직)**, **11장(엣지 케이스)**을 기준으로 검증한다.
2. 규칙 해석이 모호하면 추측하지 말고 PRD 해당 절을 인용해 확인한다.
3. 자주 틀리는 엣지 케이스(PRD 11장):
   - TAKE_TWO: 해당 색 토큰이 **4개 이상**일 때만 가능(3개면 불가).
   - TAKE_THREE: 잔여 색이 3종 미만이면 가능한 만큼만.
   - RESERVE: 골드 0개여도 예약 가능(골드만 미지급), 예약은 최대 3장.
   - PURCHASE: 카드 보너스가 비용을 먼저 상쇄, 부족분만 토큰, 그래도 부족하면 골드로 충당. 골드는 필요분만 사용.
   - 토큰 한도 10개(골드 포함, 카드 보너스는 제외).
   - 귀족 다중 충족 시 턴당 1명만 선택.
   - 15점 도달 후에도 **현재 라운드 끝까지** 진행, 동점 시 구매 카드 수가 적은 쪽 승리.

## 데이터 무결성

`cards.json` / `nobles.json` 수정 시 다음 불변식을 유지(PRD 10장):
- Level1=40, Level2=30, Level3=20 (합 90), 귀족 10장.
- 모든 카드 `bonus`는 5색(white/blue/green/red/black) 중 하나, `prestige`는 0~5.
- 모든 귀족 `prestige === 3`.
- 비용/요구치 맵에 `gold` 키 없음(비용·귀족 요구치에 골드는 존재하지 않음).

## 아키텍처 원칙 (구현됨)

PRD 4장 스택을 따름: Next.js 14 (App Router), TypeScript, Tailwind, Zustand, Vercel 배포.
- **게임 엔진(`lib/engine`)은 순수 함수** — React/DOM 비의존. 랜덤은 RNG 주입(`mulberry32` 시드)으로 결정적. `applyAction(state, action, rng) → newState`.
- 모든 행동: `validate(state, action)` 통과 후 `applyAction`이 적용(내부에서 재검증). UI는 `validate`로 불가능한 버튼을 미리 비활성화하고 사유를 툴팁으로 노출.
- 턴 종료 파이프라인: 토큰 한도(discard) → 귀족 판정(단일 자동/다중 선택) → 종료판정/턴 진행. discard·noble은 `pendingDiscard`/`pendingNoble`로 대기 상태를 표현.
- 액션 타입: `TAKE_THREE`/`TAKE_TWO`/`RESERVE`/`PURCHASE`/`DISCARD_TOKENS`/`CHOOSE_NOBLE`/`PASS`. (`PASS`는 합법 수가 전혀 없을 때만 허용되는 강제 패스.)
- 데이터 모델·액션 타입은 PRD 5장 기준(`lib/engine/types.ts`).

## 작업 시 주의 (전역 가이드라인에서)

- **이모티콘 텍스트 금지**: UI에서 ⚡🛡️ 등 텍스트 이모지 사용 금지. React에서는 `lucide-react` 아이콘 사용. (단, 게임 색상 표현은 색+아이콘+라벨 병기로 색맹 대응 — PRD 8장.)
- **exFAT/V: 드라이브 주의**: 이 프로젝트는 exFAT 외장 SSD에 있다. `next build` 프로덕션 빌드가 `EISDIR -4068 readlink` 에러로 실패할 수 있다. 이 에러를 보면 즉시 exFAT 한계로 진단하고, 프로덕션 빌드 검증은 Vercel/CI에 위임한다. (`next dev`, `tsc`, `vite`, 일반 파일 작업은 영향 없음.)

## 프로토타입 참고

`splendor_demo.html`은 빌드 없이 브라우저로 바로 열어 동작을 확인할 수 있다. 정식 엔진을 작성할 때 이 파일의 로직(`newGame`, `deficit`/`canAfford`/`payFor`, `eligibleNobles`, `aiTurn` 등)을 참조 구현으로 삼되, PRD를 최종 기준으로 검증한다.
