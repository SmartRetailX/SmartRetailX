import React, { useMemo, useState } from 'react';
import { Alert, FlatList, StyleSheet, TextInput, View } from 'react-native';
import { useMutation, useQuery } from '@tanstack/react-query';

import { addCartItem, getProducts } from '../api/core';
import { ProductCard } from '../components/ProductCard';
import { useCartStore } from '../state/cart-store';

export function CatalogScreen() {
  const [search, setSearch] = useState('');
  const setCart = useCartStore((s) => s.setCart);
  const productsQuery = useQuery({ queryKey: ['products', search], queryFn: () => getProducts(search) });

  const addMutation = useMutation({
    mutationFn: (productId: string) => addCartItem(productId, 1),
    onSuccess: (response) => {
      if (response.success) setCart(response.data);
    },
    onError: (error) => Alert.alert('Cart update failed', error instanceof Error ? error.message : 'Unknown error'),
  });

  const products = useMemo(() => productsQuery.data?.data.products ?? [], [productsQuery.data]);

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.search}
        placeholder="Search products"
        value={search}
        onChangeText={setSearch}
      />
      <FlatList
        data={products}
        keyExtractor={(item) => item.productId}
        renderItem={({ item }) => <ProductCard product={item} onAdd={(id) => addMutation.mutate(id)} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#e2e8f0', padding: 12 },
  search: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 10 },
});
