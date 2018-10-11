import * as fs from 'fs-extra'
import { expect, use } from 'chai'
import { sandbox } from 'sinon'
const chaiAsPromised = require('chai-as-promised')

import { Project } from '../../../src/lib/Project'

use(chaiAsPromised)
const ctx = sandbox.create()

describe('Project', () => {
  let getAllFilePathsStub
  let readFileStub
  let sceneFileExistsStub
  let decentralandFolderExistsStub
  let statStub

  beforeEach(() => {
    getAllFilePathsStub = ctx
      .stub(Project.prototype, 'getAllFilePaths')
      .callsFake(() => ['a.json', 'src/b.json', 'node_modules/module/a.js', 'src/node_modules/module/b.js', '.dclignore'])
    sceneFileExistsStub = ctx.stub(Project.prototype, 'sceneFileExists').callsFake(() => false)
    decentralandFolderExistsStub = ctx.stub(Project.prototype, 'decentralandFolderExists').callsFake(() => false)
    readFileStub = ctx.stub(fs, 'readFile').callsFake(path => 'buffer')
    statStub = ctx.stub(fs, 'stat').callsFake(path => ({ size: 1000 }))
  })

  afterEach(() => {
    // completely restore all fakes created through the sandbox
    ctx.restore()
  })

  describe('getFiles()', () => {
    it('should return all files', async () => {
      const project = new Project('.')
      const files = await project.getFiles('')
      const expected = ['a.json', 'src/b.json', 'node_modules/module/a.js', 'src/node_modules/module/b.js', '.dclignore']

      files.forEach((file, i) => {
        expect(file.path).to.eq(expected[i])
        expect(file.content.compare(new Buffer('buffer'))).to.eq(0)
        expect(file.size).to.eq(1000)
      })
    })

    it('should ignore node_modules', async () => {
      const project = new Project('.')
      const files = await project.getFiles('node_modules')
      const expected = ['a.json', 'src/b.json', '.dclignore']

      files.forEach((file, i) => {
        expect(file.path).to.eq(expected[i])
        expect(file.content.compare(new Buffer('buffer'))).to.eq(0)
        expect(file.size).to.eq(1000)
      })

      expect(files).to.satisfy((files: any[]) => {
        return !files.some(file => file.path.indexOf('node_modules/') !== -1)
      })
    })

    it('should ignore . files', async () => {
      const project = new Project('.')
      const files = await project.getFiles('.*')
      const expected = ['a.json', 'src/b.json', 'node_modules/module/a.js', 'src/node_modules/module/b.js']

      files.forEach((file, i) => {
        expect(file.path).to.eq(expected[i])
        expect(file.content.compare(new Buffer('buffer'))).to.eq(0)
        expect(file.size).to.eq(1000)
      })

      expect(files).to.satisfy((files: any[]) => {
        return !files.some(file => file.path === '.dclignore')
      })
    })

    it('should ignore specific file', async () => {
      const project = new Project('.')
      const files = await project.getFiles('a.json')
      const expected = ['src/b.json', 'node_modules/module/a.js', 'src/node_modules/module/b.js', '.dclignore']

      files.forEach((file, i) => {
        expect(file.path).to.eq(expected[i])
        expect(file.content.compare(new Buffer('buffer'))).to.eq(0)
        expect(file.size).to.eq(1000)
      })

      expect(files).to.satisfy((files: any[]) => {
        return !files.some(file => file.path === 'a.json')
      })
    })

    it('should ignore several files', async () => {
      const project = new Project('.')
      const files = await project.getFiles('a.json\nsrc/b.json')
      const expected = ['node_modules/module/a.js', 'src/node_modules/module/b.js', '.dclignore']

      files.forEach((file, i) => {
        expect(file.path).to.eq(expected[i])
        expect(file.content.compare(new Buffer('buffer'))).to.eq(0)
        expect(file.size).to.eq(1000)
      })

      expect(files).to.satisfy((files: any[]) => {
        return !files.some(file => file.path === 'a.json' || file.path === 'src/b.json')
      })
    })
  })

  describe('validateNewProject()', () => {
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

  describe('needsDependencies()', () => {
    it('should return true if a package.json file is present', async () => {
      getAllFilePathsStub.callsFake(() => ['package.json', 'test.json'])
      const pathExistsStub = ctx.stub(fs, 'pathExists').callsFake(path => false)

      const project = new Project('.')
      expect(await project.needsDependencies()).to.be.true
    })

    it('should return false if no package.json file is present', async () => {
      getAllFilePathsStub.callsFake(() => ['tsconfig.json', 'test.json'])
      const project = new Project('.')
      expect(await project.needsDependencies()).to.be.false
    })
  })

  describe('isTypescriptProject()', () => {
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

  describe('isValidMainFormat()', () => {
    const project = new Project('.')

    it('should return true for js', () => {
      expect(project['isValidMainFormat']('js')).to.be.true
    })

    it('should return true for xml', () => {
      expect(project['isValidMainFormat']('xml')).to.be.true
    })

    it('should return true for html', () => {
      expect(project['isValidMainFormat']('html')).to.be.true
    })

    it('should return false for invalid formats', () => {
      expect(project['isValidMainFormat']('dhtml')).to.be.false
      expect(project['isValidMainFormat']('json')).to.be.false
      expect(project['isValidMainFormat']('ts')).to.be.false
      expect(project['isValidMainFormat']('')).to.be.false
      expect(project['isValidMainFormat'](undefined)).to.be.false
    })
    
    it('should return true for null', () => {
      expect(project['isValidMainFormat'](null)).to.be.true
    })
  })

  describe('isWebSocket()', () => {
    const project = new Project('.')

    it('should return true for a valid websocket address', () => {
      expect(project['isWebSocket']('ws://127.0.0.1')).to.be.true
      expect(project['isWebSocket']('ws://mydomain.com:3131')).to.be.true
      expect(project['isWebSocket']('ws://')).to.be.true
    })

    it('should return true for a valid secure websocket address', () => {
      expect(project['isWebSocket']('wss://127.0.0.1')).to.be.true
      expect(project['isWebSocket']('wss://mydomain.com:3131')).to.be.true
      expect(project['isWebSocket']('wss://')).to.be.true
    })

    it('should return false for an invalid websocket address', () => {
      expect(project['isWebSocket']('http://mydomain.com')).to.be.false
      expect(project['isWebSocket']('http://mydomain.com:8080')).to.be.false
      expect(project['isWebSocket']('https://127.0.0.1')).to.be.false
      expect(project['isWebSocket']('w://')).to.be.false
      expect(project['isWebSocket']('')).to.be.false
      expect(project['isWebSocket'](null)).to.be.false
      expect(project['isWebSocket'](undefined)).to.be.false
    })
  })
})
