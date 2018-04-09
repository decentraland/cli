import { expect } from 'chai'
import { sandbox } from 'sinon'

import * as fs from 'fs-extra'
import { Project } from '../../src/lib/Project'

const ctx = sandbox.create()

describe('Project class', () => {
  let getAllFilePathsStub
  let getDCLIgnoreStub
  let readFileSyncStub

  beforeEach(() => {
    getAllFilePathsStub = ctx
      .stub(Project.prototype, 'getAllFilePaths')
      .callsFake(() => ['a.json', 'src/b.json', 'node_modules/module/a.js', 'src/node_modules/module/b.js', '.dclignore'])
    getDCLIgnoreStub = ctx.stub(Project.prototype, 'getDCLIgnore' as any).callsFake(() => '')
    readFileSyncStub = ctx.stub(fs, 'readFile').callsFake(path => 'buffer')
  })

  afterEach(function() {
    // completely restore all fakes created through the sandbox
    ctx.restore()
  })

  describe('getFiles', () => {
    it('should return all files', async () => {
      const project = new Project()
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

      const project = new Project()
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

      const project = new Project()
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

      const project = new Project()
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
      getDCLIgnoreStub.callsFake(
        () =>
          `a.json
          src/b.json`
      )

      const project = new Project()
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
})
