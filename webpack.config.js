// webpack.config.js - Production build configuration

const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const webpack = require('webpack');

// Load environment variables
require('dotenv').config();

module.exports = {
  mode: 'production',
  
  entry: {
    background: './src/background.js',
    content: './src/content.js',
    popup: './src/popup/main.jsx',  // Point to React entry
    classificationService: './src/classificationService.js',
    interestCaptureService: './services/interestCaptureService.js'
  },
  
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    clean: true
  },
  
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              '@babel/preset-env',
              ['@babel/preset-react', { runtime: 'automatic' }]
            ],
            plugins: ['@babel/plugin-transform-runtime']
          }
        }
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  },
  
  plugins: [
    new webpack.DefinePlugin({
      'process.env.GROQ_API_KEY': JSON.stringify(process.env.GROQ_API_KEY),
      'process.env.API_SECRET': JSON.stringify(process.env.API_SECRET),
      'process.env.SECURE_ENDPOINT_URL': JSON.stringify(process.env.SECURE_ENDPOINT_URL),
      'process.env.ONCHAINKIT_API_KEY': JSON.stringify(process.env.ONCHAINKIT_API_KEY),
      'process.env.NODE_ENV': JSON.stringify('production')
    }),
    new CopyWebpackPlugin({
      patterns: [
        { from: 'manifest.json', to: 'manifest.json' },
        { from: 'popup.html', to: 'popup.html' },
        { from: 'icons', to: 'icons', noErrorOnMissing: true }
      ]
    })
  ],
  
  optimization: {
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          compress: {
            drop_console: false, // Keep console logs for debugging
            drop_debugger: true,
            pure_funcs: ['console.debug'] // Remove debug logs
          },
          mangle: {
            safari10: true
          },
          format: {
            comments: false
          }
        },
        extractComments: false
      })
    ]
  },
  
  resolve: {
    extensions: ['.js', '.jsx'],
    fallback: {
      fs: false,
      path: false,
      crypto: false,
      stream: false,
      util: false,
      buffer: false,
      process: false
    }
  },
  
  experiments: {
    topLevelAwait: true
  },
  
  // Service worker specific optimizations
  performance: {
    hints: 'warning',
    maxEntrypointSize: 512000,
    maxAssetSize: 512000
  }
};