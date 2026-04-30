import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';

import { getOrders } from '../api/core';

export function OrdersScreen() {
  const query = useQuery({ queryKey: ['orders'], queryFn: getOrders });
  const orders = query.data?.data.orders ?? [];

  return (
    <View style={styles.container}>
      <FlatList
        data={orders}
        keyExtractor={(item) => item.orderId}
        ListEmptyComponent={<Text style={styles.empty}>No orders yet</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.id}>{item.orderId}</Text>
            <Text>Status: {item.status}</Text>
            <Text>Total: LKR {Number(item.total).toFixed(2)}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9', padding: 12 },
  empty: { textAlign: 'center', marginTop: 30, color: '#64748b' },
  card: { backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 8 },
  id: { fontWeight: '700' },
});
