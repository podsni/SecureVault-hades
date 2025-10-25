module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    '^obsidian$': '<rootDir>/__mocks__/obsidian.ts',
  },
};
