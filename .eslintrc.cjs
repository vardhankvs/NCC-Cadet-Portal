// .eslintrc.cjs
module.exports = {
    env: {
        browser: true,
        es2021: true,
        node: true,
    },
    extends: [
        'eslint:recommended',
        'plugin:react/recommended',
        'plugin:react-hooks/recommended',
        'plugin:jsx-a11y/recommended',
        'plugin:prettier/recommended',
    ],
    parserOptions: {
        ecmaFeatures: {
            jsx: true,
        },
        ecmaVersion: 'latest',
        sourceType: 'module',
    },
    plugins: ['react', 'jsx-a11y', 'import', 'prettier'],
    settings: {
        react: {
            version: 'detect',
        },
    },
    globals: {
        // Added globals
        __app_id: 'readonly',
        __initial_auth_token: 'readonly',
        __firebase_config: 'readonly',
    },
    rules: {
        'prettier/prettier': 'warn',
        'react/react-in-jsx-scope': 'off',
        'react/prop-types': 'off',
        'no-unused-vars': 'warn', // Changed errors to warnings for unused vars
    },
    ignorePatterns: ['dist', 'node_modules', '*.config.js', '*.cjs'],
};
