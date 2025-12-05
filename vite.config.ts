import typegpuPlugin from 'unplugin-typegpu/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  base: 'Glowout',
  plugins: [typegpuPlugin({})],
})
