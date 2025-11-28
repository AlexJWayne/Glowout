import { type Config } from 'prettier'

export default {
  semi: false,
  singleQuote: true,
  importOrderSeparation: true,
  importOrderSortSpecifiers: true,
  plugins: ['@trivago/prettier-plugin-sort-imports'],
} satisfies Config
