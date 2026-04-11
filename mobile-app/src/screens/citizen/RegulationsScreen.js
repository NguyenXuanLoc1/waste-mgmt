import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, RefreshControl, Platform, Alert,
} from 'react-native';
import { COLORS, Card } from '../../components/UI';
import { getEvents, joinEvent } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

// ── Static data ───────────────────────────────────────────────────────────────
const ANNOUNCEMENTS = [
  {
    id: 'a1', date: '08 Mar 2026', tag: 'NEW', tagColor: COLORS.primary,
    title: 'AI Auto-Analysis Now Active',
    body: 'All submitted waste reports are now automatically analyzed by our AI system within seconds. Valid reports will be instantly verified and earn you +10 behavior points. Fake or irrelevant images will be rejected and result in a -20 point deduction.',
  },
  {
    id: 'a2', date: '01 Mar 2026', tag: 'REMINDER', tagColor: COLORS.warning,
    title: 'Hazardous Waste Collection Day',
    body: 'Special collection for hazardous waste (batteries, paint, chemicals) will take place on the last Saturday of every month. Please bring items to the designated drop-off points.',
  },
  {
    id: 'a3', date: '15 Feb 2026', tag: 'UPDATE', tagColor: COLORS.info,
    title: 'New Fee Discount for High Scorers',
    body: 'Citizens with a Behavior Score above 120 are now eligible for a collection fee discount of up to 30%. Keep submitting accurate reports and sorting your waste properly!',
  },
];

const REGULATIONS = [
  { id: 'r1', icon: '📅', title: 'Reporting Timeliness', rules: ['Submit waste reports within 24 hours of waste accumulation.', 'Reports submitted after 48 hours may be deprioritized by collectors.', 'Emergency hazardous waste must be reported immediately.'] },
  { id: 'r2', icon: '📸', title: 'Photo Requirements', rules: ['Photos must clearly show the waste — no blurry or irrelevant images.', 'Submitting fake or unrelated photos results in a -20 behavior score deduction.', 'One photo per report is required; the photo must be taken at the waste site.'] },
  { id: 'r3', icon: '🗂️', title: 'Waste Classification', rules: ['Accurately classify waste into: Organic, Recyclable, Hazardous, or Other.', 'Misclassification may delay collection and affect your score.', 'When unsure, refer to the Waste Sorting Guide in the app.'] },
  { id: 'r4', icon: '⚖️', title: 'Behavior Score Policy', rules: ['Starting score: 100 points for all new citizens.', '+10 points for each verified (genuine) report.', '+5 points when a report is fully collected and completed.', '-20 points for submitting fake or fraudulent reports.', 'Score above 120 → eligible for collection fee discounts.', 'Score below 50 → account may be flagged for review.'] },
  { id: 'r5', icon: '🚚', title: 'Collection Fees', rules: ['Fees are calculated per kg by waste type:', '   • Organic:     $1.00 / kg', '   • Recyclable:  $0.50 / kg', '   • Hazardous:   $3.00 / kg', 'High Behavior Score holders receive a fee discount (up to 30%).'] },
  { id: 'r6', icon: '🔒', title: 'Account & Privacy', rules: ['Each citizen account is personal and non-transferable.', 'Location data is used only for dispatching collectors.', 'Report photos are stored securely and only accessible to authorized staff.'] },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
const formatDate = (d) =>
  new Date(d).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });

const showAlert = (title, msg, cb) => {
  if (Platform.OS === 'web') { window.alert(`${title}\n\n${msg}`); cb?.(); }
  else Alert.alert(title, msg, [{ text: 'OK', onPress: cb }]);
};

const isPast = (date) => new Date(date) < new Date();

