/**
 * Secure key-value storage for data-pull OAuth tokens (Spec §6/§8
 * Integrations). Native (iOS/Android) uses the Keychain/Keystore via
 * `expo-secure-store`. There's no equivalent secure-at-rest API on web, so it
 * falls back to AsyncStorage there — fine for the web bundle CI builds to
 * catch import errors, but the shipped app is native.
 */
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

export async function setSecureItem(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    await AsyncStorage.setItem(key, value);
  } else {
    await SecureStore.setItemAsync(key, value);
  }
}

export async function getSecureItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return AsyncStorage.getItem(key);
  }
  return SecureStore.getItemAsync(key);
}

export async function deleteSecureItem(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    await AsyncStorage.removeItem(key);
  } else {
    await SecureStore.deleteItemAsync(key);
  }
}
