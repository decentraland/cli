import test from 'ava'

import { Project } from '../../../src/lib/Project'
import { tmpTest } from '../../helpers/sandbox'
import { setupFilesystem } from '../helpers'

test('Integration - Project', async t => {
  await tmpTest(async (dirPath, done) => {
    await setupFilesystem(dirPath, [
      {
        path: '.decentraland/test.js',
        content: 'console.log()'
      },
      {
        path: 'test.js',
        content: 'console.log()'
      },
      {
        path: 'models/test.fbx',
        content: '...'
      },
      {
        path: 'src/index.ts',
        content: 'console.log()'
      },
      {
        path: 'src/package.json',
        content: '{}'
      },
      {
        path: 'src/node_modules/example/index.js',
        content: 'console.log()'
      },
      {
        path: 'package.json',
        content: '{}'
      },
      {
        path: 'tsconfig.json',
        content: '{}'
      },
      {
        path: 'scene.json',
        content: '{}'
      },
      {
        path: 'scene.xml',
        content: '<a></a>'
      },
      {
        path: '.dclignore',
        content: `.*\npackage.json\npackage-lock.json\nyarn-lock.json\nbuild.json\ntsconfig.json\ntslint.json\nnode_modules/\n*.ts\n*.tsx\ndist/`
      }
    ])
    const project = new Project(dirPath)
    const [files, need, tsProject] = await Promise.all([
      project.getFiles(
        `.*\npackage.json\npackage-lock.json\nyarn-lock.json\nbuild.json\ntsconfig.json\ntslint.json\nnode_modules/\n*.ts\n*.tsx\ndist/`
      ),
      project.needsDependencies(),
      project.isTypescriptProject()
    ])

    t.deepEqual(files.map(f => f.path), ['models/test.fbx', 'scene.json', 'scene.xml', 'test.js'])
    t.true(need)
    t.true(tsProject)
    done()
  })
})
