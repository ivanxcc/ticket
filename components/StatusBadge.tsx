import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { STATUS_COLORS, STATUS_LABELS, STATUS_ICONS } from '@/constants/theme';
import type { Status } from '@/store';

interface Props {
  status: Status;
  small?: boolean;
}

export function StatusBadge({ status, small }: Props) {
  const color = STATUS_COLORS[status];
  const label = STATUS_LABELS[status];
  const icon = STATUS_ICONS[status] as keyof typeof Ionicons.glyphMap;

  return (
    <View style={[styles.badge, small && styles.badgeSmall, { backgroundColor: `${color}18`, borderColor: `${color}40` }]}>
      <Ionicons name={icon} size={small ? 10 : 12} color={color} />
      <Text style={[styles.label, small && styles.labelSmall, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  badgeSmall: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    gap: 3,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
  labelSmall: {
    fontSize: 11,
  },
});
