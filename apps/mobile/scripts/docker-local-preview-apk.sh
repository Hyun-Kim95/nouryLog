#!/usr/bin/env bash
# 내부 테스트용 APK — Docker(Linux)에서 eas build --local (Windows 호스트 우회)
set -euo pipefail

export DEBIAN_FRONTEND=noninteractive
export ANDROID_HOME=/opt/android-sdk
export ANDROID_SDK_ROOT=/opt/android-sdk
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
export PATH="$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/build-tools/35.0.0"

apt-get update -qq
apt-get install -y -qq openjdk-17-jdk-headless git curl ca-certificates unzip wget >/dev/null
java -version

if [ ! -x "$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager" ]; then
  mkdir -p "$ANDROID_HOME/cmdline-tools"
  cd /tmp
  wget -q https://dl.google.com/android/repository/commandlinetools-linux-13114758_latest.zip -O cmdtools.zip
  unzip -q cmdtools.zip -d "$ANDROID_HOME/cmdline-tools"
  rm -rf "$ANDROID_HOME/cmdline-tools/latest"
  mv "$ANDROID_HOME/cmdline-tools/cmdline-tools" "$ANDROID_HOME/cmdline-tools/latest"
fi

yes | sdkmanager --licenses >/tmp/sdk-licenses.log || true
sdkmanager --install "platform-tools" "platforms;android-35" "platforms;android-36" "build-tools;35.0.0" "build-tools;36.0.0" "ndk;27.1.12297006" "cmake;3.22.1"
test -x "$ANDROID_HOME/build-tools/35.0.0/aapt"
echo "SDK OK: $($ANDROID_HOME/build-tools/35.0.0/aapt version 2>&1 | head -1)"
export ANDROID_NDK_HOME="$ANDROID_HOME/ndk/27.1.12297006"

export ORG_GRADLE_PROJECT_reactNativeArchitectures=arm64-v8a
export GRADLE_OPTS="-Dorg.gradle.daemon=false -Dorg.gradle.workers.max=1 -Dorg.gradle.parallel=false -Xmx2g"
export NODE_OPTIONS="--max-old-space-size=2048"

# Host android/ is debug-oriented; let EAS local prebuild cleanly.
rm -rf /workspace/apps/mobile/android

cd /workspace
npm ci

npm install -g eas-cli@16.28.0 >/dev/null
eas whoami

mkdir -p /workspace/apps/mobile/dist
cd /workspace/apps/mobile
npx expo config --type public >/tmp/expo-config-check.txt
eas build --platform android --profile preview --local --non-interactive \
  --output /workspace/apps/mobile/dist/nourylog-preview.apk

ls -la /workspace/apps/mobile/dist/nourylog-preview.apk
echo "APK_READY=/workspace/apps/mobile/dist/nourylog-preview.apk"
