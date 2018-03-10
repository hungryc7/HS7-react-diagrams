const webpack = require("webpack");
const UglifyJsPlugin = require('uglifyjs-webpack-plugin')
var plugins = [];

//do we minify it all
if(process.env.NODE_ENV === 'production'){
	console.log("creating production build");
	plugins.push(new webpack.DefinePlugin({
		'process.env.NODE_ENV': 'production',
	}));
}

/**
 * @author Dylan Vorster
 */
module.exports =
	//for building the umd distribution
	{
		entry: './src/main.ts',
		output: {
			filename: 'main.js',
			path: __dirname + '/dist',
			libraryTarget: 'umd',
			library: 'storm-react-diagrams'
		},
		externals: {
			react: {
				root: 'React',
				commonjs2: 'react',
				commonjs: 'react',
				amd: 'react'
			},
			'react-dom': {
				root: 'ReactDOM',
				commonjs2: 'react-dom',
				commonjs: 'react-dom',
				amd: 'react-dom'
			},
			"lodash": {
				commonjs: 'lodash',
				commonjs2: 'lodash',
				amd: '_',
				root: '_'
			}
		},
		plugins:plugins,
		module: {
			rules: [
				{
					enforce: 'pre',
					test: /\.js$/,
					loader: "source-map-loader"
				},
				{
					test: /\.tsx?$/,
					loader: 'ts-loader'
				}
			]
		},
		resolve: {
			extensions: [".tsx", ".ts", ".js"]
		},
		devtool: 'cheap-module-source-map',
		mode: process.env.NODE_ENV || 'development',
		optimization: {
			minimizer: [
				// we specify a custom UglifyJsPlugin here to get source maps in production
				new UglifyJsPlugin({
					uglifyOptions: {
						compress: false,
						ecma: 6,
						mangle: false
					},
					sourceMap: true
				})
			]
		},
	}
;
