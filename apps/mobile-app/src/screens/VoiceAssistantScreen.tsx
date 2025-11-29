/* eslint-disable jsx-a11y/accessible-emoji */
import React, { useEffect, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { assistantClient, VoiceQueryResponse } from '../lib/assistant-client';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  text: string;
  timestamp: Date;
  isVoice?: boolean;
  audioUri?: string;
}

interface VoiceAssistantScreenProps {
  onBack?: () => void;
}

export const VoiceAssistantScreen: React.FC<VoiceAssistantScreenProps> = ({ onBack }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [language, setLanguage] = useState<'en' | 'si'>('si');
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    // Request audio permissions on mount
    requestAudioPermissions();

    // Add welcome message
    addMessage({
      id: Date.now().toString(),
      type: 'assistant',
      text:
        language === 'si'
          ? 'ආයුබෝවන්! මම ඔබට උදවු කරන්න සූදානම්. කථා කරන්න හෝ ටයිප් කරන්න.'
          : "Hello! I'm ready to help you. Speak or type your question.",
      timestamp: new Date(),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const requestAudioPermissions = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please grant microphone permissions to use voice features.',
        );
      }
    } catch (error) {
      console.error('Failed to request audio permissions:', error);
    }
  };

  const addMessage = (message: Message) => {
    setMessages((prev) => [...prev, message]);
    // Scroll to bottom after adding message
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleSendText = async () => {
    if (!inputText.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      text: inputText.trim(),
      timestamp: new Date(),
    };

    addMessage(userMessage);
    setInputText('');
    Keyboard.dismiss();

    await processQuery(userMessage.text);
  };

  const processQuery = async (query: string) => {
    setIsProcessing(true);

    try {
      const response: VoiceQueryResponse = await assistantClient.sendQuery({
        query,
        language,
      });

      const assistantMessage: Message = {
        id: Date.now().toString(),
        type: 'assistant',
        text: response.response,
        timestamp: new Date(),
      };

      addMessage(assistantMessage);
    } catch (error) {
      console.error('Failed to process query:', error);
      Alert.alert('Error', 'Failed to get response from assistant. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const startRecording = async () => {
    try {
      // Request permissions
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Microphone permission is required for voice recording.');
        return;
      }

      // Configure audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // Start recording
      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );

      setRecording(newRecording);
      setIsRecording(true);
    } catch (error) {
      console.error('Failed to start recording:', error);
      Alert.alert('Error', 'Failed to start recording. Please try again.');
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    try {
      setIsRecording(false);
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();

      setRecording(null);

      if (uri) {
        // Add user voice message
        const userMessage: Message = {
          id: Date.now().toString(),
          type: 'user',
          text: '🎤 Voice message',
          timestamp: new Date(),
          isVoice: true,
          audioUri: uri,
        };

        addMessage(userMessage);

        // Process voice message
        await processVoiceMessage(uri);
      }
    } catch (error) {
      console.error('Failed to stop recording:', error);
      Alert.alert('Error', 'Failed to process recording. Please try again.');
    }
  };

  const processVoiceMessage = async (audioUri: string) => {
    setIsProcessing(true);

    try {
      // Read audio file as base64
      // Note: In a real implementation, you would convert the audio file to base64
      // For now, we'll send the text directly to the query endpoint
      // This is a placeholder - actual speech-to-text would happen here

      // For demo purposes, we'll show a placeholder message
      const assistantMessage: Message = {
        id: Date.now().toString(),
        type: 'assistant',
        text: 'Voice recognition is being processed. For now, please use text input.',
        timestamp: new Date(),
      };

      addMessage(assistantMessage);

      // TODO: Implement actual speech-to-text conversion
      // const audioBase64 = await convertAudioToBase64(audioUri);
      // const sttResponse = await assistantClient.speechToText({
      //   audio: audioBase64,
      //   language,
      // });
      // await processQuery(sttResponse.text);
    } catch (error) {
      console.error('Failed to process voice message:', error);
      Alert.alert('Error', 'Failed to process voice message. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleLanguage = () => {
    setLanguage((prev) => (prev === 'en' ? 'si' : 'en'));
    Alert.alert(
      'Language Changed',
      `Language switched to ${language === 'en' ? 'Sinhala (සිංහල)' : 'English'}`,
    );
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.type === 'user';

    return (
      <View
        style={[styles.messageContainer, isUser ? styles.userMessage : styles.assistantMessage]}
      >
        <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.assistantBubble]}>
          <Text style={[styles.messageText, isUser ? styles.userText : styles.assistantText]}>
            {item.text}
          </Text>
          <Text
            style={[styles.timestamp, isUser ? styles.userTimestamp : styles.assistantTimestamp]}
          >
            {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>🤖 Voice Assistant</Text>
          <Text style={styles.headerSubtitle}>SinLlama AI</Text>
        </View>
        <TouchableOpacity onPress={toggleLanguage} style={styles.langButton}>
          <Text style={styles.langButtonText}>{language === 'en' ? 'EN' : 'සිං'}</Text>
        </TouchableOpacity>
      </View>

      {/* Messages List */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      {/* Processing Indicator */}
      {isProcessing && (
        <View style={styles.processingContainer}>
          <ActivityIndicator size="small" color="#143055" />
          <Text style={styles.processingText}>Processing...</Text>
        </View>
      )}

      {/* Input Area */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          placeholder={
            language === 'si' ? 'ඔබගේ ප්‍රශ්නය මෙහි ටයිප් කරන්න...' : 'Type your message...'
          }
          placeholderTextColor="#999"
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={500}
          editable={!isProcessing}
        />

        <View style={styles.actionButtons}>
          {/* Voice Button */}
          <TouchableOpacity
            style={[styles.voiceButton, isRecording && styles.voiceButtonRecording]}
            onPress={isRecording ? stopRecording : startRecording}
            disabled={isProcessing}
          >
            <Ionicons name={isRecording ? 'stop' : 'mic'} size={24} color="#fff" />
          </TouchableOpacity>

          {/* Send Button */}
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!inputText.trim() || isProcessing) && styles.sendButtonDisabled,
            ]}
            onPress={handleSendText}
            disabled={!inputText.trim() || isProcessing}
          >
            <Ionicons name="send" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#143055',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.8,
    marginTop: 2,
  },
  langButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  langButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  messagesList: {
    padding: 16,
    flexGrow: 1,
  },
  messageContainer: {
    marginBottom: 12,
    maxWidth: '80%',
  },
  userMessage: {
    alignSelf: 'flex-end',
  },
  assistantMessage: {
    alignSelf: 'flex-start',
  },
  messageBubble: {
    borderRadius: 16,
    padding: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  userBubble: {
    backgroundColor: '#143055',
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
    marginBottom: 4,
  },
  userText: {
    color: '#fff',
  },
  assistantText: {
    color: '#333',
  },
  timestamp: {
    fontSize: 10,
    marginTop: 4,
  },
  userTimestamp: {
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'right',
  },
  assistantTimestamp: {
    color: '#999',
    textAlign: 'left',
  },
  processingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
  },
  processingText: {
    marginLeft: 8,
    color: '#143055',
    fontSize: 14,
  },
  inputContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  textInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    maxHeight: 100,
    marginBottom: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  voiceButton: {
    flex: 1,
    backgroundColor: '#143055',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceButtonRecording: {
    backgroundColor: '#e74c3c',
  },
  sendButton: {
    flex: 1,
    backgroundColor: '#27ae60',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#95a5a6',
    opacity: 0.5,
  },
});
