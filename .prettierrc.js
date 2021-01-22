module.exports = {
  overrides: [
    {
      files: '*.js',
      options: {
        singleQuote: true,
        bracketSpacing: false,
        printWidth: 150,
        useTabs: false,
        tabWidth: 2,
      },
    },
    {
      files: '*.sol',
      options: {
        printWidth: 150,
        tabWidth: 4,
        singleQuote: false,
        explicitTypes: 'always',
      },
    },
  ],
};
