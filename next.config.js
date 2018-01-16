const Uglify = require('uglifyjs-webpack-plugin')

module.exports = {
  webpack: (config, { buildId, dev }) => {
    // https://github.com/zeit/next.js/issues/1582
    config.plugins = config.plugins.filter(
      plugin => plugin.constructor.name !== 'UglifyJsPlugin'
    )
    config.plugins.push(new Uglify())

    // Fixes "Cannot find module 'fs'" from decentraland-commons
    config.node = {}
    config.node.fs = "empty"
    return config
  },
  exportPathMap: function() {
    return {
      '/linker': { page: '/linker' }
    }
  }
}
