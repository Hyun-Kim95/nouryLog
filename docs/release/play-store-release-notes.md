# Play Store 출시 노트 · 배포 기록

nouryLog Android(`com.nourylog.app`) **출시노트 문구**와 **실제로 올라간 빌드·커밋 범위**를 남기는 SSOT다.  
Play Console / EAS만 보면 문구·포함 작업이 레포에 남지 않으므로, **AAB를 만들거나 트랙에 올릴 때** 여기 항목을 추가·갱신한다.

관련: [play-store-phase0.md](./play-store-phase0.md) · 로컬 산출물 `apps/mobile/dist/` (gitignore 대상일 수 있음)

---

## 자동 기록 (기본)

`apps/mobile/scripts/docker-local-production-aab.sh` 가 AAB 성공 직후  
`apps/mobile/scripts/record-play-release-notes.sh` 를 호출한다.

| 자동 | 수동(HUMAN) |
|------|-------------|
| `semver`, `versionCode`, `gitHead`, `includesSince`, `artifact`, `buildHow`, 날짜 | Play 업로드 후 `track` / `playStatus` / `uploadedAt` |
| 포함 커밋 (`git log` since 직전 기록) | — |
| 출시 노트: `docs/release/pending-play-release-notes.txt` 가 있으면 그 문구 | 없으면 **커밋 subject 초안** → Play에 넣기 전 다듬기 권장 |
| sidecar: `apps/mobile/dist/nourylog-production.release.json` (`dist/`는 gitignore) | — |

같은 `versionCode`가 이미 있으면 마크다운은 건너뛰고 sidecar만 갱신한다.

**다음 출시 문구를 미리 쓰려면:**  
`pending-play-release-notes.txt.example` 를 `pending-play-release-notes.txt` 로 복사해 적어 둔다(빌드 전에).

수동 재실행 예:

```bash
bash apps/mobile/scripts/record-play-release-notes.sh --version-code 24 --aab apps/mobile/dist/nourylog-production.aab
# 또는 로그에서 versionCode 파싱:
bash apps/mobile/scripts/record-play-release-notes.sh --log /tmp/eas-production-aab.log
```

---

## 사용법 (수동 보완)

1. (자동이 안 돌았을 때만) 위 스크립트로 항목을 추가하거나, 아래 템플릿으로 맨 위(최신 먼저)에 추가한다.
2. Play Console에 넣은 최종 문구가 자동 초안과 다르면 해당 항목의 노트 블록을 **최종본으로 교체**한다.
3. 트랙·업로드 후 `track` / `playStatus` / `uploadedAt`을 HUMAN이 갱신한다.

### 항목 템플릿 (복사용)

```markdown
### YYYY-MM-DD — vX.Y.Z (versionCode N)

| 필드 | 값 |
|------|-----|
| semver | |
| versionCode | |
| gitHead | |
| includesSince | (직전 업로드 빌드 gitHead; 첫 항목이면 `—`) |
| artifact | `apps/mobile/dist/nourylog-production.aab` 또는 EAS URL |
| buildHow | `docker-local-production-aab` / EAS cloud |
| track | `internal` / `closed` / `open` / `production` / `미업로드` |
| playStatus | `draft` / `inReview` / `rolledOut` / `halted` / `미업로드` |
| uploadedAt | YYYY-MM-DD 또는 `—` |
| easBuildId | (있으면) |

**출시 노트 (Play Console에 넣은 문구)**

```
(여기에 붙여넣기)
```

**포함 작업 (사용자 체감 · 주요 커밋)**

- …
- `hash` — 커밋 한 줄 요약

**비고**

- …
```

---

## 기록 (최신 위)

### 2026-08-02 — v1.0.1 (versionCode 24)

| 필드 | 값 |
|------|-----|
| semver | `1.0.1` |
| versionCode | `24` |
| gitHead | `3a9840d` |
| includesSince | `544c68d` (EAS cloud production vc17, 2026-07-23; 그사이 remote versionCode는 23까지 증가된 상태였음) |
| artifact | `apps/mobile/dist/nourylog-production.aab` (~38.9 MB, 로컬 Docker) |
| buildHow | `apps/mobile/scripts/docker-local-production-aab.sh` (`eas build --profile production --local`) |
| track | `미업로드` (Play 업로드 시 HUMAN 갱신) |
| playStatus | `미업로드` |
| uploadedAt | `—` |
| easBuildId | 로컬 빌드 (cloud ID 없음) |

