import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.strict,
  {
    rules: {
      'semi': ['error', 'never'],
      'no-restricted-syntax': [
        'error',
        {
          selector: 'ImportDeclaration[specifiers.length=0]',
          message: 'Empty imports are not allowed',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
  {
    ignores: ['dist/', 'node_modules/'],
  },
)