// ── Event Card ────────────────────────────────────────────────────────────────
function EventCard({ event, onJoined, isGuest }) {
  const [joining, setJoining] = useState(false);
  const past = isPast(event.eventDate);

  const handleJoin = async () => {
    if (isGuest) {
      showAlert('🔒 Login Required', 'You need an account to register for events.');
      return;
    }
    setJoining(true);
    try {
      await joinEvent(event._id);
      showAlert('🎉 Registered!', `You have registered for "${event.title}". Admin will confirm and award your points.`, onJoined);
    } catch (err) {
      showAlert('Error', err.response?.data?.message || 'Could not register.');
    } finally {
      setJoining(false);
    }
  };

  return (
    <View style={[styles.eventCard, past && styles.eventCardPast]}>
      <View style={styles.eventTopRow}>
        <View style={[styles.eventTag, { backgroundColor: past ? COLORS.gray : '#8b5cf6' }]}>
          <Text style={styles.eventTagText}>{past ? 'ENDED' : 'UPCOMING'}</Text>
        </View>
        <Text style={styles.eventDate}>📅 {formatDate(event.eventDate)}</Text>
      </View>

      <Text style={styles.eventTitle}>{event.title}</Text>

      <View style={styles.eventPointsRow}>
        <View style={styles.pointsBadge}>
          <Text style={styles.pointsBadgeText}>🌟 +{event.points} points upon participation</Text>
        </View>
      </View>

      {event.description ? (
        <Text style={styles.eventDesc}>{event.description}</Text>
      ) : null}

      {!past && (
        <View style={styles.eventFooter}>
          <Text style={styles.eventParticipants}>
            👥 {event.participants?.length || 0} registered
          </Text>

          {event.hasJoined ? (
            <View style={[
              styles.joinedBadge,
              event.isConfirmed && styles.joinedBadgeConfirmed,
              event.notAttended && styles.joinedBadgeNoShow,
            ]}>
              <Text style={[styles.joinedText, event.notAttended && { color: COLORS.danger }]}>
                {event.isConfirmed
                  ? `✅ Confirmed (+${event.points} pts)`
                  : event.notAttended
                  ? `❌ Not attended (-${event.points * 2} pts)`
                  : '⏳ Pending confirmation'}
              </Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.joinBtn, joining && { opacity: 0.6 }]}
              onPress={handleJoin}
              disabled={joining}
              activeOpacity={0.85}
            >
              <Text style={styles.joinBtnText}>
                {joining ? '...' : '🙋 Register'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

// ── Announcement & Regulation Cards ──────────────────────────────────────────
function AnnouncementCard({ item }) {
  return (
    <View style={styles.announcementCard}>
      <View style={styles.annHeader}>
        <View style={[styles.annTag, { backgroundColor: item.tagColor }]}>
          <Text style={styles.annTagText}>{item.tag}</Text>
        </View>
        <Text style={styles.annDate}>{item.date}</Text>
      </View>
      <Text style={styles.annTitle}>{item.title}</Text>
      <Text style={styles.annBody}>{item.body}</Text>
    </View>
  );
}

function RegulationCard({ item }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={() => setExpanded((v) => !v)} style={styles.regCard}>
      <View style={styles.regHeader}>
        <Text style={styles.regIcon}>{item.icon}</Text>
        <Text style={styles.regTitle}>{item.title}</Text>
        <Text style={styles.chevron}>{expanded ? '▲' : '▼'}</Text>
      </View>
      {expanded && (
        <View style={styles.regBody}>
          {item.rules.map((rule, i) => (
            <View key={i} style={styles.ruleRow}>
              <Text style={styles.ruleBullet}>›</Text>
              <Text style={styles.ruleText}>{rule}</Text>
            </View>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function RegulationsScreen() {
  const { isGuest } = useAuth();
  const [tab, setTab]           = useState('events');
  const [events, setEvents]     = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadEvents = useCallback(async () => {
    if (isGuest) { setEvents([]); return; }
    try {
      const { data } = await getEvents();
      setEvents(data);
    } catch {}
  }, [isGuest]);

  const onRefresh = async () => { setRefreshing(true); await loadEvents(); setRefreshing(false); };
  useEffect(() => { if (tab === 'events') loadEvents(); }, [tab, loadEvents]);

  const upcomingEvents = events.filter((e) => !isPast(e.eventDate));
  const pastEvents     = events.filter((e) =>  isPast(e.eventDate));

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Banner */}
      <View style={styles.banner}>
        <Text style={styles.bannerIcon}>📢</Text>
        <Text style={styles.bannerTitle}>Regulations & Announcements</Text>
        <Text style={styles.bannerSub}>Stay informed about rules and the latest updates.</Text>
      </View>

      {/* Tab switcher */}
      <View style={styles.tabRow}>
        {[
          { key: 'events',        label: '🎉 Events' },
          { key: 'announcements', label: '📣 Announcements' },
          { key: 'regulations',   label: '📜 Regulations' },
        ].map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tab, tab === t.key && styles.tabActive]}
            onPress={() => setTab(t.key)}
          >
            <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Events tab ── */}
      {tab === 'events' && (
        <View>
          {isGuest && (
            <View style={styles.guestNotice}>
              <Text style={styles.guestNoticeText}>
                👤 Log in to register for events and earn reward points!
              </Text>
            </View>
          )}

          {upcomingEvents.length === 0 && pastEvents.length === 0 ? (
            <View style={styles.emptyEvents}>
              <Text style={styles.emptyEventsIcon}>📭</Text>
              <Text style={styles.emptyEventsText}>No events available</Text>
              <Text style={styles.emptyEventsSub}>Pull down to refresh</Text>
            </View>
          ) : (
            <>
              {upcomingEvents.length > 0 && (
                <>
                  <Text style={styles.sectionHeader}>🗓️ Upcoming ({upcomingEvents.length})</Text>
                  {upcomingEvents.map((e) => (
                    <EventCard key={e._id} event={e} onJoined={loadEvents} isGuest={isGuest} />
                  ))}
                </>
              )}
              {pastEvents.length > 0 && (
                <>
                  <Text style={[styles.sectionHeader, { color: COLORS.gray }]}>
                    ⏪ Past Events ({pastEvents.length})
                  </Text>
                  {pastEvents.map((e) => (
                    <EventCard key={e._id} event={e} onJoined={loadEvents} isGuest={isGuest} />
                  ))}
                </>
              )}
            </>
          )}
        </View>
      )}

      {/* ── Announcements tab ── */}
      {tab === 'announcements' && (
        <View>
          {ANNOUNCEMENTS.map((item) => <AnnouncementCard key={item.id} item={item} />)}
          <Text style={styles.footerNote}>Showing the 3 most recent announcements.</Text>
        </View>
      )}

      {/* ── Regulations tab ── */}
      {tab === 'regulations' && (
        <View>
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>📌 Tap any section to expand the full rules.</Text>
          </View>
          {REGULATIONS.map((item) => <RegulationCard key={item.id} item={item} />)}
        </View>
      )}
    </ScrollView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.light, padding: 16 },

  banner: { backgroundColor: '#f97316', borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 16 },
  bannerIcon: { fontSize: 48, marginBottom: 8 },
  bannerTitle: { fontSize: 20, fontWeight: '900', color: '#fff', marginBottom: 6, textAlign: 'center' },
  bannerSub: { fontSize: 13, color: 'rgba(255,255,255,0.88)', textAlign: 'center' },

  tabRow: { flexDirection: 'row', backgroundColor: COLORS.white, borderRadius: 12, padding: 4, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 9, alignItems: 'center' },
  tabActive: { backgroundColor: '#f97316' },
  tabText: { fontSize: 11, fontWeight: '600', color: COLORS.gray },
  tabTextActive: { color: '#fff' },

  guestNotice: { backgroundColor: '#fefce8', borderRadius: 10, padding: 12, borderLeftWidth: 4, borderLeftColor: COLORS.warning, marginBottom: 12 },
  guestNoticeText: { fontSize: 13, color: '#92400e', lineHeight: 19 },

  sectionHeader: { fontSize: 15, fontWeight: '700', color: COLORS.dark, marginBottom: 8, marginTop: 4 },

  eventCard: { backgroundColor: COLORS.white, borderRadius: 14, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2, borderLeftWidth: 4, borderLeftColor: '#8b5cf6' },
  eventCardPast: { borderLeftColor: COLORS.gray, opacity: 0.75 },
  eventTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  eventTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  eventTagText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  eventDate: { fontSize: 12, color: COLORS.gray },
  eventTitle: { fontSize: 16, fontWeight: '800', color: COLORS.dark, marginBottom: 8 },
  eventPointsRow: { flexDirection: 'row', marginBottom: 8 },
  pointsBadge: { backgroundColor: '#fefce8', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: '#fde68a' },
  pointsBadgeText: { fontSize: 12, fontWeight: '700', color: '#92400e' },
  eventDesc: { fontSize: 13, color: COLORS.gray, lineHeight: 19, marginBottom: 10 },
  eventFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.border },
  eventParticipants: { fontSize: 12, color: COLORS.gray },

  joinBtn: { backgroundColor: '#8b5cf6', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  joinBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  joinedBadge: { backgroundColor: '#fefce8', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: '#fde68a' },
  joinedBadgeConfirmed: { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' },
  joinedBadgeNoShow:    { backgroundColor: '#fef2f2', borderColor: '#fecaca' },
  joinedText: { fontSize: 12, fontWeight: '700', color: '#92400e' },

  emptyEvents: { alignItems: 'center', paddingVertical: 60 },
  emptyEventsIcon: { fontSize: 48, marginBottom: 12 },
  emptyEventsText: { fontSize: 16, fontWeight: '700', color: COLORS.dark },
  emptyEventsSub: { fontSize: 13, color: COLORS.gray, marginTop: 4 },

  announcementCard: { backgroundColor: COLORS.white, borderRadius: 14, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  annHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  annTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  annTagText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  annDate: { fontSize: 12, color: COLORS.gray },
  annTitle: { fontSize: 15, fontWeight: '800', color: COLORS.dark, marginBottom: 6 },
  annBody: { fontSize: 13, color: COLORS.gray, lineHeight: 20 },
  footerNote: { textAlign: 'center', fontSize: 12, color: COLORS.gray, marginTop: 8, marginBottom: 16 },

  infoBox: { backgroundColor: '#eff6ff', borderRadius: 10, padding: 12, borderLeftWidth: 4, borderLeftColor: COLORS.info, marginBottom: 12 },
  infoText: { fontSize: 13, color: '#1e40af', lineHeight: 19 },
  regCard: { backgroundColor: COLORS.white, borderRadius: 14, padding: 16, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  regHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  regIcon: { fontSize: 22 },
  regTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: COLORS.dark },
  chevron: { fontSize: 12, color: COLORS.gray, fontWeight: '700' },
  regBody: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border },
  ruleRow: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  ruleBullet: { fontSize: 16, color: '#f97316', fontWeight: '900', lineHeight: 20 },
  ruleText: { fontSize: 13, color: COLORS.dark, lineHeight: 20, flex: 1 },
});