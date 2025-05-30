/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  displayName: 'tools/setup',
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: [
    '**/src/tools/setup/tests/**/*.spec.ts',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.json',
      },
    ],
  },
  testTimeout: 10000,
  // Set NODE_ENV to 'test' for all tests
  testEnvironmentOptions: {
    env: {
      NODE_ENV: 'test',
    },
  },
};
