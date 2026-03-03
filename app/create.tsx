import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '@/hooks/useTheme';
import { useAppStore, type Priority } from '@/store';
import { CATEGORIES } from '@/constants/categories';
import { PRIORITY_COLORS, PRIORITY_LABELS } from '@/constants/theme';
import { formatDate } from '@/utils/format';

const PRIORITIES: Priority[] = ['low', 'medium', 'urgent'];

export default function CreateScreen() {
  const { colors } = useTheme();
  const { members, currentMemberId, addTicket } = useAppStore();
  const insets = useSafeAreaInsets();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('it');
  const [assignedTo, setAssignedTo] = useState<string[]>(
    members.filter((m) => m.id !== currentMemberId).map((m) => m.id).slice(0, 1),
  );
  const [priority, setPriority] = useState<Priority>('medium');
  const [deadline, setDeadline] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const toggleAssignee = (memberId: string) => {
    setAssignedTo((prev) =>
      prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId],
    );
  };

  const canSubmit = title.trim().length > 0 && !!currentMemberId && assignedTo.length > 0;

  const handleSubmit = () => {
    if (!canSubmit) return;

    if (!currentMemberId || assignedTo.length === 0) {
      Alert.alert('Missing assignee', 'Please choose who this ticket is assigned to.');
      return;
    }

    addTicket({
      title: title.trim(),
      description: description.trim(),
      category,
      assignedTo,
      createdBy: currentMemberId,
      status: 'submitted',
      priority,
      deadline: deadline ? deadline.toISOString() : null,
    });

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
            <Ionicons name="close" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>New Ticket</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.form}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {/* Title */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>TITLE</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="What needs to be done?"
              placeholderTextColor={colors.textTertiary}
              style={[styles.titleInput, { color: colors.text, backgroundColor: colors.inputBackground, borderColor: colors.border }]}
              multiline
              maxLength={120}
              autoFocus
            />
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>DETAILS</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Add more context... (optional)"
              placeholderTextColor={colors.textTertiary}
              style={[styles.descInput, { color: colors.text, backgroundColor: colors.inputBackground, borderColor: colors.border }]}
              multiline
              numberOfLines={3}
              maxLength={500}
            />
          </View>

          {/* Category */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>CATEGORY</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryList}>
              {CATEGORIES.map((cat) => {
                const active = category === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    onPress={() => setCategory(cat.id)}
                    activeOpacity={0.7}
                    style={[
                      styles.categoryChip,
                      {
                        backgroundColor: active ? `${cat.color}20` : colors.surface,
                        borderColor: active ? cat.color : colors.border,
                      },
                    ]}
                  >
                    <Ionicons
                      name={cat.icon as keyof typeof Ionicons.glyphMap}
                      size={15}
                      color={active ? cat.color : colors.textSecondary}
                    />
                    <Text style={[styles.categoryChipText, { color: active ? cat.color : colors.textSecondary }]}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Assign to (multi-select) */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>ASSIGN TO</Text>
            <View style={styles.memberRow}>
              {members.map((member) => {
                const active = assignedTo.includes(member.id);
                return (
                  <TouchableOpacity
                    key={member.id}
                    onPress={() => toggleAssignee(member.id)}
                    activeOpacity={0.7}
                    style={[
                      styles.memberCard,
                      {
                        flex: 1,
                        backgroundColor: active ? `${member.color}18` : colors.surface,
                        borderColor: active ? member.color : colors.border,
                      },
                    ]}
                  >
                    <Text style={styles.memberEmoji}>{member.emoji}</Text>
                    <Text style={[styles.memberName, { color: active ? member.color : colors.text }]}>
                      {member.name}
                    </Text>
                    {active && (
                      <Ionicons name="checkmark-circle" size={16} color={member.color} style={{ marginTop: 2 }} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Priority */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>PRIORITY</Text>
            <View style={styles.priorityRow}>
              {PRIORITIES.map((p) => {
                const active = priority === p;
                const pc = PRIORITY_COLORS[p];
                return (
                  <TouchableOpacity
                    key={p}
                    onPress={() => setPriority(p)}
                    activeOpacity={0.7}
                    style={[
                      styles.priorityBtn,
                      {
                        flex: 1,
                        backgroundColor: active ? `${pc}20` : colors.surface,
                        borderColor: active ? pc : colors.border,
                      },
                    ]}
                  >
                    <Text style={[styles.priorityBtnText, { color: active ? pc : colors.textSecondary }]}>
                      {PRIORITY_LABELS[p]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Deadline */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>DEADLINE</Text>
            <TouchableOpacity
              onPress={() => setShowDatePicker(!showDatePicker)}
              activeOpacity={0.7}
              style={[
                styles.deadlineRow,
                {
                  backgroundColor: colors.inputBackground,
                  borderColor: deadline ? colors.accent : colors.border,
                },
              ]}
            >
              <Ionicons
                name="calendar-outline"
                size={16}
                color={deadline ? colors.accent : colors.textSecondary}
              />
              <Text style={[styles.deadlineText, { color: deadline ? colors.text : colors.textTertiary, flex: 1 }]}>
                {deadline ? formatDate(deadline.toISOString()) : 'No deadline (optional)'}
              </Text>
              {deadline ? (
                <TouchableOpacity
                  onPress={() => { setDeadline(null); setShowDatePicker(false); }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              ) : (
                <Ionicons
                  name={showDatePicker ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={colors.textTertiary}
                />
              )}
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={deadline ?? new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                minimumDate={new Date()}
                onChange={(_event, selectedDate) => {
                  if (selectedDate) setDeadline(selectedDate);
                }}
                style={styles.datePicker}
              />
            )}
          </View>
        </ScrollView>

        {/* Submit */}
        <View style={[styles.submitContainer, { borderTopColor: colors.border, backgroundColor: colors.background, paddingBottom: Math.max(insets.bottom, 16) }]}>
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={!canSubmit}
            activeOpacity={0.85}
            style={[
              styles.submitBtn,
              {
                backgroundColor: canSubmit ? colors.accent : colors.border,
              },
            ]}
          >
            <Ionicons name="send" size={16} color="#fff" />
            <Text style={styles.submitText}>Submit Ticket</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  form: {
    padding: 20,
    gap: 24,
    paddingBottom: 8,
  },
  section: {
    gap: 10,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  titleInput: {
    fontSize: 17,
    fontWeight: '500',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    minHeight: 52,
    lineHeight: 24,
  },
  descInput: {
    fontSize: 15,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    minHeight: 80,
    lineHeight: 22,
    textAlignVertical: 'top',
  },
  categoryList: {
    gap: 8,
    flexDirection: 'row',
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  memberRow: {
    flexDirection: 'row',
    gap: 10,
  },
  memberCard: {
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 6,
  },
  memberEmoji: {
    fontSize: 26,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '600',
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 10,
  },
  priorityBtn: {
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  priorityBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  deadlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  deadlineText: {
    fontSize: 15,
  },
  datePicker: {
    height: 160,
  },
  submitContainer: {
    paddingTop: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
  },
  submitText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
