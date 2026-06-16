---
type: prd
project: dietManagement
status: approved
owner: product
updated_at: 2026-06-03
tags: [requirements, prd, ai, rag, ollama, pgvector, error-handling]
supersedes_partial: []
aligns_with:
  - docs/requirements/feature-diet-management-app-prd.md
  - docs/requirements/api-contract-v1.10-stats-six-bucket-delta.md
  - docs/requirements/feature-recommendation-v14-prd.md
  - docs/legal/terms.md
  - docs/legal/privacy.md
---

# AI 식단 분석·영양 지식 RAG 확장 PRD (초안)

> **Deprecated (2026-06-15):** 본 PRD의 RAG·LLM·`/me/ai/*` 범위는 **식단 인사이트**로 대체되었습니다.  
> 현행 계약: [`api-contract-v1.14-insights-delta.md`](api-contract-v1.14-insights-delta.md) — SQL·규칙 기반 `/me/insights/*` only.  
> **2026-06-16:** `apps/user-web` 제거. 소비자 UI SSOT는 `apps/mobile`.

## 1) 문서 목적

- nouryLog에 **OCR → 구조화 저장 → 통계 → RAG → 개인화 분석** 파이프라인을 추가한다.
- 단순 챗봇이 아니라, **DB 집계 결과를 근거(citation)로 제시**하는 AI 식단 분석 기능의 범위·정책·API·배포 전략을 Gate 1 수준으로 정의한다.
- 구현 순서: **(1) 본 PRD·계약 승인 → (2) 로컬 docker-compose → (3) nouryLog MVP**.

## 2) 제품 목표

| 목표 | 설명 |
|------|------|
| 구조화된 기록 활용 | 기존 `Meal`·`Stats`·OCR 결과를 AI 입력의 **진실(source of truth)** 로 사용 |
| 근거 있는 답변 | “최근 단백질 부족해?” 등 질문에 **날짜·음식·수치**를 citation으로 표시 |
| 하이브리드 분석 | 수치/기간 질문은 **SQL 집계**, 지식/맥락 질문은 **벡터 RAG** |
| 주간 리포트 | 기간별 섭취·목표 대비 요약을 자동 생성(템플릿 fallback 포함) |
| OCR 학습 루프 | 사용자 수정 diff를 저장해 파서·검색 품질 개선 |
| 로컬 LLM 데모 | Ollama + **Postgres pgvector**로 **API 비용 0원** 실험 (Chroma **미사용**) |

## 3) 대상 사용자

- **일반 사용자**: 자연어로 식단·영양 상태를 질문하고, 주간 리포트를 받고 싶은 nouryLog 사용자.
- **개발/데모**: 로컬에서 Ollama·**pgvector(Postgres)**·Tesseract(선택) 스택을 시연하는 운영자.

## 4) 핵심 사용자 시나리오

1. 사용자가 “이번 주 단백질 많이 먹었어?”라고 질문한다 → 시스템이 **주간 집계 + 목표 대비**를 계산하고, 근거 meal 목록과 함께 설명한다.
2. 사용자가 “단백질 많은 음식 추천해줘”라고 질문한다 → **(2차)** 영양 지식 RAG + 사용자 최근 선호 기록을 조합해 답한다.
3. 매주 월요일(또는 사용자 요청 시) **주간 식단 리포트**가 생성된다.
4. OCR 결과를 사용자가 수정하면 **원문·수정값·diff**가 저장되고, 이후 유사 라벨 검색·파서 개선에 활용된다.
5. (로컬 데모) 개발자가 docker-compose로 Ollama·**Postgres pgvector**·API를 띄워 **무료 LLM**으로 동일 API를 호출한다.

## 5) 아키텍처 원칙

### 5.1 하이브리드 질의 (SQL 우선, RAG 보조)

```text
POST /me/ai/ask
       │
       ▼
 [의도 분류] ── stats_query ──► Prisma/SQL (기존 stats·meals)
       │                              │
       ├── knowledge_query ──► pgvector (영양 지식)
       │                              │
       └── semantic_meal ──► pgvector (meal note·OCR 원문)
       │
       ▼
 [LLM 설명 생성]  ← 숫자·날짜는 DB 결과 고정, LLM은 서술만
       │
       ▼
 citations[] + answer (markdown/plain)
```

