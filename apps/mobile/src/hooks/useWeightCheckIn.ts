import { useCallback, useState } from 'react';
import { getWeightCheckInStatus, postWeightEntry, type WeightCheckInStatus } from '../api/weightEntries';
import { ensureAccessToken } from '../authSession';
import { todayAnchorKst } from '../lib/statsPeriod';
import { getWeightPromptDismissedYmd, setWeightPromptDismissedYmd } from '../userPrefs';

export function useWeightCheckIn() {
  const [weightStatus, setWeightStatus] = useState<WeightCheckInStatus | null>(null);
  const [weightModalVisible, setWeightModalVisible] = useState(false);
  const [authToken, setAuthToken] = useState<string | null>(null);

  const refreshWeightStatus = useCallback(async (opts?: { openModalIfDue?: boolean }) => {
    const token = await ensureAccessToken();
    if (!token) return null;
    setAuthToken(token);
    const status = await getWeightCheckInStatus(token).catch(() => null);
    if (!status) return null;
    setWeightStatus(status);
    if (opts?.openModalIfDue) {
      const dismissedYmd = await getWeightPromptDismissedYmd();
      const todayKst = todayAnchorKst();
      if (status.due && dismissedYmd !== todayKst) {
        setWeightModalVisible(true);
      }
    }
    return status;
  }, []);

  const openWeightModal = useCallback(() => {
    void (async () => {
      const token = await ensureAccessToken();
      if (token) setAuthToken(token);
      setWeightModalVisible(true);
    })();
  }, []);

  const dismissWeightModalLater = useCallback(() => {
    void setWeightPromptDismissedYmd(todayAnchorKst());
    setWeightModalVisible(false);
  }, []);

  const onWeightSaved = useCallback(
    (result: Awaited<ReturnType<typeof postWeightEntry>>) => {
      setWeightModalVisible(false);
      setWeightStatus({
        due: false,
        lastRecordedAt: result.entry.recordedAt,
        lastWeightKg: result.entry.weightKg,
        daysSince: 0,
      });
    },
    [],
  );

  return {
    weightStatus,
    weightModalVisible,
    authToken,
    refreshWeightStatus,
    openWeightModal,
    dismissWeightModalLater,
    onWeightSaved,
    setWeightModalVisible,
  };
}
