import * as fs from 'fs'
import * as path from 'path'

export default async markdown => {
  fs.writeFileSync(path.resolve(process.cwd(), 'release.md'), markdown)
  return markdown
}