- **환각 방지**: `protein`, `calories` 등 **집계 수치는 서버가 계산**하고 LLM 프롬프트에 고정값으로 주입한다.
- LLM은 요약·조언·표현만 담당한다.

### 5.2 배포 2-tier

| Tier | 용도 | LLM | 벡터·DB | OCR |
|------|------|-----|---------|-----|
| **A — 로컬 데모** | 포트폴리오·실험 | Ollama (3B~7B) | **PostgreSQL + pgvector** (compose `pgvector/pgvector:pg16`) | Tesseract(선택) + Vision |
| **B — Railway** | 공개 URL api-server | Groq / tunnel / mock / 템플릿 | **동일 Railway Postgres + pgvector** | Google Vision (기존) |

- Render Free + Vercel Free에 **Ollama 7B급을 올리는 것은 범위外**(RAM·슬립·타임아웃).
- 프론트 AI UI는 **Vercel(관리자 웹 확장 또는 전용 Vite 앱)** 또는 **모바일 탭 추가** 중 Gate 2 전 선택.

### 5.3 기존 스택 재사용

- **DB**: PostgreSQL + Prisma 유지 (SQLite는 로컬-only 옵션).
- **API**: `apps/server` Express에 AI 라우트 추가.
- **통계**: `GET /stats`·집계 로직 재사용. 단, **주간 리포트·단일 주 질의**는 v1.10 **6버킷 윈도우 전체**가 아니라 **anchor가 속한 1개 KST 주(일~토)** 만 집계한다(§7.2·§16).
- **목표 비교**: `feature-recommendation-v14-prd.md` 및 stats v1.8 `WeightEntry` 스냅샷 규칙과 동일 SSOT.

### 5.4 기존 정책 SSOT (충돌 시 우선)

| 주제 | SSOT | AI PRD 적용 |
|------|------|-------------|
| OCR 무료 한도 | `docs/legal/terms.md` v3, `apps/server/src/lib/ocrQuota.ts` | **월간** 10/5회(활성 USER 수 기준). 구 PRD의 **누적 5회** 표현은 **무효**. AI 기능과 OCR 쿼터 **별도** |
| 유료·구독 | `terms.md` v3 §유료 부가기능 | **현재 미제공**. AI·주간 리포트 **무료**(MVP). 추후 게이트는 별도 PRD |
| 식단·통계 집계 | API v1.10, `GET /stats` | AI `computed`는 동일 `dailyAverage`·KST·`active` meal 규칙 |
| 권장량·면책 | recommendation v14 | “**추정 권장값**”, 의료 처방 아님 — AI disclaimer와 **동일 톤** |
| 삭제·보존 | base PRD §7.1, `privacy.md` v4 | 비활성 즉시 이용 중단, 1년 후 파기, 감사 로그 5년 |
| 개인정보 위탁 | `privacy.md` v4 §5 | LLM·벡터 DB 수탁자 **v5 갱신 전** 프로덕션 AI **ON 금지**(로컬 Tier A 제외) |

### 5.5 벡터 저장 SSOT (pgvector — 2026-06-03 확정)

- **로컬·Railway 모두 `VECTOR_BACKEND=pgvector` 고정.** Chroma·별도 벡터 DB **사용하지 않음**.
- **관계형 데이터**(`Meal`, `User`, …)와 **임베딩**(`AiEmbedding`)은 **같은 PostgreSQL**.
- 마이그레이션: `20260603140000_pgvector_ai_embeddings` (`CREATE EXTENSION vector`, `AiEmbedding` 테이블).
- `collection` 컬럼으로 논리 컬렉션 구분: `meals`, `ocr_raw`, `ocr_corrections`, `nutrition_kb`.
- 임베딩 차원: **768** (`nomic-embed-text` / Ollama embed).
- Railway: 기존 Postgres 서비스에 **동일 마이그레이션 deploy** (별도 Chroma 서비스 없음).
- dev/prod parity: 로컬 compose도 **`pgvector/pgvector:pg16`** 이미지 (`docker-compose.ai.yml`, 루트 `docker-compose.yml`).

