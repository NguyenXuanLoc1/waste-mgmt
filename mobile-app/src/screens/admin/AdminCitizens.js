import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, RefreshControl,
  TouchableOpacity, Modal, Alert, TextInput,
} from 'react-native';
import { getCitizens, adjustScore, calculateFee } from '../../services/api';
import { Card, Button, COLORS } from '../../components/UI';

function ScoreModal({ citizen, visible, onClose, onDone }) {
  const [delta, setDelta] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAdjust = async () => {
    if (!delta) return Alert.alert('Error', 'Enter a score delta (positive or negative)');
    setLoading(true);
    try {
      await adjustScore(citizen._id, parseInt(delta), reason);
      Alert.alert('✅ Score adjusted', `${delta > 0 ? '+' : ''}${delta} applied to ${citizen.name}`);
      onDone();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed');
    } finally { setLoading(false); }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalBox}>
          <Text style={styles.modalTitle}>Adjust Score: {citizen?.name}</Text>
          <Text style={styles.currentScore}>Current: {citizen?.behaviorScore} pts</Text>
          <TextInput
            style={styles.input}
            placeholder="Delta (e.g. +10 or -20)"
            value={delta}
            onChangeText={setDelta}
            keyboardType="numbers-and-punctuation"
          />
          <TextInput
            style={[styles.input, { height: 60 }]}
            placeholder="Reason (optional)"
            value={reason}
            onChangeText={setReason}
            multiline
          />
          <Button title="Apply" onPress={handleAdjust} loading={loading} />
          <Button title="Cancel" color={COLORS.gray} onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

function CitizenCard({ citizen, onAdjust, onCalcFee }) {
  const scoreColor = citizen.behaviorScore >= 120 ? COLORS.primary : citizen.behaviorScore >= 80 ? COLORS.warning : COLORS.danger;
  return (
    <Card>
      <View style={styles.row}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{citizen.name.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.name}>{citizen.name}</Text>
          <Text style={styles.email}>{citizen.email}</Text>
        </View>
        <View style={[styles.scoreBadge, { backgroundColor: scoreColor }]}>
          <Text style={styles.scoreText}>{citizen.behaviorScore}</Text>
          <Text style={styles.scoreLbl}>pts</Text>
        </View>
      </View>
      <View style={styles.actRow}>
        <Button title="⭐ Score" color={COLORS.info} onPress={() => onAdjust(citizen)} style={styles.actBtn} />
        <Button title="💰 Calc Fee" color={COLORS.warning} onPress={() => onCalcFee(citizen._id)} style={styles.actBtn} />
      </View>
    </Card>
  );
}

export default function AdminCitizens() {
  const [citizens, setCitizens] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCitizen, setSelectedCitizen] = useState(null);

  const load = async () => {
    try {
      const { data } = await getCitizens();
      setCitizens(data);
    } catch {}
  };

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };
  useEffect(() => { load(); }, []);

  const handleCalcFee = async (citizenId) => {
    try {
      const { data } = await calculateFee(citizenId);
      Alert.alert(
        `💰 Fee: ${data.citizen.name}`,
        `Score: ${data.citizen.behaviorScore}\n` +
        `Organic: ${data.weights.organic}kg\nRecyclable: ${data.weights.recyclable}kg\nHazardous: ${data.weights.hazardous}kg\n` +
        `Base fee: $${data.baseFee}\nDiscount: ${data.discount}\nFinal fee: $${data.finalFee}`
      );
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Could not calculate');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Citizens ({citizens.length})</Text>
      <Text style={styles.sub}>Sorted by highest score</Text>

      <FlatList
        data={citizens}
        keyExtractor={(c) => c._id}
        renderItem={({ item }) => (
          <CitizenCard
            citizen={item}
            onAdjust={(c) => setSelectedCitizen(c)}
            onCalcFee={handleCalcFee}
          />
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.empty}><Text style={styles.emptyText}>No citizens found</Text></View>
        }
        contentContainerStyle={{ paddingBottom: 40 }}
      />

      {selectedCitizen && (
        <ScoreModal
          citizen={selectedCitizen}
          visible={!!selectedCitizen}
          onClose={() => setSelectedCitizen(null)}
          onDone={() => { setSelectedCitizen(null); load(); }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.light, padding: 16 },
  title: { fontSize: 20, fontWeight: '800', color: COLORS.dark },
  sub: { fontSize: 13, color: COLORS.gray, marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 18 },
  info: { flex: 1 },
  name: { fontWeight: '700', color: COLORS.dark, fontSize: 15 },
  email: { fontSize: 12, color: COLORS.gray },
  scoreBadge: { padding: 8, borderRadius: 10, alignItems: 'center', minWidth: 50 },
  scoreText: { color: '#fff', fontWeight: '900', fontSize: 18 },
  scoreLbl: { color: '#fff', fontSize: 10 },
  actRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  actBtn: { flex: 1, marginVertical: 0, padding: 10 },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyText: { color: COLORS.gray, fontSize: 15 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: COLORS.dark, marginBottom: 4 },
  currentScore: { color: COLORS.gray, marginBottom: 12 },
  input: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 12,
    fontSize: 15, marginBottom: 10, color: COLORS.dark,
  },
});
