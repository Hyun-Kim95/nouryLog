-- 식단 인사이트 전환: RAG·질의 로그·pgvector 임베딩 스토어 제거 (AiPeriodReport 캐시는 유지)
DROP TABLE IF EXISTS "AiQueryLog";
DROP TABLE IF EXISTS "AiEmbedding";
DROP EXTENSION IF EXISTS vector;
