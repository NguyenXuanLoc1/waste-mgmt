import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity,
} from 'react-native';
import { COLORS, Card } from '../../components/UI';

const ANNOUNCEMENTS = [
  {
    id: 'a1',
    date: '08 Mar 2026',
    tag: 'NEW',
    tagColor: COLORS.primary,
    title: 'AI Auto-Analysis Now Active',
    body:
      'All submitted waste reports are now automatically analyzed by our AI system within seconds. Valid reports will be instantly verified and earn you +10 behavior points. Fake or irrelevant images will be rejected and result in a -20 point deduction.',
  },
  {
    id: 'a2',
    date: '01 Mar 2026',
    tag: 'REMINDER',
    tagColor: COLORS.warning,
    title: 'Hazardous Waste Collection Day',
    body:
      'Special collection for hazardous waste (batteries, paint, chemicals) will take place on the last Saturday of every month. Please bring items to the designated drop-off points. Do not leave hazardous waste at regular collection sites.',
  },
  {
    id: 'a3',
    date: '15 Feb 2026',
    tag: 'UPDATE',
    tagColor: COLORS.info,
    title: 'New Fee Discount for High Scorers',
    body:
      'Citizens with a Behavior Score above 120 are now eligible for a collection fee discount of up to 30%. Keep submitting accurate reports and sorting your waste properly to increase your score!',
  },
];

const REGULATIONS = [
  {
    id: 'r1',
    icon: '📅',
    title: 'Reporting Timeliness',
    rules: [
      'Submit waste reports within 24 hours of waste accumulation.',
      'Reports submitted after 48 hours may be deprioritized by collectors.',
      'Emergency hazardous waste must be reported immediately.',
    ],
  },
  {
    id: 'r2',
    icon: '📸',
    title: 'Photo Requirements',
    rules: [
      'Photos must clearly show the waste — no blurry or irrelevant images.',
      'Submitting fake or unrelated photos results in a -20 behavior score deduction.',
      'One photo per report is required; the photo must be taken at the waste site.',
    ],
  },
  {
    id: 'r3',
    icon: '🗂️',
    title: 'Waste Classification',
    rules: [
      'Accurately classify waste into: Organic, Recyclable, Hazardous, or Other.',
      'Misclassification may delay collection and affect your score.',
      'When unsure, refer to the Waste Sorting Guide in the app.',
    ],
  },
  {
    id: 'r4',
    icon: '⚖️',
    title: 'Behavior Score Policy',
    rules: [
      'Starting score: 100 points for all new citizens.',
      '+10 points for each verified (genuine) report.',
      '+5 points when a report is fully collected and completed.',
      '-20 points for submitting fake or fraudulent reports.',
      'Score above 120 → eligible for collection fee discounts.',
      'Score below 50 → account may be flagged for review.',
    ],
  },
  {
    id: 'r5',
    icon: '🚚',
    title: 'Collection Fees',
    rules: [
      'Fees are calculated per kg by waste type:',
      '   • Organic:     $1.00 / kg',
      '   • Recyclable:  $0.50 / kg',
      '   • Hazardous:   $3.00 / kg',
      'High Behavior Score holders receive a fee discount (up to 30%).',
      'Fees are displayed on your dashboard and updated after each collection.',
    ],
  },
  {
    id: 'r6',
    icon: '🔒',
    title: 'Account & Privacy',
    rules: [
      'Each citizen account is personal and non-transferable.',
      'Location data is used only for dispatching collectors.',
      'Report photos are stored securely and only accessible to authorized staff.',
    ],
  },
];

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
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => setExpanded((v) => !v)}
      style={styles.regCard}
    >
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

export default function RegulationsScreen() {
  const [tab, setTab] = useState('announcements'); // 'announcements' | 'regulations'

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>

      {/* Banner */}
      <View style={styles.banner}>
        <Text style={styles.bannerIcon}>📢</Text>
        <Text style={styles.bannerTitle}>Regulations & Announcements</Text>
        <Text style={styles.bannerSub}>Stay informed about rules and the latest updates.</Text>
      </View>

      {/* Tab switcher */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, tab === 'announcements' && styles.tabActive]}
          onPress={() => setTab('announcements')}
        >
          <Text style={[styles.tabText, tab === 'announcements' && styles.tabTextActive]}>
            📣 Announcements
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'regulations' && styles.tabActive]}
          onPress={() => setTab('regulations')}
        >
          <Text style={[styles.tabText, tab === 'regulations' && styles.tabTextActive]}>
            📜 Regulations
          </Text>
        </TouchableOpacity>
      </View>

      {/* Announcements tab */}
      {tab === 'announcements' && (
        <View>
          {ANNOUNCEMENTS.map((item) => (
            <AnnouncementCard key={item.id} item={item} />
          ))}
          <Text style={styles.footerNote}>
            Showing the 3 most recent announcements. Check back regularly for updates.
          </Text>
        </View>
      )}

      {/* Regulations tab */}
      {tab === 'regulations' && (
        <View>
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              📌 Tap any section to expand the full rules. Compliance helps keep your Behavior Score high.
            </Text>
          </View>
          {REGULATIONS.map((item) => (
            <RegulationCard key={item.id} item={item} />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.light, padding: 16 },

  banner: {
    backgroundColor: '#f97316',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  bannerIcon: { fontSize: 48, marginBottom: 8 },
  bannerTitle: { fontSize: 20, fontWeight: '900', color: '#fff', marginBottom: 6, textAlign: 'center' },
  bannerSub: { fontSize: 13, color: 'rgba(255,255,255,0.88)', textAlign: 'center' },

  // Tab switcher
  tabRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  tab: {
    flex: 1, paddingVertical: 10, borderRadius: 9, alignItems: 'center',
  },
  tabActive: { backgroundColor: '#f97316' },
  tabText: { fontSize: 13, fontWeight: '600', color: COLORS.gray },
  tabTextActive: { color: '#fff' },

  // Announcement cards
  announcementCard: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  annHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  annTag: {
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 20,
  },
  annTagText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  annDate: { fontSize: 12, color: COLORS.gray },
  annTitle: { fontSize: 15, fontWeight: '800', color: COLORS.dark, marginBottom: 6 },
  annBody: { fontSize: 13, color: COLORS.gray, lineHeight: 20 },

  footerNote: {
    textAlign: 'center', fontSize: 12, color: COLORS.gray,
    marginTop: 8, marginBottom: 16,
  },

  // Info box
  infoBox: {
    backgroundColor: '#eff6ff',
    borderRadius: 10, padding: 12,
    borderLeftWidth: 4, borderLeftColor: COLORS.info,
    marginBottom: 12,
  },
  infoText: { fontSize: 13, color: '#1e40af', lineHeight: 19 },

  // Regulation cards
  regCard: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  regHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  regIcon: { fontSize: 22 },
  regTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: COLORS.dark },
  chevron: { fontSize: 12, color: COLORS.gray, fontWeight: '700' },
  regBody: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border },
  ruleRow: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  ruleBullet: { fontSize: 16, color: '#f97316', fontWeight: '900', lineHeight: 20 },
  ruleText: { fontSize: 13, color: COLORS.dark, lineHeight: 20, flex: 1 },
});
