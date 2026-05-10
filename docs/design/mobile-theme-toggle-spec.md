---
type: design-spec
project: dietManagement
doc_lane: design
parent: docs/requirements/feature-mobile-theme-toggle-prd.md
related:
  - docs/design/mobile-onboarding-spec.md
  - docs/design/mobile-profile-extra-spec.md
  - .cursor/rules/40-dark-mode.mdc
updated_at: 2026-05-09
tags: [design, mobile, theme, dark-mode, settings]
---

# 모바일 테마 사용자 토글 디자인 스펙 v0.1 (draft)

## 0) 출처 / 이중 안 정책

- 안 B(SSOT): Stitch 디자인 시스템(`docs/design/stitch-system-summary.md`) DS v1의 라이트/다크 팔레트와 모바일 `theme.tsx`의 기존 토큰. 신규 토큰 추가 없음.
- 안 A(로컬 와이어): **본 트랙도 작은 범위 예외**로 65-design-gate 이중안 정책에서 제외.
- 사유: 단일 카드(헤더 1행 + 본문 1행 + Segmented 1행)이며, 같은 `Segmented` 컴포넌트가 직전 트랙들에서 이미 검증됨. 디자인 변동성이 낮음.
- 보완: 본 스펙 §2~§3에 텍스트 와이어로 충분히 명세하고, 별도 안 A를 만들지 않는다. emergent-rule 후보(작은 범위 단일 컴포넌트 보강은 안 A 면제 가능)가 본 트랙으로 세 번째 적용되며, 정식 규칙 승격은 사용자 승인 후.

## 1) 진입점

- Subscription 탭(`apps/mobile/src/screens/SubscriptionScreen.tsx`).
- 위치: 기존 "내 프로필" 카드(상단)와 "구독 · 복구" 섹션 사이.
- 진입은 카드 내 Segmented 직접 조작으로 완결. 별도 화면 push 없음.

## 2) 카드 구조 (와이어)

```
┌──────────────────────────────────────┐
│ 내 프로필                             │  (기존 카드 그대로)
│ 활동량·목표를 입력하면 …               │
│ [ 프로필 편집 ]                       │
└──────────────────────────────────────┘

┌──────────────────────────────────────┐  ← 신규
│ 테마                                  │  caption, fgMuted, weight 700
│ 라이트와 다크 모드를 직접 선택할 수    │  body, fg
│ 있어요. 변경 즉시 반영되고 다음        │
│ 실행에도 유지됩니다.                   │
│                                      │
│ ┌────────────┬────────────┐          │
│ │  라이트     │   다크     │          │
│ └────────────┴────────────┘          │
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│ 구독 · 복구                           │  (기존 그대로)
│ …                                    │
└──────────────────────────────────────┘
```

- 카드 컨테이너: `padding=spacing.md`, `radius=radius.md`, `borderWidth=1`, `borderColor=colors.border`, `backgroundColor=colors.surface`, `gap=spacing.sm`.
- "내 프로필" 카드와 동일한 스타일을 사용하여 시각적 일관성 유지.
- Segmented는 카드 본문 텍스트 아래 spacing.sm 만큼 띄우고, 가로 100% 폭.

## 3) ThemeToggle 컴포넌트 (신규)

기존 `Segmented`(`apps/mobile/src/components/Segmented.tsx`)를 그대로 재사용한다. 별도 컴포넌트로 둘 만한 별도 로직이 없으므로 SubscriptionScreen 안에서 인라인으로 구성하거나, 재사용성을 위해 얇은 래퍼만 둔다.

권장: SubscriptionScreen 안에 인라인으로 두고, 후속 트랙에서 진입점이 추가될 때 컴포넌트로 추출.

### 3.1 데이터

```ts
type UserThemeMode = 'light' | 'dark';

const OPTIONS: { value: UserThemeMode; label: string }[] = [
  { value: 'light', label: '라이트' },
  { value: 'dark', label: '다크' },
];
```

### 3.2 시각 / 토큰

