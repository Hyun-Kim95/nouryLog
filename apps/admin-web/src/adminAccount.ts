import { apiFetch } from './api';

export async function changeAdminPassword(
  token: string,
  payload: { currentPassword: string; newPassword: string },
): Promise<{ ok: true }> {
  return apiFetch('/admin/me/password', {
    method: 'PATCH',
    token,
    body: JSON.stringify(payload),
  });
}
