const webpack = require('webpack');
const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');

const entry = './src/index.ts';

module.exports = {
    entry,
    output: {
        path: path.resolve(__dirname, 'dist/umd'),
        filename: 'hybridforms.min.js',
        library: {
            type: 'umd',
            name: 'HybridFormsJS'
        }
    },
    optimization: {
        minimize: true,
        minimizer: [
            new TerserPlugin({
                extractComments: false
            })
        ]
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                loader: 'ts-loader',
                options: {
                    transpileOnly: false
                }
            }
        ]
    },
    resolve: {
        extensions: ['.ts', '.js', '.json']
    },
    externalsPresets: { node: true },
    plugins: [
        new webpack.DefinePlugin({
            process: 'process/browser'
        }),
        new webpack.optimize.LimitChunkCountPlugin({
            maxChunks: 1
        })
    ]
};
