# 스플렌더 카드 **배경 이미지** 생성 프롬프트

> **목적**: 개발 카드의 *배경 일러스트*만 생성하기 위한 프롬프트 모음.
> 보석 아이콘 · 명성 점수 · 비용 표시는 코드에서 오버레이하므로 **배경에는 글자/숫자/보석 아이콘을 넣지 않습니다.**
> **타입 구분**: 스플렌더 카드는 **레벨(3) × 보너스 색(5) = 15종**으로 나뉩니다. 여기에 카드 뒷면(3종)과 귀족 타일 배경을 더했습니다.

---

## 0. 사용 가이드

- **조합 방식**: 아래 `BASE 스타일 블록` + `타입별 SCENE 한 줄`을 이어 붙이면 완성 프롬프트가 됩니다. (4장에 조립 예시 포함)
- **안전 영역(가장 중요)**: 오버레이가 들어갈 자리는 배경을 비워둬야 가독성이 삽니다.
  - 좌상단 = 명성 점수 / 우상단 = 보너스 보석 / 좌하단~하단 = 비용 표시
  - → 프롬프트에 "상단 양 모서리와 하단 영역은 어둡고 디테일 없이" 지시를 포함했습니다.
- **비율**: 카드이므로 세로형 **2:3** (예: 832×1216, 1024×1536). 
- **카드별 변형**: 한 타입 안에 카드가 여러 장(예: L1 검정 8장)이므로, `seed`를 바꾸고 4장의 `변형 모디파이어` 중 하나를 끼워 넣으면 카드마다 다른 그림이 나옵니다.
- **언어**: 프롬프트 본문은 영어 권장(모델 성능 안정). FLUX / SDXL / Midjourney / DALL·E 공통으로 동작합니다.

---

## 1. BASE 스타일 블록 (모든 프롬프트에 공통으로 붙임)

```
[STYLE]
Richly detailed painterly illustration in a Renaissance Flemish oil-painting style,
ornamental and luxurious, warm cinematic chiaroscuro lighting, deep atmospheric
shadows, museum-quality fine art, subtle canvas texture, elegant and timeless.

[COMPOSITION / SAFE AREAS]
Portrait composition with a strong central vignette; the four corners and the entire
top edge fade into dark, quiet, low-detail negative space; the upper-left and
upper-right corners are deliberately empty and clean; the bottom strip is darkened
and uncluttered; main subject sits in the lower-center, leaving calm space around the
edges for overlaid icons. No frame, no border.
```

```
[NEGATIVE PROMPT]  (SD/FLUX의 negative 칸, 또는 Midjourney --no 로)
text, letters, numbers, typography, watermark, signature, logo, UI, frame, border,
card border, ornate gold frame, gemstone icons, jewels in corners, people staring at
camera, modern objects, low quality, blurry, oversaturated, cluttered corners
```

> 보석/숫자/아이콘을 배경에 그리지 않도록 negative에 `gemstone icons, numbers, text`를 반드시 유지하세요.

---

## 2. 레벨별 장면 테마 (SCENE의 "무엇을" 결정)

| 레벨 | 테마 | 핵심 소재 |
|---|---|---|
| **Level 1 (•)** | *원석 채굴* — 소박하고 흙내음 | 광산 갱도, 곡괭이질하는 광부, 동굴 벽의 원석 광맥, 광차, 횃불, 거친 미가공 보석 |
| **Level 2 (••)** | *세공과 교역* — 분주한 중간 부 | 보석 세공 공방, 상인 캐러밴, 항구의 무역선, 시장 좌판, 저울과 연장, 연마 중인 보석 |
| **Level 3 (•••)** | *영화와 권력* — 호화롭고 극적 | 왕실 보물고, 금세공 진열, 대상인의 궁전 내부, 금고와 촛대, 완성된 보석 장신구, 대리석과 금 |

조명도 단계별로 강하게: L1 횃불·촛불의 어둑함 → L2 따뜻한 주광/등불 → L3 드라마틱한 명암 대비.

---

## 3. 보석 색 팔레트 (SCENE의 "색조"를 결정)

| 색 | 보석 | 팔레트 키워드 |
|---|---|---|
| **white** | Diamond | icy clear crystal, silver-white, cool platinum highlights, frosty light |
| **blue** | Sapphire | deep royal blue, cobalt, midnight indigo, cool moonlit glow |
| **green** | Emerald | verdant deep green, malachite, mossy tones, lush emerald light |
| **red** | Ruby | crimson and deep wine-red, warm garnet glow, firelit highlights |
| **black** | Onyx | obsidian black, charcoal and smoke, subtle violet-silver sheen |

