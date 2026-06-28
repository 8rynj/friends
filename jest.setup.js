// AsyncStorage has no native module under Node, so swap in its official Jest
// mock. The persisted Zustand store (src/store/useStore.ts) imports it at module
// load, so this must run before any test requires the store.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