## 6) 범위 정의

### 6.1 MVP (1차 — 단계 3)

- `POST /me/ai/ask`
  - 지원 의도(MVP): `stats_query`만 (단백질·칼로리·기간). `knowledge_query`·`semantic_meal`은 **2차**
  - 주간 요약 질의는 `stats_query` + 내부 `period=week_single` 처리. 별도 intent **`weekly_summary` 사용하지 않음**
  - 응답: `answer`, `citations[]`, `intent`, `computed`(집계 스냅샷), `isStale`(stats 지연 여부)
  - LLM: 로컬 Ollama 연동 + **LLM unavailable 시 템플릿 fallback**
- `GET /me/ai/reports/weekly?anchor=YYYY-MM-DD`
  - **단일 KST 주(일~토 7일)** 리포트. stats v1.10의 **6주 롤링 윈도우와 별도** semantics(§7.2)
  - `summaryText` + `sections` JSON
- `POST /me/ocr/feedback`
  - OCR 원문 필드 vs 사용자 확정값 diff 저장
- **클라이언트**: **`apps/user-web`** (Vite) — 로그인·**홈 허브**·AI 채팅·주간 리포트·**식단 목록(읽기)**·설정. **모바일 앱 변경 없음**(모바일 AI UI는 2차). UI: `docs/design/user-web-ai-spec.md`
- **인덱싱**: meal 저장·OCR 피드백 시 **비동기 임베딩** (실패해도 기록 저장은 성공)

### 6.2 2차 (후순위)

- 영양 지식 문서 RAG (공공 데이터·자체 markdown corpus)
- OCR 피드백 기반 파서 규칙 자동 제안
- 관리자: AI 질의 로그·품질 대시board
- pgvector **단일 경로** 확정 — ~~Chroma 로컬~~ **폐기**
- Tesseract provider를 `OCR_PROVIDER` enum에 추가

### 6.3 범위外 (본 PRD)

- Render/Vercel에 Ollama 상주 호스팅
- 멀티모달(음식 사진 직접 LLM 분석)
- 의료·질병 진단 수준 조언 (면책 문구만 제공)

## 7) 기능 요구사항

### 7.1 자연어 질의 (`POST /me/ai/ask`)

**입력**

- `question` (string, 1~500자)
- `contextAnchor` (optional, `YYYY-MM-DD`, KST) — “이번 주” 해석 기준일

**처리**

1. JWT 사용자 식별
2. 의도 분류 (규칙 + 소형 LLM, MVP는 **키워드 규칙 우선**)
3. `stats_query`: 기간 해석 후 **단일 기간 집계** 호출
   - `day` / `week_single`(1 KST 주) / `month_single`(1 KST 달) — stats v1.10 **6버킷 API 응답 그대로 쓰지 않음**
   - 집계 규칙: `active=true` meal만, `consumedAt` KST 경계, summary는 **기록일 일평균**(`dailyAverage`)
4. 목표 비교: `GET /stats`와 동일 — 해당 기간 **종료일** 기준 `WeightEntry` 스냅샷 + `proteinGoalG`/`calorieGoalKcal`(v14)
5. 관련 `Meal` 상위 N건(기본 5)을 citation 후보로 선정
6. LLM에 `{ question, computed, citations, profile goals }` 주입 — **email·SNS id·이미지 base64 미포함**
7. 응답 조립. `aggregatedAt`/`isStale`/`staleHours`는 stats 배치 메타와 동기

**출력 (필수)**

- `answer`: 사용자-facing 텍스트
- `intent`: `stats_query` | `knowledge_query` | `semantic_meal` | `unknown`
- `citations[]`: 아래 7.4 스키마
- `computed`: `{ period, summary, goalComparison?, mealCount, aggregation, periodMeta? }`
- `isStale`, `staleHours`, `aggregatedAt`: stats 배치와 동일 의미
- `llm`: `{ provider, model, used: boolean }` — fallback 시 `used: false`