---

## 4. 타입별 프롬프트 (레벨 × 색 = 15종)

> 각 항목은 **SCENE 한 줄**입니다. `BASE 스타일 블록`과 이어 붙여 쓰세요.
> 형식: `[SCENE]` = 장면 + 색 팔레트 + "보석 박힌 광맥/완성 보석은 배경 요소로만, 클로즈업 금지".

### ◾ Level 1 — 원석 채굴

- **L1 · White (Diamond)**
  `An old candlelit diamond mine tunnel, a lone miner chipping rough clear crystals from a pale rock vein, icy silver-white glints in cold stone, frosty cool light, humble and atmospheric.`
- **L1 · Blue (Sapphire)**
  `A deep cavern with veins of raw sapphire in the rock, a miner with a torch, cobalt and midnight-indigo reflections on wet stone walls, cool moonlit blue glow.`
- **L1 · Green (Emerald)**
  `A mossy underground quarry where rough emerald crystals grow from cracked stone, dripping water, lush deep-green light filtering through, an ore cart in shadow.`
- **L1 · Red (Ruby)**
  `A torchlit mine shaft with raw ruby crystals embedded in dark rock, warm crimson and garnet glow from the firelight, a miner's silhouette, smoky air.`
- **L1 · Black (Onyx)**
  `A dim obsidian quarry, slabs of polished black onyx and charcoal stone, faint violet-silver sheen catching torchlight, heavy shadow, austere and quiet.`

### ◾ Level 2 — 세공과 교역

- **L2 · White (Diamond)**
  `A Renaissance gem-cutter's workshop, an artisan polishing a clear diamond at a workbench with tiny tools, platinum-white sparkle, cool daylight from a tall window.`
- **L2 · Blue (Sapphire)**
  `A merchant trading hall at dusk, scales and velvet pouches of sapphires on a table, deep cobalt drapery, indigo evening light through arched windows.`
- **L2 · Green (Emerald)**
  `A bustling spice-and-gem market stall, crates of polished emeralds, malachite bowls, lush green awnings, warm afternoon light, distant caravan.`
- **L2 · Red (Ruby)**
  `A harbor warehouse of an overseas trading company, a wooden ship beyond the doorway, chests of cut rubies glowing crimson by lantern light, wine-red sails.`
- **L2 · Black (Onyx)**
  `A craftsman's atelier inlaying onyx into a casket, dark workbench, charcoal and obsidian materials, a single warm lamp, subtle violet sheen on black stone.`

### ◾ Level 3 — 영화와 권력

- **L3 · White (Diamond)**
  `An opulent royal treasury vault of white marble and silver, a grand diamond-set crown on a velvet cushion catching brilliant platinum light, dramatic chiaroscuro, candelabra.`
- **L3 · Blue (Sapphire)**
  `A lavish merchant-prince palace hall draped in royal blue and gold, sapphire-encrusted regalia on display, cobalt shadows, dramatic single-source lighting, marble columns.`
- **L3 · Green (Emerald)**
  `A grand ornate gallery with emerald-and-gold jewelry on dark velvet, malachite pillars, deep verdant ambiance, gilded candlelight, sumptuous and theatrical.`
- **L3 · Red (Ruby)**
  `A regal vault interior bathed in firelight, a ruby-and-gold necklace on a pedestal, crimson silk and gilded ornament, deep wine-red shadows, baroque opulence.`
- **L3 · Black (Onyx)**
  `An imposing dark treasury of obsidian and gold, a magnificent onyx-and-silver scepter under a single dramatic beam of light, charcoal shadow with violet-silver edge, austere grandeur.`

---

## 5. 조립 예시 (그대로 복사해서 사용)

### 예시 A — Level 1 · Red (Ruby)
```
Richly detailed painterly illustration in a Renaissance Flemish oil-painting style,
ornamental and luxurious, warm cinematic chiaroscuro lighting, deep atmospheric shadows,
museum-quality fine art, subtle canvas texture.
A torchlit mine shaft with raw ruby crystals embedded in dark rock, warm crimson and
garnet glow from the firelight, a miner's silhouette, smoky air.
Portrait composition with a strong central vignette; the four corners and the entire top
edge fade into dark, quiet, low-detail negative space; the upper-left and upper-right
corners are deliberately empty and clean; the bottom strip is darkened and uncluttered;
main subject in the lower-center. No frame, no border.
--ar 2:3 --style raw
Negative: text, letters, numbers, typography, watermark, logo, UI, frame, border,
gemstone icons, jewels in corners, modern objects, blurry, cluttered corners
```

