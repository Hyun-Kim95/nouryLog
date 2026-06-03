-- pgvector extension + AI embedding store (로컬·Railway 공통)
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS "AiEmbedding" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "collection" TEXT NOT NULL,
    "sourceId" TEXT,
    "content" TEXT NOT NULL,
    "embedding" vector(768) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiEmbedding_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AiEmbedding_userId_collection_idx" ON "AiEmbedding"("userId", "collection");
