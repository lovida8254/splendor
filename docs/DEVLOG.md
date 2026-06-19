# 개발 로그 (DEVLOG)

> Splendor 디지털 구현 프로젝트의 작업 기록. 최신 항목이 위로 오도록 작성.

---

## 2026-06-20 — MVP 구현 + 설치형 PWA + 갤럭시 폴드 최적화 + 배포

### 요약
기획/프로토타입 단계였던 프로젝트를 **플레이 가능한 MVP**로 끌어올렸다. PRD를 단일 기준으로
순수 TS 엔진 → React UI → 휴리스틱 AI → 설치형 PWA(갤럭시 폴드 최적화) 순서로 구현하고,
각 단계를 자동 테스트로 검증했다. 개인 GitHub 계정에 public 저장소로 푸시 완료.

저장소: https://github.com/lovida8254/splendor (public)

### 구현 범위 (PRD 로드맵 기준)
- **P1 엔진** ✅ — `lib/engine/`
- **P2 핫시트 UI** ✅ — `components/`, `app/`, `store/`
- **P3 AI 상대** ✅ — `lib/ai/`
- **(추가) 설치형 PWA + 갤럭시 폴드 최적화** ✅
- P4(온라인/영속 고도화), P5(폴리시)는 미진행 → 백로그

### 1. 게임 엔진 (`lib/engine/`)
- 순수 함수형. `applyAction(state, action, rng) → newState`. React/DOM 비의존, RNG(`mulberry32`) 주입으로 결정적.
- 파일: `types.ts`(데이터모델·액션), `util.ts`, `data.ts`(시드 로드+무결성 검증), `setup.ts`(newGame, 인원별 셋업),
  `payment.ts`(deficit/canAfford/autoPayment/validatePayment), `nobles.ts`, `actions.ts`(validate+applyAction+턴 파이프라인+승자),
  `moves.ts`(합법수 열거 + autoDiscard).
- 턴 종료 파이프라인: **토큰 한도(discard) → 귀족 판정(단일 자동/다중 선택) → 종료판정 → 턴 진행**.
  대기 상태는 `pendingDiscard` / `pendingNoble`로 표현.
- 액션: `TAKE_THREE`/`TAKE_TWO`/`RESERVE`/`PURCHASE`/`DISCARD_TOKENS`/`CHOOSE_NOBLE`/`PASS`.
- 규칙 충실 구현: TAKE_TWO 4개↑ 조건, TAKE_THREE 가용색 미만 처리, 예약 골드 선택성·3장 한도,
  보너스 우선 상쇄+골드 충당, 10토큰 한도(보너스 제외), 귀족 턴당 1명, 15점 후 라운드 종료·동점시 카드 적은 쪽.

### 2. AI (`lib/ai/ai.ts`)
- easy/normal/hard. 공통 평가함수(baseEval: 명성·엔진·귀족진척·토큰경제·보드근접도).
- easy는 myopicEval(계획성 제거) + 노이즈, normal은 baseEval 1-ply, **hard는 3-ply 그리디 룩어헤드**(내 수→상대 최선→내 후속).
- 좌석교대 승률(각 120판): hard>normal **74.2%**, normal>easy **89.2%**, hard>easy **86.7%** → 난이도 단조 확인.

### 3. UI (`components/`, `store/`, `app/`)
- Next.js 14 App Router + Tailwind + Zustand + lucide-react. 르네상스 벨벳+골드 테마(데모 개선).
- 셋업 화면(인원/좌석 사람·AI·난이도), 게임 보드(귀족·3×4 카드·토큰뱅크·플레이어 패널·로그),
  반환/귀족선택/종료 모달. AI 자동진행(setTimeout), localStorage 저장/이어하기.
- 색맹 대응: 색+아이콘+글자라벨 병기. 불가능한 행동은 비활성+사유 툴팁.

### 4. 설치형 PWA + 갤럭시 폴드
- `output: 'export'` 정적 번들. `public/manifest.webmanifest`(standalone), `public/sw.js`(오프라인 런타임 캐시),
  `components/PWARegister.tsx`. 아이콘은 `scripts/gen-icons.ts`(sharp, SVG→PNG 192/512/maskable).
- 폴드 반응형: 커버(~280–360px) 단일컬럼+카드행 가로스크롤, 펼침(~768–900px) 2컬럼 보드+사이드바.
  `safe-area` 인셋, `100dvh`, 폴드 분할 미디어쿼리.

