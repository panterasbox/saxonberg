module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'react', 'react-hooks'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended'
  ],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    ecmaFeatures: { jsx: true }
  },
  settings: {
    react: { version: 'detect' }
  },
  env: {
    browser: true,
    node: true,
    es2021: true
  },
  rules: {
    'react/react-in-jsx-scope': 'off',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }]
  },
  overrides: [
    {
      // Subdir-isolation boundary: the `api/mql/` and `api/mml/`
      // directories are internal pipelines. Only their facade modules
      // (`api/mql.ts`, `api/mml.ts`) may import from them; every other
      // consumer goes through the facade, which re-exports what it
      // means to expose. Matches an import specifier containing
      // `/mql/` or `/mml/` (the facade imports `./mql` / `./mml` with
      // no trailing segment, so those stay allowed).
      files: ['packages/server/src/**/*.ts', 'packages/server/src/**/*.tsx'],
      excludedFiles: [
        'packages/server/src/mud/api/mql.ts',
        'packages/server/src/mud/api/mml.ts',
        'packages/server/src/mud/api/mql/**',
        'packages/server/src/mud/api/mml/**',
        // White-box pipeline tests exercise the internal stages
        // (lexer / parser / desugar / resolver) directly.
        'packages/server/src/**/__tests__/**'
      ],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: ['**/mql/*', '**/mql/**', '**/mml/*', '**/mml/**'],
                message:
                  'Import from the api/mql.ts or api/mml.ts facade, not the mql/ or mml/ internal pipeline directly (see the Api subdir-isolation rule).'
              }
            ]
          }
        ]
      }
    },
    {
      // Apis expose behavior through their Api class. Module-level
      // exported functions are not allowed in api/*.ts — fold them
      // into the owning Api. Types and constants stay exportable.
      // A function exported solely for white-box tests may opt out
      // with an `eslint-disable-next-line no-restricted-syntax` plus a
      // justification. Subdirs (api/mql/, api/mml/) and tests
      // (api/__tests__/) are out of scope by the single-level glob.
      files: ['packages/server/src/mud/api/*.ts'],
      rules: {
        'no-restricted-syntax': [
          'error',
          {
            selector: 'ExportNamedDeclaration > FunctionDeclaration',
            message:
              'No exported functions in api/*.ts — fold this into the Api class (or, if it is exported only for a white-box test, add an eslint-disable with a justification).'
          },
          {
            selector:
              'ExportNamedDeclaration > VariableDeclaration > VariableDeclarator[init.type="ArrowFunctionExpression"]',
            message:
              'No exported function-valued consts in api/*.ts — fold this into the Api class.'
          },
          {
            selector:
              'ExportNamedDeclaration > VariableDeclaration > VariableDeclarator[init.type="FunctionExpression"]',
            message:
              'No exported function-valued consts in api/*.ts — fold this into the Api class.'
          }
        ]
      }
    }
  ],
  ignorePatterns: ['node_modules/', 'dist/', 'build/', '*.log']
};
