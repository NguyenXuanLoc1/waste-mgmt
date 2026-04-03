import React, { useRef, useState } from 'react';
import {
  TouchableOpacity, Text, StyleSheet, Animated,
  View, Platform,
} from 'react-native';

export default function LeaderboardFAB({ onPress }) {
  const scaleAnim  = useRef(new Animated.Value(1)).current;
  const shadowAnim = useRef(new Animated.Value(0.25)).current;
  const [showTooltip, setShowTooltip] = useState(false);

  const handlePressIn = () => {
    setShowTooltip(true);
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1.12, useNativeDriver: true, speed: 20, bounciness: 8 }),
      Animated.timing(shadowAnim, { toValue: 0.45, duration: 150, useNativeDriver: false }),
    ]).start();
  };

  const handlePressOut = () => {
    setShowTooltip(false);
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 6 }),
      Animated.timing(shadowAnim, { toValue: 0.25, duration: 150, useNativeDriver: false }),
    ]).start();
  };

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      {/* Tooltip */}
      {showTooltip && (
        <View style={styles.tooltip}>
          <Text style={styles.tooltipText}>View Leaderboard</Text>
          <View style={styles.tooltipArrow} />
        </View>
      )}

      {/* FAB */}
      <Animated.View style={[styles.shadow, { transform: [{ scale: scaleAnim }], shadowOpacity: shadowAnim }]}>
        <TouchableOpacity
          style={styles.fab}
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          {...(Platform.OS === 'web' ? { onMouseEnter: handlePressIn, onMouseLeave: handlePressOut } : {})}
          activeOpacity={0.9}
        >
          <Text style={styles.icon}>🏆</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const FAB_SIZE = 56;

const styles = StyleSheet.create({
  wrapper: { position: 'absolute', bottom: 30, right: 30, zIndex: 9999, alignItems: 'center' },

  tooltip: {
    position: 'absolute', bottom: FAB_SIZE + 10, right: 0,
    backgroundColor: 'rgba(0,0,0,0.78)', paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 8, alignItems: 'center', minWidth: 140,
  },
  tooltipText:  { color: '#fff', fontSize: 12, fontWeight: '600' },
  tooltipArrow: {
    position: 'absolute', bottom: -5, right: 20,
    width: 0, height: 0,
    borderLeftWidth: 5, borderRightWidth: 5, borderTopWidth: 6,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
    borderTopColor: 'rgba(0,0,0,0.78)',
  },

  shadow: {
    width: FAB_SIZE, height: FAB_SIZE, borderRadius: FAB_SIZE / 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowRadius: 10,
    elevation: 10,
  },
  fab: {
    width: FAB_SIZE, height: FAB_SIZE, borderRadius: FAB_SIZE / 2,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#FFD700',
    borderTopWidth: 1.5, borderTopColor: '#FFE94D',
    borderBottomWidth: 1.5, borderBottomColor: '#E6B800',
    overflow: 'hidden',
  },
  icon: { fontSize: 26, lineHeight: 30, marginTop: Platform.OS === 'android' ? -2 : 0 },
});