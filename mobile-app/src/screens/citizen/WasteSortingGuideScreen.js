import React, { useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Platform,
} from 'react-native';
import { Video } from 'expo-av'; 
import { COLORS, Card } from '../../components/UI';

const GUIDE_DATA = [
  {
    id: 'organic',
    icon: '🌿',
    title: 'Organic Waste',
    color: '#22c55e',
    bg: '#f0fdf4',
    border: '#bbf7d0',
    description: 'Food scraps, garden trimmings, and other biodegradable materials.',
    examples: ['Fruit & vegetable peels', 'Leftover food', 'Coffee grounds & tea bags', 'Grass clippings & leaves', 'Eggshells'],
    tips: 'Drain excess liquid before disposal. Can be composted into fertilizer. Store in a sealed container to avoid odors.',
    doNot: 'Do NOT mix with plastics, glass, or hazardous chemicals.',
  },
  {
    id: 'recyclable',
    icon: '♻️',
    title: 'Recyclable Waste',
    color: '#3b82f6',
    bg: '#eff6ff',
    border: '#bfdbfe',
    description: 'Materials that can be collected, processed, and reused in new products.',
    examples: ['Paper & cardboard (clean, dry)', 'Plastic bottles & containers (rinsed)', 'Glass bottles & jars', 'Aluminum & tin cans', 'Newspapers & magazines'],
    tips: 'Rinse containers before placing in recycling. Flatten cardboard boxes to save space. Remove lids from glass jars.',
    doNot: 'Do NOT recycle greasy paper, broken glass, or items with food residue.',
  },
  {
    id: 'hazardous',
    icon: '☢️',
    title: 'Hazardous Waste',
    color: '#ef4444',
    bg: '#fef2f2',
    border: '#fecaca',
    description: 'Waste that poses substantial threats to public health or the environment.',
    examples: ['Batteries & accumulators', 'Paint & solvents', 'Pesticides & herbicides', 'Fluorescent light bulbs', 'Electronic devices (e-waste)', 'Motor oil & chemicals'],
    tips: 'Keep in original containers when possible. Bring to designated collection points only. Never pour down the drain.',
    doNot: 'Do NOT mix with regular waste. Do NOT burn or bury hazardous materials.',
  },
  {
    id: 'other',
    icon: '🗑️',
    title: 'Other / General Waste',
    color: '#6b7280',
    bg: '#f9fafb',
    border: '#e5e7eb',
    description: 'Waste that cannot be recycled or composted and must go to landfill.',
    examples: ['Soiled tissues & diapers', 'Broken ceramics or mirrors', 'Styrofoam packaging', 'Rubber items', 'Mixed-material packaging'],
    tips: 'Minimize this category by choosing recyclable or reusable products when shopping. Reduce, reuse, then dispose.',
    doNot: 'Do NOT throw hazardous or recyclable items into general waste.',
  },
];

