const path = require('path')
const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
  target: 'web',
  entry: path.resolve(__dirname, 'src') + '/index.tsx',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/
      },
      {
        test: /\.css$/,
        use: ['css-loader'],
      },
      {
        test: /\.(jpe?g|png|gif|svg|ttf|woff|woff2|eot)$/i,
        use: [
          {
            loader: 'url-loader',
            options: {
              limit: 512000
            }
          }
        ]
      },
    ]
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.json']
  },
  output: {
    filename: 'index.js',
    path: path.resolve(__dirname, '../dist/linker-app/src')
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
