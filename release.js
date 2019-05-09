const fs = require('fs')
const path = require('path')

module.exports = async markdown => {
  fs.writeFileSync(path.resolve(process.cwd(), 'release.md'), markdown)
  return markdown
}
