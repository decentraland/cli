import { Scene } from '@dcl/schemas'
import test, { before } from 'ava'
import sinon from 'sinon'

import * as spinner from '../../../src/utils/spinner'
import { validateScene } from '../../../src/sceneJson/utils'
import sceneJson from '../resources/data/scene.json'

const sandbox = sinon.createSandbox()
type SinnonKeys = keyof typeof spinner
let mockSpinner: Record<SinnonKeys, sinon.SinonSpy>

test.before(() => {
  mockSpinner = {
    create: sandbox.stub(spinner, 'create').callsFake(a => a),
    fail: sandbox.stub(spinner, 'fail').callsFake(a => a),
    warn: sandbox.stub(spinner, 'warn').callsFake(a => a),
    succeed: sandbox.stub(spinner, 'succeed').callsFake(a => a),
    info: sandbox.stub(spinner, 'info').callsFake(a => a),
  }
})
test.after(() => {
  sandbox.restore()
})

test('Unit - validateScene should fail with default metadata values', t => {
  sandbox.reset()
  const scene: Scene = sceneJson

  t.false(validateScene(scene, true))

  sandbox.assert.calledOnce(mockSpinner.create)
  sandbox.assert.calledOnce(mockSpinner.warn)
  sandbox.assert.notCalled(mockSpinner.fail)
  sandbox.assert.notCalled(mockSpinner.succeed)
})

test('Unit - validateScene should pass with valid scene.json', t => {
  sandbox.reset()
  const scene: Scene = {
    ...sceneJson,
    display: {
      navmapThumbnail: 'navmap-thumbnail.png',
      description: 'some-description',
      title: 'some-title'
    }
  }

  t.true(validateScene(scene, true))

  sandbox.assert.calledOnce(mockSpinner.create)
  sandbox.assert.calledOnce(mockSpinner.succeed)
  sandbox.assert.notCalled(mockSpinner.fail)
  sandbox.assert.notCalled(mockSpinner.warn)
})

test('Unit - validateScene should fail with missing main prop', t => {
  sandbox.reset()
  const scene: Scene = {
    ...sceneJson,
    main: undefined
  }

  t.false(validateScene(scene, true))

  sandbox.assert.calledOnce(mockSpinner.create)
  sandbox.assert.calledOnce(mockSpinner.fail)
  sandbox.assert.notCalled(mockSpinner.succeed)
  sandbox.assert.notCalled(mockSpinner.warn)
})

test('Unit - validateScene should fail with invalid description prop', t => {
  sandbox.reset()
  const scene: Scene = {
    ...sceneJson,
    display: {
      description: 1 as any as string,
      title: 'asd',
      navmapThumbnail: 'asd'
    }
  }

  t.false(validateScene(scene, true))

  sandbox.assert.calledOnce(mockSpinner.create)
  sandbox.assert.calledOnce(mockSpinner.fail)
  sandbox.assert.notCalled(mockSpinner.succeed)
  sandbox.assert.notCalled(mockSpinner.warn)
})

test('Unit - validateScene should not called spinner with log in false', t => {
  sandbox.reset()
  const scene: Scene = sceneJson

  t.false(validateScene(scene, false))

  sandbox.assert.notCalled(mockSpinner.create)
  sandbox.assert.notCalled(mockSpinner.fail)
  sandbox.assert.notCalled(mockSpinner.succeed)
  sandbox.assert.notCalled(mockSpinner.warn)
})
