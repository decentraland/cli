import { Stats } from 'fs-extra'
import test from 'ava'
import sinon from 'sinon'

function createSandbox() {
  const ctx = sinon.createSandbox()
  delete require.cache[require.resolve('fs-extra')]
  delete require.cache[require.resolve('../../../src/lib/Project')]
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Project } = require('../../../src/lib/Project')
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const fs = require('fs-extra')

  const getAllFilePathsStub = ctx
    .stub(Project.prototype, 'getAllFilePaths')
    .callsFake(async () => [
      'a.json',
      'src/b.json',
      'node_modules/module/a.js',
      'src/node_modules/module/b.js',
      '.dclignore'
    ])
  const sceneFileExistsStub = ctx
    .stub(Project.prototype, 'sceneFileExists')
    .callsFake(async () => false)
  ctx.stub(fs, 'readFile').callsFake(async () => Buffer.from('buffer'))
  ctx.stub(fs, 'stat').callsFake(async () => {
    const stat = new Stats()
    stat.size = 1000
    return stat
  })

  return {
    ctx,
    fs,
    Project,
    getAllFilePathsStub,
    sceneFileExistsStub
  }
}

test('Unit - Project.getFiles() - should return all files', async (t) => {
  const { Project } = createSandbox()
  const project = new Project('.')
  const files = await project.getFiles('')
  const expected = [
    'a.json',
    'src/b.json',
    'node_modules/module/a.js',
    'src/node_modules/module/b.js',
    '.dclignore'
  ]

  files.forEach((file, i) => {
    t.is(file.path, expected[i])
    t.is(file.content.compare(Buffer.from('buffer')), 0)
    t.is(file.size, 1000)
  })
})

test('Unit - Project.getFiles() - should ignore node_modules', async (t) => {
  const { Project } = createSandbox()
  const project = new Project('.')
  const files = await project.getFiles('node_modules')
  const expected = ['a.json', 'src/b.json', '.dclignore']

  files.forEach((file, i) => {
    t.is(file.path, expected[i])
    t.is(file.content.compare(Buffer.from('buffer')), 0)
    t.is(file.size, 1000)
  })

  t.false(files.some((file) => file.path.indexOf('node_modules/') !== -1))
})

test('Unit - Project.getFiles() - should ignore . files', async (t) => {
  const { Project } = createSandbox()
  const project = new Project('.')
  const files = await project.getFiles('.*')
  const expected = [
    'a.json',
    'src/b.json',
    'node_modules/module/a.js',
    'src/node_modules/module/b.js'
  ]

  files.forEach((file, i) => {
    t.is(file.path, expected[i])
    t.is(file.content.compare(Buffer.from('buffer')), 0)
    t.is(file.size, 1000)
  })

  t.false(files.some((file) => file.path === '.dclignore'))
})

test('Unit - Project.getFiles() - should ignore specific file', async (t) => {
  const { Project } = createSandbox()
  const project = new Project('.')
  const files = await project.getFiles('a.json')
  const expected = [
    'src/b.json',
    'node_modules/module/a.js',
    'src/node_modules/module/b.js',
    '.dclignore'
  ]

  files.forEach((file, i) => {
    t.is(file.path, expected[i])
    t.is(file.content.compare(Buffer.from('buffer')), 0)
    t.is(file.size, 1000)
  })

  t.false(files.some((file) => file.path === 'a.json'))
})

test('Unit - Project.getFiles() - should ignore several files', async (t) => {
  const { Project } = createSandbox()
  const project = new Project('.')
  const files = await project.getFiles('a.json\nsrc/b.json')
  const expected = [
    'node_modules/module/a.js',
    'src/node_modules/module/b.js',
    '.dclignore'
  ]

  files.forEach((file, i) => {
    t.is(file.path, expected[i])
    t.is(file.content.compare(Buffer.from('buffer')), 0)
    t.is(file.size, 1000)
  })

  t.false(
    files.some((file) => file.path === 'a.json' || file.path === 'src/b.json')
  )
})

test('Unit - Project.validateNewProject() - should pass if the working directory is not dirty', async (t) => {
  const { Project } = createSandbox()
  const project = new Project('.')

  await project.validateNewProject()
  t.pass()
})