- 미선택 옵션: `surface2` 배경, `fgMuted` 텍스트.
- 선택 옵션: `primary` 배경, `primaryFg` 텍스트.
- 보더: `border` 1px.
- 라이트/다크 양 팔레트 모두 4.5:1 이상 대비(기존 `theme.tsx` 토큰 그대로 충족).

### 3.3 인터랙션

- 탭 즉시: `setUserMode(next)` → SecureStore write(비동기, 결과 무시) → ThemeProvider 재계산.
- 같은 옵션 재탭: 무동작(테마는 항상 둘 중 하나).
- 트랜지션: 200ms 색상 보간(컴포넌트 기본 동작 그대로).

## 4) ThemeProvider 변경 (구현 노트)

### 4.1 상태 모델

```ts
type UserThemeMode = 'light' | 'dark';
type ResolvedMode = 'light' | 'dark';

const [userMode, setUserMode] = useState<UserThemeMode | null>(null);
```

- `null`: 부팅 직후, SecureStore 로드 전. children 미렌더.
- `'light' | 'dark'`: 결정됨. children 정상 렌더.

### 4.2 부팅 로드 / 첫 부팅 시드

```ts
useEffect(() => {
  let cancelled = false;
  (async () => {
    const saved = await getThemeMode(); // SecureStore 'dm_theme_mode'
    if (cancelled) return;
    if (saved === 'light' || saved === 'dark') {
      setUserMode(saved);
    } else {
      const seed: UserThemeMode = scheme === 'dark' ? 'dark' : 'light';
      setUserMode(seed);
      void setThemeModeStored(seed); // 첫 부팅 시드 저장
    }
  })();
  return () => { cancelled = true; };
}, []);
```

- `scheme = useColorScheme()`은 첫 부팅 시드 결정에만 사용.
- 이후 OS 변경에는 재반응하지 않음(useEffect deps `[]`).

### 4.3 우선순위

```ts
const resolvedMode: ResolvedMode =
  themeOverride === 'light' ? 'light'
  : themeOverride === 'dark' ? 'dark'
  : userMode!; // userMode === null일 때는 children 미렌더 분기에서 미도달
```

### 4.4 렌더 분기

```tsx
if (userMode === null) return null; // 부팅 1프레임 보호
return (
  <ThemeContext.Provider value={{ mode: resolvedMode, ...tokens }}>
    {children}
  </ThemeContext.Provider>
);
```

> App.tsx의 `initialRoute === null` 보호 분기와 같은 시점에 결정되므로 사용자가 깜빡임을 인지할 가능성은 0에 가깝다(둘 다 SecureStore read 한 번).

## 5) 영속 저장

### 5.1 모듈 분리

- 신규 모듈 `apps/mobile/src/userPrefs.ts`(또는 `authStorage.ts` 확장 — 도메인이 다르므로 분리 권장).
- 키: `dm_theme_mode`.
- API:

```ts
export async function getThemeMode(): Promise<'light' | 'dark' | null>;
export async function setThemeModeStored(mode: 'light' | 'dark'): Promise<void>;
```

### 5.2 clearTokens와 분리

- 본 키는 **로그아웃 시 삭제하지 않는다**(테마는 디바이스 선호 유지가 자연스러움).
- `authStorage.clearTokens()`는 기존 동작 그대로 유지.

## 6) 상태 처리 (5상태)

| 상태 | 표현 |
|---|---|
| 기본 | 현재 모드 측이 `primary` 배경으로 강조 |
| 로딩 | 부팅 시드 결정 전 ThemeProvider children 미렌더(SubscriptionScreen 자체 미진입) |
| 빈 데이터 | N/A |
| 오류 | SecureStore write 실패 시 콘솔 warn, UI는 즉시 반영 유지 |
| 완료 | 즉시 시각적 전환이 완료 신호 |
| 권한 제한 | N/A |

## 7) 반응형 / 안전 영역

