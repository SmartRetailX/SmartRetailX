import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';

import { HomeScreen } from '../screens/HomeScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { SignupScreen } from '../screens/SignupScreen';
import { VoiceAssistantScreen } from '../screens/VoiceAssistantScreen';

type Screen = 'login' | 'signup' | 'home' | 'voiceAssistant';

export const App = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>('login');

  // Skip initial auth check for now - user can login manually
  // This prevents loading screen issues when backend is slow or unreachable

  return (
    <>
      {currentScreen === 'login' && (
        <LoginScreen
          onLoginSuccess={() => setCurrentScreen('home')}
          onNavigateToSignup={() => setCurrentScreen('signup')}
        />
      )}
      {currentScreen === 'signup' && (
        <SignupScreen
          onSignupSuccess={() => setCurrentScreen('home')}
          onNavigateToLogin={() => setCurrentScreen('login')}
        />
      )}
      {currentScreen === 'home' && (
        <HomeScreen
          onLogout={() => setCurrentScreen('login')}
          onNavigateToVoiceAssistant={() => setCurrentScreen('voiceAssistant')}
        />
      )}
      {currentScreen === 'voiceAssistant' && (
        <VoiceAssistantScreen onBack={() => setCurrentScreen('home')} />
      )}
      {/* eslint-disable-next-line react/style-prop-object */}
      <StatusBar style="auto" />
    </>
  );
};

export default App;
