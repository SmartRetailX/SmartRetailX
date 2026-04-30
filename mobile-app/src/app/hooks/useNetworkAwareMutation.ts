import { useMutation, type UseMutationOptions } from '@tanstack/react-query';
import * as Network from 'expo-network';

export function useNetworkAwareMutation<TData, TError, TVariables>(
  options: UseMutationOptions<TData, TError, TVariables>,
) {
  return useMutation<TData, TError, TVariables>({
    ...options,
    mutationFn: async (variables) => {
      const state = await Network.getNetworkStateAsync();
      if (!state.isConnected) {
        throw new Error('No network connection');
      }
      return options.mutationFn!(variables);
    },
    retry: 2,
  });
}
