const path = require('path');
const HtmlPlugin = require('html-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
    entry: {
        popup: './src/popup/index.tsx',
        background: './src/background/index.ts',
    },
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: '[name].js',
    },
    performance: {
        maxEntrypointSize: 512000,
        maxAssetSize: 512000,
        hints: 'warning'
    },
    resolve: {
        extensions: ['.ts', '.tsx', '.js', '.css'],
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
            {
                test: /\.css$/,
                use: [
                    'style-loader',
                    'css-loader'
                ]
            }
        ],
    },
    plugins: [
        new HtmlPlugin({
            template: './src/popup/index.html',
            filename: 'popup.html',
        }),
        new CopyPlugin({
            patterns: [
                { from: 'manifest.json', to: 'manifest.json' }, // Copy manifest from top level to dist/
                { from: 'src/assets', to: 'assets' },
            ],
        }),
    ],
    devServer: {
        static: {
            directory: path.join(__dirname, 'dist'),
        },
        compress: true,
        port: 9000,
    },
};
