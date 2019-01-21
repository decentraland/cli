import { expect } from 'chai'
import * as path from 'path'

import { setupFilesystem } from '../helpers'
import { tmpTest, TIMEOUT_MS } from '../../sandbox'
import { Project } from '../../../src/lib/Project'

tmpTest(async (dirPath, done) => {
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

  describe('Project', () => {
    after(() => done())

    describe('getFiles()', async () => {
      it('should return all the files qualified to be uploaded', async () => {
        const project = new Project(dirPath)
        const result = await project.getFiles(
          `.*\npackage.json\npackage-lock.json\nyarn-lock.json\nbuild.json\ntsconfig.json\ntslint.json\nnode_modules/\n*.ts\n*.tsx\ndist/`
        )
        expect(result.map(f => f.path)).to.deep.equal([
          'models/test.fbx',
          'scene.json',
          'scene.xml',
          'test.js'
        ])
      }).timeout(TIMEOUT_MS)
    })

    describe('needsDependencies()', async () => {
      it('should return true when a package.json file is present', async () => {
        const project = new Project(dirPath)
        const result = await project.needsDependencies()
        expect(result).to.be.true
      }).timeout(TIMEOUT_MS)

      it('should return false when a node_modules folder is present (and not empty)', async () => {
        const project = new Project(path.resolve(dirPath, 'src'))
        const result = await project.needsDependencies()
        expect(result).to.be.false
      }).timeout(TIMEOUT_MS)
    })

    describe('isTypescriptProject()', async () => {
      it('should return true when a tsconfig.json file is present', async () => {
        const project = new Project(dirPath)
        const result = await project.isTypescriptProject()
        expect(result).to.be.true
      }).timeout(TIMEOUT_MS)
    })
  })
})
