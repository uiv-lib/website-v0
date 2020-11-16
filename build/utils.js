'use strict'
const path = require('path')
const config = require('../config')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const packageConfig = require('../package.json')
const babel = require('babel-core')
const PrerenderSpaPlugin = require('prerender-spa-plugin')
const SitemapPlugin = require('sitemap-webpack-plugin').default
const Renderer = PrerenderSpaPlugin.PuppeteerRenderer

exports.assetsPath = function (_path) {
  const assetsSubDirectory = process.env.NODE_ENV === 'production'
    ? config.build.assetsSubDirectory
    : config.dev.assetsSubDirectory

  return path.posix.join(assetsSubDirectory, _path)
}

exports.cssLoaders = function (options) {
  options = options || {}

  const cssLoader = {
    loader: 'css-loader',
    options: {
      sourceMap: options.sourceMap
    }
  }

  const postcssLoader = {
    loader: 'postcss-loader',
    options: {
      sourceMap: options.sourceMap
    }
  }

  // generate loader string to be used with extract text plugin
  function generateLoaders (loader, loaderOptions) {
    const loaders = options.usePostCSS ? [cssLoader, postcssLoader] : [cssLoader]

    if (loader) {
      loaders.push({
        loader: loader + '-loader',
        options: Object.assign({}, loaderOptions, {
          sourceMap: options.sourceMap
        })
      })
    }

    // Extract CSS when that option is specified
    // (which is the case during production build)
    if (options.extract) {
      return [MiniCssExtractPlugin.loader].concat(loaders)
    } else {
      return ['vue-style-loader'].concat(loaders)
    }
  }

  // https://vue-loader.vuejs.org/en/configurations/extract-css.html
  return {
    css: generateLoaders(),
    postcss: generateLoaders(),
    less: generateLoaders('less'),
    sass: generateLoaders('sass', { indentedSyntax: true }),
    scss: generateLoaders('sass'),
    stylus: generateLoaders('stylus'),
    styl: generateLoaders('stylus')
  }
}

// Generate loaders for standalone style files (outside of .vue)
exports.styleLoaders = function (options) {
  const output = []
  const loaders = exports.cssLoaders(options)

  for (const extension in loaders) {
    const loader = loaders[extension]
    output.push({
      test: new RegExp('\\.' + extension + '$'),
      use: loader
    })
  }

  return output
}

exports.createNotifierCallback = () => {
  const notifier = require('node-notifier')

  return (severity, errors) => {
    if (severity !== 'error') return

    const error = errors[0]
    const filename = error.file && error.file.split('!').pop()

    notifier.notify({
      title: packageConfig.name,
      message: severity + ': ' + error.name,
      subtitle: filename || '',
      icon: path.join(__dirname, 'logo.png')
    })
  }
}

// Get routes array from /docs/router/routes.js
const getDocumentRoutes = () => {
  let routesCode = babel.transformFileSync(path.join(__dirname, '../src/router/routes.js')).code
  routesCode = routesCode
    .replace(/import\('[\S\s].*?'\)/ig, 'null')
    .replace(/export default[\S\s].*?;/, '')
    .replace('var routes = ', '')
    .replace(/\/\/.*/g, '')
  const routes = eval(routesCode)
  return routes.map(v => v.path)
}

exports.generateRenderPlugins = () => {
  let paths = getDocumentRoutes()
  let distPath = path.join(__dirname, './../dist')
  console.log(paths)
  return [
    new PrerenderSpaPlugin({
        staticDir: distPath,
        routes: paths,
        renderer: new Renderer({
          maxConcurrentRoutes: 5,
          headless: true,
          args: [
            `--no-sandbox`
          ]
        })
      }
    ),
    new SitemapPlugin({
      base: 'https://uiv-v0.wxsm.space',
      paths: paths.map(path => {
        return {
          path: path === '/' ? path : path + '/',
          changeFreq: 'weekly'
        }
      })
    })
  ]
}
