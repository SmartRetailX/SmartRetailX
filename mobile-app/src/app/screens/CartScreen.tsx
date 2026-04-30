import React from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';

import { createOrder, getCart, removeCartItem, updateCartItem } from '../api/core';
import { useNetworkAwareMutation } from '../hooks/useNetworkAwareMutation';
import { useCartStore } from '../state/cart-store';

export function CartScreen() {
  const cart = useCartStore((s) => s.cart);
  const setCart = useCartStore((s) => s.setCart);

  useQuery({
    queryKey: ['cart'],
    queryFn: getCart,
    onSuccess: (response) => response.success && setCart(response.data),
  });

  const updateMutation = useNetworkAwareMutation({
    mutationFn: ({ productId, quantity }: { productId: string; quantity: number }) =>
      updateCartItem(productId, quantity),
    onMutate: ({ productId, quantity }) => {
      const current = useCartStore.getState().cart;
      if (!current) return;
      const items = current.items
        .map((item) =>
          item.productId === productId ? { ...item, quantity, totalPrice: item.unitPrice * quantity } : item,
        )
        .filter((item) => item.quantity > 0);
      const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
      setCart({ ...current, items, subtotal, total: subtotal });
    },
    onSuccess: (response) => response.success && setCart(response.data),
    onError: (error) => Alert.alert('Cart error', error instanceof Error ? error.message : 'Unknown error'),
  });

  const orderMutation = useNetworkAwareMutation({
    mutationFn: createOrder,
    onSuccess: () => {
      Alert.alert('Order created', 'Checkout completed.');
      setCart(null);
    },
    onError: (error) => Alert.alert('Checkout failed', error instanceof Error ? error.message : 'Unknown error'),
  });

  return (
    <View style={styles.container}>
      <FlatList
        data={cart?.items ?? []}
        keyExtractor={(item) => item.productId}
        ListEmptyComponent={<Text style={styles.empty}>Cart is empty</Text>}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.productNameSi || item.productName}</Text>
              <Text style={styles.meta}>Qty: {item.quantity}</Text>
              <Text style={styles.meta}>LKR {item.totalPrice.toFixed(2)}</Text>
            </View>
            <Pressable style={styles.smallBtn} onPress={() => updateMutation.mutate({ productId: item.productId, quantity: item.quantity + 1 })}>
              <Text>+</Text>
            </Pressable>
            <Pressable style={styles.smallBtn} onPress={() => updateMutation.mutate({ productId: item.productId, quantity: item.quantity - 1 })}>
              <Text>-</Text>
            </Pressable>
            <Pressable style={styles.smallBtn} onPress={() => removeCartItem(item.productId).then((r) => r.success && setCart(r.data))}>
              <Text>x</Text>
            </Pressable>
          </View>
        )}
      />
      <Text style={styles.total}>Total: LKR {(cart?.total ?? 0).toFixed(2)}</Text>
      <Pressable style={styles.checkoutBtn} onPress={() => orderMutation.mutate(undefined)}>
        <Text style={styles.checkoutText}>Checkout</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 12 },
  empty: { textAlign: 'center', marginTop: 30, color: '#64748b' },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 8 },
  name: { fontWeight: '600', fontSize: 15 },
  meta: { fontSize: 12, color: '#64748b' },
  smallBtn: { width: 30, height: 30, marginLeft: 6, borderRadius: 8, backgroundColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center' },
  total: { fontSize: 18, fontWeight: '700', marginVertical: 12 },
  checkoutBtn: { backgroundColor: '#0f766e', borderRadius: 10, padding: 14 },
  checkoutText: { color: '#fff', textAlign: 'center', fontWeight: '700' },
});