### 예시 B — Level 3 · Blue (Sapphire)
```
Richly detailed painterly illustration in a Renaissance Flemish oil-painting style,
ornamental and luxurious, warm cinematic chiaroscuro lighting, deep atmospheric shadows,
museum-quality fine art, subtle canvas texture.
A lavish merchant-prince palace hall draped in royal blue and gold, sapphire-encrusted
regalia on display, cobalt shadows, dramatic single-source lighting, marble columns.
Portrait composition with a strong central vignette; the four corners and the entire top
edge fade into dark, quiet, low-detail negative space; upper-left and upper-right corners
empty and clean; bottom strip darkened and uncluttered; subject in the lower-center.
No frame, no border.
--ar 2:3 --style raw
Negative: text, letters, numbers, typography, watermark, logo, UI, frame, border,
gemstone icons, jewels in corners, modern objects, blurry, cluttered corners
```

---

## 6. 카드 변형 모디파이어 (같은 타입 내 카드별 다양화)

한 타입 안에서 카드마다 다른 그림이 필요하면 SCENE 끝에 아래 중 하나를 추가하고 `seed`를 바꾸세요:

```
, viewed from a low angle
, seen through an archway
, wide establishing shot
, intimate close framing of the workspace
, with drifting dust motes in the light
, with a distant figure in the background
, slightly different time of day, cooler light
, slightly different time of day, warmer light
```

---

## 7. 카드 뒷면 (Card Back) — 레벨 3종

> 뒷면은 보석·인물 없이 **문장(emblem) + 패턴 + 레벨 도트**만. (도트도 코드 오버레이라면 negative에 포함)

- **Back · Level 1**
  `Ornate card back, dark slate-green background, embossed Renaissance damask pattern, a single bronze gem-merchant emblem centered, subtle vignette, symmetrical, elegant, muted.`
- **Back · Level 2**
  `Ornate card back, deep burgundy background, richer gold damask filigree, a refined gem-merchant emblem centered, soft metallic sheen, symmetrical, balanced.`
- **Back · Level 3**
  `Ornate card back, near-black background with royal purple undertone, lavish gold baroque filigree, an ornate gem-merchant crest centered, luminous gilt accents, symmetrical, opulent.`

공통 negative: `text, numbers, level dots, pips, gemstone icons, asymmetry, watermark, photo`

---

## 8. 귀족 타일 배경 (선택, 정사각형 권장 1:1)

> 귀족 타일은 명성 3점 + 요구 보석만 오버레이. 배경은 르네상스 귀족 초상 분위기로.

- **Noble tile background**
  `Renaissance noble portrait setting, an opulent gilded interior with brocade tapestry and marble, warm museum-painting chiaroscuro, regal and dignified, empty center-right space for an overlaid portrait medallion, no face in the empty zone.`
  - 변형: 인물 실루엣을 넣고 싶으면 `, a dignified Renaissance aristocrat in rich robes, three-quarter view` 추가.
  - negative: `text, numbers, gemstone icons, modern clothing, watermark, frame`

---

## 9. 모델별 파라미터 메모

| 모델 | 권장 설정 |
|---|---|
| **Midjourney** | `--ar 2:3 --style raw --stylize 200` / 뒷면·귀족은 `--ar 1:1`. 일관성은 `--sref <같은 참조 이미지>` 또는 `--seed 고정` |
| **FLUX.1 (schnell/dev)** | 1024×1536, guidance 3.5~5, 자연어 프롬프트 그대로. negative는 프롬프트에 자연어로 녹이거나 별도 지원 시 사용 |
| **SDXL / Realistic Vision** | 832×1216, steps 30~40, CFG 6~8, sampler DPM++ 2M Karras, **Negative 칸에 7장 negative 입력**, 일관성은 seed 고정 + 동일 style 토큰 |

**일관성 팁**: 15종 전체를 같은 `seed` 계열 + 동일 `[STYLE]` 문장으로 뽑으면 한 세트처럼 보입니다. 레벨별로 명도(어둠→밝음), 색별로 색조만 달라지도록 위 팔레트를 고정하세요.

---

*끝. 배경만 생성 → 코드에서 좌상단 점수 · 우상단 보석 · 하단 비용을 오버레이하면 카드가 완성됩니다.*
