import React, { useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Audio } from 'expo-av';

import { voiceAudio, voiceText } from '../api/core';
import type { VoiceMessage } from '../types/api';

export function VoiceScreen() {
  const [messages, setMessages] = useState<VoiceMessage[]>([]);
  const [text, setText] = useState('');
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [working, setWorking] = useState(false);

  const push = (role: 'user' | 'assistant', body: string) => {
    setMessages((prev) => [
      ...prev,
      { id: `${Date.now()}-${Math.random()}`, role, text: body, createdAt: new Date().toISOString() },
    ]);
  };

  const sendText = async () => {
    if (!text.trim() || working) return;
    const message = text.trim();
    setText('');
    push('user', message);
    setWorking(true);
    try {
      const res = await voiceText(message);
      push('assistant', res.responseText);
      console.log('voice_analytics', { type: 'text', fallback: true });
    } catch (error) {
      Alert.alert('Voice failed', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setWorking(false);
    }
  };

  const startRecording = async () => {
    const perm = await Audio.requestPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission required', 'Microphone permission is needed.');
      return;
    }
    await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
    const rec = new Audio.Recording();
    await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
    await rec.startAsync();
    setRecording(rec);
  };

  const stopRecording = async () => {
    if (!recording || working) return;
    setWorking(true);
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);
      if (!uri) throw new Error('No audio captured');
      push('user', '[Voice message]');
      const start = Date.now();
      const response = await voiceAudio(uri);
      push('assistant', response.responseText);
      console.log('voice_analytics', { type: 'audio', latencyMs: Date.now() - start, fallback: false });
    } catch (error) {
      Alert.alert('Audio processing failed', 'Falling back to text mode.');
      console.log('voice_analytics', { type: 'audio', fallback: true });
    } finally {
      setWorking(false);
    }
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 12 }}
        renderItem={({ item }) => (
          <View style={[styles.msg, item.role === 'assistant' ? styles.assistant : styles.user]}>
            <Text style={styles.msgText}>{item.text}</Text>
          </View>
        )}
      />

      <View style={styles.controls}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Type Sinhala/English fallback"
        />
        <Pressable style={styles.sendBtn} onPress={sendText}>
          <Text style={styles.sendText}>Send</Text>
        </Pressable>
      </View>

      <Pressable
        style={[styles.pttBtn, recording ? styles.stopBtn : undefined]}
        onPress={recording ? stopRecording : startRecording}
      >
        <Text style={styles.sendText}>{recording ? 'Stop & Send Voice' : 'Push To Talk'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 12 },
  msg: { padding: 10, borderRadius: 10, marginBottom: 8, maxWidth: '85%' },
  assistant: { backgroundColor: '#dcfce7', alignSelf: 'flex-start' },
  user: { backgroundColor: '#e2e8f0', alignSelf: 'flex-end' },
  msgText: { fontSize: 14 },
  controls: { flexDirection: 'row', gap: 8 },
  input: { flex: 1, backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 9 },
  sendBtn: { backgroundColor: '#0f766e', borderRadius: 10, paddingHorizontal: 14, justifyContent: 'center' },
  pttBtn: { marginTop: 10, backgroundColor: '#1d4ed8', borderRadius: 10, padding: 14 },
  stopBtn: { backgroundColor: '#b91c1c' },
  sendText: { color: '#fff', textAlign: 'center', fontWeight: '700' },
});