### 검증 (코딩→테스트→오류검증→수정→테스트 반복)
- `tsc --noEmit` 클린.
- **vitest 39/39 통과**: 엔진 엣지케이스(PRD 11장) + fuzz/AI 시뮬레이션(2~4인 수천 판 완주하며 매 턴 불변식
  검사: 토큰·카드 보존, 10한도, 음수 금지, 종료/승자) + 스토어 통합(전원 AI 게임 스케줄러 완주, 사람 조작).
- **Playwright 폴드 뷰포트 5/5 통과**(프로덕션 빌드 대상, 280·344·768·884·1280): 가로 오버플로 0 / 콘솔 에러 0.
  스크린샷 `screenshots/`.
- 프로덕션 정적 빌드 성공(C:\ NTFS에서). `out/` 번들에 index/manifest/sw/icons 포함 확인.

### 반복 중 발견·수정한 버그
1. **데드락**: 토큰 고갈+예약 3장+구매불가 시 합법수 0 → fuzz 시뮬이 검출. 규칙대로 강제 `PASS` 추가.
2. **AI 난이도 역전**: hard가 normal에 패배(좌석교대로 확인). 룩어헤드를 raw 평가값으로 잘못 스케일한 것이 원인 →
   3-ply 재설계로 단조 정렬 회복.
3. **dev 서버 교착**: `.next`를 공유한 dev 인스턴스 2개가 exFAT에서 컴파일 교착 → 단일 인스턴스로 정리.
4. dev 전용 하이드레이션 경고는 프로덕션 빌드에서 사라짐을 확인(번들 깨끗).

### 환경/제약 메모
- 프로젝트가 exFAT(`V:`)에 있어 `next build`는 로컬에서 실패(EISDIR). **프로덕션 빌드는 `C:\`로 복사 후 수행**(README 참고).
  로컬 무결성은 typecheck + vitest + `next dev` + `fold-test`로 보장.
- 이 PC엔 Android 빌드 툴체인(JDK/SDK/Gradle) 미설치 → APK 대신 **PWA**로 결정.

### 배포
- 개인 계정(`lovida8254`)으로 커밋·푸시. SSH 별칭 origin(`git@github.com-personal:...`). 저장소 public.
- Vercel은 사용자가 import 예정. Next.js 자동 인식 + `output:'export'` 정적 서빙. (선택) `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1`로 빌드 가속.

---

## 다음에 진행할 개선사항 (Backlog)

### 게임플레이 / 규칙 UX
- [ ] **수동 지불 플랜 UI** — 현재 골드 자동 충당. 어떤 토큰/골드로 낼지 사용자가 선택(PRD 6.4 옵션).
- [ ] **되돌리기/리플레이** — `log` 기반 undo, 판 전체 리플레이.
- [ ] 행동 미리보기 강화(토큰 이동/구매 후 변화 프리뷰 애니메이션).

### AI
- [ ] hard 추가 강화(깊은 탐색/가지치기) 또는 self-play 기반 고난도.
- [ ] AI 의사결정 속도/딜레이 튜닝, 사고과정 힌트 표시(옵션).

### 접근성 / i18n
- [ ] 키보드 내비게이션, ARIA 라벨 보강, 스크린리더 대응.
- [ ] 다국어(현재 한국어 전용) — 영어 등.

### 영속/온라인 (PRD P4)
- [ ] 저장 포맷에 시드+액션로그 저장으로 **정확 재현 가능한 이어하기**(현재 재개 시 AI는 새 RNG 사용).
- [ ] Supabase 기반 온라인 멀티 + 관전/리플레이 공유 (RLS 필수).

### 폴리시 (PRD P5)
- [ ] 토큰 이동/카드 획득 애니메이션, 사운드, 튜토리얼, 통계 대시보드.
- [ ] 카드/귀족 일러스트(현재 색·숫자 기반 미니멀).

### 빌드/배포/품질
- [ ] Vercel 빌드 최적화: `playwright`/`sharp`/`tsx` 등 도구 의존성을 빌드에서 분리(설치형 PWA에는 불필요).
- [ ] 컴포넌트/RTL 단위테스트 + 실제 게임 플로우 e2e(Playwright) 추가.
- [ ] (원하면) PWA를 TWA로 감싼 실제 APK 빌드 — 단, Android SDK 툴체인 설치 필요.
- [ ] Lighthouse PWA/성능 점검 및 개선.
