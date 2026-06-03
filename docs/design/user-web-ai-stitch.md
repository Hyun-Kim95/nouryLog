---
type: design-spec
project: dietManagement
doc_lane: design
updated_at: 2026-06-03
tags: [design, stitch, user-web, ai, option-b]
status: approved
approved_at: 2026-06-03
approved_note: 계획 구현 착수 — Stitch 8화면 기준 user-web 반응형 UI
scope: option-2
---

# nouryLog user-web — Stitch 안 B (2번 범위, 컨펌 대기)

> 기능 스펙: `docs/design/user-web-ai-spec.md`  
> **범위:** AI + **홈·설정·식단 목록(읽기 전용)**  
> **구현 착수:** HUMAN 승인 후 `apps/user-web`

## Stitch 프로젝트

| 항목 | 값 |
|------|-----|
| **projectId** | `15635846868928156195` |
| **designSystem** | `assets/2618258368521191675` |
| **네비** | `홈` · `AI` · `리포트` · `식단` · `설정` |

## 화면 목록 (전체)

| 경로 | 제목 | screenId | 스크린샷 |
|------|------|----------|----------|
| `/login` | 로그인 | `33cb248c6a8848b0a58bef6416af360b` | [보기](https://lh3.googleusercontent.com/aida/AP1WRLvi_6oUXztUd-oCQGNzBlHZkvG7eqV_inEOGi5-P8tR-hN7UXJ6xYKeZqgHGA9oe2n5DSY3AhJpc3bGgEXFYerqpk12B9U5I8hF5pjyWqvq1RdpueAgrtBK2ds266_I0kyNCXNvqxantMWDf7ZjoXk6quaLSZLOb4ZLUyIXcmMflH-nltiFHvjdQar1xQr1PREhfU-fPpjmn1K3Nz4JBn5K5izF08uSH_W9DJHtMs79vhYwXaT_yTw4rwlj) |
| `/home` | 홈 허브 | `9fb7ce1789ad48e091129bcd81809cfa` | [보기](https://lh3.googleusercontent.com/aida/AP1WRLsxQjX_9vijawQuzHyKrjk9C0opNdkOEoOpwU2fDee-rqTDku274IroYWQZJ2SRYFBQwEYVdDVXdaRpXwciZubuRiR1dq8PyamgIubP7WZIctj6jvhBnxYM9tJFS_dpa2XDbw0ZLVkMfTQrmJXdS4vU_IA4U7jAu_ZnLCaSHlCK51c7v4_TlH057dYFwHPxW2h0Cw6YYzLzweicRDEzwL-Ka3eNMjM71pL2H7ves1WBRmW0dPBEoejWdVo) |
| `/ai` | AI 영양 채팅 | `a371d065f9644325ad4fe385eba431d5` | [보기](https://lh3.googleusercontent.com/aida/AP1WRLulr-DOkz0NPTKV_fBP5CLEVCHIrmTw5aQjhPFsrrybhDRkD5EIi9dZ2GKcqLFJi5riGjy96TnGiO6O9dt8JITDcqOPwMw-uCTaprfoa7l_H6TvCvqqEBjMLGgPX9j4qvz_k06ZmC0i5L9EfHUflr58ctbGYcWCZ7tpH2BonqXX5ZgkZFYxxewGLZF5l0TLNXbfsYWuBF7Ak40zTO_jKvgGNc0M_7mBfpHc5HdFTEFFsJmkGXQocnYjv86h) |
| `/ai/report` | 주간 리포트 | `b9ef414d7d7b40e184cecee93142cc96` | [보기](https://lh3.googleusercontent.com/aida/AP1WRLvIKecTgcI4ukafXR5ap0qXD77lonRjo2VW0ToeIT8GOHk63qMApyxAnF6Avpc6H80XqbYc2VmJfLwPiMLW-PhQ4wuEvVOvGG-NlBOsBj91yOPIIp0-US4klN5P0TL6Jxji85EHYaGXjgO708O7S5FKxuIE2JiYFJa9kjlj4i0ZHy8ZFFNGwGFNjPhyFevu6MzFwPABHRZHF0cg8mcyL0iz18oMxV4D-RJAjnMlSbGARBHT5tXJzK0-8Zdc) |
| `/ai/report` (빈) | 주간 리포트 빈 상태 | `665478435f6341e4b6562299a859b65b` | [보기](https://lh3.googleusercontent.com/aida/AP1WRLs4DbkJqPmvk49SY_EKe0YTgVn5VnjlwwOT4Owzgy98Z-IO92nyvZ-roPCFTiQCncosstb76ZyPfP_BaWA_mV07ffu2rH4QuAGeRZWPNoQW2tmmim99t0t8RU9UbI305DX_-4DoUjl4tYXTrzpgcJofXc2lbxdyln7THWfDDgh2ON5I86firZvBGJ38fNmkft8bzoD-8E5QDcvdC4FzuG1g3gFPbjuna71Ac33w9yVxicUv8HRD7t-Kw00) |
| `/meals` | 식단 목록 (읽기 전용) | `97d40372b7b3453782c01e7c9431c113` | [보기](https://lh3.googleusercontent.com/aida/AP1WRLsUiYWRsBENEh5rv6hDhcm3nGZOk3ibo8tVZs3iqa-AwNSFen2T3azKLq5WQcoRo5is_Za9NC78yFpCn3_WuKah23te9SMQ_cnjP3VKYEYG0iYy_w1yYEnhDUoKxa3OV_rnLLRSzmv5hy9zW18zAnoSjON5oFYYLwGlz8s1mW3Sa4DLbMfEnhhdbYK7TEGXtyUl4ULBFQ_Ar8-KxuXyjbDnyY4L2dnVqKz3UelsD8OXso2HZJUUZnT3eBeP) |
| `/settings` | 설정 | `94bc228fff104843bcc0c5d7b5a260c4` | [보기](https://lh3.googleusercontent.com/aida/AP1WRLswmplejQPgEPJiovoSrV5mNwg-l8jTCiP64YJa44_GtucydKoBP_B3Q23xrsAUCRP2v7KAbqN81euxGQMMIXeFRKN2VGc2RhcBZJ8G4QP1aCHqpk9aLfpzcp5tI6GxyjIqw4E_KpE3eFLevRAiPtpz8mPCauSEA7jKkMYm7CHHm-tR1GhX85XWhmL9PtVatv-K-vJTE6lQmKXoRxceStDmpVoVTq1bF3Om3bFsrqKAMNtohLtfCSzaP8s) |
| `/stats` | 통계 대시보드 | `07b31da09b5a4dac9b8f0eef40c36b33` | [보기](https://lh3.googleusercontent.com/aida/AP1WRLvL1a6kGBiMkBubw4lSL8wD7LW52KzD7qCyvXwwsI82U8PvfcJYxHwFjdkA_hZiCRl_HodAZuZz8McxlK3dxi0q3yUqd6g70TI5pwKMMXJYg1UxeiSBX41xe8rFQ13J1MwYCF_7EpeFFrtaqKZPlPwoZZmqRdPOHXVeEyLFyQkiR1Keu7RZmHpg31t7KOEspxMbdqKL-QVlmt6IHAzNaQIrytMWje6KHP8I7Ys_DCAJKKweYTC-RAuElISv) |

> 구현 시 기존 AI·로그인 화면에 **동일 글로벌 네비**를 Stitch 홈/식단/설정과 맞춰 적용한다.

## 컨펌 (HUMAN)

1. **승인** — 전 화면 UI 리디자인 + 라우트·API 연동 (`/home`, `/meals`, `/settings`)
2. **수정** — Stitch `edit_screens` (네비·색·빈 상태 등)
3. **보류** — 통계(`/stats`) 등은 2번 범위外, 별도 요청 시 추가

### 승인 후 구현 요약

- `Layout`: 6탭 네비, 로그인 후 `/home`, 반응형 헤더
- 페이지: `HomePage`, `MealsPage`, `SettingsPage` + Login/AI/Report/Stats 정합
- API: `GET /stats`, `GET /meals`, `GET /me/profile`
- 반응형 320px~720px+, 다크모드

## 이력

- 2026-06-03: AI 3화면 + 리포트 빈 상태
- 2026-06-03: 사용자 **2번** 선택 → 홈·설정·식단 목록 Stitch 추가
- 2026-06-03: **통계(/stats)** Stitch + `apps/user-web` 구현(막대·도넛 차트)