**정책**

- 타 사용자 meal 접근 금지. `mealId` citation은 **본인 active meal**만
- **비활성 회원**·만료 JWT → 401 (기존 auth 정책)
- `contextAnchor`가 KST **내일 00:00 이후** → 422 `VALIDATION_FAILED` (`field: contextAnchor`) — stats와 동일
- 질의 rate limit: **분당 10회** (MVP). OCR 월간 쿼터와 **독립**
- LLM 타임아웃: **30초**, 초과 시 템플릿 fallback
- **과금**: 현행 무료 출시 — AI 호출 **결제 게이트 없음** (`402`/`PAYMENT_REQUIRED` 미사용)
- 면책(고정): “본 답변은 **추정 권장값·일반 정보**이며, 의료 진단·치료·처방을 대체하지 않습니다.” (recommendation v14 톤)
- **무관 질문**(식단·영양·내 기록 신호 없음) → `intent: unknown` + 고정 안내 (HTTP 200). `knowledge_query`/`semantic_meal`은 **키워드 매칭 시 허용**(구현됨)
- **식단 기록 방법**(예: 「식단 기록을 어떻게 시작하면 좋을까?」) → `knowledge_query` + `meal-logging-basics` KB (코치 칩 `intentHint`와 정합)
- **영양 개념 질문**(기간 신호 없이 「탄수화물은 왜 필요한가요?」 등) → `knowledge_query` (집계 `stats_query`와 분리)
- **영양 KB corpus** (`apps/server/data/nutrition-kb/`): `protein-basics`, `high-protein-foods`, `calorie-basics`, `fat-basics`, `fiber-basics`, `carb-basics`, `hydration`, `balanced-meal`, `meal-logging-basics` — **md 추가·수정 후 `npm run ai:seed-kb` 필수**

### 7.2 주간 리포트 (`GET /me/ai/reports/weekly`)

- `anchor` 생략 시 KST 오늘이 속한 주(일~토)
- **집계 범위**: anchor 주 **단 7일** (`period.from` = 해당 주 일요일 00:00 KST, `toExclusive` = 다음 주 일요일 00:00)
- **stats v1.10 `range=week`와의 차이**: v1.10은 **6주 버킷** 차트용. 주간 리포트는 **리포트 주 1개만** SQL 집계. 혼동 금지(§16)
- `summary`·`goalAchievement`: 해당 7일 내 **기록일 일평균** + 일별 goalMet(stats v1.10 `goalMet` 규칙)
- `sections`: `overview`, `macroBreakdown`, `goalAchievement`, `highlights[]`, `suggestions[]`
- `summaryText`: LLM 또는 템플릿
- `generatedAt`, `citations[]` (주간 대표 meal)
- 기록 0건: HTTP 200, 빈 sections + “이번 주 기록이 없습니다” + 기록 CTA copy

### 7.3 OCR 피드백 (`POST /me/ocr/feedback`)

**트리거 (필수)**

- **`POST /meals` 또는 `PUT /meals/{id}` 저장 성공 후**, OCR 경로로 입력했고 사용자가 OCR 제안값을 **1개 이상 수정**한 경우에만 클라이언트가 호출
- OCR 미사용·수정 없음 → 호출하지 않음 (base PRD “저장 전 사용자 확인”과 정합)

**입력**

- `ocrRequestId` (optional, 추후 OCR 세션 ID)
- `imageHash` (optional, sha256)
- `confidence` (optional, 0~1) — `POST /nutrition/ocr` 응답값 전달
- `rawOcr`: `{ calories?, carbohydrate?, protein?, fat?, rawText? }`
- `corrected`: 동일 필드 — 사용자 확정값
- `mealId` (optional) — 저장된 meal과 연결 (**본인 active meal**만)

**처리**

