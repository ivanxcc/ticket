import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/hooks/useTheme';

export default function SignInScreen() {
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    if (!email.trim() || !password) return;
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    setLoading(false);
    if (error) {
      Alert.alert('Sign In Failed', error.message);
    }
    // On success, onAuthStateChange in _layout.tsx handles navigation
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inner}
      >
        <View style={styles.header}>
          <Text style={[styles.appName, { color: colors.accent }]}>Ticket</Text>
          <Text style={[styles.tagline, { color: colors.textTertiary }]}>
            Household task tracker
          </Text>
        </View>

        <View style={styles.form}>
          <Text style={[styles.title, { color: colors.text }]}>Welcome back</Text>

          <View style={styles.fields}>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Email"
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              style={[styles.input, { color: colors.text, backgroundColor: colors.inputBackground, borderColor: colors.border }]}
            />
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              placeholderTextColor={colors.textTertiary}
              secureTextEntry
              autoComplete="password"
              style={[styles.input, { color: colors.text, backgroundColor: colors.inputBackground, borderColor: colors.border }]}
            />
          </View>

          <TouchableOpacity
            onPress={handleSignIn}
            disabled={loading || !email.trim() || !password}
            activeOpacity={0.85}
            style={[
              styles.btn,
              { backgroundColor: email.trim() && password ? colors.accent : colors.border },
            ]}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>Sign In</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push('/(auth)/sign-up' as any)} activeOpacity={0.7}>
            <Text style={[styles.link, { color: colors.textSecondary }]}>
              No account?{' '}
              <Text style={{ color: colors.accent }}>Sign up</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1, justifyContent: 'center', padding: 28 },
  header: { alignItems: 'center', marginBottom: 48 },
  appName: { fontSize: 36, fontWeight: '800', letterSpacing: -0.5 },
  tagline: { fontSize: 14, marginTop: 6 },
  form: { gap: 20 },
  title: { fontSize: 24, fontWeight: '700' },
  fields: { gap: 12 },
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
  link: { textAlign: 'center', fontSize: 14 },
});
