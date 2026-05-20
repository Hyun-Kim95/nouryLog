# EAS production Secret 등록 예시 (값은 직접 채운 뒤 실행)
# cd apps/mobile 후 실행하거나 -w mobile 과 함께 사용

$ErrorActionPreference = 'Stop'

$PROD_API = 'https://api-server-production-52bc.up.railway.app'

Write-Host "EXPO_PUBLIC_API_URL (고정)"
# npx eas-cli secret:create --scope project --name EXPO_PUBLIC_API_URL --value $PROD_API

Write-Host @"

아래는 본인 콘솔 값으로 교체 후 주석 해제:

# npx eas-cli secret:create --scope project --name EXPO_PUBLIC_NAVER_CLIENT_ID --value "..."
# npx eas-cli secret:create --scope project --name EXPO_PUBLIC_NAVER_CLIENT_SECRET --value "..."
# npx eas-cli secret:create --scope project --name EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY --value "..."
# npx eas-cli secret:create --scope project --name EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID --value "..."
# npx eas-cli secret:create --scope project --name ADMOB_ANDROID_APP_ID --value "ca-app-pub-..."
# npx eas-cli secret:create --scope project --name EXPO_PUBLIC_ADMOB_BANNER_ANDROID --value "ca-app-pub-..."

Secret 준비 후:
# npx eas-cli build --profile production --platform android
"@