**출시 노트 (Play Console에 넣을 문구)**

```
• 식약처 음식 검색으로 영양·그램을 더 쉽게 채울 수 있어요
• 참고 1인분 칩으로 분량을 빠르게 적용할 수 있어요
• 0.1 단위로 분량을 조절할 수 있어요 (반 인분 등)
• OCR·과거 기록에서 섭취량(g)이 더 정확하게 채워져요
• 식사 수정 시 분량·단위가 덮어씌워지던 문제를 수정했어요
```

**포함 작업 (사용자 체감 · 주요 커밋)**  
`544c68d` 이후 ~ `3a9840d` (앱/서버 관련):

- `38c0836` — NutritionFood 참고 1인분 추천 칩 · SERVING_WT import
- `adc8cf9` — 분량 0.1~50 (0.1 단위) 클라·API 정합
- `646dca8` — 과거 기록 제안 · OCR 섭취 g 보정
- `30e7c4b` — NF 의도적 그램 표시 · 검색 힌트(defaultServingGrams)
- `d21a3fe` — 로그 이름 제안에서 템플릿 제외 등
- `544c68d` 자체는 **직전** EAS production에 이미 포함(분량 저장·수정 덮어쓰기 수정). 노트의 「식사 수정…」은 그 계열 UX 개선을 사용자 문구로 묶은 것.

**비고**

- 빌드 로그: `Incrementing versionCode from 23 to 24`.
- 로컬에 `2026-07-24`자 `nourylog-production.aab`가 있었으나, 당시 Play 출시노트·versionCode·업로드 여부는 **레포에 기록되지 않음**(아래 과거 항목 참고).
- Play 업로드 후 이 표의 `track` / `playStatus` / `uploadedAt`만 갱신하면 된다.

---

### 2026-07-23 — v1.0.1 (versionCode 17) — EAS cloud

| 필드 | 값 |
|------|-----|
| semver | `1.0.1` |
| versionCode | `17` |
| gitHead | `544c68d` |
| includesSince | `—` (이 문서 작성 전; 이전 업로드 범위 미기록) |
| artifact | EAS `2c802401-302d-4522-ac78-244bbd60726b` ([빌드](https://expo.dev/accounts/khyun9512/projects/mobile/builds/2c802401-302d-4522-ac78-244bbd60726b)) |
| buildHow | EAS cloud · profile `production` |
| track | **HUMAN 확인** (내부 테스트/프로덕션 여부 Play Console) |
| playStatus | **HUMAN 확인** |
| uploadedAt | **HUMAN 확인** |
| easBuildId | `2c802401-302d-4522-ac78-244bbd60726b` |

**출시 노트 (Play Console에 넣은 문구)**

```
(미기록 — 당시 레포 SSOT 없음. Play Console 해당 출시 상세에서 확인·여기에 붙여넣기)
```

**포함 작업 (추정 · gitHead 기준)**

- `544c68d` — 분량 저장 유지 · 수정 시 덮어쓰기 방지
- 그 이전 NutritionFood 검색 자동채움·g-only Phase 1.1 등은 동일 `1.0.1` 라인에 포함됐을 수 있으나, **어느 versionCode부터 스토어에 올랐는지는 미기록**

**비고**

- 같은 날 preview APK vc17(`d07da5da-…`)도 EAS에 있음(내부 배포용, 스토어 노트와 별개).
- vc18~23 사이 빌드/업로드 내역은 이 문서 작성 시점에 상세를 채우지 않음. 필요 시 `eas build:list` · Play Console로 보강.

---

## 과거 공백

| 구간 | 상태 |
|------|------|
| Play Console에 실제로 붙인 과거 「새로운 기능」문구 | **없음** (콘솔에서만 확인 가능 → 발견 시 위 항목에 소급 기재) |
| versionCode ↔ git SHA 전체 매핑 | **부분만** (EAS list + 이번 로컬 빌드 로그) |
| git tag | **미사용** |

소급 기입이 필요하면 Play Console 출시 상세 + `eas build:list --platform android` 결과를 보고 위 형식으로 추가한다.
