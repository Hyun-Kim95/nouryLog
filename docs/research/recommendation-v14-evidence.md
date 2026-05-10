---
type: research-note
project: dietManagement
status: draft
owner: product
updated_at: 2026-05-10
tags: [research, recommendation, nutrition, phase-p, b4]
related:
  - docs/requirements/feature-recommendation-v14-prd.md
  - apps/server/src/lib/recommendation.ts
---

# Recommendation v1.4 Evidence Note (Phase P/B4)

## 0) Purpose

This note collects public, non-diagnostic nutrition references for Recommendation v1.4. It is **not medical advice** and must not be presented as clinical counseling. The product should label outputs as "estimated targets" and keep user override behavior.

## 1) Current Implementation Baseline (v1.3)

Current SSOT code: `apps/server/src/lib/recommendation.ts`

- BMR: Mifflin-St Jeor.
- Activity: `sedentary=1.2`, `light=1.375`, `moderate=1.55`, `active=1.725`.
- Calorie goal: `lose=0.9`, `maintain=1.0`, `gain=1.1`.
- Protein: `lose=1.4 g/kg`, `maintain=1.0 g/kg`, `gain=1.6 g/kg`.
- Nullable `activityLevel` / `goal` fallback: `moderate` / `maintain`.

## 2) Evidence Summary

| Topic | Reference | Extracted Policy-Relevant Point | Product Use |
|---|---|---|---|
| General adult protein | National Academies DRI macronutrients | Adult protein RDA is about `0.8 g/kg/day`; AMDR: protein `10-35%`, carbohydrate `45-65%`, fat `20-35%` of energy. | Use as lower general baseline and macro sanity bounds. |
| Korean adult protein | KDRI 2020 protein review | Adult EAR `0.73 g/kg/day`, RNI `0.91 g/kg/day`; protein AMDR `7-20%` energy in KDRI context. | Maintain Korean baseline around `0.9 g/kg/day`; avoid maintain value below `0.9`. |
| Exercising adults | ISSN protein and exercise position stand (2017) | Exercising individuals commonly use `1.4-2.0 g/kg/day`; energy-restricted resistance-trained individuals may require higher intakes (`2.3-3.1 g/kg/day`) but this is specialized. | App default should cap typical training range at `2.0`; do not expose `>2.0` without expert/pro mode. |
| Older adults | ESPEN expert recommendations | Healthy older adults: at least `1.0-1.2 g/kg/day`; at-risk/illness contexts `1.2-1.5+ g/kg/day`. | For age `65+`, maintain/gain default should not be below `1.1`; include caution text for illness. |
| BMR equation | Mifflin-St Jeor equation and later systematic reviews | Mifflin-St Jeor is a widely used adult RMR estimate and often performs better than common alternatives, but individual error remains. | Keep formula, add disclaimer and clamp/safety policy. |
| Weight loss rate | NIH/NIDDK/NIH News in Health | Safe, sustainable weight loss is often framed around `1-2 lb/week`; a `~500 kcal/day` deficit is a common adult reference. | Replace percentage-only `0.9` with bounded deficit model: roughly `10-20%` or `300-500 kcal`, whichever is conservative. |
| Adolescents | Academy of Nutrition and Dietetics / Canadian Paediatric Society | Adolescent interventions should be developmentally appropriate and avoid restrictive dieting without professional support. | For age `<19`, do not auto-generate aggressive deficit/surplus. Show maintain-oriented estimate and expert guidance note. |

## 3) Recommended v1.4 Policy

### 3.1 Calorie Target

Keep Mifflin-St Jeor BMR and activity factors, but change goal adjustment from pure multiplier to bounded delta:

