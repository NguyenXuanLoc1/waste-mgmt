import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, RefreshControl,
  TouchableOpacity, Modal, Alert, ScrollView, Platform, TextInput,
} from 'react-native';
import { getAdminEvents, createEvent, confirmParticipant, deleteEvent } from '../../services/api';
import { Card, Button, COLORS, Badge } from '../../components/UI';
import api from '../../services/api';

// ── Helpers ───────────────────────────────────────────────────────────────────
const formatDate = (d) =>
  new Date(d).toLocaleDateString('en-US', { day: '2-digit', month: '2-digit', year: 'numeric' });

const showAlert = (title, msg, cb) => {
  if (Platform.OS === 'web') { window.alert(`${title}\n\n${msg}`); cb?.(); }
  else Alert.alert(title, msg, [{ text: 'OK', onPress: cb }]);
};

// ── Create Event Modal ────────────────────────────────────────────────────────
function CreateEventModal({ visible, onClose, onCreated }) {
  const [title, setTitle]     = useState('');
  const [desc, setDesc]       = useState('');
  const [date, setDate]       = useState('');
  const [points, setPoints]   = useState('');
  const [loading, setLoading] = useState(false);

  const reset = () => { setTitle(''); setDesc(''); setDate(''); setPoints(''); };

  const handleCreate = async () => {
    if (!title.trim() || !date.trim() || !points.trim())
      return showAlert('Error', 'Please fill in Title, Date, and Points.');
    if (isNaN(parseInt(points)) || parseInt(points) < 1)
      return showAlert('Error', 'Points must be a positive integer.');
    setLoading(true);
    try {
      await createEvent({ title, description: desc, eventDate: date, points: parseInt(points) });
      showAlert('✅ Success', 'Event created successfully!', () => { reset(); onCreated(); });
    } catch (err) {
      showAlert('Error', err.response?.data?.message || 'Could not create event.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={modal.overlay}>
        <ScrollView contentContainerStyle={modal.sheet}>
          <Text style={modal.title}>🎉 Create New Event</Text>

          <Text style={modal.label}>Event Title *</Text>
          <TextInput style={modal.input} value={title} onChangeText={setTitle} placeholder="e.g. Recycling Day" />

          <Text style={modal.label}>Description</Text>
          <TextInput style={[modal.input, { height: 80 }]} value={desc} onChangeText={setDesc}
            placeholder="Describe the event..." multiline />

          <Text style={modal.label}>Event Date * (YYYY-MM-DD)</Text>
          <TextInput style={modal.input} value={date} onChangeText={setDate}
            placeholder="2026-04-15" keyboardType="numbers-and-punctuation" />

          <Text style={modal.label}>Reward Points *</Text>
          <TextInput style={modal.input} value={points} onChangeText={setPoints}
            placeholder="e.g. 20" keyboardType="number-pad" />

          <Button title="✅ Create Event" onPress={handleCreate} loading={loading} style={{ marginTop: 8 }} />
          <Button title="Cancel" color={COLORS.gray} onPress={() => { reset(); onClose(); }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

// ── Participant Row ────────────────────────────────────────────────────────────
function ParticipantRow({ participant, eventId, eventPoints, onRefresh }) {
  const [loadingConfirm, setLoadingConfirm] = useState(false);
  const [loadingNoShow,  setLoadingNoShow]  = useState(false);
  const citizen = participant.citizenId;

  const handleConfirm = async () => {
    setLoadingConfirm(true);
    try {
      await confirmParticipant(eventId, citizen._id);
      showAlert('✅ Confirmed', `+${eventPoints} points awarded to ${citizen.name}`, onRefresh);
    } catch (err) {
      showAlert('Error', err.response?.data?.message || 'Could not confirm.');
    } finally {
      setLoadingConfirm(false);
    }
  };

  const handleNotAttended = async () => {
    const deduction = eventPoints * 2;
    const ok = Platform.OS === 'web'
      ? window.confirm(`Mark ${citizen.name} as NOT attended?\n-${deduction} points will be deducted.`)
      : await new Promise((res) =>
          Alert.alert(
            '❌ Not Attended',
            `Mark "${citizen.name}" as not attended?\n-${deduction} points will be deducted.`,
            [
              { text: 'Cancel', onPress: () => res(false) },
              { text: 'Confirm', style: 'destructive', onPress: () => res(true) },
            ]
          )
        );
    if (!ok) return;
    setLoadingNoShow(true);
    try {
      await api.post(`/events/${eventId}/not-attended/${citizen._id}`);
      showAlert('❌ Marked', `-${deduction} points deducted from ${citizen.name}`, onRefresh);
    } catch (err) {
      showAlert('Error', err.response?.data?.message || 'Could not mark as not attended.');
    } finally {
      setLoadingNoShow(false);
    }
  };

  // Already confirmed
  if (participant.pointsGiven) {
    return (
      <View style={styles.participantRow}>
        <View style={styles.participantInfo}>
          <Text style={styles.participantName}>{citizen?.name || 'Unknown'}</Text>
          <Text style={styles.participantEmail}>{citizen?.email}</Text>
        </View>
        <View style={styles.confirmedBadge}>
          <Text style={styles.confirmedText}>✅ +{eventPoints} pts</Text>
        </View>
      </View>
    );
  }

  // Already marked no-show
  if (participant.notAttended) {
    return (
      <View style={styles.participantRow}>
        <View style={styles.participantInfo}>
          <Text style={styles.participantName}>{citizen?.name || 'Unknown'}</Text>
          <Text style={styles.participantEmail}>{citizen?.email}</Text>
        </View>
        <View style={styles.noShowBadge}>
          <Text style={styles.noShowText}>❌ -{eventPoints * 2} pts</Text>
        </View>
      </View>
    );
  }

  // Pending — show both action buttons
  return (
    <View style={styles.participantRow}>
      <View style={styles.participantInfo}>
        <Text style={styles.participantName}>{citizen?.name || 'Unknown'}</Text>
        <Text style={styles.participantEmail}>{citizen?.email}</Text>
        <Text style={styles.pendingLabel}>⏳ Pending</Text>
      </View>
      <View style={styles.actionBtns}>
        <Button
          title="✅ Attended"
          color={COLORS.primary}
          onPress={handleConfirm}
          loading={loadingConfirm}
          style={styles.actionBtn}
          textStyle={{ fontSize: 11 }}
        />
        <Button
          title="❌ No Show"
          color={COLORS.danger}
          onPress={handleNotAttended}
          loading={loadingNoShow}
          style={styles.actionBtn}
          textStyle={{ fontSize: 11 }}
        />
      </View>
    </View>
  );
}

// ── Event Card ────────────────────────────────────────────────────────────────
function EventCard({ event, onRefresh }) {
  const [expanded, setExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const confirmedCount = event.participants.filter((p) => p.pointsGiven).length;
  const noShowCount    = event.participants.filter((p) => p.notAttended).length;
  const pendingCount   = event.participants.filter((p) => !p.pointsGiven && !p.notAttended).length;

  const handleDelete = async () => {
    const ok = Platform.OS === 'web'
      ? window.confirm(`Delete event "${event.title}"?`)
      : await new Promise((res) => Alert.alert('Confirm', `Delete "${event.title}"?`,
          [{ text: 'Cancel', onPress: () => res(false) }, { text: 'Delete', style: 'destructive', onPress: () => res(true) }]));
    if (!ok) return;
    setDeleting(true);
    try {
      await deleteEvent(event._id);
      onRefresh();
    } catch (err) {
      showAlert('Error', err.response?.data?.message || 'Could not delete.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Card>
      <TouchableOpacity onPress={() => setExpanded((v) => !v)} activeOpacity={0.85}>
        <View style={styles.eventHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.eventTitle}>{event.title}</Text>
            <Text style={styles.eventDate}>📅 {formatDate(event.eventDate)}</Text>
            <Text style={styles.eventPoints}>🌟 +{event.points} pts &nbsp;|&nbsp; ❌ -{event.points * 2} pts if no-show</Text>
          </View>
          <View style={styles.eventMeta}>
            <Badge label={event.isActive ? 'active' : 'inactive'} color={event.isActive ? COLORS.primary : COLORS.gray} />
            <Text style={styles.participantCount}>👥 {event.participants.length} total</Text>
            <Text style={[styles.participantCount, { color: COLORS.primary }]}>✅ {confirmedCount}</Text>
            <Text style={[styles.participantCount, { color: COLORS.danger }]}>❌ {noShowCount}</Text>
            {pendingCount > 0 && (
              <Text style={[styles.participantCount, { color: COLORS.warning }]}>⏳ {pendingCount}</Text>
            )}
          </View>
        </View>
        {event.description ? <Text style={styles.eventDesc}>{event.description}</Text> : null}
      </TouchableOpacity>

      {expanded && (
        <View style={styles.expandedSection}>
          <Text style={styles.participantsTitle}>
            Registered Participants ({event.participants.length})
          </Text>
          {event.participants.length === 0 ? (
            <Text style={styles.emptyParticipants}>No participants yet</Text>
          ) : (
            event.participants.map((p) => (
              <ParticipantRow
                key={p._id}
                participant={p}
                eventId={event._id}
                eventPoints={event.points}
                onRefresh={onRefresh}
              />
            ))
          )}
          <Button
            title={deleting ? '...' : '🗑️ Delete Event'}
            color={COLORS.danger}
            onPress={handleDelete}
            loading={deleting}
            style={{ marginTop: 12 }}
          />
        </View>
      )}
    </Card>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function AdminEvents() {
  const [events, setEvents]         = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  const load = async () => {
    try {
      const { data } = await getAdminEvents();
      setEvents(data);
    } catch {}
  };

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };
  useEffect(() => { load(); }, []);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>🎉 Event Management</Text>
          <Text style={styles.sub}>{events.length} event(s)</Text>
        </View>
        <Button
          title="+ New Event"
          onPress={() => setShowCreate(true)}
          style={styles.createBtn}
          textStyle={{ fontSize: 13 }}
        />
      </View>

      <View style={styles.legend}>
        <Text style={styles.legendItem}>✅ Attended → +points</Text>
        <Text style={styles.legendItem}>❌ No Show → -2x points</Text>
      </View>

      <FlatList
        data={events}
        keyExtractor={(e) => e._id}
        renderItem={({ item }) => <EventCard event={item} onRefresh={load} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyText}>No events yet</Text>
            <Text style={styles.emptySub}>Tap "New Event" to get started</Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 40 }}
      />

      <CreateEventModal
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={() => { setShowCreate(false); load(); }}
      />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: COLORS.light, padding: 16 },
  headerRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  title:      { fontSize: 20, fontWeight: '800', color: COLORS.dark },
  sub:        { fontSize: 13, color: COLORS.gray },
  createBtn:  { marginVertical: 0, paddingHorizontal: 16, paddingVertical: 10 },

  legend:     { flexDirection: 'row', gap: 16, marginBottom: 12 },
  legendItem: { fontSize: 12, color: COLORS.gray },

  eventHeader:      { flexDirection: 'row', gap: 10 },
  eventTitle:       { fontSize: 15, fontWeight: '800', color: COLORS.dark, marginBottom: 4 },
  eventDate:        { fontSize: 13, color: COLORS.gray },
  eventPoints:      { fontSize: 12, color: '#f59e0b', fontWeight: '700', marginTop: 2 },
  eventDesc:        { fontSize: 13, color: COLORS.gray, marginTop: 8, lineHeight: 18 },
  eventMeta:        { alignItems: 'flex-end', gap: 3 },
  participantCount: { fontSize: 11, color: COLORS.gray },

  expandedSection:   { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border },
  participantsTitle: { fontSize: 14, fontWeight: '700', color: COLORS.dark, marginBottom: 8 },
  emptyParticipants: { color: COLORS.gray, fontSize: 13, textAlign: 'center', paddingVertical: 12 },

  participantRow:   { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  participantInfo:  { flex: 1 },
  participantName:  { fontWeight: '700', color: COLORS.dark, fontSize: 14 },
  participantEmail: { fontSize: 12, color: COLORS.gray },
  pendingLabel:     { fontSize: 11, color: COLORS.warning, fontWeight: '600', marginTop: 2 },

  actionBtns: { flexDirection: 'column', gap: 5 },
  actionBtn:  { marginVertical: 0, paddingHorizontal: 10, paddingVertical: 7, minWidth: 100 },

  confirmedBadge: { backgroundColor: '#f0fdf4', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: '#bbf7d0' },
  confirmedText:  { color: '#16a34a', fontWeight: '700', fontSize: 12 },
  noShowBadge:    { backgroundColor: '#fef2f2', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: '#fecaca' },
  noShowText:     { color: COLORS.danger, fontWeight: '700', fontSize: 12 },

  empty:     { alignItems: 'center', marginTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, fontWeight: '700', color: COLORS.dark },
  emptySub:  { fontSize: 13, color: COLORS.gray, marginTop: 4 },
});

const modal = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet:   { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
  title:   { fontSize: 18, fontWeight: '800', color: COLORS.dark, marginBottom: 16 },
  label:   { fontSize: 13, fontWeight: '600', color: COLORS.dark, marginBottom: 4, marginTop: 10 },
  input:   { borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 12, fontSize: 14, color: COLORS.dark, backgroundColor: COLORS.white },
});