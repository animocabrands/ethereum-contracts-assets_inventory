module.exports = {
  skipFiles: [],
  mocha: {
    timeout: 60000,
    grep: '@skip-on-coverage', // Find everything with this tag
    invert: true, // Run the grep's inverse set.
  },
  // providerOptions: {

  // }
};
