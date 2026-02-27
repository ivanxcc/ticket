import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
  Alert,
  Clipboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useAppStore, type ThemeMode, type Member } from '@/store';
import { supabase } from '@/lib/supabase';

const PRESET_EMOJIS = [
  '🏠','🦁','🐻','🦊','🐺','🦝','🐨','🦄',
  '🌟','🎸','🏔️','🌊','🦋','🍀','🎯','🚀',
  '💎','🔥','🌙','⭐','🎉','🍕','🎮','🐶',
];

const THEME_OPTIONS: { mode: ThemeMode; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { mode: 'system', label: 'System', icon: 'phone-portrait-outline' },
  { mode: 'light', label: 'Light', icon: 'sunny-outline' },
  { mode: 'dark', label: 'Dark', icon: 'moon-outline' },
];

export default function SettingsScreen() {
  const { colors } = useTheme();
  const {
    members,
    currentMemberId,
    updateMember,
    themeMode,
    setThemeMode,
    tickets,
    householdInviteCode,
    signOut,
  } = useAppStore();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmoji, setEditEmoji] = useState('');
  const [customEmojiInput, setCustomEmojiInput] = useState('');
  const [deleteArmedUntil, setDeleteArmedUntil] = useState(0);
  const [deletingAccount, setDeletingAccount] = useState(false);

  const startEdit = (member: Member) => {
    setEditingId(member.id);
    setEditName(member.name);
    setEditEmoji(member.emoji);
    setCustomEmojiInput('');
  };

  const saveEdit = () => {
    if (editingId && editName.trim()) {
      updateMember(editingId, { name: editName.trim(), emoji: editEmoji });
    }
    setEditingId(null);
  };

  const handleCopyCode = () => {
    if (householdInviteCode) {
      Clipboard.setString(householdInviteCode);
      Alert.alert('Copied!', `Invite code "${householdInviteCode}" copied to clipboard.`);
    }
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => signOut() },
    ]);
  };

  const runDeleteAccount = async () => {
    setDeletingAccount(true);
    try {
      const { data: authData, error: authErr } = await supabase.auth.getUser();
      if (authErr) throw authErr;
      const user = authData.user;
      if (!user) throw new Error('Not signed in');

      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('household_id')
        .eq('id', user.id)
        .maybeSingle();
      if (profileErr) throw profileErr;

      const householdId = profile?.household_id ?? null;
      if (householdId) {
        const { count: memberCount, error: countErr } = await supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('household_id', householdId);
        if (countErr) throw countErr;

        // If this user is the last member, delete household data to avoid orphan data.
        if ((memberCount ?? 0) <= 1) {
          const { error: tErr } = await supabase
            .from('tickets')
            .delete()
            .eq('household_id', householdId);
          if (tErr) throw tErr;

          const { error: hErr } = await supabase
            .from('households')
            .delete()
            .eq('id', householdId);
          if (hErr) throw hErr;
        }
      }

      const { error: deleteProfileErr } = await supabase
        .from('profiles')
        .delete()
        .eq('id', user.id);
      if (deleteProfileErr) throw deleteProfileErr;

      await signOut();
    } catch (e: unknown) {
      const message = (e as any)?.message ?? String(e);
      Alert.alert('Delete Failed', message);
    } finally {
      setDeletingAccount(false);
      setDeleteArmedUntil(0);
    }
  };

  const handleDeleteAccount = () => {
    const now = Date.now();
    if (now > deleteArmedUntil) {
      setDeleteArmedUntil(now + 10000);
      Alert.alert(
        'Arm Delete Account',
        'Safety check enabled. Tap "Delete Account" again within 10 seconds to continue.',
      );
      return;
    }

    Alert.alert(
      'Delete account data?',
      'This removes your profile and may also delete household/tickets if you are the only member. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete Account', style: 'destructive', onPress: runDeleteAccount },
      ],
    );
  };

  const totalTickets = tickets.length;
  const openTickets = tickets.filter((t) => t.status !== 'complete').length;
  const completedTickets = tickets.filter((t) => t.status === 'complete').length;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Text style={[styles.pageTitle, { color: colors.text }]}>Settings</Text>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statNum, { color: colors.text }]}>{totalTickets}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total</Text>
          </View>
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => router.push('/?filter=open' as any)}
            style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <Text style={[styles.statNum, { color: '#F59E0B' }]}>{openTickets}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Open</Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => router.push('/?filter=complete' as any)}
            style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <Text style={[styles.statNum, { color: '#22C55E' }]}>{completedTickets}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Done</Text>
          </TouchableOpacity>
        </View>

        {/* Household section */}
        <SectionHeader title="HOUSEHOLD" colors={colors} />

        {/* Invite code */}
        {householdInviteCode && (
          <TouchableOpacity
            onPress={handleCopyCode}
            activeOpacity={0.7}
            style={[styles.inviteCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <View>
              <Text style={[styles.inviteLabel, { color: colors.textSecondary }]}>Invite code</Text>
              <Text style={[styles.inviteCode, { color: colors.accent }]}>{householdInviteCode}</Text>
            </View>
            <View style={[styles.copyBtn, { backgroundColor: `${colors.accent}15`, borderColor: `${colors.accent}30` }]}>
              <Ionicons name="copy-outline" size={15} color={colors.accent} />
              <Text style={[styles.copyText, { color: colors.accent }]}>Copy</Text>
            </View>
          </TouchableOpacity>
        )}

        <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
          Share the invite code with household members. You can edit your own profile below.
        </Text>

        {members.map((member) => {
          const isCurrentUser = member.id === currentMemberId;
          const isEditing = editingId === member.id;

          return (
            <View
              key={member.id}
              style={[
                styles.memberCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: isCurrentUser ? `${member.color}60` : colors.border,
                  borderWidth: isCurrentUser ? 1.5 : 1,
                },
              ]}
            >
              {isEditing ? (
                /* Edit mode */
                <View style={styles.editBody}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.emojiPicker}>
                    {PRESET_EMOJIS.map((e) => (
                      <TouchableOpacity
                        key={e}
                        onPress={() => { setEditEmoji(e); setCustomEmojiInput(''); }}
                        style={[
                          styles.emojiOption,
                          editEmoji === e && !customEmojiInput && { backgroundColor: `${member.color}25`, borderRadius: 8 },
                        ]}
                      >
                        <Text style={styles.emojiText}>{e}</Text>
                      </TouchableOpacity>
                    ))}
                    <TextInput
                      value={customEmojiInput}
                      onChangeText={(text) => {
                        setCustomEmojiInput(text);
                        if (text) setEditEmoji(text);
                      }}
                      placeholder="✏️"
                      maxLength={8}
                      style={[
                        styles.emojiOption,
                        styles.customEmojiInput,
                        customEmojiInput
                          ? { backgroundColor: `${member.color}25`, borderRadius: 8 }
                          : undefined,
                        { color: colors.text },
                      ]}
                    />
                  </ScrollView>
                  <View style={styles.editNameRow}>
                    <Text style={styles.selectedEmoji}>{editEmoji}</Text>
                    <TextInput
                      value={editName}
                      onChangeText={setEditName}
                      style={[styles.nameInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBackground }]}
                      maxLength={20}
                      returnKeyType="done"
                      onSubmitEditing={saveEdit}
                      autoFocus
                    />
                    <TouchableOpacity
                      onPress={saveEdit}
                      style={[styles.saveBtn, { backgroundColor: member.color }]}
                    >
                      <Ionicons name="checkmark" size={18} color="#fff" />
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                /* Display mode */
                <View style={styles.memberDisplay}>
                  <View style={styles.memberLeft}>
                    <Text style={styles.memberEmoji}>{member.emoji}</Text>
                    <View>
                      <Text style={[styles.memberName, { color: colors.text }]}>{member.name}</Text>
                      {isCurrentUser && (
                        <Text style={[styles.youLabel, { color: member.color }]}>● You</Text>
                      )}
                    </View>
                  </View>
                  {isCurrentUser && (
                    <TouchableOpacity
                      onPress={() => startEdit(member)}
                      style={[styles.editBtn, { borderColor: colors.border }]}
                    >
                      <Ionicons name="pencil-outline" size={15} color={colors.textSecondary} />
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          );
        })}

        {/* Theme section */}
        <SectionHeader title="APPEARANCE" colors={colors} />
        <View style={[styles.themeCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {THEME_OPTIONS.map((opt, idx) => {
            const active = themeMode === opt.mode;
            return (
              <View key={opt.mode}>
                <TouchableOpacity
                  onPress={() => setThemeMode(opt.mode)}
                  activeOpacity={0.7}
                  style={styles.themeRow}
                >
                  <View style={styles.themeLeft}>
                    <Ionicons
                      name={opt.icon}
                      size={18}
                      color={active ? colors.accent : colors.textSecondary}
                    />
                    <Text style={[styles.themeLabel, { color: active ? colors.text : colors.textSecondary }]}>
                      {opt.label}
                    </Text>
                  </View>
                  {active && (
                    <Ionicons name="checkmark-circle" size={20} color={colors.accent} />
                  )}
                </TouchableOpacity>
                {idx < THEME_OPTIONS.length - 1 && (
                  <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />
                )}
              </View>
            );
          })}
        </View>

        {/* About */}
        <SectionHeader title="ABOUT" colors={colors} />
        <View style={[styles.aboutCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.aboutTitle, { color: colors.text }]}>ticket</Text>
          <Text style={[styles.aboutSub, { color: colors.textSecondary }]}>
            A simple household ticketing system.
          </Text>
        </View>

        {/* Sign Out */}
        <TouchableOpacity
          onPress={handleSignOut}
          activeOpacity={0.7}
          style={[styles.signOutBtn, { borderColor: '#EF444440' }]}
        >
          <Ionicons name="log-out-outline" size={18} color="#EF4444" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleDeleteAccount}
          disabled={deletingAccount}
          activeOpacity={0.7}
          style={[
            styles.deleteAccountBtn,
            { borderColor: deletingAccount ? '#EF444420' : '#EF444460' },
          ]}
        >
          <Ionicons name="trash-outline" size={18} color="#EF4444" />
          <Text style={styles.deleteAccountText}>
            {deletingAccount ? 'Deleting...' : 'Delete Account'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionHeader({ title, colors }: { title: string; colors: any }) {
  return (
    <Text style={[styles.sectionHeader, { color: colors.textTertiary }]}>{title}</Text>
  );
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
  sectionSubtitle: {
    fontSize: 13,
    marginBottom: 4,
    lineHeight: 19,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 4,
  },
  statCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    alignItems: 'center',
    gap: 4,
  },
  statNum: {
    fontSize: 22,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  inviteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  inviteLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.4,
    marginBottom: 3,
  },
  inviteCode: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 2,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  copyText: {
    fontSize: 13,
    fontWeight: '600',
  },
  memberCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 4,
  },
  memberDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  memberLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  memberEmoji: {
    fontSize: 30,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
  },
  youLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 1,
  },
  editBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBody: {
    padding: 14,
    gap: 12,
  },
  emojiPicker: {
    gap: 4,
    paddingVertical: 4,
  },
  emojiOption: {
    padding: 4,
  },
  customEmojiInput: {
    fontSize: 22,
    textAlign: 'center',
    minWidth: 34,
  },
  emojiText: {
    fontSize: 24,
  },
  selectedEmoji: {
    fontSize: 26,
  },
  editNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  nameInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  saveBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  themeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  themeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  themeLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  rowDivider: {
    height: 1,
    marginHorizontal: 16,
    opacity: 0.5,
  },
  aboutCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    alignItems: 'center',
    gap: 6,
  },
  aboutTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  aboutSub: {
    fontSize: 13,
    textAlign: 'center',
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 8,
  },
  signOutText: {
    color: '#EF4444',
    fontSize: 15,
    fontWeight: '600',
  },
  deleteAccountBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 4,
    marginBottom: 8,
  },
  deleteAccountText: {
    color: '#EF4444',
    fontSize: 15,
    fontWeight: '700',
  },
});
