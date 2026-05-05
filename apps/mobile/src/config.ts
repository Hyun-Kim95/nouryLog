/** 실제 기기에서는 PC LAN IP로 변경 (예: http://192.168.0.10:3000). Android 에뮬레이터: http://10.0.2.2:3000 */
export const API_BASE = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000').replace(/\/$/, '');
