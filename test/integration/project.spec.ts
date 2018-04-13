import { expect } from 'chai'
import * as fs from 'fs-extra'
import { tmpTest } from './sandbox'
import { Project } from '../../src/lib/Project'
import * as path from 'path'

async function setup(dirPath) {
  const files = [
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
      content: `.*\npackage.json\npackage-lock.json\nyarn-lock.json\nbuild.json\ntsconfig.json\ntslint.json\nnode_modules/\n**/node_modules/*\n*.ts\n*.tsx\ndist/`
    }
  ]

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const filePath = path.resolve(dirPath, file.path)
    const fileDir = path.dirname(filePath)

    if (fileDir !== dirPath) {
      await fs.mkdirp(fileDir)
    }

    await fs.writeFile(filePath, file.content)
  }
}

tmpTest(async (dirPath, done) => {
  await setup(dirPath)

  describe('Project', () => {
    after(() => done())

    describe('getFiles()', async () => {
      it('should return all the files qualified to be uploaded', async () => {
        const project = new Project(dirPath)
        const result = await project.getFiles()

        expect(result.map(f => f.path)).to.deep.equal(['/tmp/models/test.fbx', '/tmp/scene.json', '/tmp/scene.xml', '/tmp/test.js'])
      }).timeout(5000)
    })

    describe('hasDependencies()', async () => {
      it('should return true when a package.json file is present', async () => {
        const project = new Project(dirPath)
        const result = await project.hasDependencies()
        expect(result).to.be.true
      }).timeout(5000)
    })

    describe('isTypescriptProject()', async () => {
      it('should return true when a tsconfig.json file is present', async () => {
        const project = new Project(dirPath)
        const result = await project.isTypescriptProject()
        expect(result).to.be.true
      }).timeout(5000)
    })
  })
})
