import { expect, use } from 'chai'
import { sandbox } from 'sinon'
const chaiAsPromised = require('chai-as-promised')

import * as fs from 'fs-extra'
import { Project } from '../../src/lib/Project'

use(chaiAsPromised)
const ctx = sandbox.create()

describe('Project class', () => {
  let getAllFilePathsStub
  let getDCLIgnoreStub
  let readFileStub
  let sceneFileExistsStub
  let decentralandFolderExistsStub

  beforeEach(() => {
    getAllFilePathsStub = ctx
      .stub(Project.prototype, 'getAllFilePaths')
      .callsFake(() => ['a.json', 'src/b.json', 'node_modules/module/a.js', 'src/node_modules/module/b.js', '.dclignore'])
    getDCLIgnoreStub = ctx.stub(Project.prototype, 'getDCLIgnore' as any).callsFake(() => '')
    sceneFileExistsStub = ctx.stub(Project.prototype, 'sceneFileExists').callsFake(() => false)
    decentralandFolderExistsStub = ctx.stub(Project.prototype, 'decentralandFolderExists').callsFake(() => false)
    readFileStub = ctx.stub(fs, 'readFile').callsFake(path => 'buffer')
  })

  afterEach(function() {
    // completely restore all fakes created through the sandbox
    ctx.restore()
  })

  describe('getFiles', () => {
    it('should return all files', async () => {
      const project = new Project('.')
      const files = await project.getFiles()
      const expected = ['a.json', 'src/b.json', 'node_modules/module/a.js', 'src/node_modules/module/b.js', '.dclignore']

      files.forEach((file, i) => {
        expect(file.path).to.eq('/tmp/' + expected[i])
        expect(file.content.compare(new Buffer('buffer'))).to.eq(0)
      })
    })

    it('should ignore node_modules', async () => {
      getDCLIgnoreStub.callsFake(
        () =>
          `node_modules
        **/node_modules/*`
      )

      const project = new Project('.')
      const files = await project.getFiles()
      const expected = ['a.json', 'src/b.json', '.dclignore']

      files.forEach((file, i) => {
        expect(file.path).to.eq('/tmp/' + expected[i])
        expect(file.content.compare(new Buffer('buffer'))).to.eq(0)
      })

      expect(files).to.satisfy((files: any[]) => {
        return !files.some(file => file.path.indexOf('node_modules/') !== -1)
      })
    })

    it('should ignore . files', async () => {
      getDCLIgnoreStub.callsFake(() => `.*`)

      const project = new Project('.')
      const files = await project.getFiles()
      const expected = ['a.json', 'src/b.json', 'node_modules/module/a.js', 'src/node_modules/module/b.js']

      files.forEach((file, i) => {
        expect(file.path).to.eq('/tmp/' + expected[i])
        expect(file.content.compare(new Buffer('buffer'))).to.eq(0)
      })

      expect(files).to.satisfy((files: any[]) => {
        return !files.some(file => file.path === '.dclignore')
      })
    })

    it('should ignore specific file', async () => {
      getDCLIgnoreStub.callsFake(() => `a.json`)

      const project = new Project('.')
      const files = await project.getFiles()
      const expected = ['src/b.json', 'node_modules/module/a.js', 'src/node_modules/module/b.js', '.dclignore']

      files.forEach((file, i) => {
        expect(file.path).to.eq('/tmp/' + expected[i])
        expect(file.content.compare(new Buffer('buffer'))).to.eq(0)
      })

      expect(files).to.satisfy((files: any[]) => {
        return !files.some(file => file.path === 'a.json')
      })
    })

    it('should ignore several files', async () => {
      getDCLIgnoreStub.callsFake(() => `a.json\nsrc/b.json`)

      const project = new Project('.')
      const files = await project.getFiles()
      const expected = ['node_modules/module/a.js', 'src/node_modules/module/b.js', '.dclignore']

      files.forEach((file, i) => {
        expect(file.path).to.eq('/tmp/' + expected[i])
        expect(file.content.compare(new Buffer('buffer'))).to.eq(0)
      })

      expect(files).to.satisfy((files: any[]) => {
        return !files.some(file => file.path === 'a.json' || file.path === 'src/b.json')
      })
    })
  })

  describe('validateNewProject', () => {
    it('should pass if the working directory is not dirty', () => {
      const project = new Project('.')
      expect(project.validateNewProject(), 'expect validateNewProject not to fail').to.be['fulfilled']
    })

    it('should fail if the working directory contains a scene.json file', async () => {
      decentralandFolderExistsStub.callsFake(() => false)
      sceneFileExistsStub.callsFake(() => true)
      const project = new Project('.')
      return expect(project.validateNewProject(), 'expect validateNewProject to fail').to.be['rejectedWith']('Project already exists')
    })

    it('should fail if the working directory contains a .decentraland folder', async () => {
      sceneFileExistsStub.callsFake(() => false)
      decentralandFolderExistsStub.callsFake(() => true)
      const project = new Project('.')
      return expect(project.validateNewProject(), 'expect validateNewProject to fail').to.be['rejectedWith']('Project already exists')
    })
  })

  describe('hasDependencies', () => {
    it('should return true if a package.json file is present', async () => {
      getAllFilePathsStub.callsFake(() => ['package.json', 'test.json'])
      const project = new Project('.')
      expect(await project.hasDependencies()).to.be.true
    })

    it('should return false if no package.json file is present', async () => {
      getAllFilePathsStub.callsFake(() => ['tsconfig.json', 'test.json'])
      const project = new Project('.')
      expect(await project.hasDependencies()).to.be.false
    })
  })

  describe('isTypescriptProject', () => {
    it('should return true if a tsconfig.json file is present', async () => {
      getAllFilePathsStub.callsFake(() => ['tsconfig.json', 'test.json'])
      const project = new Project('.')
      expect(await project.isTypescriptProject()).to.be.true
    })

    it('should return false if no tsconfig.json file is present', async () => {
      getAllFilePathsStub.callsFake(() => ['package.json', 'test.json'])
      const project = new Project('.')
      expect(await project.isTypescriptProject()).to.be.false
    })
  })
})
