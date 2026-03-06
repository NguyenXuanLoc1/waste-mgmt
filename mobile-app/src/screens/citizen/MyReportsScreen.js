import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  Image, RefreshControl, TouchableOpacity,
} from 'react-native';
import { getMyReports } from '../../services/api';
import { Card, Badge, COLORS } from '../../components/UI';

const CATEGORY_ICONS = { organic: '🌿', recyclable: '♻️', hazardous: '☢️', other: '🗑️' };

function ReportCard({ report }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <TouchableOpacity onPress={() => setExpanded(!expanded)}>
      <Card>
        <View style={styles.row}>
          <Image source={{ uri: report.photoUrl }} style={styles.thumb} />
          <View style={styles.info}>
            <View style={styles.rowBetween}>
              <Text style={styles.cat}>
                {CATEGORY_ICONS[report.wasteCategory]} {report.wasteCategory}
              </Text>
              <Badge label={report.status} />
            </View>
            <Text style={styles.date}>
              {new Date(report.createdAt).toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric',
              })}
            </Text>
            {report.description ? (
              <Text style={styles.desc} numberOfLines={expanded ? undefined : 1}>
                {report.description}
              </Text>
            ) : null}
          </View>
        </View>
        {expanded && (
          <View style={styles.details}>
            <Text style={styles.detailText}>
              📍 {report.location?.address || `${report.location?.latitude?.toFixed(4)}, ${report.location?.longitude?.toFixed(4)}`}
            </Text>
            {report.status === 'completed' && (
              <>
                <Text style={styles.detailText}>💰 Fee: ${report.collectionFee?.toFixed(2)}</Text>
                <Text style={styles.detailText}>
                  ⚖️ Organic: {report.weights?.organic}kg | Recyclable: {report.weights?.recyclable}kg | Hazardous: {report.weights?.hazardous}kg
                </Text>
              </>
            )}
            {report.status === 'rejected' && report.rejectionReason && (
              <Text style={[styles.detailText, { color: COLORS.danger }]}>
                ❌ Reason: {report.rejectionReason}
              </Text>
            )}
            {report.aiAnalysis?.notes ? (
              <Text style={styles.aiNote}>🤖 AI: {report.aiAnalysis.notes}</Text>
            ) : null}
          </View>
        )}
      </Card>
    </TouchableOpacity>
  );
}

export default function MyReportsScreen() {
  const [reports, setReports] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const { data } = await getMyReports();
      setReports(data);
    } catch {}
  };

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };
  useEffect(() => { load(); }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Reports ({reports.length})</Text>
      <FlatList
        data={reports}
        keyExtractor={(r) => r._id}
        renderItem={({ item }) => <ReportCard report={item} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No reports yet. Submit your first report!</Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 40 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.light, padding: 16 },
  title: { fontSize: 20, fontWeight: '800', color: COLORS.dark, marginBottom: 12 },
  row: { flexDirection: 'row', gap: 12 },
  thumb: { width: 70, height: 70, borderRadius: 8, backgroundColor: COLORS.border },
  info: { flex: 1 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cat: { fontWeight: '700', color: COLORS.dark, fontSize: 14, textTransform: 'capitalize' },
  date: { fontSize: 12, color: COLORS.gray, marginTop: 2 },
  desc: { fontSize: 13, color: COLORS.gray, marginTop: 4 },
  details: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border },
  detailText: { fontSize: 13, color: COLORS.dark, marginBottom: 4 },
  aiNote: { fontSize: 12, color: COLORS.info, marginTop: 4, fontStyle: 'italic' },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyText: { color: COLORS.gray, fontSize: 15 },
});
