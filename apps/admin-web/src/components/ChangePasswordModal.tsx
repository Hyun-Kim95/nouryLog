import { useEffect, useState } from 'react';
import { changeAdminPassword } from '../adminAccount';
import { useToast } from '../toast/useToast';
import { Modal } from './Modal';

type ChangePasswordModalProps = {
  open: boolean;
  onClose: () => void;
  token: string | null;
};

export function ChangePasswordModal({ open, onClose, token }: ChangePasswordModalProps) {
  const toast = useToast();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const resetForm = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  useEffect(() => {
    if (!open) resetForm();
  }, [open]);

  const handleClose = () => {
    if (busy) return;
    onClose();
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || busy) return;
    if (newPassword.length < 6) {
      toast.show({ kind: 'error', message: '새 비밀번호는 6자 이상이어야 합니다.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.show({ kind: 'error', message: '새 비밀번호 확인이 일치하지 않습니다.' });
      return;
    }
    setBusy(true);
    try {
      await changeAdminPassword(token, { currentPassword, newPassword });
      resetForm();
      onClose();
      toast.show({ kind: 'success', message: '비밀번호를 변경했어요.' });
    } catch (er) {
      const msg = er instanceof Error ? er.message : '비밀번호를 변경하지 못했습니다.';
      toast.show({ kind: 'error', message: msg });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="비밀번호 변경"
      size="sm"
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={handleClose} disabled={busy}>
            취소
          </button>
          <button type="submit" form="change-password-form" className="btn btn-primary" disabled={busy}>
            {busy ? '변경 중…' : '변경'}
          </button>
        </>
      }
    >
      <form id="change-password-form" className="login-form" onSubmit={(e) => void onSubmit(e)}>
        <label className="login-field">
          <span>현재 비밀번호</span>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </label>
        <label className="login-field">
          <span>새 비밀번호</span>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={6}
            autoComplete="new-password"
          />
        </label>
        <label className="login-field">
          <span>새 비밀번호 확인</span>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={6}
            autoComplete="new-password"
          />
        </label>
      </form>
    </Modal>
  );
}