- diff 필드만 `OcrFeedback` 테이블 저장
- `rawText`가 있으면 **pgvector** `AiEmbedding` (`collection=ocr_raw`, user-scoped)
- **영양표 사진 바이너리**는 저장하지 않음 (`privacy.md` OCR 일시 처리와 동일)
- `ocr_corrections` **global** 컬렉션: userId·mealId **미포함**, 필드명+diff 패턴만 익명 요약 후 저장
- 동일 `mealId`+동일 diff **중복 제출** → 200/201 멱등(기존 id 반환)

**보존**

- `OcrFeedback`·벡터: 회원 **비활성 즉시 AI/RAG 조회 불가**, **hard delete 시 함께 파기**(base PRD §7.1). 감사 목적 `AiQueryLog`는 운영 로그 5년 규칙 **별도**

### 7.4 Citation 스키마 (공통)

| 필드 | 타입 | 설명 |
|------|------|------|
| `type` | enum | `meal` \| `stat_period` \| `ocr_feedback` \| `knowledge_doc` |
| `mealId` | string? | meal 인용 시 |
| `date` | string | KST `YYYY-MM-DD` |
| `foodName` | string? | |
| `mealSlot` | enum? | BREAKFAST 등 |
| `nutrients` | object? | `{ protein, calories, carbohydrate, fat }`. `stat_period`는 **기간 일평균**, `meal`은 **해당 1끼** |
| `label` | string | UI 한 줄 표시 (예: `6/1 점심 — 닭가슴살 32g 단백질`) |
| `sourceId` | string? | feedback/doc id |

### 7.5 벡터 인덱스 (`AiEmbedding`, pgvector)

| 소스 | `collection` | scope |
|------|--------------|-------|
| Meal `note` + name | `meals` | `userId` |
| OCR `rawText` | `ocr_raw` | `userId` |
| OCR feedback diff 요약 | `ocr_corrections` | global(`userId` null, 익명 패턴) |
| 영양 지식 markdown | `nutrition_kb` | global |

- 저장: Postgres `AiEmbedding.embedding vector(768)`
- 검색: cosine distance (`<=>`) — 단계 3 구현
- 임베딩: Ollama `nomic-embed-text` (로컬), 교체 가능 추상화

### 7.6 엣지케이스/에러 처리 기준 (필수)

> base PRD `feature-diet-management-app-prd.md` §8.1·§8과 동일 카테고리로 정의.  
> 에러 코드 UX는 `api-contract-v1.11-ai-rag-delta.md` §6 및 (단계 3 전) `feature-diet-management-state-mapping.md` AI 절에 반영.

#### 네트워크·서버 공통

- `POST /me/ai/ask`, `GET /me/ai/reports/weekly`에서 **5xx·네트워크 타임아웃** → 오류 상태 + **재시도** 버튼. 사용자 **질문 입력값·anchor는 유지**.
- AI 질의 **전송 버튼**: in-flight 중 **비활성화**, 연타로 중복 POST **금지**(idempotency key는 MVP 생략, **클라이언트 차단**으로 1회 처리).
- **DB/집계 실패**(Prisma·SQL 오류) → HTTP **500** + 재시도. LLM·템플릿 fallback **시도하지 않음**(숫자 source of truth 상실 방지).
- **LLM·pgvector만** 장애 → §7.1 fallback(**200**, SQL+템플릿). **stats_query**는 pgvector 없이도 동작.

#### 인증·권한

- `AUTH_UNAUTHORIZED` / 액세스 토큰 만료 → **refresh 1회** 후 재요청, 실패 시 로그인 화면(base PRD §8.1 동일).
- **비활성 회원** → 401, AI 화면 **권한 제한** + 재로그인 안내.
- AI 엔드포인트는 **USER 전용**. `AUTH_FORBIDDEN`(403)은 관리자 토큰 오용 등 극히 드묾 — 접근 불가 안내.

#### AI 질의 (`POST /me/ai/ask`)

