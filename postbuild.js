const fs = require('fs')
const path = require('path')

const cssPath = './src/css'
const distPath = './dist/css'

function copy(file) {
  fs.copyFileSync(cssPath + '/' + file, path.resolve(distPath + '/' + path.basename(file)))
}

// make dir if it doesnt exist
if (!fs.existsSync(distPath)) {
  fs.mkdirSync(distPath)
}

// copy css files from src into dist
copy('styles.css')
copy('dark-theme.css')
copy('logo.svg')
