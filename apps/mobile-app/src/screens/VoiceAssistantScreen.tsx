/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable jsx-a11y/accessible-emoji */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  Alert,
  Animated,
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
}

interface VoiceAssistantScreenProps {
  onBack?: () => void;
}

// Check if native speech recognition is available
const isSpeechRecognitionAvailable = (): boolean => {
  try {
    const { ExpoSpeechRecognitionModule } = require('expo-speech-recognition');
    return !!ExpoSpeechRecognitionModule;
  } catch {
    return false;
  }
};

const SPEECH_AVAILABLE = isSpeechRecognitionAvailable();

export const VoiceAssistantScreen: React.FC<VoiceAssistantScreenProps> = ({ onBack }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [language, setLanguage] = useState<'en' | 'si'>('si');
  const [messageIdCounter, setMessageIdCounter] = useState(0);
  const [transcribedText, setTranscribedText] = useState('');
  const [recognitionStatus, setRecognitionStatus] = useState<string>('');
  const [speechNotAvailable, setSpeechNotAvailable] = useState(!SPEECH_AVAILABLE);
  const flatListRef = useRef<FlatList>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Pulse animation for listening indicator
  useEffect(() => {
    if (isListening) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.3,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ]),
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isListening, pulseAnim]);

  const processQueryInternal = useCallback(
    async (query: string) => {
      setIsProcessing(true);

      try {
        const response: VoiceQueryResponse = await assistantClient.sendQuery({
          query,
          language,
        });

        const assistantMessage: Message = {
          id: `msg-${Date.now()}-assistant`,
          type: 'assistant',
          text: response.response,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, assistantMessage]);
      } catch (error) {
        console.error('Failed to process query:', error);
        Alert.alert('Error', 'Failed to get response from assistant. Please try again.');
      } finally {
        setIsProcessing(false);
      }
    },
    [language],
  );

  const handleVoiceResultInternal = useCallback(
    async (transcript: string) => {
      if (!transcript.trim()) return;

      const userMessage: Message = {
        id: `msg-${Date.now()}-voice`,
        type: 'user',
        text: `🎤 "${transcript}"`,
        timestamp: new Date(),
        isVoice: true,
      };

      setMessages((prev) => [...prev, userMessage]);
      setTranscribedText('');

      // Process the transcribed text
      await processQueryInternal(transcript);
    },
    [processQueryInternal],
  );

  // Setup speech recognition event handlers if available
  useEffect(() => {
    if (!SPEECH_AVAILABLE) {
      console.log('[SpeechRecognition] Native module not available - running in Expo Go mode');
      return;
    }

    const { ExpoSpeechRecognitionModule } = require('expo-speech-recognition');

    const startHandler = ExpoSpeechRecognitionModule.addListener('start', () => {
      console.log('[SpeechRecognition] Started');
      setIsListening(true);
      setTranscribedText('');
      setRecognitionStatus(language === 'si' ? 'සවන් දෙමින්...' : 'Listening...');
    });

    const endHandler = ExpoSpeechRecognitionModule.addListener('end', () => {
      console.log('[SpeechRecognition] Ended');
      setIsListening(false);
      setRecognitionStatus('');
    });

    const resultHandler = ExpoSpeechRecognitionModule.addListener('result', (event: any) => {
      console.log('[SpeechRecognition] Result:', JSON.stringify(event.results, null, 2));
      const latestResult = event.results[event.results.length - 1];
      if (latestResult) {
        const transcript = latestResult.transcript;
        console.log(
          '[SpeechRecognition] Transcript:',
          transcript,
          'isFinal:',
          latestResult.isFinal,
        );
        setTranscribedText(transcript);
        setRecognitionStatus(
          latestResult.isFinal
            ? language === 'si'
              ? 'හඳුනාගත්තා!'
              : 'Recognized!'
            : language === 'si'
              ? 'සවන් දෙමින්...'
              : 'Listening...',
        );

        if (latestResult.isFinal && transcript.trim()) {
          handleVoiceResultInternal(transcript);
        }
      }
    });

    const errorHandler = ExpoSpeechRecognitionModule.addListener('error', (event: any) => {
      console.error('[SpeechRecognition] Error:', event.error, event.message);
      setIsListening(false);
      setRecognitionStatus('');

      let errorMessage = event.message || 'Failed to recognize speech.';
      if (event.error === 'no-speech') {
        errorMessage =
          language === 'si'
            ? 'කථාවක් අසන්නට නැත. නැවත උත්සාහ කරන්න.'
            : 'No speech detected. Please try again.';
      } else if (event.error === 'network') {
        errorMessage =
          language === 'si'
            ? 'ජාල දෝෂයකි. අන්තර්ජාල සම්බන්ධතාවය පරීක්ෂා කරන්න.'
            : 'Network error. Check your internet connection.';
      } else if (event.error === 'not-allowed') {
        errorMessage =
          language === 'si' ? 'මයික්‍රොෆෝන අවසරය අවශ්‍යයි.' : 'Microphone permission is required.';
      }

      Alert.alert(
        language === 'si' ? 'කථන හඳුනාගැනීම් දෝෂය' : 'Speech Recognition Error',
        errorMessage,
      );
    });

    return () => {
      startHandler?.remove();
      endHandler?.remove();
      resultHandler?.remove();
      errorHandler?.remove();
    };
  }, [language, handleVoiceResultInternal]);

  useEffect(() => {
    // Check supported languages on mount
    const checkSupportedLanguages = async () => {
      if (!SPEECH_AVAILABLE) return;

      try {
        const { ExpoSpeechRecognitionModule } = require('expo-speech-recognition');
        const supportedLanguages = await ExpoSpeechRecognitionModule.getSupportedLocales({
          androidRecognitionServicePackage: undefined,
          onDevice: false,
        });
        console.log('[SpeechRecognition] Supported languages:', supportedLanguages);

        const sinhalaSupportedLocales = supportedLanguages.locales.filter((locale: string) =>
          locale.toLowerCase().startsWith('si'),
        );
        console.log('[SpeechRecognition] Sinhala locales:', sinhalaSupportedLocales);

        if (sinhalaSupportedLocales.length === 0) {
          console.warn('[SpeechRecognition] Sinhala not supported on this device');
        }
      } catch (error) {
        console.log('[SpeechRecognition] Could not get supported languages:', error);
      }
    };

    checkSupportedLanguages();

    // Add welcome message
    const welcomeText = speechNotAvailable
      ? language === 'si'
        ? 'ආයුබෝවන්! 🎤 කටහඬ හඳුනාගැනීම සඳහා Development Build අවශ්‍යයි. කරුණාකර ටයිප් කරන්න.'
        : 'Hello! 🎤 Voice recognition requires a Development Build. Please type your message.'
      : language === 'si'
        ? 'ආයුබෝවන්! මම ඔබට උදවු කරන්න සූදානම්. කථා කරන්න හෝ ටයිප් කරන්න.'
        : "Hello! I'm ready to help you. Speak or type your question.";

    setMessages([
      {
        id: `msg-${Date.now()}-0`,
        type: 'assistant',
        text: welcomeText,
        timestamp: new Date(),
      },
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addMessage = (message: Message) => {
    setMessages((prev) => [...prev, message]);
    setMessageIdCounter((prev) => prev + 1);
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const generateMessageId = () => {
    const id = `msg-${Date.now()}-${messageIdCounter}`;
    setMessageIdCounter((prev) => prev + 1);
    return id;
  };

  const handleSendText = async () => {
    if (!inputText.trim()) return;

    const userMessage: Message = {
      id: generateMessageId(),
      type: 'user',
      text: inputText.trim(),
      timestamp: new Date(),
    };

    addMessage(userMessage);
    setInputText('');
    Keyboard.dismiss();

    await processQueryInternal(userMessage.text);
  };

  const startListening = async () => {
    if (!SPEECH_AVAILABLE) {
      Alert.alert(
        language === 'si' ? 'Development Build අවශ්‍යයි' : 'Development Build Required',
        language === 'si'
          ? 'කටහඬ හඳුනාගැනීම Expo Go හි ක්‍රියා නොකරයි. කරුණාකර Development Build භාවිතා කරන්න හෝ ටයිප් කරන්න.'
          : 'Voice recognition does not work in Expo Go. Please use a Development Build or type your message.',
        [{ text: 'OK' }],
      );
      return;
    }

    try {
      const { ExpoSpeechRecognitionModule } = require('expo-speech-recognition');

      const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      console.log('[SpeechRecognition] Permission result:', result);

      if (!result.granted) {
        Alert.alert(
          language === 'si' ? 'අවසරය ප්‍රතික්ෂේප විය' : 'Permission Denied',
          language === 'si'
            ? 'කථන හඳුනාගැනීම සඳහා මයික්‍රොෆෝන අවසරය අවශ්‍යයි.'
            : 'Microphone permission is required for voice recognition.',
        );
        return;
      }

      const locale = language === 'si' ? 'si-LK' : 'en-US';

      console.log('[SpeechRecognition] Starting with locale:', locale);
      setRecognitionStatus(language === 'si' ? 'ආරම්භ කරමින්...' : 'Starting...');

      ExpoSpeechRecognitionModule.start({
        lang: locale,
        interimResults: true,
        maxAlternatives: 3,
        continuous: false,
        requiresOnDeviceRecognition: false,
        addsPunctuation: true,
      });
    } catch (error) {
      console.error('[SpeechRecognition] Failed to start:', error);
      setRecognitionStatus('');
      setSpeechNotAvailable(true);
      Alert.alert(
        language === 'si' ? 'දෝෂය' : 'Error',
        language === 'si'
          ? 'කථන හඳුනාගැනීම ආරම්භ කිරීමට අසමත් විය. Development Build අවශ්‍ය විය හැක.'
          : 'Failed to start speech recognition. A Development Build may be required.',
      );
    }
  };

  const stopListening = () => {
    if (!SPEECH_AVAILABLE) return;

    try {
      const { ExpoSpeechRecognitionModule } = require('expo-speech-recognition');
      ExpoSpeechRecognitionModule.stop();
    } catch (error) {
      console.error('Failed to stop speech recognition:', error);
    }
  };

  const toggleLanguage = () => {
    const newLang = language === 'en' ? 'si' : 'en';
    setLanguage(newLang);
    Alert.alert(
      'Language Changed',
      `Language switched to ${newLang === 'si' ? 'Sinhala (සිංහල)' : 'English'}`,
    );
  };

  const handleTestSinhala = () => {
    setInputText('මගේ අවසන් මිලදී ගැනීම් ලැයිස්තුව කුමක්ද?');
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
            {item.timestamp.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
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
          <Text style={styles.headerSubtitle}>
            {speechNotAvailable ? 'Text Mode (Expo Go)' : 'SinLlama AI'}
          </Text>
        </View>
        <TouchableOpacity onPress={toggleLanguage} style={styles.langButton}>
          <Text style={styles.langButtonText}>{language === 'en' ? 'EN' : 'සිං'}</Text>
        </TouchableOpacity>
      </View>

      {/* Development Build Notice */}
      {speechNotAvailable && (
        <View style={styles.noticeContainer}>
          <Ionicons name="information-circle" size={20} color="#f57c00" />
          <Text style={styles.noticeText}>
            {language === 'si'
              ? '🎤 කටහඬ සඳහා Development Build අවශ්‍යයි'
              : '🎤 Voice requires Development Build'}
          </Text>
        </View>
      )}

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

      {/* Listening Indicator - Enhanced */}
      {isListening && (
        <View style={styles.listeningContainer}>
          <Animated.View style={[styles.listeningDot, { transform: [{ scale: pulseAnim }] }]} />
          <Text style={styles.listeningText}>
            {recognitionStatus || (language === 'si' ? 'සවන් දෙමින්...' : 'Listening...')}
          </Text>
          {transcribedText ? (
            <View style={styles.transcribedContainer}>
              <Text style={styles.transcribedLabel}>
                {language === 'si' ? 'හඳුනාගත්තේ:' : 'Recognized:'}
              </Text>
              <Text style={styles.transcribedText}>"{transcribedText}"</Text>
            </View>
          ) : (
            <Text style={styles.listeningHint}>
              {language === 'si' ? '🎤 දැන් කතා කරන්න...' : '🎤 Speak now...'}
            </Text>
          )}
        </View>
      )}

      {/* Show last transcribed text even when not listening */}
      {!isListening && transcribedText && !isProcessing && (
        <View style={styles.lastTranscribedContainer}>
          <Text style={styles.lastTranscribedLabel}>
            {language === 'si' ? 'අවසන් හඳුනාගැනීම:' : 'Last recognized:'}
          </Text>
          <Text style={styles.lastTranscribedText}>"{transcribedText}"</Text>
        </View>
      )}

      {/* Processing Indicator */}
      {isProcessing && (
        <View style={styles.processingContainer}>
          <ActivityIndicator size="small" color="#143055" />
          <Text style={styles.processingText}>
            {language === 'si' ? 'සකසමින්...' : 'Processing...'}
          </Text>
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
          editable={!isProcessing && !isListening}
        />

        <View style={styles.actionButtons}>
          {/* Test Button for Sinhala */}
          {language === 'si' && (
            <TouchableOpacity
              style={styles.testButton}
              onPress={handleTestSinhala}
              disabled={isProcessing || isListening}
            >
              <Text style={styles.testButtonText}>Demo</Text>
            </TouchableOpacity>
          )}

          {/* Voice Button */}
          <TouchableOpacity
            style={[
              styles.voiceButton,
              isListening && styles.voiceButtonActive,
              speechNotAvailable && styles.voiceButtonDisabled,
            ]}
            onPress={isListening ? stopListening : startListening}
            disabled={isProcessing}
          >
            <Ionicons
              name={isListening ? 'stop' : speechNotAvailable ? 'mic-off' : 'mic'}
              size={24}
              color="#fff"
            />
          </TouchableOpacity>

          {/* Send Button */}
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!inputText.trim() || isProcessing || isListening) && styles.sendButtonDisabled,
            ]}
            onPress={handleSendText}
            disabled={!inputText.trim() || isProcessing || isListening}
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
  noticeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff3e0',
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 8,
  },
  noticeText: {
    color: '#e65100',
    fontSize: 13,
    fontWeight: '500',
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
    borderRadius: 20,
    padding: 14,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  userBubble: {
    backgroundColor: '#143055',
    borderBottomRightRadius: 6,
  },
  assistantBubble: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: '#e8e8e8',
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
  listeningContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#e8f5e9',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#4caf50',
  },
  listeningDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#e74c3c',
    marginBottom: 12,
  },
  listeningText: {
    color: '#2e7d32',
    fontSize: 16,
    fontWeight: '700',
  },
  listeningHint: {
    marginTop: 8,
    color: '#666',
    fontSize: 14,
  },
  transcribedContainer: {
    marginTop: 12,
    alignItems: 'center',
    width: '100%',
  },
  transcribedLabel: {
    color: '#666',
    fontSize: 12,
    marginBottom: 4,
  },
  transcribedText: {
    color: '#143055',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  lastTranscribedContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f5f5f5',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  lastTranscribedLabel: {
    color: '#999',
    fontSize: 11,
    marginBottom: 4,
  },
  lastTranscribedText: {
    color: '#333',
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
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
    backgroundColor: '#f8f8f8',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 12,
    fontSize: 15,
    maxHeight: 100,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e8e8e8',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  voiceButton: {
    flex: 1,
    backgroundColor: '#143055',
    paddingVertical: 16,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#143055',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  voiceButtonActive: {
    backgroundColor: '#e74c3c',
  },
  voiceButtonDisabled: {
    backgroundColor: '#95a5a6',
    opacity: 0.7,
  },
  sendButton: {
    flex: 1,
    backgroundColor: '#27ae60',
    paddingVertical: 16,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#27ae60',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  sendButtonDisabled: {
    backgroundColor: '#95a5a6',
    opacity: 0.5,
  },
  testButton: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    backgroundColor: '#e0e0e0',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 5,
  },
  testButtonText: {
    fontSize: 12,
    color: '#333',
    fontWeight: '600',
  },
});
