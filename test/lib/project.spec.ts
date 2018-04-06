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
      .callsFake(() => ['a.json', 'src/b.json', 'node_modules/module/a.js', '.dclignore'])
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
      const expected = ['a.json', 'src/b.json', 'node_modules/module/a.js', '.dclignore']

      files.forEach((file, i) => {
        expect(file.path).to.eq('/tmp/' + expected[i])
        expect(file.content.compare(new Buffer('buffer'))).to.eq(0)
      })
    })

    it('should ignore node_modules', async () => {
      getDCLIgnoreStub.callsFake(() => 'node_modules')

      const project = new Project()
      const files = await project.getFiles()
      const expected = ['a.json', 'src/b.json', '.dclignore']

      files.forEach((file, i) => {
        expect(file.path).to.eq('/tmp/' + expected[i])
        expect(file.content.compare(new Buffer('buffer'))).to.eq(0)
      })

      expect(files).to.satisfy((files: any[]) => {
        return !files.some(file => file.path === '/tmp/node_modules/module/a.js')
      })
    })

    it('should ignore several files', async () => {
      getDCLIgnoreStub.callsFake(() => 'node_modules')

      const project = new Project()
      const files = await project.getFiles()
      const expected = ['a.json', 'src/b.json', '.dclignore']

      files.forEach((file, i) => {
        expect(file.path).to.eq('/tmp/' + expected[i])
        expect(file.content.compare(new Buffer('buffer'))).to.eq(0)
      })

      expect(files).to.satisfy((files: any[]) => {
        return !files.some(file => file.path === '/tmp/node_modules/module/a.js')
      })
    })
  })
})
