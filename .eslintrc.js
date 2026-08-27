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
    '@typescript-eslint/no-unused-vars': [
      'warn',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        destructuredArrayIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_'
      }
    ]
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
        // The `mql` logic singleton IS the MqlApi's own implementation
        // (the Api face forwards to it), so it shares the facade's
        // privilege to import from the sealed `mql/` pipeline.
        'packages/server/src/mud/platform/idea/api/MqlLogic.ts',
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
      // Logic-singleton isolation: `obj/api/*Logic.ts` modules are the
      // internal implementation behind their `api/*.ts` facade. Nothing
      // imports a logic module directly — every consumer goes through the
      // facade, which forwards/re-exports what it means to expose. The
      // ONE sanctioned importer is each facade itself (it value-imports
      // its own logic class for the singleton resolver) — exempted by the
      // single-level `mud/api/*.ts` glob. Tests white-box logic internals
      // directly (the test-only carve-out) — exempted by `__tests__`. The
      // Consumer/Producer sibling cross-imports (an EventApi
      // restrictSubscribe allowlist) opt out per-line with an
      // `eslint-disable no-restricted-imports` + justification (see
      // architecture.md § sanctioned-exception registry).
      files: ['packages/server/src/**/*.ts', 'packages/server/src/**/*.tsx'],
      excludedFiles: [
        'packages/server/src/mud/api/*.ts',
        'packages/server/src/**/__tests__/**'
      ],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: ['**/platform/idea/api/*Logic', '**/api/*Logic', './*Logic'],
                message:
                  'Import from the api/<x>.ts facade, not the obj/api/<X>Logic singleton (logic modules are internal implementation; only the facade imports its own logic).'
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
    },
    {
      // lib/ modules export the ONE concept they define — a class, a
      // mixin factory, or a named value-object/vocabulary/registry —
      // plus the types and constants its surface speaks. Never a
      // free-floating helper function. Two recognized function
      // categories are exempt: **mixin factories** (`export function
      // FooMixin` — exempt by the `Mixin` name suffix) and **decorators**
      // (`lib/security/decorators.ts` + `RequiresActive.ts` — exempt by
      // path; a decorator IS a function by nature). A genuine ad-hoc
      // exception (a test-only white-box export, a DI injection seam) may
      // opt out with `eslint-disable-next-line no-restricted-syntax` +
      // a justification — but introducing a NEW exception must be cleared
      // with the user first (CLAUDE.md § Export discipline & the
      // sanctioned-exception registry; architecture.md catalogs the set).
      files: ['packages/server/src/mud/lib/**/*.ts'],
      excludedFiles: [
        'packages/server/src/mud/lib/**/__tests__/**',
        'packages/server/src/mud/lib/security/decorators.ts',
        'packages/server/src/mud/lib/security/RequiresActive.ts'
      ],
      rules: {
        'no-restricted-syntax': [
          'error',
          {
            selector:
              'ExportNamedDeclaration > FunctionDeclaration[id.name!=/Mixin$/]',
            message:
              'No free-floating exported functions in lib/ — fold it into the owning class/Api/value-object, name it `*Mixin` if it is a mixin factory, or (a documented exception only) add an eslint-disable with a justification and clear the new exception with the user first (see CLAUDE.md § Export discipline).'
          },
          {
            selector:
              'ExportNamedDeclaration > VariableDeclaration > VariableDeclarator[init.type="ArrowFunctionExpression"]',
            message:
              'No exported function-valued consts in lib/ — fold it into the owning class/Api/value-object (see CLAUDE.md § Export discipline).'
          },
          {
            selector:
              'ExportNamedDeclaration > VariableDeclaration > VariableDeclarator[init.type="FunctionExpression"]',
            message:
              'No exported function-valued consts in lib/ — fold it into the owning class/Api/value-object (see CLAUDE.md § Export discipline).'
          }
        ]
      }
    }
  ],
  ignorePatterns: ['node_modules/', 'dist/', 'build/', '*.log']
};
