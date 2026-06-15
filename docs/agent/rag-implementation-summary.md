# RAG 완성 구현 요약 (2026-06-03)

> **Deprecated (2026-06-15):** RAG·임베딩·`/me/ai/*`는 제거되었습니다. 현행: [`api-contract-v1.14-insights-delta.md`](../requirements/api-contract-v1.14-insights-delta.md), [`mobile-insights-spec.md`](../design/mobile-insights-spec.md).

## 변경 요약

- **pgvector 실사용**: `embeddingService`, `vectorStore`, `aiIndexWorker` — upsert·cosine 검색
- **`POST /me/ai/ask`**: `semantic_meal`, `knowledge_query` 분기 + `aiRagNarrative` / citation 확장
- **인덱싱**: meal `POST/PUT` 비동기, `PATCH deactivate` 시 벡터 삭제, `npm run ai:backfill` / `ai:seed-kb`
- **nutrition_kb** (9 md): `protein-basics`, `high-protein-foods`, `calorie-basics`, `fat-basics`, `fiber-basics`, `carb-basics`, `hydration`, `balanced-meal`, `meal-logging-basics` — 신규·수정 md 반영 시 **`npm run ai:seed-kb` 재실행**
- **`POST /me/ocr/feedback`**: `OcrFeedback` 테이블, `ocr_raw` / `ocr_corrections` 임베딩
- **`POST /nutrition/ocr`**: 응답에 `rawText` (최대 2KB)
- **모바일**: OCR 저장 후 diff 시 피드백 fire-and-forget
- **user-web**: citation `knowledge_doc` / `ocr_feedback`, 예시 질문 칩

## 로컬 검증

```powershell
npm run ai:up
npm run db:migrate
npm run ai:pull-models
npm run prisma:seed -w @diet-management/server
npm run ai:backfill
npm run ai:seed-kb
npm run dev:server
npm run ai:smoke
npm run ai:smoke:ask
```

## 미포함 (계획 범위外)

- Railway prod Ollama, privacy v5, HNSW 인덱스, `AiQueryLog` 90일 purge
