import Commando from '../helpers/commando'
import { isDebug } from '../../src/utils/env'

export default function buildProject(dirPath) {
  return new Promise(resolve => {
    new Commando(`npm run build`, {
      silent: !isDebug(),
      workingDir: dirPath,
      env: { NODE_ENV: 'development' }
    }).on('end', async () => {
      resolve()
    })
  })
}
