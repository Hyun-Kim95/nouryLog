# 포트폴리오 Notion 초안

개인 포트폴리오 프로젝트 페이지는 **동일한 문서 골격**을 따른다. (STAR가 아니라 **PAAR**.)

## 전체 섹션 순서

| 순서 | 섹션 | 비고 |
|------|------|------|
| — | **메타** | 시작일 · 종료일 · URL · 기여도 · 기술 · 핵심 경험 |
| 1 | **프로젝트 개요** | 제품/목표·흐름 한 줄·(선택) 다이어그램 |
| 2 | **주요 기능** | `####` 기능별 소제목 |
| 3 | **Problem** | PAAR — **P** |
| 4 | **Analysis** | PAAR — **A**(판단), `#### 1.` … 번호 소제목 |
| 5 | **Action** | PAAR — **A**(실행), `#### 1.` … 번호 소제목 |
| 6 | **Result** | PAAR — **R**, 불릿 요약 |
| 7 | **이 프로젝트에서 강조하고 싶은 점** | 마무리 메시지 |

## PAAR vs STAR

- **PAAR:** Problem → **Analysis** → Action → Result  
- **STAR:** Situation / Task → Action → Result (Analysis 단계 없음)

포트폴리오 5종(rag-assistant 포함)은 **PAAR + 개요·주요기능·강조점** 구조다.

## 문체 (가독성)

- 레포 경로·파일명은 본문에 넣지 않는다. 역할만 서술한다(예: “연동 체크리스트”, “회귀 시나리오 문서”).
- 백틱·코드블록·볼드는 본문에 쓰지 않는다. API·기능은 풀어 쓴다(예: “OCR API”, “소셜 토큰 교환 API”).
- 남겨도 되는 것: 제품·면접 키워드(AGENTS.md, OpenAPI, com.nourylog.app), 증거 링크(URL·GitHub·스크린샷), rag처럼 끝에 한 줄 근거 링크 정도.

## 초안 파일

| 프로젝트 | 파일 |
|----------|------|
| nouryLog | [`nourylog-notion-draft.md`](./nourylog-notion-draft.md) |
