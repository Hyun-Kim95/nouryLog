import { useCallback, useEffect, useState } from 'react';
import { Button, FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { apiFetch } from '../api';
import { getAccessToken } from '../authStorage';

type MealRow = { mealId: string; name: string; calories: number; consumedAt: string };

export function LogScreen() {
  const [items, setItems] = useState<MealRow[]>([]);
  const [name, setName] = useState('샐러드');
  const [calories, setCalories] = useState('320');
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = await getAccessToken();
    if (!token) return;
    const res = await apiFetch<{ items: MealRow[] }>('/meals?page=1&size=15', { token });
    setItems(res.items);
  }, []);

  useEffect(() => {
    void load().catch(() => setItems([]));
  }, [load]);

  const addMeal = async () => {
    setMsg(null);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error('로그인 필요');
      await apiFetch('/meals', {
        method: 'POST',
        token,
        body: JSON.stringify({
          name,
          calories: Number(calories),
          carbohydrate: 40,
          protein: 12,
          fat: 10,
          consumedAt: new Date().toISOString(),
        }),
      });
      setMsg('저장됨');
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : '실패');
    }
  };

  const runOcr = async () => {
    setMsg(null);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error('로그인 필요');
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) throw new Error('갤러리 접근 권한이 필요합니다.');

      const picked = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        base64: true,
        allowsEditing: false,
      });
      if (picked.canceled || !picked.assets[0]) {
        setMsg('이미지 선택이 취소되었습니다.');
        return;
      }
      const imageBase64 = picked.assets[0].base64;
      if (!imageBase64) throw new Error('이미지 인코딩(base64)에 실패했습니다.');

      const res = await apiFetch<{
        calories: number;
        carbohydrate: number;
        protein: number;
        fat: number;
        confidence: number;
        missingFields: string[];
        remainingFreeQuota: number;
      }>('/nutrition/ocr', {
        method: 'POST',
        token,
        body: JSON.stringify({ imageBase64 }),
      });
      setMsg(
        `OCR 완료 · kcal ${res.calories}, 탄 ${res.carbohydrate}, 단 ${res.protein}, 지 ${res.fat}` +
          ` · 신뢰도 ${Math.round(res.confidence * 100)}% · 남은 무료 ${res.remainingFreeQuota}`,
      );
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'OCR 실패');
    }
  };

  return (
    <View style={styles.box}>
      <Text style={styles.title}>기록 · OCR</Text>
      {msg ? <Text style={styles.msg}>{msg}</Text> : null}
      <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="음식명" />
      <TextInput style={styles.input} value={calories} onChangeText={setCalories} keyboardType="numeric" placeholder="칼로리" />
      <Button title="기록 추가" onPress={() => void addMeal()} />
      <Button title="OCR (이미지 선택 후 분석)" onPress={() => void runOcr()} />
      <FlatList
        data={items}
        keyExtractor={(it) => it.mealId}
        renderItem={({ item }) => (
          <Text style={styles.row}>
            {item.name} · {item.calories}kcal · {item.consumedAt.slice(0, 10)}
          </Text>
        )}
        ListEmptyComponent={<Text style={styles.empty}>기록이 없습니다.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flex: 1, padding: 16, gap: 10 },
  title: { fontSize: 20, fontWeight: '700' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10 },
  row: { paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#ddd' },
  empty: { color: '#666', marginTop: 12 },
  msg: { color: '#2563eb' },
});
