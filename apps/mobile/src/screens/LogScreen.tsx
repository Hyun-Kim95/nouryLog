import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Button,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { apiFetch } from '../api';
import { getAccessToken } from '../authStorage';

type MealRow = {
  mealId: string;
  name: string;
  calories: number;
  consumedAt: string;
  foodTemplateId?: string | null;
  mealInputMode?: string | null;
  portionQuantity?: number | null;
};

type FoodTemplateItem = {
  id: string;
  name: string;
  memo: string | null;
  category: string | null;
  portionUnit: string;
  portionLabel: string | null;
  servingGrams: number;
  calories: number;
  protein: number;
  fat: number;
  carbohydrate: number;
};

type EntryMode = 'manual' | 'template';
type TemplateInputMode = 'PORTION_COUNT' | 'TOTAL_GRAMS';

function unitHint(t: FoodTemplateItem): string {
  if (t.portionUnit === 'GRAM') return 'g';
  if (t.portionLabel) return t.portionLabel;
  if (t.portionUnit === 'PIECE') return '개';
  if (t.portionUnit === 'PLATE') return '접시';
  if (t.portionUnit === 'BOWL') return '공기';
  return '단위';
}

export function LogScreen() {
  const [items, setItems] = useState<MealRow[]>([]);
  const [name, setName] = useState('샐러드');
  const [calories, setCalories] = useState('320');
  const [msg, setMsg] = useState<string | null>(null);

  const [entryMode, setEntryMode] = useState<EntryMode>('manual');
  const [templates, setTemplates] = useState<FoodTemplateItem[]>([]);
  const [tplLoading, setTplLoading] = useState(false);
  const [selectedTpl, setSelectedTpl] = useState<FoodTemplateItem | null>(null);
  const [mealInputMode, setMealInputMode] = useState<TemplateInputMode>('PORTION_COUNT');
  const [tplAmount, setTplAmount] = useState('1');

  const load = useCallback(async () => {
    const token = await getAccessToken();
    if (!token) return;
    const res = await apiFetch<{ items: MealRow[] }>('/meals?page=1&size=15', { token });
    setItems(res.items);
  }, []);

  const loadTemplates = useCallback(async () => {
    const token = await getAccessToken();
    if (!token) return;
    setTplLoading(true);
    try {
      const res = await apiFetch<{ items: FoodTemplateItem[] }>('/me/food-templates?page=1&size=100', { token });
      setTemplates(res.items ?? []);
    } catch {
      setTemplates([]);
    } finally {
      setTplLoading(false);
    }
  }, []);

  useEffect(() => {
    void load().catch(() => setItems([]));
  }, [load]);

  useEffect(() => {
    if (entryMode === 'template') {
      void loadTemplates();
    }
  }, [entryMode, loadTemplates]);

  const addMeal = async () => {
    setMsg(null);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error('로그인 필요');

      if (entryMode === 'template') {
        if (!selectedTpl) throw new Error('음식 템플릿을 선택해 주세요.');
        const amt = Number(String(tplAmount).replace(',', '.'));
        if (!Number.isFinite(amt) || amt <= 0) throw new Error('수량을 올바르게 입력해 주세요.');

        const body: Record<string, unknown> = {
          foodTemplateId: selectedTpl.id,
          mealInputMode,
          consumedAt: new Date().toISOString(),
        };
        if (mealInputMode === 'PORTION_COUNT') {
          body.portionQuantity = amt;
        } else {
          body.totalGrams = amt;
        }

        await apiFetch('/meals', {
          method: 'POST',
          token,
          body: JSON.stringify(body),
        });
      } else {
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
      }
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

  const previewKcal =
    selectedTpl && Number.isFinite(Number(tplAmount))
      ? (() => {
          const amt = Number(String(tplAmount).replace(',', '.'));
          if (!Number.isFinite(amt) || amt <= 0 || !(selectedTpl.servingGrams > 0)) return null;
          const g =
            mealInputMode === 'PORTION_COUNT' ? amt * selectedTpl.servingGrams : amt;
          const scale = g / selectedTpl.servingGrams;
          return Math.round(selectedTpl.calories * scale);
        })()
      : null;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.box}>
      <Text style={styles.title}>기록 · OCR</Text>
      {msg ? <Text style={styles.msg}>{msg}</Text> : null}

      <Text style={styles.section}>입력 방식</Text>
      <View style={styles.rowBtns}>
        <Pressable
          onPress={() => setEntryMode('manual')}
          style={[styles.chip, entryMode === 'manual' && styles.chipOn]}
        >
          <Text style={styles.chipText}>직접 입력</Text>
        </Pressable>
        <Pressable
          onPress={() => setEntryMode('template')}
          style={[styles.chip, entryMode === 'template' && styles.chipOn]}
        >
          <Text style={styles.chipText}>템플릿</Text>
        </Pressable>
      </View>

      {entryMode === 'manual' ? (
        <>
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="음식명" />
          <TextInput
            style={styles.input}
            value={calories}
            onChangeText={setCalories}
            keyboardType="numeric"
            placeholder="칼로리"
          />
        </>
      ) : (
        <>
          {tplLoading ? (
            <ActivityIndicator />
          ) : templates.length === 0 ? (
            <Text style={styles.hint}>등록된 템플릿이 없거나 불러오지 못했습니다.</Text>
          ) : (
            <FlatList
              horizontal
              data={templates}
              keyExtractor={(it) => it.id}
              style={styles.tplList}
              contentContainerStyle={{ gap: 8 }}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => setSelectedTpl(item)}
                  style={[styles.tplChip, selectedTpl?.id === item.id && styles.tplChipOn]}
                >
                  <Text style={styles.tplChipText}>{item.name}</Text>
                </Pressable>
              )}
            />
          )}
          {selectedTpl ? (
            <>
              <Text style={styles.hint}>
                기준: {selectedTpl.servingGrams}g당 kcal {selectedTpl.calories} · 단위: {unitHint(selectedTpl)}
              </Text>
              <View style={styles.rowBtns}>
                <Pressable
                  onPress={() => setMealInputMode('PORTION_COUNT')}
                  style={[styles.chip, mealInputMode === 'PORTION_COUNT' && styles.chipOn]}
                >
                  <Text style={styles.chipText}>분량 수</Text>
                </Pressable>
                <Pressable
                  onPress={() => setMealInputMode('TOTAL_GRAMS')}
                  style={[styles.chip, mealInputMode === 'TOTAL_GRAMS' && styles.chipOn]}
                >
                  <Text style={styles.chipText}>총 g</Text>
                </Pressable>
              </View>
              <TextInput
                style={styles.input}
                value={tplAmount}
                onChangeText={setTplAmount}
                keyboardType="decimal-pad"
                placeholder={mealInputMode === 'PORTION_COUNT' ? `몇 ${unitHint(selectedTpl)}?` : '총 몇 g?'}
              />
              {previewKcal != null ? (
                <Text style={styles.hint}>예상 칼로리 약 {previewKcal} kcal</Text>
              ) : null}
            </>
          ) : null}
        </>
      )}

      <Button title="기록 추가" onPress={() => void addMeal()} />
      <Button title="OCR (이미지 선택 후 분석)" onPress={() => void runOcr()} />

      <FlatList
        scrollEnabled={false}
        data={items}
        keyExtractor={(it) => it.mealId}
        renderItem={({ item }) => (
          <Text style={styles.row}>
            {item.name} · {item.calories}kcal · {item.consumedAt.slice(0, 10)}
            {item.foodTemplateId && item.mealInputMode === 'PORTION_COUNT' && item.portionQuantity != null
              ? ` · ×${item.portionQuantity}`
              : ''}
          </Text>
        )}
        ListEmptyComponent={<Text style={styles.empty}>기록이 없습니다.</Text>}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  box: { padding: 16, gap: 10, paddingBottom: 32 },
  title: { fontSize: 20, fontWeight: '700' },
  section: { fontSize: 14, fontWeight: '600', marginTop: 4 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10 },
  row: { paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#ddd' },
  empty: { color: '#666', marginTop: 12 },
  msg: { color: '#2563eb' },
  hint: { color: '#555', fontSize: 13 },
  rowBtns: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#f5f5f5',
  },
  chipOn: { borderColor: '#2563eb', backgroundColor: '#e8efff' },
  chipText: { fontSize: 14 },
  tplList: { maxHeight: 44 },
  tplChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#fafafa',
  },
  tplChipOn: { borderColor: '#2563eb', backgroundColor: '#e8efff' },
  tplChipText: { fontSize: 14 },
});
