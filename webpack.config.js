const path = require('path')
const webpack = require('webpack')
const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
  target: 'node',
  node: {
    __dirname: false,
    __filename: false
  },
  plugins: [
    new webpack.BannerPlugin({
      banner: '#!/usr/bin/env node',
      raw: true
    }),
    new webpack.ProvidePlugin({
      window: 'global/window',
   }),

  ],
  // external dependencies
  externals: ['aws-sdk', 'electron', 'dcl-node-runtime', '@dcl/linker-dapp'],
  entry: './src/index.ts',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/
      }
    ]
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js']
  },
  output: {
    filename: 'cli.js',
    path: path.resolve(__dirname, 'dist')
  },
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          keep_classnames: true
        },
      }),
    ],
  }
}
