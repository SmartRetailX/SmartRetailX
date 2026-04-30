import 'react-native-gesture-handler';

import React, { useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthScreen } from './screens/AuthScreen';
import { MainTabs } from './screens/MainTabs';
import { useSessionStore } from './state/session-store';

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const queryClient = new QueryClient();

export const App = () => {
  const token = useSessionStore((state) => state.token);
  const setToken = useSessionStore((state) => state.setToken);

  useEffect(() => {
    SecureStore.getItemAsync('srx_token').then((savedToken) => {
      if (savedToken) setToken(savedToken);
    });
  }, [setToken]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <NavigationContainer>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
              {token ? (
                <Stack.Screen name="Main" component={MainTabs} />
              ) : (
                <Stack.Screen name="Auth" component={AuthScreen} />
              )}
            </Stack.Navigator>
          </NavigationContainer>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

export default App;
