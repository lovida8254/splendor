# Splendor

보드게임 *Splendor*(Marc André)의 디지털 구현. Next.js 14 + TypeScript + Tailwind.
싱글플레이(vs AI)와 로컬 핫시트(2~4인)를 지원하며, 규칙은 `SPLENDOR_PRD.md`를 단일 기준으로 100% 재현한다.

## 빠른 시작

```bash
npm install
npm run dev        # http://localhost:3000
```

설정 화면에서 인원(2~4)과 각 좌석의 사람/AI(쉬움·보통·어려움)를 고르고 시작한다.
먼저 **15 명성점**에 도달하면 그 라운드를 끝까지 진행한 뒤 최고 점수자가 승리한다.

## 명령어

| 명령 | 설명 |
|---|---|
| `npm run dev` | 개발 서버 |
| `npm run typecheck` | TypeScript 검사 (`tsc --noEmit`) |
| `npm test` | 단위 테스트 + fuzz/AI 시뮬레이션 + 스토어 통합 |
| `npm run sim [games] [players]` | AI 풀게임 시뮬 요약 |
| `npx tsx scripts/headtohead.ts [games]` | AI 난이도 좌석교대 승률 비교 |
| `npm run build` | 프로덕션 빌드 (※ 아래 참고) |

## 구조

```
lib/engine/   순수 TS 게임 엔진 (규칙·검증·종료). UI 비의존, 결정적(RNG 주입).
lib/ai/       휴리스틱 AI (easy/normal/hard; hard는 3-ply 룩어헤드).
store/        Zustand 스토어 (엔진 래핑 + AI 자동진행 + 저장/이어하기).
components/   React UI (보드, 카드, 토큰, 귀족, 패널, 모달).
app/          Next.js App Router 엔트리.
data/         카드 90장 / 귀족 10장 시드.
scripts/      AI 시뮬레이션·밸런스 CLI.
```

## 품질 보증

규칙 정확도는 `lib/engine/simulation.test.ts`의 fuzz 하니스로 검증한다 — 랜덤·AI 정책으로
2~4인 게임 수천 판을 완주시키며 매 턴 불변식(토큰·카드 보존, 10개 한도, 음수 금지,
종료/승자 규칙)을 검사한다. AI 난이도 순서(easy < normal < hard)는 좌석교대 승률로 확인된다.

## 📱 Android / 갤럭시 폴드 (설치형 PWA)

이 앱은 **설치형 PWA**라 별도 APK 없이 안드로이드에 앱처럼 설치된다. 갤럭시 폴드의
커버 화면(좁음 ~280–360px)과 펼친 내부 화면(넓음 ~768–900px) 양쪽에 맞춰 반응형 최적화되어 있고,
디스플레이 컷아웃/힌지 안전영역(safe-area)도 처리한다. 오프라인 실행도 지원(서비스워커).

### 폴드에 설치하는 법
1. PWA를 **HTTPS로 호스팅**한다 (설치/오프라인은 보안 컨텍스트 필요). 가장 쉬운 방법은 Vercel/Netlify에
   `out/` 폴더를 정적 배포하는 것 (아래 빌드 참고). 배포하면 `https://...` 주소가 나온다.
2. 갤럭시 폴드의 **Chrome**으로 그 주소를 연다.
3. 주소창 메뉴 → **앱 설치 / 홈 화면에 추가** → 홈 화면 아이콘으로 전체화면 실행.

> 같은 와이파이의 PC에서 `npm run serve`로 로컬 미리보기는 가능하지만(`http://<PC-IP>:3002`),
> 안드로이드 Chrome은 보안 컨텍스트(HTTPS 또는 localhost)에서만 "설치"를 허용하므로
> **설치/오프라인까지 쓰려면 HTTPS 배포가 필요**하다. (브라우저 실행만이면 LAN으로도 됨.)

### 정적 빌드(`out/`) 만들기
`output: 'export'`로 정적 번들을 생성한다. **단, exFAT(`V:`)에서는 `next build`가 실패**하므로
NTFS 경로(`C:\`)에서 빌드한다:

```bash
# 1) 소스를 C:로 복사 (node_modules/.next 제외)
robocopy V:\00_Projects_game\SPLENDOR C:\dev\splendor /E /XD node_modules .next screenshots .git
# 2) C:에서 빌드
cd C:\dev\splendor && npm install && npm run build   # -> C:\dev\splendor\out
```

`out/` 안에 `index.html`, `manifest.webmanifest`, `sw.js`, `icons/`가 모두 포함된다.
이 폴더를 정적 호스트(Vercel 등)에 올리면 끝. (현재 빌드본은 프로젝트 `out/`에 복사되어 있음.)

### 폴드 레이아웃 자동 검증
`npm run fold-test` — Playwright로 커버(280/344)·펼침(768/884)·데스크톱(1280) 뷰포트에서
게임을 시작해 **가로 오버플로 0 / 콘솔 에러 0**을 확인하고 `screenshots/`에 스크린샷을 남긴다.
(`npm run serve`로 `out/`를 띄운 뒤 `BASE_URL=http://localhost:3002 npm run fold-test` 권장.)

## 빌드 / 배포 참고 (exFAT)

이 저장소가 exFAT 드라이브(`V:`)에 있으면 로컬 `next build`가 `EISDIR readlink`로 실패한다.
이는 파일시스템 한계이며 코드 문제가 아니다. **프로덕션 빌드는 Vercel/CI(Linux)에 위임**한다.
로컬 검증은 `npm run typecheck` + `npm test` + `npm run dev`로 충분하다.
```
