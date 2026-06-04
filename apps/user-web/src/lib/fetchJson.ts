/** fetch 응답을 JSON으로 파싱. 빈 본문·프록시 오류 시 사용자 친화 메시지 */
export async function parseJsonResponse<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text.trim()) {
    if (res.status === 502 || res.status === 504) {
      throw new Error(
        'API 서버에 연결할 수 없습니다. apps/server가 실행 중인지, user-web `.env.local`의 VITE_DEV_API_TARGET 포트(예: 3002)가 맞는지 확인하세요.',
      );
    }
    throw new Error(`서버 응답이 비어 있습니다 (HTTP ${res.status}).`);
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(
      text.length > 120 ? `${text.slice(0, 120)}…` : text || `응답 파싱 실패 (HTTP ${res.status})`,
    );
  }
}
