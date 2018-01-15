module.exports = {
  webpack: (config, { buildId, dev }) => {
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