| 상황 | 서버 | 클라이언트 UX |
|------|------|----------------|
| `question` 공백·미입력 | 422 `VALIDATION_FAILED` (`field: question`) | 전송 전 trim 검증, 인라인 오류 |
| 500자 초과 | 422 `AI_QUESTION_TOO_LONG` | 입력 글자수 표시·초과 시 전송 차단 |
| `contextAnchor` 형식 오류·**미래 날짜** | 422 `VALIDATION_FAILED` (`field: contextAnchor`) | date picker/수동 입력 검증 |
| 분당 10회 초과 | 429 `AI_RATE_LIMIT` | **info** 토스트, 질문 유지, 잠시 후 재시도 |
| 기록 0건 | **200**, `mealCount=0`, citation `[]` | **빈 데이터** + 기록 추가 CTA (오류 아님) |
| `proteinGoalG`/`calorieGoalKcal` 미설정 | **200**, `goalComparison: null` | 목표 없이 **섭취만** 설명, 프로필 설정 CTA(선택) |
| LLM 타임아웃·연결 실패 | **200**, `llm.used=false`, 템플릿 `answer` | **info** 배지 “집계 기준 답변” + `computed`·citation **동일 표시** |
| LLM+템플릿 모두 불가 | 503 `AI_LLM_UNAVAILABLE` | 오류 + 재시도 |
| `intent: unknown`(식단·영양·기록 무관) | **200** | 고정 안내 + 예시 질문 칩 |
| `isStale=true` | **200** | stats와 **동일** 지연 배너 + `aggregatedAt` 표시 |
| citation `mealId`가 **비활성화됨** | — | 카드는 유지, 탭 시 “삭제된 기록” **info** (상세 이동 안 함) |
| LLM이 숫자를 바꿔 출력 | — | 서버 **사후 검증**: `answer` 내 수치는 `computed`와 불일치 시 **템플릿으로 대체** |

- **타임존**: 집계·`period.timezone`은 **항상 `Asia/Seoul`**. 단말기 TZ 변경은 AI 기간 해석에 **영향 없음**(stats §8.1 “타임존 표시” — AI 화면에도 기준 TZ 라벨 노출).
- **의료·진단 질문**(키워드 감지): 거부하지 않고 **면책 + 일반 정보·본인 기록** 범위로 답변, 전문 진단 문구 **금지**.

#### 주간 리포트 (`GET /me/ai/reports/weekly`)

- 기록 0건 → **200**, 빈 `highlights`, `summaryText` 안내 + CTA.
- `isStale`/`staleHours`/`aggregatedAt` — **ask와 동일** 응답·배너.
- LLM 실패 → `llm.used=false`, `sections` 수치는 SQL 고정, `summaryText`·`suggestions`만 템플릿.
- 5xx → 재시도. in-flight **중복 조회**는 허용(멱등 GET).

#### OCR 피드백 (`POST /me/ocr/feedback`)

- `rawOcr`와 `corrected` **동일**(diff 없음) → 클라이언트 **호출 생략**.
- 영양 필드 **음수** → 422 (meal 저장과 동일 검증).
- `mealId` inactive·타 사용자 → **404**; 클라이언트 **무시**(meal 저장 직후 비활성 race).
- 네트워크/5xx 실패 → **UI blocking 없음**, 재시도 **하지 않음**(MVP). 2차: 백그라운드 retry queue.
- 임베딩 실패 → `indexed: false`, HTTP **201** 유지.

#### 삭제·비활성화·캐시

- meal **비활성화 직후** AI 화면에 이전 답변이 남을 수 있음 → **pull-to-refresh** 또는 재질의로 갱신.
- 사용자 **탈퇴·비활성** 직후 → 다음 AI 호출 401, 로컬 AI 대화 **클리어**(민감 데이터 잔존 방지).
- AI 응답 **서버 캐시 없음**(매 요청 실시간 집계). 클라이언트는 세션 내 **마지막 N턴**만 메모리 보관, 로그아웃 시 삭제.

#### 비동기 인덱싱

- meal 저장 성공 + embed 실패 → 기록·AI SQL 답변 **정상**. 검색(2차)만 지연.
- hard delete 시 user-scoped 벡터·`OcrFeedback` **파기** — orphan index **허용하지 않음**(worker best-effort delete).

## 8) 비기능 요구사항

