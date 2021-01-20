module.exports = {
  overrides: [
    {
      files: '*',
      options: {
        singleQuote: true,
        bracketSpacing: false,
        printWidth: 120,
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