test('Unit - Project.validateNewProject() - should fail if the working directory contains a scene.json file', async (t) => {
  const { Project, sceneFileExistsStub } = createSandbox()
  sceneFileExistsStub.callsFake(() => true)
  const project = new Project('.')

  await t.throwsAsync(project.validateNewProject(), {
    message: 'Project already exists'
  })
})

test('Unit - Project.needsDependencies() - should return true if a package.json file is present', async (t) => {
  const { ctx, fs, Project, getAllFilePathsStub } = createSandbox()

  getAllFilePathsStub.callsFake(() => ['package.json', 'test.json'])
  ctx.stub(fs, 'pathExists').callsFake(() => false)

  const project = new Project('.')
  t.true(await project.needsDependencies())
})

test('Unit - Project.needsDependencies() - sshould return false if no package.json file is present', async (t) => {
  const { Project, getAllFilePathsStub } = createSandbox()
  getAllFilePathsStub.callsFake(() => ['tsconfig.json', 'test.json'])
  const project = new Project('.')
  t.false(await project.needsDependencies())
})

test('Unit - Project.isTypescriptProject() - should return true if a tsconfig.json file is present', async (t) => {
  const { Project, getAllFilePathsStub } = createSandbox()
  getAllFilePathsStub.callsFake(() => ['tsconfig.json', 'test.json'])
  const project = new Project('.')
  t.true(await project.isTypescriptProject())
})

test('Unit - Project.isTypescriptProject() - should return false if no tsconfig.json file is present', async (t) => {
  const { Project, getAllFilePathsStub } = createSandbox()
  getAllFilePathsStub.callsFake(() => ['package.json', 'test.json'])
  const project = new Project('.')
  t.false(await project.isTypescriptProject())
})

test('Unit - Project.isValidMainFormat() - should return true for js', (t) => {
  t.true(new (createSandbox().Project)()['isValidMainFormat']('js'))
})

test('Unit - Project.isValidMainFormat() - should return true for xml', (t) => {
  t.true(new (createSandbox().Project)()['isValidMainFormat']('xml'))
})

test('Unit - Project.isValidMainFormat() - should return true for html', (t) => {
  t.true(new (createSandbox().Project)()['isValidMainFormat']('html'))
})

test('Unit - Project.isValidMainFormat() - should return false for invalid formats', (t) => {
  t.false(new (createSandbox().Project)()['isValidMainFormat']('dhtml'))
  t.false(new (createSandbox().Project)()['isValidMainFormat']('json'))
  t.false(new (createSandbox().Project)()['isValidMainFormat']('ts'))
  t.false(new (createSandbox().Project)()['isValidMainFormat'](''))
  t.false(new (createSandbox().Project)()['isValidMainFormat'](undefined))
})

test('Unit - Project.isValidMainFormat() - should return true for null', (t) => {
  t.true(new (createSandbox().Project)()['isValidMainFormat'](null))
})

test('Unit - Project.isWebSocket() - should return true for a valid websocket address', (t) => {
  t.true(new (createSandbox().Project)()['isWebSocket']('ws://127.0.0.1'))
  t.true(
    new (createSandbox().Project)()['isWebSocket']('ws://mydomain.com:3131')
  )
  t.true(new (createSandbox().Project)()['isWebSocket']('ws://'))
})

test('Unit - Project.isWebSocket() - should return true for a valid secure websocket address', (t) => {
  t.true(new (createSandbox().Project)()['isWebSocket']('wss://127.0.0.1'))
  t.true(
    new (createSandbox().Project)()['isWebSocket']('wss://mydomain.com:3131')
  )
  t.true(new (createSandbox().Project)()['isWebSocket']('wss://'))
})

test('Unit - Project.isWebSocket() - should return false for an invalid websocket address', (t) => {
  t.false(new (createSandbox().Project)()['isWebSocket']('http://mydomain.com'))
  t.false(
    new (createSandbox().Project)()['isWebSocket']('http://mydomain.com:8080')
  )
  t.false(new (createSandbox().Project)()['isWebSocket']('https://127.0.0.1'))
  t.false(new (createSandbox().Project)()['isWebSocket']('w://'))
  t.false(new (createSandbox().Project)()['isWebSocket'](''))
  t.false(new (createSandbox().Project)()['isWebSocket'](null))
  t.false(new (createSandbox().Project)()['isWebSocket'](undefined))
})