| Goal | Current v1.3 | Recommended v1.4 |
|---|---|---|
| `lose` | `TDEE * 0.9` | `TDEE - min(max(TDEE * 0.10, 250), 500)` for adults `19-64`; for age `<19`, use maintain estimate + caution; for age `65+`, use `min(max(TDEE * 0.05, 150), 300)` unless user overrides. |
| `maintain` | `TDEE * 1.0` | unchanged. |
| `gain` | `TDEE * 1.1` | `TDEE + min(max(TDEE * 0.08, 200), 400)` for adults `19-64`; for age `<19`, use maintain estimate + caution; for age `65+`, use `min(max(TDEE * 0.05, 150), 300)` unless user overrides. |

Minimum calorie floor should be policy-only, not medical:

- Female/unspecified: do not auto-suggest below `1200 kcal/day`.
- Male: do not auto-suggest below `1500 kcal/day`.
- These floors are guardrails, not prescriptions. User override remains possible with warning.

### 3.2 Protein Target

Recommended default coefficients:

| Age / Goal | `lose` | `maintain` | `gain` | Rationale |
|---|---:|---:|---:|---|
| `<19` | `0.9` | `0.9` | `0.9` | Avoid aggressive diet advice; show expert guidance note. |
| `19-64 sedentary/light` | `1.2` | `0.9` | `1.4` | KDRI/RDA baseline + modest activity/goal adjustment. |
| `19-64 moderate/active` | `1.6` | `1.2` | `1.6` | Fits ISSN exercising adult range while staying conservative. |
| `65+` | `1.2` | `1.1` | `1.2` | ESPEN healthy older adult lower range. |

Hard cap for automatic recommendation:

- Default max: `2.0 g/kg/day`.
- Do not auto-suggest `>2.0` in normal mode.
- Future expert/pro mode may expose higher ranges with explicit caution.

### 3.3 Output Disclaimer

Every generated recommendation should include a short label:

> "추정 권장값입니다. 질환, 임신/수유, 청소년 성장기, 고령·근감소 위험, 전문 운동 목표가 있으면 전문가와 상담하세요."

### 3.4 Special Population Policy

The app currently accepts age `13-100`. v1.4 should treat age as a policy branch:

- `<19`: keep estimates non-restrictive; do not apply weight-loss deficit automatically. If goal is `lose` or `gain`, display a caution and maintain-oriented calorie target.
- `19-64`: use adult baseline.
- `65+`: conservative calorie adjustment and protein minimum bump.
- Any user-entered medical condition is out of scope because no such field exists yet.

## 4) Sources

- National Academies, *Dietary Reference Intakes for Energy, Carbohydrate, Fiber, Fat, Fatty Acids, Cholesterol, Protein, and Amino Acids*: https://www.nationalacademies.org/publications/10490
- National Academies DRI chapter skim, Protein and Amino Acids: https://nap.nationalacademies.org/nap-cgi/skimchap.cgi?chap=589%E2%80%93768&recid=10490
- 2020 KDRI protein review, Journal of Nutrition and Health / Korea Science: https://www.koreascience.or.kr/article/JAKO202210242857035.page
- ISSN Position Stand: Protein and Exercise (2017): https://jissn.biomedcentral.com/counter/pdf/10.1186/s12970-017-0177-8.pdf
- Mifflin-St Jeor original equation abstract: https://scite.ai/reports/10.1093/ajcn/51.2.241
- RMR equation systematic review (Mifflin-St Jeor comparison): https://www.sciencedirect.com/science/article/abs/pii/S0002822305001495
- NIH News in Health, Healthy Weight Control: https://newsinhealth.nih.gov/2022/12/healthy-weight-control
- NIDDK Body Weight Planner: https://www.niddk.nih.gov/health-information/weight-management/body-weight-planner
- Academy of Nutrition and Dietetics pediatric overweight/obesity position: https://www.jandonline.org/article/S2212-2672(22)00039-9/fulltext
- Canadian Paediatric Society, dieting in adolescence: https://cps.ca/en/documents/position/dieting-in-adolescence
- ESPEN protein recommendations for older adults: https://www.espen.org/files/PIIS0261561414001113.pdf
