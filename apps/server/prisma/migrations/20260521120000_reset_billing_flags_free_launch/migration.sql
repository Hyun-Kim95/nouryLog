-- 1차 무료 출시(Policy v2): 남아 있는 프리미엄 entitlements 플래그 일괄 해제.
-- Play 구독 이력(PlaySubscriptionPurchase)은 유지; 2차 결제 재개 시 restore/검증으로 다시 반영 가능.
UPDATE "Billing"
SET "ocrPaidEnabled" = false,
    "adFreeEnabled" = false
WHERE "ocrPaidEnabled" = true
   OR "adFreeEnabled" = true;
