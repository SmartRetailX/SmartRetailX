import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { CartScreen } from './CartScreen';
import { CatalogScreen } from './CatalogScreen';
import { OrdersScreen } from './OrdersScreen';
import { VoiceScreen } from './VoiceScreen';

export type RootTabParamList = {
  Catalog: undefined;
  Cart: undefined;
  Orders: undefined;
  Voice: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

export function MainTabs() {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Catalog" component={CatalogScreen} />
      <Tab.Screen name="Cart" component={CartScreen} />
      <Tab.Screen name="Orders" component={OrdersScreen} />
      <Tab.Screen name="Voice" component={VoiceScreen} />
    </Tab.Navigator>
  );
}
