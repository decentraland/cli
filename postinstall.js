const fs = require('fs')
const path = require('path')

const cssPath = './src/css'
const uiPath = path.resolve(path.dirname(require.resolve('decentraland-ui')), '..')

function copy(file) {
  fs.copyFileSync(uiPath + '/' + file, path.resolve(cssPath + '/' + path.basename(file)))
}

// make dir if it doesnt exist
if (!fs.existsSync(cssPath)) {
  fs.mkdirSync(cssPath)
}

// copy css files from decentraland-ui into src
copy('lib/styles.css')
copy('lib/dark-theme.css')
copy('static/logo.svg')
