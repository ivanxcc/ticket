import { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import { useAppStore } from '@/store';
import { STATUS_COLORS, STATUS_LABELS } from '@/constants/theme';

const STATUSES = ['submitted', 'in_progress', 'pending', 'complete'] as const;

export default function StatsScreen() {
  const { colors } = useTheme();
  const tickets = useAppStore((s) => s.tickets);
  const members = useAppStore((s) => s.members);

  const stats = useMemo(() => {
    const completed = tickets.filter((t) => t.status === 'complete');
    const open = tickets.filter((t) => t.status !== 'complete');
    const total = tickets.length;
    const completionRate = total > 0 ? Math.round((completed.length / total) * 100) : 0;

    const avgMs =
      completed.length > 0
        ? completed.reduce(
            (acc, t) => acc + (new Date(t.updatedAt).getTime() - new Date(t.createdAt).getTime()),
            0,
          ) / completed.length
        : null;
    const avgDays = avgMs !== null ? Math.round(avgMs / 86400000) : null;

    const byStatus = Object.fromEntries(
      STATUSES.map((s) => [s, tickets.filter((t) => t.status === s).length]),
    ) as Record<(typeof STATUSES)[number], number>;

    const cutoff = new Date(Date.now() - 30 * 86400000);
    const created30 = tickets.filter((t) => new Date(t.createdAt) >= cutoff).length;
    const completed30 = completed.filter((t) => new Date(t.updatedAt) >= cutoff).length;

    const memberStats = members
      .map((m) => {
        const assigned = tickets.filter((t) => t.assignedTo.includes(m.id));
        const done = assigned.filter((t) => t.status === 'complete').length;
        const rate = assigned.length > 0 ? Math.round((done / assigned.length) * 100) : 0;
        return { member: m, assigned: assigned.length, done, rate };
      })
      .sort((a, b) => b.assigned - a.assigned);

    return {
      total,
      completedCount: completed.length,
      openCount: open.length,
      completionRate,
      avgDays,
      byStatus,
      created30,
      completed30,
      memberStats,
    };
  }, [tickets, members]);

  const maxStatusCount = Math.max(...STATUSES.map((s) => stats.byStatus[s]), 1);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.pageTitle, { color: colors.text }]}>stats</Text>

        {/* Overview */}
        <SectionHeader title="OVERVIEW" colors={colors} />
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.overviewRow}>
            <View style={styles.rateBox}>
              <Text style={[styles.rateNum, { color: colors.accent }]}>{stats.completionRate}%</Text>
              <Text style={[styles.rateLabel, { color: colors.textSecondary }]}>completion</Text>
            </View>
            <View style={[styles.overviewDivider, { backgroundColor: colors.border }]} />
            <View style={styles.countsRow}>
              <View style={styles.countBox}>
                <Text style={[styles.countNum, { color: '#22C55E' }]}>{stats.completedCount}</Text>
                <Text style={[styles.countLabel, { color: colors.textSecondary }]}>done</Text>
              </View>
              <View style={styles.countBox}>
                <Text style={[styles.countNum, { color: '#F59E0B' }]}>{stats.openCount}</Text>
                <Text style={[styles.countLabel, { color: colors.textSecondary }]}>open</Text>
              </View>
              <View style={styles.countBox}>
                <Text style={[styles.countNum, { color: colors.text }]}>{stats.total}</Text>
                <Text style={[styles.countLabel, { color: colors.textSecondary }]}>total</Text>
              </View>
            </View>
          </View>

          <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
            {stats.completionRate > 0 && (
              <View
                style={[
                  styles.progressFill,
                  { width: `${stats.completionRate}%`, backgroundColor: '#22C55E' },
                ]}
              />
            )}
          </View>

          {stats.total === 0 ? (
            <Text style={[styles.avgLabel, { color: colors.textTertiary }]}>No tickets yet</Text>
          ) : stats.completedCount === 0 ? (
            <Text style={[styles.avgLabel, { color: colors.textTertiary }]}>No completed tickets yet</Text>
          ) : stats.avgDays !== null ? (
            <Text style={[styles.avgLabel, { color: colors.textSecondary }]}>
              Avg {stats.avgDays === 0 ? 'less than 1 day' : `${stats.avgDays} day${stats.avgDays !== 1 ? 's' : ''}`} to complete
            </Text>
          ) : null}
        </View>

        {/* Status breakdown */}
        <SectionHeader title="STATUS BREAKDOWN" colors={colors} />
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {STATUSES.map((status, idx) => {
            const count = stats.byStatus[status];
            const color = STATUS_COLORS[status];
            const barPct = (count / maxStatusCount) * 100;
            return (
              <View key={status}>
                <View style={styles.statusRow}>
                  <View style={[styles.statusDot, { backgroundColor: color }]} />
                  <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>
                    {STATUS_LABELS[status]}
                  </Text>
                  <View style={[styles.statusBarTrack, { backgroundColor: colors.border }]}>
                    {count > 0 && (
                      <View
                        style={[styles.statusBarFill, { width: `${barPct}%`, backgroundColor: color }]}
                      />
                    )}
                  </View>
                  <Text style={[styles.statusCount, { color: colors.text }]}>{count}</Text>
                </View>
                {idx < STATUSES.length - 1 && (
                  <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />
                )}
              </View>
            );
          })}
        </View>

        {/* Last 30 days */}
        <SectionHeader title="LAST 30 DAYS" colors={colors} />
        <View style={styles.thirtyRow}>
          <View style={[styles.thirtyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.thirtyNum, { color: colors.text }]}>{stats.created30}</Text>
            <Text style={[styles.thirtyLabel, { color: colors.textSecondary }]}>Created</Text>
          </View>
          <View style={[styles.thirtyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.thirtyNum, { color: '#22C55E' }]}>{stats.completed30}</Text>
            <Text style={[styles.thirtyLabel, { color: colors.textSecondary }]}>Completed</Text>
          </View>
        </View>

        {/* Members */}
        {stats.memberStats.length > 0 && (
          <>
            <SectionHeader title="MEMBERS" colors={colors} />
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {stats.memberStats.map((ms, idx) => (
                <View key={ms.member.id}>
                  <View style={styles.memberRow}>
                    <Text style={styles.memberEmoji}>{ms.member.emoji}</Text>
                    <View style={styles.memberInfo}>
                      <View style={styles.memberNameRow}>
                        <Text style={[styles.memberName, { color: colors.text }]}>{ms.member.name}</Text>
                        <Text style={[styles.memberRate, { color: ms.member.color }]}>{ms.rate}%</Text>
                      </View>
                      <Text style={[styles.memberSub, { color: colors.textSecondary }]}>
                        {ms.assigned} assigned · {ms.done} done
                      </Text>
                      <View style={[styles.memberBarTrack, { backgroundColor: colors.border }]}>
                        {ms.rate > 0 && (
                          <View
                            style={[
                              styles.memberBarFill,
                              { width: `${ms.rate}%`, backgroundColor: ms.member.color },
                            ]}
                          />
                        )}
                      </View>
                    </View>
                  </View>
                  {idx < stats.memberStats.length - 1 && (
                    <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />
                  )}
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionHeader({ title, colors }: { title: string; colors: any }) {
  return <Text style={[styles.sectionHeader, { color: colors.textTertiary }]}>{title}</Text>;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    padding: 20,
    gap: 10,
    paddingBottom: 48,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginTop: 8,
    marginBottom: 2,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  // Overview
  overviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rateBox: {
    alignItems: 'center',
    paddingRight: 16,
    minWidth: 72,
  },
  rateNum: {
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -1,
  },
  rateLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  overviewDivider: {
    width: 1,
    height: 48,
    marginRight: 16,
  },
  countsRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  countBox: {
    alignItems: 'center',
    gap: 2,
  },
  countNum: {
    fontSize: 22,
    fontWeight: '700',
  },
  countLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    borderRadius: 3,
  },
  avgLabel: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  // Status breakdown
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 2,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  statusLabel: {
    fontSize: 13,
    fontWeight: '500',
    width: 88,
  },
  statusBarTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  statusBarFill: {
    height: 8,
    borderRadius: 4,
  },
  statusCount: {
    fontSize: 13,
    fontWeight: '700',
    width: 24,
    textAlign: 'right',
  },
  rowDivider: {
    height: 1,
    opacity: 0.4,
  },
  // 30 days
  thirtyRow: {
    flexDirection: 'row',
    gap: 10,
  },
  thirtyCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    alignItems: 'center',
    gap: 4,
  },
  thirtyNum: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  thirtyLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  // Members
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  memberEmoji: {
    fontSize: 28,
  },
  memberInfo: {
    flex: 1,
    gap: 3,
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  memberName: {
    fontSize: 14,
    fontWeight: '600',
  },
  memberRate: {
    fontSize: 14,
    fontWeight: '700',
  },
  memberSub: {
    fontSize: 12,
    fontWeight: '400',
  },
  memberBarTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 2,
  },
  memberBarFill: {
    height: 4,
    borderRadius: 2,
  },
});
