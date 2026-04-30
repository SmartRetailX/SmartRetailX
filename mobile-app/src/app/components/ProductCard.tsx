import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Product } from '../types/api';

type Props = {
  product: Product;
  onAdd: (productId: string) => void;
};

export function ProductCard({ product, onAdd }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.name}>{product.nameSi || product.name}</Text>
      <Text style={styles.meta}>LKR {Number(product.price).toFixed(2)}</Text>
      <Text style={styles.meta}>Stock: {product.stockQuantity}</Text>
      <Pressable style={styles.button} onPress={() => onAdd(product.productId)}>
        <Text style={styles.buttonText}>Add to Cart</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10 },
  name: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  meta: { fontSize: 13, color: '#4b5563' },
  button: { marginTop: 10, backgroundColor: '#0f766e', borderRadius: 8, paddingVertical: 10 },
  buttonText: { color: '#fff', textAlign: 'center', fontWeight: '600' },
});
