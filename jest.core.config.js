/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  displayName: 'core',
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/core/**/__tests__/**/*.ts?(x)'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  coverageDirectory: 'coverage/core',
  collectCoverageFrom: [
    'src/core/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
  ],
};