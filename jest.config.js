
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
     '^@/components/(.*)$': '<rootDir>/src/components/$1',
     '^@/hooks/(.*)$': '<rootDir>/src/hooks/$1',
     '^@/lib/(.*)$': '<rootDir>/src/lib/$1',
  },
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { presets: ['next/babel'] }],
  },
   testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/'],
   moduleDirectories: ['node_modules', 'src'],
    transformIgnorePatterns: [
    '/node_modules/(?!(lucide-react)/)',
    '^.+\\.module\\.(css|sass|scss)$',
  ],
};
