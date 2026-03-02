import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/hooks/useTheme';
import { useAppStore, type Status } from '@/store';
import { Confetti } from '@/components/Confetti';
import { StatusBadge } from '@/components/StatusBadge';
import { CATEGORIES } from '@/constants/categories';
import { STATUS_COLORS, STATUS_LABELS, STATUS_ICONS, PRIORITY_COLORS, PRIORITY_LABELS } from '@/constants/theme';
import { formatTicketNumber, formatDate, formatRelativeTime } from '@/utils/format';

const STATUS_ORDER: Status[] = ['submitted', 'in_progress', 'pending', 'complete'];

export default function TicketDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const { tickets, members, updateTicketStatus, deleteTicket } = useAppStore();

  const ticket = tickets.find((t) => t.id === id);
  const [showConfetti, setShowConfetti] = useState(false);

  if (!ticket) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.notFound}>
          <Text style={[styles.notFoundText, { color: colors.textSecondary }]}>Ticket not found.</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={[styles.backLink, { color: colors.accent }]}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const assignee = members.find((m) => m.id === ticket.assignedTo);
  const creator = members.find((m) => m.id === ticket.createdBy);
  const category = CATEGORIES.find((c) => c.id === ticket.category);
  const statusColor = STATUS_COLORS[ticket.status];
  const priorityColor = PRIORITY_COLORS[ticket.priority];

  const handleStatusChange = (newStatus: Status) => {
    if (newStatus === ticket.status) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    updateTicketStatus(ticket.id, newStatus);
    if (newStatus === 'complete') setShowConfetti(true);
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Ticket',
      `Delete "${ticket.title}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            deleteTicket(ticket.id);
            router.back();
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.textSecondary} />
        </TouchableOpacity>
        <Text style={[styles.ticketNum, { color: colors.textTertiary }]}>
          {formatTicketNumber(ticket.ticketNumber)}
        </Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => router.push(`/ticket/edit?id=${ticket.id}` as any)}
            style={styles.headerBtn}
          >
            <Ionicons name="pencil-outline" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDelete} style={styles.headerBtn}>
            <Ionicons name="trash-outline" size={18} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>

      {showConfetti && (
        <View style={styles.confettiOverlay} pointerEvents="none">
          <Confetti onFinish={() => setShowConfetti(false)} />
        </View>
      )}

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Status stripe accent */}
        <View style={[styles.statusAccent, { backgroundColor: statusColor }]} />

        {/* Title */}
        <Text style={[styles.title, { color: colors.text }]}>{ticket.title}</Text>

        {/* Current status badge */}
        <View style={styles.currentStatusRow}>
          <StatusBadge status={ticket.status} />
          <Text style={[styles.updatedAt, { color: colors.textTertiary }]}>
            Updated {formatRelativeTime(ticket.updatedAt)}
          </Text>
        </View>

        {/* Status stepper */}
        <View style={[styles.stepperCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>UPDATE STATUS</Text>
          <View style={styles.statusGrid}>
            {STATUS_ORDER.map((s) => {
              const active = ticket.status === s;
              const sc = STATUS_COLORS[s];
              const icon = STATUS_ICONS[s] as keyof typeof Ionicons.glyphMap;
              return (
                <TouchableOpacity
                  key={s}
                  onPress={() => handleStatusChange(s)}
                  activeOpacity={0.7}
                  style={[
                    styles.statusBtn,
                    {
                      backgroundColor: active ? `${sc}20` : colors.inputBackground,
                      borderColor: active ? sc : colors.border,
                    },
                  ]}
                >
                  <Ionicons name={icon} size={20} color={active ? sc : colors.textTertiary} />
                  <Text style={[styles.statusBtnText, { color: active ? sc : colors.textSecondary }]}>
                    {STATUS_LABELS[s]}
                  </Text>
                  {active && (
                    <View style={[styles.activeDot, { backgroundColor: sc }]} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Description */}
        {ticket.description ? (
          <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>DETAILS</Text>
            <Text style={[styles.description, { color: colors.text }]}>{ticket.description}</Text>
          </View>
        ) : null}

        {/* Metadata grid */}
        <View style={[styles.metaCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <MetaRow
            label="Category"
            colors={colors}
            value={
              <View style={styles.metaValueRow}>
                {category && (
                  <Ionicons
                    name={category.icon as keyof typeof Ionicons.glyphMap}
                    size={14}
                    color={category.color}
                  />
                )}
                <Text style={[styles.metaValue, { color: colors.text }]}>{category?.label ?? 'Other'}</Text>
              </View>
            }
          />
          <MetaDivider colors={colors} />

          <MetaRow
            label="Priority"
            colors={colors}
            value={
              <View style={[styles.priorityPill, { backgroundColor: `${priorityColor}15`, borderColor: `${priorityColor}40` }]}>
                <Text style={[styles.priorityPillText, { color: priorityColor }]}>
                  {PRIORITY_LABELS[ticket.priority]}
                </Text>
              </View>
            }
          />
          <MetaDivider colors={colors} />

          <MetaRow
            label="Assigned to"
            colors={colors}
            value={
              <View style={styles.metaValueRow}>
                <Text>{assignee?.emoji ?? '?'}</Text>
                <Text style={[styles.metaValue, { color: colors.text }]}>{assignee?.name ?? 'Unknown'}</Text>
              </View>
            }
          />
          <MetaDivider colors={colors} />

          <MetaRow
            label="Submitted by"
            colors={colors}
            value={
              <View style={styles.metaValueRow}>
                <Text>{creator?.emoji ?? '?'}</Text>
                <Text style={[styles.metaValue, { color: colors.text }]}>{creator?.name ?? 'Unknown'}</Text>
              </View>
            }
          />
          <MetaDivider colors={colors} />

          <MetaRow
            label="Created"
            colors={colors}
            value={<Text style={[styles.metaValue, { color: colors.text }]}>{formatDate(ticket.createdAt)}</Text>}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function MetaRow({ label, value, colors }: { label: string; value: React.ReactNode; colors: any }) {
  return (
    <View style={styles.metaRow}>
      <Text style={[styles.metaLabel, { color: colors.textSecondary }]}>{label}</Text>
      {value}
    </View>
  );
}

function MetaDivider({ colors }: { colors: any }) {
  return <View style={[styles.metaDivider, { backgroundColor: colors.border }]} />;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confettiOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },
  ticketNum: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  content: {
    padding: 20,
    gap: 14,
    paddingBottom: 48,
  },
  statusAccent: {
    height: 3,
    borderRadius: 2,
    width: 40,
    marginBottom: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 32,
  },
  currentStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  updatedAt: {
    fontSize: 12,
  },
  stepperCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusBtn: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    position: 'relative',
  },
  statusBtnText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  infoCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  description: {
    fontSize: 15,
    lineHeight: 23,
  },
  metaCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  metaLabel: {
    fontSize: 14,
  },
  metaValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  metaDivider: {
    height: 1,
    marginHorizontal: 16,
    opacity: 0.5,
  },
  priorityPill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  priorityPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  notFound: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  notFoundText: { fontSize: 16 },
  backLink: { fontSize: 15, fontWeight: '600' },
});
