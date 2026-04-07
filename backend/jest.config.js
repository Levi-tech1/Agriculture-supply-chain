export default {
  testEnvironment: "node",
  transform: {},
  testMatch: ["**/test/**/*.test.js"],
  // Integration tests boot an in-memory MongoDB instance; first run downloads binaries.
  testTimeout: 180000,
};
