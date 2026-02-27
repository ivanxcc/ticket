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
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/hooks/useTheme';
import { useAppStore } from '@/store';

const PRESET_EMOJIS = [
  '🏠', '🦁', '🐻', '🦊', '🐺', '🦝', '🐨', '🦄',
  '🌟', '🎸', '🏔️', '🌊', '🦋', '🍀', '🎯', '🚀',
];

const PRESET_COLORS = [
  '#5B8DEF', '#A855F7', '#22C55E', '#F59E0B',
  '#EF4444', '#06B6D4', '#F97316', '#EC4899',
];

type Step = 'profile' | 'household';

export default function SetupScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { initFromSupabase, signOut, setUserId, setHousehold } = useAppStore();

  const [step, setStep] = useState<Step>('profile');
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('🏠');
  const [customEmojiInput, setCustomEmojiInput] = useState('');
  const [color, setColor] = useState('#5B8DEF');
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);

  const errMsg = (e: unknown) =>
    (e as any)?.message ?? (e as any)?.error_description ?? String(e);

  const handleCreateHousehold = async () => {
    setLoading(true);
    try {
      const { data: { session }, error: authErr } = await supabase.auth.getSession();
      if (authErr) throw authErr;
      if (!session?.user) {
        Alert.alert('Session required', 'Please sign in after verifying your email.');
        router.replace('/(auth)/sign-in' as any);
        return;
      }
      const user = session.user;

      // Generate unique invite code
      const inviteCode = Math.random().toString(36).slice(2, 8).toUpperCase();

      // Create household
      const { data: household, error: hErr } = await supabase
        .from('households')
        .insert({ invite_code: inviteCode })
        .select()
        .single();
      if (hErr) throw hErr;

      // Create profile
      const { error: pErr } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          household_id: household.id,
          name: name.trim() || 'You',
          emoji,
          color,
        });
      if (pErr) throw pErr;

      // Ensure app auth store is primed so init does not early-return.
      setUserId(user.id);
      setHousehold(household.id, household.invite_code);

      // Populate store so _layout.tsx householdId watcher can transition to 'ready'
      await initFromSupabase();
    } catch (e: unknown) {
      console.error('handleCreateHousehold error:', e);
      Alert.alert('Error', errMsg(e));
    } finally {
      setLoading(false);
    }
  };

  const handleJoinHousehold = async () => {
    if (!joinCode.trim()) return;
    setLoading(true);
    try {
      const { data: { session }, error: authErr } = await supabase.auth.getSession();
      if (authErr) throw authErr;
      if (!session?.user) {
        Alert.alert('Session required', 'Please sign in after verifying your email.');
        router.replace('/(auth)/sign-in' as any);
        return;
      }
      const user = session.user;

      // Look up household by invite code
      const { data: household, error: hErr } = await supabase
        .from('households')
        .select()
        .eq('invite_code', joinCode.trim().toUpperCase())
        .single();
      if (hErr || !household) {
        Alert.alert('Invalid code', 'No household found with that invite code.');
        return;
      }

      // Create profile in that household
      const { error: pErr } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          household_id: household.id,
          name: name.trim() || 'User',
          emoji,
          color,
        });
      if (pErr) throw pErr;

      // Ensure app auth store is primed so init does not early-return.
      setUserId(user.id);
      setHousehold(household.id, household.invite_code);

      // Populate store so _layout.tsx householdId watcher can transition to 'ready'
      await initFromSupabase();
    } catch (e: unknown) {
      console.error('handleJoinHousehold error:', e);
      Alert.alert('Error', errMsg(e));
    } finally {
      setLoading(false);
    }
  };

  const handleStartOver = () => {
    Alert.alert(
      'Start over?',
      'This will sign you out and return to sign in.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start Over',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await signOut();
            } catch (e: unknown) {
              Alert.alert('Error', errMsg(e));
            } finally {
              setLoading(false);
            }
          },
        },
      ],
    );
  };

  if (step === 'profile') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 24) }]}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={[styles.title, { color: colors.text }]}>Your profile</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Set up how your household sees you.
            </Text>

            {/* Emoji picker */}
            <Text style={[styles.label, { color: colors.textSecondary }]}>PICK AN EMOJI</Text>
            <View style={styles.emojiGrid}>
              {PRESET_EMOJIS.map((e) => (
                <TouchableOpacity
                  key={e}
                  onPress={() => { setEmoji(e); setCustomEmojiInput(''); }}
                  style={[
                    styles.emojiBtn,
                    {
                      backgroundColor: emoji === e ? `${color}25` : colors.surface,
                      borderColor: emoji === e ? color : colors.border,
                    },
                  ]}
                >
                  <Text style={styles.emojiText}>{e}</Text>
                </TouchableOpacity>
              ))}
              <TextInput
                value={customEmojiInput}
                onChangeText={(text) => {
                  setCustomEmojiInput(text);
                  if (text) setEmoji(text);
                }}
                placeholder="✏️"
                maxLength={8}
                style={[
                  styles.emojiBtn,
                  styles.customEmojiInput,
                  {
                    backgroundColor: customEmojiInput ? `${color}25` : colors.surface,
                    borderColor: customEmojiInput ? color : colors.border,
                    color: colors.text,
                  },
                ]}
              />
            </View>

            {/* Color picker */}
            <Text style={[styles.label, { color: colors.textSecondary, marginTop: 20 }]}>PICK A COLOR</Text>
            <View style={styles.colorRow}>
              {PRESET_COLORS.map((c) => (
                <TouchableOpacity
                  key={c}
                  onPress={() => setColor(c)}
                  style={[
                    styles.colorBtn,
                    { backgroundColor: c },
                    color === c && styles.colorBtnActive,
                  ]}
                />
              ))}
            </View>

            {/* Name */}
            <Text style={[styles.label, { color: colors.textSecondary, marginTop: 20 }]}>YOUR NAME</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. Alex"
              placeholderTextColor={colors.textTertiary}
              style={[styles.input, { color: colors.text, backgroundColor: colors.inputBackground, borderColor: colors.border }]}
              maxLength={30}
            />

            <TouchableOpacity
              onPress={() => setStep('household')}
              activeOpacity={0.85}
              style={[styles.btn, { backgroundColor: colors.accent, marginTop: 32 }]}
            >
              <Text style={styles.btnText}>Continue</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleStartOver}
              disabled={loading}
              activeOpacity={0.7}
              style={styles.startOverBtn}
            >
              <Text style={[styles.startOverText, { color: colors.textSecondary }]}>Start Over</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // Household step
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 24) }]}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[styles.title, { color: colors.text }]}>Your household</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Start a new household or join an existing one.
          </Text>

          {/* Create household */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Create a new household</Text>
            <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>
              You'll get an invite code to share with household members.
            </Text>
            <TouchableOpacity
              onPress={handleCreateHousehold}
              disabled={loading}
              activeOpacity={0.85}
              style={[styles.btn, { backgroundColor: colors.accent }]}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnText}>Create Household</Text>
              )}
            </TouchableOpacity>
          </View>

          <Text style={[styles.or, { color: colors.textTertiary }]}>— or —</Text>

          {/* Join household */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Join an existing household</Text>
            <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>
              Enter the invite code they shared with you.
            </Text>
            <TextInput
              value={joinCode}
              onChangeText={setJoinCode}
              placeholder="e.g. AB12CD"
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="characters"
              maxLength={6}
              style={[styles.input, { color: colors.text, backgroundColor: colors.inputBackground, borderColor: colors.border }]}
            />
            <TouchableOpacity
              onPress={handleJoinHousehold}
              disabled={loading || !joinCode.trim()}
              activeOpacity={0.85}
              style={[
                styles.btn,
                { backgroundColor: joinCode.trim() ? colors.accent : colors.border, marginTop: 12 },
              ]}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnText}>Join Household</Text>
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={handleStartOver}
            disabled={loading}
            activeOpacity={0.7}
            style={styles.startOverBtn}
          >
            <Text style={[styles.startOverText, { color: colors.textSecondary }]}>Start Over</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 28, gap: 12 },
  title: { fontSize: 28, fontWeight: '800', marginBottom: 4 },
  subtitle: { fontSize: 15, lineHeight: 22, marginBottom: 24 },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginBottom: 8 },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  emojiBtn: {
    width: 52,
    height: 52,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customEmojiInput: {
    textAlign: 'center',
    fontSize: 22,
  },
  emojiText: { fontSize: 24 },
  colorRow: { flexDirection: 'row', gap: 10 },
  colorBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  colorBtnActive: {
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  input: {
    fontSize: 16,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    height: 52,
  },
  btn: {
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 18,
    gap: 10,
  },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  cardDesc: { fontSize: 14, lineHeight: 20 },
  or: { textAlign: 'center', fontSize: 13, marginVertical: 4 },
  startOverBtn: {
    alignSelf: 'center',
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  startOverText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
