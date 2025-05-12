module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testPathIgnorePatterns: ['/node_modules/', '/.next/'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  setupFilesAfterEnv: [],
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json',
    },
  },
}; 