- **로컬 데모**: `docker-compose.ai.yml` — **Postgres(pgvector) + Ollama** (Chroma **없음**)
- **환경 변수**: `LLM_*`, `VECTOR_BACKEND=pgvector`, `AI_ENABLED`
- **관측**: `traceId` 기존 규칙 유지, AI 요청 duration 로그. PostHog 이벤트(2차): `ai_ask`, `ai_report_view` — **질문 본문 전송 금지**
- **개인정보**
  - LLM 프롬프트: email·provider id·OCR 이미지 **미포함**
  - `AiQueryLog.question`: DB 저장 시 **프로덕션 90일 rolling** 또는 hard delete 시 파기(운영 로그 5년과 **별도** — 질문 원문은 민감)
  - Tier B 외부 LLM(Groq 등) 사용 시 **`privacy.md` v5**·약관 **AI 기능·수탁자** 조항 갱신 **선행**
- **장애**: LLM down → stats_query **템플릿-only 200**. pgvector down → SQL-only (MVP stats)

## 9) 클라이언트·UI (Gate 2 전 요약)

- **플랫폼**: **`apps/user-web`** (`/ai` 코치 통합). **`apps/mobile`**: 홈 카드 + Stack `AiCoach` (v1.12 summary + ask). 스펙: `docs/design/mobile-ai-coach-spec.md`
- **상태**: 기본 / 로딩 / 빈(첫 질문·기록 없음) / 오류(5xx·503) / **완료**(답변 표시) / 권한 제한(401) / LLM fallback(`llm.used=false`) / **stale 배너**
- **토스트**: `feature-mobile-toast-prd.md` — `AI_RATE_LIMIT`·fallback·citation 탭 실패는 **info**, 5xx·503은 **error**+재시도
- **citation UI**: answer 아래 카드, 탭 시 meal 상세(비활성 meal이면 숨김)
- **OCR 피드백**: 저장 성공 후 백그라운드 POST, UI blocking 없음
- **다크모드**: 기존 mobile theme 토큰 준수
- **디자인**: 본 PRD 승인 후 이중 목업 또는 Stitch 톤 확장 — **구현 전 HUMAN 선택**
- **후속 문서**: `feature-diet-management-state-mapping.md`에 **§2 AI 분석 화면**·§4 AI 에러 코드 매핑 추가(단계 3 전, §7.6 SSOT)

## 10) API 계약

- 상세: `docs/requirements/api-contract-v1.11-ai-rag-delta.md`
- 오류 코드 추가: `AI_RATE_LIMIT`, `AI_LLM_UNAVAILABLE`, `AI_QUESTION_TOO_LONG`
- **`AI_NO_DATA`는 사용하지 않음** — 기록 없음은 HTTP 200 + 빈 citation(계약·PRD 통일)

## 11) 성공 지표 (MVP)

- stats_query **기록 있음** 3종(단백질/칼로리/주간) citation ≥ 1 응답률 95%+
- **기록 없음** 질의: HTTP 200 + 빈 citation 100%
- LLM 없이도 템플릿 fallback으로 **200 응답** 100%
- 로컬 docker-compose **15분 이내** 기동·샘플 질의 성공
- OCR feedback 저장 후 재질의 시 **동일 라벨 패턴** 검색 hit (수동 검증 1케이스)

## 12) 리스크·완화

| 리스크 | 완화 |
|--------|------|
| LLM 환각 | 숫자 SQL 고정 + citation 필수 |
| Ollama 로컬 RAM 부족 | 3B 모델 기본, CPU-only 경고 |
| pgvector Railway 미적용 | migrate deploy + `/health/ai` `embeddingTableReady` |
| 한글 OCR Tesseract 품질 | 프로덕션 Vision 유지, Tesseract는 로컬 옵션 |

## 13) 미확정 항목

- [ ] MVP 진입점: **홈 vs 통계** (Stack 1곳으로 확정, 카피·CTA만 선택)
- [ ] 프로덕션 LLM: Groq free vs Cloudflare Tunnel vs mock-only (**privacy v5 선행**)
- [x] `VECTOR_BACKEND`: **pgvector** (로컬·Railway 통일, Chroma 폐기)
- [ ] 주간 리포트 **푸시 알림** 연동 여부
- [ ] `AiQueryLog` 보존 **90일 vs hard-delete-only** (현재 PRD: 90일 rolling 권장)