function GuideCard({ item }) {
  const [expanded, setExpanded] = React.useState(false);

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => setExpanded((v) => !v)}
      style={[styles.guideCard, { backgroundColor: item.bg, borderColor: item.border }]}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.iconCircle, { backgroundColor: item.color }]}>
          <Text style={styles.iconText}>{item.icon}</Text>
        </View>
        <View style={styles.cardTitleWrap}>
          <Text style={[styles.cardTitle, { color: item.color }]}>{item.title}</Text>
          <Text style={styles.cardDesc} numberOfLines={expanded ? undefined : 2}>
            {item.description}
          </Text>
        </View>
        <Text style={[styles.chevron, { color: item.color }]}>{expanded ? '▲' : '▼'}</Text>
      </View>

      {expanded && (
        <View style={styles.cardBody}>
          <View style={[styles.divider, { backgroundColor: item.border }]} />
          <Text style={[styles.bodyHeading, { color: item.color }]}>📦 Examples</Text>
          {item.examples.map((ex, i) => (
            <View key={i} style={styles.bulletRow}>
              <Text style={[styles.bullet, { color: item.color }]}>•</Text>
              <Text style={styles.bulletText}>{ex}</Text>
            </View>
          ))}
          <View style={[styles.tipBox, { borderLeftColor: item.color }]}>
            <Text style={styles.tipHeading}>💡 Tips</Text>
            <Text style={styles.tipText}>{item.tips}</Text>
          </View>
          <View style={styles.doNotBox}>
            <Text style={styles.doNotText}>🚫 {item.doNot}</Text>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

// =========================================================
// 🎥 PHẦN VIDEO FORM BẠN THÍCH - TRỊ TẬN GỐC LỖI TEO NHỎ
// =========================================================
function GuideVideoPlayer() {
  const videoRef = useRef(null);

  // Phím tắt F
  useEffect(() => {
    if (Platform.OS !== 'web') return; 
    const handleKeyPress = async (event) => {
      if ((event.key === 'f' || event.key === 'F') && videoRef.current) {
        event.preventDefault(); 
        try {
          if (document.fullscreenElement) {
            await document.exitFullscreen();
          } else {
            await videoRef.current.presentFullscreenPlayer();
          }
        } catch (e) {}
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  return (
    <View style={styles.videoCard}>
      {/* 1. Header */}
      <View style={styles.videoHeader}>
        <Text style={styles.videoTitle}>🎥 Video Hướng Dẫn</Text>
      </View>
      
      {/* 2. Khung Video chuẩn chỉnh */}
      <View style={styles.videoContainer}>
        <Video
          ref={videoRef}
          style={styles.videoPlayer} // <-- Ép width 100%, height 100% ở đây
          source={require('../../../assets/waste-sorting.mp4')} 
          useNativeControls={true} 
          resizeMode="contain" // <-- Giữ nguyên hình ảnh, không cắt xén
          isLooping={false}
        />
      </View>

      {/* 3. Footer có chú thích */}
      <View style={styles.videoFooter}>
        <Text style={styles.videoCaption}>
          Xem đoạn hoạt hình ngắn này để biết cách phân loại 3 loại rác cơ bản nhé!
        </Text>
      </View>
    </View>
  );
}

export default function WasteSortingGuideScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Banner */}
      <View style={styles.banner}>
        <Text style={styles.bannerIcon}>♻️</Text>
        <Text style={styles.bannerTitle}>Waste Sorting Guide</Text>
        <Text style={styles.bannerSub}>
          Tap each category to learn how to sort your waste correctly.
        </Text>
      </View>

      {/* Lời nhắc */}
      <View style={styles.reminderBox}>
        <Text style={styles.reminderText}>
          🌟 Correctly sorting your waste improves your Behavior Score and reduces your collection fee!
        </Text>
      </View>

      {/* Gọi Component Video */}
      <GuideVideoPlayer />

      {/* Guide cards */}
      {GUIDE_DATA.map((item) => (
        <GuideCard key={item.id} item={item} />
      ))}

      {/* Footer tip */}
      <Card style={styles.footerCard}>
        <Text style={styles.footerTitle}>🏙️ Collection Schedule</Text>
        <Text style={styles.footerText}>
          Place your sorted waste bags at the designated collection point before{' '}
          <Text style={{ fontWeight: '700' }}>7:00 AM</Text> on collection days.
          Use separate colored bags for each category when available.
        </Text>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.light, padding: 16 },

  banner: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 12,
  },
  bannerIcon: { fontSize: 48, marginBottom: 8 },
  bannerTitle: { fontSize: 22, fontWeight: '900', color: '#fff', marginBottom: 6 },
  bannerSub: { fontSize: 13, color: 'rgba(255,255,255,0.85)', textAlign: 'center' },

  reminderBox: {
    backgroundColor: '#fefce8',
    borderRadius: 10,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.warning,
    marginBottom: 16,
  },
  reminderText: { fontSize: 13, color: '#92400e', lineHeight: 19 },

  // ===============================================
  // STYLE CHO FORM VIDEO (ĐÃ FIX LỖI TEO NHỎ TRÊN WEB)
  // ===============================================
  videoCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    overflow: 'hidden', // Gọt giũa 4 góc
  },
  videoHeader: {
    padding: 16,
    backgroundColor: '#f8fafc', 
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    alignItems: 'center',
  },
  videoTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.dark,
  },
  videoContainer: {
    width: '100%',         // Container chiếm toàn bộ chiều ngang của Card
    aspectRatio: 16 / 9,   // Giữ khung hình chữ nhật chuẩn
    backgroundColor: '#000', // Đáy đen 
  },
  videoPlayer: {
    width: '100%',         // Bắt buộc: Ép thẻ video bung hết 100% chiều ngang
    height: '100%',        // Bắt buộc: Ép thẻ video bung hết 100% chiều dọc
  },
  videoFooter: {
    padding: 16,
    backgroundColor: '#f8fafc',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  videoCaption: {
    fontSize: 13,
    color: COLORS.gray,
    fontStyle: 'italic',
    textAlign: 'center',
  },

  // --- STYLE CHO THẺ HƯỚNG DẪN ---
  guideCard: {
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  iconCircle: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  iconText: { fontSize: 22 },
  cardTitleWrap: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '800', marginBottom: 3 },
  cardDesc: { fontSize: 13, color: COLORS.gray, lineHeight: 18 },
  chevron: { fontSize: 12, fontWeight: '700', marginTop: 4 },

  cardBody: { marginTop: 12 },
  divider: { height: 1, marginBottom: 12 },

  bodyHeading: { fontSize: 13, fontWeight: '700', marginBottom: 8 },
  bulletRow: { flexDirection: 'row', gap: 6, marginBottom: 4 },
  bullet: { fontSize: 14, fontWeight: '900', lineHeight: 20 },
  bulletText: { fontSize: 13, color: COLORS.dark, lineHeight: 20, flex: 1 },

  tipBox: {
    backgroundColor: '#fffbeb',
    borderLeftWidth: 3,
    borderRadius: 8,
    padding: 10,
    marginTop: 12,
  },
  tipHeading: { fontSize: 12, fontWeight: '700', color: '#92400e', marginBottom: 4 },
  tipText: { fontSize: 12, color: '#78350f', lineHeight: 18 },

  doNotBox: {
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
  },
  doNotText: { fontSize: 12, color: '#b91c1c', lineHeight: 18 },

  footerCard: { marginTop: 4 },
  footerTitle: { fontSize: 15, fontWeight: '700', color: COLORS.dark, marginBottom: 8 },
  footerText: { fontSize: 13, color: COLORS.gray, lineHeight: 20 },
});