- Subscription 탭 컨테이너의 `padding=spacing.lg`, `gap=spacing.md`를 그대로 따른다.
- 카드 폭은 화면 폭에서 좌우 padding 제외한 100%.
- 태블릿(폭 ≥ 768): SubscriptionScreen 전체 max-width를 두지 않고 자연 너비. 카드 자체가 자체 패딩으로 보호되므로 추가 분기 불필요.
- 안전 영역: `SafeAreaProvider` 기본값 그대로.

## 8) 다크모드 / 토큰 정합

- 카드 자체가 양 팔레트에서 자연스럽게 표현되어야 함.
- 라이트: `surface=#ffffff`, `border=#e2e8f0`, `fg=#0f172a`, `primary=#16a34a`, `primaryFg=#ffffff`, `surface2=#f8fafc`.
- 다크: `surface=#111827`, `border=#334155`, `fg=#f8fafc`, `primary=#22c55e`, `primaryFg=#052e16`, `surface2=#1f2937`.
- Segmented 미선택은 `surface2`, 선택은 `primary` + `primaryFg`. 다크에서 선택된 옵션의 텍스트 색이 `#052e16`이라 밝은 배경 위 어두운 텍스트로 충분한 대비(4.5:1 이상).

## 9) 인터랙션 / 모션

- 탭 → Segmented 자체의 active 트랜지션(200ms) + 화면 전체 ThemeContext 갱신은 즉시 한 프레임에 발생.
- 화면 전체 fade-in/out은 별도 적용하지 않음(과도한 모션 회피, 단순 즉시 전환).

## 10) 접근성

- Segmented 옵션마다 `accessibilityRole="button"`, `accessibilityState={{ selected: mode === option }}`.
- accessibilityLabel: `라이트 모드 선택`, `다크 모드 선택`.
- 텍스트 대비는 양 팔레트에서 4.5:1 이상.
- 시스템 폰트 스케일 추종.

## 11) DevPanel 관계

- 본 트랙은 DevPanel 코드를 변경하지 않는다.
- DevPanel의 `themeOverride` Segmented는 dev 빌드에서 그대로 노출되며, `'system'`(기본) 상태일 때만 사용자 모드가 적용된다(우선순위 §4.3).
- DevPanel `themeOverride`로 강제 적용 중일 때 SubscriptionScreen 카드의 Segmented selected 표시는 **사용자 모드 기준**으로 둔다(SecureStore 저장된 값을 보여줌). 이 경우 화면 색은 DevPanel 강제값을 따르고 카드 selected 표시와 화면 색이 다를 수 있다는 한계가 있으나, dev 한정이라 허용한다.

## 12) 시각 점검 체크리스트(h8 검증용)

- [ ] 첫 부팅(앱 데이터 클린): OS가 다크면 다크, 라이트면 라이트로 시작.
- [ ] 첫 부팅 직후 앱 강제 종료 → 재실행 시 SecureStore 저장값으로 일관 시작(시스템과 무관).
- [ ] Subscription 탭에 "테마 설정" 카드가 "내 프로필" 카드 아래, "구독 · 복구" 위에 노출.
- [ ] 라이트 → 다크 Segmented 탭 시 즉시 전체 화면 전환.
- [ ] 다크 → 라이트로 다시 토글 시 즉시 복귀.
- [ ] 강제 종료 후 재실행 시 마지막 선택 유지.
- [ ] OS 시스템 다크/라이트 토글 → 앱은 무반응.
- [ ] DevPanel `themeOverride='light'/'dark'` 강제 시 사용자 모드 무시하고 즉시 화면 색 강제 적용. SecureStore 값은 변경되지 않음.
- [ ] DevPanel `themeOverride='system'` 복귀 시 사용자 모드로 즉시 복귀.
- [ ] 라이트/다크 두 팔레트에서 카드 보더·텍스트·Segmented 선택 표시 모두 4.5:1 이상 대비.

## 13) 변경 이력

- 2026-05-09 (v0.1 draft): 초안 작성. PRD v0.1 T1~T5 반영. h2.