## 14) 정책 충돌 해소 기록 (2026-06-03)

| # | 충돌·누락 | 해소 |
|---|-----------|------|
| C1 | MVP intent `weekly_summary` vs API intent enum | **`weekly_summary` 폐기**. 주간은 `stats_query` 또는 `/reports/weekly` |
| C2 | PRD `AI_NO_DATA` vs API “200 빈 데이터” | **`AI_NO_DATA` 미사용**으로 통일 |
| C3 | 주간 리포트 “v1.10 week와 동일” vs v1.10 **6주 버킷** | **단일 7일 주** 전용 semantics 명시 |
| C4 | citation `stat_period` 합계 vs `computed.summary` 일평균 | **`stat_period.nutrients`=기간 일평균**으로 통일 |
| C5 | base PRD OCR **누적 5회** vs 운영 **월 10/5회** | **ocrQuota·terms SSOT** 우선, AI PRD에 명시 |
| C6 | base PRD **유료 OCR/구독** vs terms **현재 미제공** | AI **무료**, 결제 게이트 없음 |
| C7 | OCR feedback 저장 vs **사진 미보관** privacy | rawText·diff만, **meal 저장 후** 트리거 |
| C8 | global `ocr_corrections` vs 개인정보 | **userId 제거·익명 패턴**만 |
| C9 | stats **`isStale`** 미전파 | AI 응답에 **`isStale`/`staleHours` 필수** |
| C10 | 목표 비교 WeightEntry 스냅샷 | stats v1.8·v14 **동일 규칙** |
| C11 | LLM 위탁 privacy v4 미등재 | **프로덕션 ON 전 v5** 갱신 |
| C12 | 시나리오 knowledge_query vs MVP 범위 | 시나리오 **2차** 표시 |
| C13 | “AI 탭” vs 5탭 네비 | **Stack 화면**, 탭 추가 없음 |
| E1 | base §8.1 네트워크·중복 제출 | §7.6 전송 비활성·재시도·질문 유지 |
| E2 | base §8.1 auth refresh | §7.6 refresh 1회·401 권한 제한 |
| E3 | 목표 미설정 시 goalComparison | **`null`**, 섭취-only 답변 |
| E4 | LLM 숫자 환각 | **사후 검증→템플릿 대체** |
| E5 | DB vs LLM 장애 분리 | DB→500, LLM→200 fallback |
| E6 | citation 비활성 meal | 탭 시 info, 상세 이동 안 함 |
| E7 | OCR feedback diff 없음 | **클라 호출 생략** |
| E8 | weekly `isStale` 미정의 | ask와 **동일 필드** |
| E9 | state-mapping AI 절 없음 | §7.6 + delta §6, 단계 3 전 state-mapping 갱신 |
| C14 | Chroma(로컬) vs pgvector(Railway) 이원화 | **pgvector 단일 SSOT** §5.5, Chroma 제거 |

## 15) 구현 단계 (사용자 합의 순서)

| 단계 | 산출물 | Gate |
|------|--------|------|
| **1** | 본 PRD + API v1.11 delta | **HUMAN PRD 승인** |
| **2** | `docker-compose.ai.yml`, Ollama + **pgvector** 연동, `GET /health/ai` | migrate + smoke |
| **3** | `/me/ai/*` API + **user-web** MVP UI + citation + **RAG**(semantic/knowledge/OCR feedback) | Gate 3 verify (RAG: `docs/agent/ai-local-demo.md` §4) |

## 16) 승인

- 상태: **approved** (2026-06-03)
- 단계 2: `docker-compose.ai.yml`(pgvector+Ollama), `docs/agent/ai-local-demo.md`, `GET /health/ai`, migration `20260603140000_pgvector_ai_embeddings`
- 단계 3: `/me/ai/*` API + **user-web** MVP — **진행 중**
