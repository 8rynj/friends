// Jest config for the Knowable app. We test the pure logic layers — the
// commonality engine, nudge helpers, and the Zustand store — not RN screens.
// jest-expo gives us the Babel transform (TS/JSX + babel-preset-expo) and the
// Expo/React Native module mocks; the setup file mocks AsyncStorage so the
// persisted store can be imported in Node.
module.exports = {
  preset: 'jest-expo',
  setupFiles: ['<rootDir>/jest.setup.js'],
  testMatch: ['<rootDir>/src/**/__tests__/**/*.test.ts'],
  // Keep coverage scoped to the logic we actually exercise here.
  collectCoverageFrom: ['src/engine/**/*.ts', 'src/store/**/*.ts'],
};
