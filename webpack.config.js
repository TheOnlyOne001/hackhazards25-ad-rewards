// webpack.config.js - FINAL VERSION with ML file copying
const path = require('path');
const webpack = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');

// Load environment variables from .env file
require('dotenv').config();

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';
  
  return {
    mode: isProduction ? 'production' : 'development',
    devtool: isProduction ? false : 'source-map',
    
    entry: {
      background: './background.js',
      content: './content.js',
      popup: './src/popup/main.jsx'  // Add this line!
    },
    
    // Add module rules for JSX/React
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
              ]
            }
          }
        },
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader']
        }
      ]
    },
    
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: '[name].js',
      clean: true
    },
    
    plugins: [
      // **CRITICAL**: Inject environment variables at build time
      new webpack.DefinePlugin({
        'process.env.GROQ_API_KEY': JSON.stringify(process.env.GROQ_API_KEY),
        'process.env.API_SECRET': JSON.stringify(process.env.API_SECRET),
        'process.env.SECURE_ENDPOINT_URL': JSON.stringify(process.env.SECURE_ENDPOINT_URL),
        'process.env.ONCHAINKIT_API_KEY': JSON.stringify(process.env.ONCHAINKIT_API_KEY),
        'process.env.NODE_ENV': JSON.stringify(isProduction ? 'production' : 'development')
      }),
      
      // **CRITICAL FIX**: Copy all required files
      new CopyWebpackPlugin({
        patterns: [
          { from: 'manifest.json', to: 'manifest.json' },
          { from: 'popup.html', noErrorOnMissing: true },
          { from: 'icons/', to: 'icons/', noErrorOnMissing: true }
          // Models will be downloaded automatically by transformers library
        ]
      })
    ],
    
    resolve: {
      extensions: ['.js', '.jsx'],
      fallback: {
        "crypto": false,
        "stream": false,
        "util": false,
        "buffer": false,
        "process": false,
        "fs": false,
        "path": false
      }
    },
    
    experiments: {
      topLevelAwait: true
    },
    
    optimization: {
      minimize: isProduction,
      splitChunks: false // Keep each bundle separate for extension
    },
    
    // Ensure proper handling of worker context
    target: ['web', 'es2020']
  };
};