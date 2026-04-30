import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import * as SecureStore from 'expo-secure-store';

import { signInEmail } from '../api/auth';
import { useSessionStore } from '../state/session-store';

export function AuthScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const setToken = useSessionStore((s) => s.setToken);

  const onSignIn = async () => {
    try {
      setLoading(true);
      const session = await signInEmail(email.trim(), password);
      const token = session?.session?.token;
      if (!token) throw new Error('Missing session token');
      await SecureStore.setItemAsync('srx_token', token);
      setToken(token);
    } catch (error) {
      Alert.alert('Sign in failed', error instanceof Error ? error.message : 'Unable to sign in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Smart Retail X</Text>
      <TextInput style={styles.input} placeholder="Email" autoCapitalize="none" value={email} onChangeText={setEmail} />
      <TextInput style={styles.input} placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} />
      <Pressable style={styles.button} onPress={onSignIn} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Signing in...' : 'Sign In'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', backgroundColor: '#f8fafc', padding: 20 },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 18, color: '#0f172a' },
  input: { backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 10 },
  button: { backgroundColor: '#0f766e', borderRadius: 10, padding: 12, marginTop: 8 },
  buttonText: { color: '#fff', textAlign: 'center', fontWeight: '600' },
});
