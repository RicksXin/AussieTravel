const path = require('path')
module.exports = {
  projectName: 'aussie-travel',
  date: '2026-09-16',
  designWidth: 390,
  deviceRatio: { 390: 750 / 390, 640: 2.34 / 2, 750: 1, 828: 1.81 / 2 },
  sourceRoot: 'src',
  outputRoot: `dist/${process.env.TARO_ENV || 'weapp'}`,
  framework: 'react',
  compiler: 'webpack5',
  plugins: ['@tarojs/plugin-platform-weapp', '@tarojs/plugin-platform-h5'],
  cache: { enable: false },
  csso: { config: { calc: false } },
  alias: { '@': path.resolve(__dirname, '..', 'src') },
  mini: {
    postcss: { pxtransform: { enable: true }, cssModules: { enable: false } },
    webpackChain(chain) {
      // Avoid spawning a worker pool for this small mini-program build.
      for (const name of ['terserPlugin', 'cssoWebpackPlugin']) {
        if (chain.optimization.minimizers.has(name)) {
          chain.optimization.minimizer(name).tap(args => {
            args[0].parallel = false
            return args
          })
        }
      }
    }
  },
  h5: {
    publicPath: '/',
    staticDirectory: 'static',
    router: { mode: 'hash' },
    devServer: { host: '0.0.0.0', port: 10086 },
    postcss: { pxtransform: { enable: false }, autoprefixer: { enable: true }, cssModules: { enable: false } }
  }
}
