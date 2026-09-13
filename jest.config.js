module.exports = {
  testEnvironment: 'jsdom',
  testMatch: ['**/tests/**/*.test.js'],
  // babel-jest via babel.config.js (Roadmap #3 criterion-(3) step 1): lets the suite read
  // `import`/`export` once the modules are converted. CJS-shaped files pass through unchanged.
  transform: { '\\.js$': 'babel-jest' }
};
