const { withProjectBuildGradle, createRunOncePlugin } = require('@expo/config-plugins');

const KAKAO_MAVEN_REPO = 'https://devrepo.kakao.com/nexus/content/groups/public/';

/**
 * @react-native-seoul/kakao-login 은 카카오 SDK를 Kakao Maven에서 받는다.
 * prebuild 기본 build.gradle 에 저장소가 없어 로컬/EAS assembleDebug 가 실패할 수 있다.
 */
function withKakaoMavenRepository(config) {
  return withProjectBuildGradle(config, (gradle) => {
    if (gradle.modResults.language !== 'groovy') {
      return gradle;
    }
    if (gradle.modResults.contents.includes('devrepo.kakao.com')) {
      return gradle;
    }
    const injected = `maven { url '${KAKAO_MAVEN_REPO}' }`;
    if (gradle.modResults.contents.includes('jitpack.io')) {
      gradle.modResults.contents = gradle.modResults.contents.replace(
        /maven\s*\{\s*url\s*['"]https:\/\/www\.jitpack\.io['"]\s*\}/,
        `maven { url 'https://www.jitpack.io' }\n    ${injected}`,
      );
    } else {
      gradle.modResults.contents = gradle.modResults.contents.replace(
        /allprojects\s*\{\s*repositories\s*\{/,
        `allprojects {\n  repositories {\n    ${injected}`,
      );
    }
    return gradle;
  });
}

module.exports = createRunOncePlugin(withKakaoMavenRepository, 'with-kakao-maven-repository', '1.0.0');
