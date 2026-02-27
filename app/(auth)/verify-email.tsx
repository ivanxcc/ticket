import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/hooks/useTheme';

export default function VerifyEmailScreen() {
  const { colors } = useTheme();
  const { email } = useLocalSearchParams<{ email?: string }>();
  const [loading, setLoading] = useState(false);

  const handleResend = async () => {
    const targetEmail = (email ?? '').trim().toLowerCase();
    if (!targetEmail) {
      Alert.alert('Missing email', 'Go back to sign up and try again.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: targetEmail,
    });
    setLoading(false);

    if (error) {
      Alert.alert('Resend failed', error.message);
      return;
    }

    Alert.alert('Email sent', `Verification email resent to ${targetEmail}.`);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inner}
      >
        <View style={styles.card}>
          <Text style={[styles.title, { color: colors.text }]}>Verify your email</Text>
          <Text style={[styles.body, { color: colors.textSecondary }]}> 
            We sent a verification link to{email ? ` ${email}` : ' your email'}. Confirm it before continuing to household setup.
          </Text>

          <TouchableOpacity
            onPress={() => router.replace('/(auth)/sign-in' as any)}
            activeOpacity={0.85}
            style={[styles.primaryBtn, { backgroundColor: colors.accent }]}
          >
            <Text style={styles.primaryBtnText}>Go to Sign In</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleResend}
            disabled={loading}
            activeOpacity={0.7}
            style={[styles.secondaryBtn, { borderColor: colors.border }]}
          >
            {loading ? (
              <ActivityIndicator color={colors.textSecondary} />
            ) : (
              <Text style={[styles.secondaryBtnText, { color: colors.textSecondary }]}>Resend verification email</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: {
    flex: 1,
    justifyContent: 'center',
    padding: 28,
  },
  card: {
    gap: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
  },
  primaryBtn: {
    marginTop: 6,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryBtn: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
