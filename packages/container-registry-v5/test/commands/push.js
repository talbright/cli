'use strict'

const cli = require('heroku-cli-util')
const cmd = require('../..').commands.find(c => c.topic === 'container' && c.command === 'push')
const expect = require('unexpected')
const sinon = require('sinon')
const nock = require('nock')

const Sanbashi = require('../../lib/sanbashi')
var sandbox

describe('container push', () => {
  beforeEach(() => {
    cli.mockConsole()
    sandbox = sinon.createSandbox()
  })
  afterEach(() => sandbox.restore())

  it('gets a build error', () => {
    let api = nock('https://api.heroku.com:443')
      .get('/apps/testapp')
      .reply(200, { name: 'testapp' })

    let dockerfiles = sandbox.stub(Sanbashi, 'getDockerfiles')
      .returns(['/path/to/Dockerfile'])
    let build = sandbox.stub(Sanbashi, 'buildImage').throws()

    return cmd.run({ app: 'testapp', args: ['web'], flags: {} })
      .then(() => expect(cli.stderr, 'to contain', 'docker build exited with Error: Error'))
      .then(() => expect(cli.stdout, 'to contain', 'Building web (/path/to/Dockerfile)'))
      .then(() => sandbox.assert.calledOnce(dockerfiles))
      .then(() => sandbox.assert.calledOnce(build))
      .then(() => api.done())
  })

  it('gets a push error', () => {
    let api = nock('https://api.heroku.com:443')
      .get('/apps/testapp')
      .reply(200, { name: 'testapp' })

    let dockerfiles = sandbox.stub(Sanbashi, 'getDockerfiles')
      .returns(['/path/to/Dockerfile'])
    let build = sandbox.stub(Sanbashi, 'buildImage')
    let push = sandbox.stub(Sanbashi, 'pushImage').throws()

    return cmd.run({ app: 'testapp', args: ['web'], flags: {} })
      .then(() => expect(cli.stderr, 'to contain', 'docker push exited with Error: Error'))
      .then(() => expect(cli.stdout, 'to contain', 'Building web (/path/to/Dockerfile)'))
      .then(() => sandbox.assert.calledOnce(dockerfiles))
      .then(() => sandbox.assert.calledOnce(build))
      .then(() => sandbox.assert.calledOnce(push))
      .then(() => api.done())
  })

  it('pushes to the docker registry', () => {
    let api = nock('https://api.heroku.com:443')
      .get('/apps/testapp')
      .reply(200, { name: 'testapp' })

    let dockerfiles = sandbox.stub(Sanbashi, 'getDockerfiles')
      .returns(['/path/to/Dockerfile'])
    let build = sandbox.stub(Sanbashi, 'buildImage')
      .withArgs('/path/to/Dockerfile', 'registry.heroku.com/testapp/web', [])
    let push = sandbox.stub(Sanbashi, 'pushImage')
      .withArgs('registry.heroku.com/testapp/web')

    return cmd.run({ app: 'testapp', args: ['web'], flags: {} })
      // .then(() => expect(cli.stderr, 'to be empty'))
      .then(() => expect(cli.stdout, 'to contain', 'Building web (/path/to/Dockerfile)'))
      .then(() => expect(cli.stdout, 'to contain', 'Pushing web (/path/to/Dockerfile)'))
      .then(() => sandbox.assert.calledOnce(dockerfiles))
      .then(() => sandbox.assert.calledOnce(build))
      .then(() => sandbox.assert.calledOnce(push))
      .then(() => api.done())
  })

  it('pushes the standard dockerfile to non-web', () => {
    let api = nock('https://api.heroku.com:443')
      .get('/apps/testapp')
      .reply(200, { name: 'testapp' })

    let dockerfiles = sandbox.stub(Sanbashi, 'getDockerfiles')
      .returns(['/path/to/Dockerfile'])
    let build = sandbox.stub(Sanbashi, 'buildImage')
      .withArgs('/path/to/Dockerfile', 'registry.heroku.com/testapp/worker', [])
    let push = sandbox.stub(Sanbashi, 'pushImage')
      .withArgs('registry.heroku.com/testapp/worker')

    return cmd.run({ app: 'testapp', args: ['worker'], flags: {} })
      // .then(() => expect(cli.stderr, 'to be empty'))
      .then(() => expect(cli.stdout, 'to contain', 'Building worker (/path/to/Dockerfile)'))
      .then(() => expect(cli.stdout, 'to contain', 'Pushing worker (/path/to/Dockerfile)'))
      .then(() => sandbox.assert.calledOnce(dockerfiles))
      .then(() => sandbox.assert.calledOnce(build))
      .then(() => sandbox.assert.calledOnce(push))
      .then(() => api.done())
  })

  it('pushes several dockerfiles recursively', () => {
    let api = nock('https://api.heroku.com:443')
      .get('/apps/testapp')
      .reply(200, { name: 'testapp' })

    let dockerfiles = sandbox.stub(Sanbashi, 'getDockerfiles')
      .returns(['/path/to/Dockerfile.web', '/path/to/Dockerfile.worker'])
    let build = sandbox.stub(Sanbashi, 'buildImage')
    build.withArgs('/path/to/Dockerfile.web', 'registry.heroku.com/testapp/web', [])
    build.withArgs('/path/to/Dockerfile.worker', 'registry.heroku.com/testapp/worker', [])
    let push = sandbox.stub(Sanbashi, 'pushImage')
    push.withArgs('registry.heroku.com/testapp/web')
    push.withArgs('registry.heroku.com/testapp/worker')

    return cmd.run({ app: 'testapp', args: ['web', 'worker'], flags: { recursive: true } })
      // .then(() => expect(cli.stderr, 'to be empty'))
      .then(() => expect(cli.stdout, 'to contain', 'Building web (/path/to/Dockerfile.web)'))
      .then(() => expect(cli.stdout, 'to contain', 'Building worker (/path/to/Dockerfile.worker)'))
      .then(() => expect(cli.stdout, 'to contain', 'Pushing web (/path/to/Dockerfile.web)'))
      .then(() => expect(cli.stdout, 'to contain', 'Pushing worker (/path/to/Dockerfile.worker)'))
      .then(() => sandbox.assert.calledOnce(dockerfiles))
      .then(() => sandbox.assert.calledTwice(build))
      .then(() => sandbox.assert.calledTwice(push))
      .then(() => api.done())
  })

  it('builds with custom context path and pushes to the docker registry', () => {
    let api = nock('https://api.heroku.com:443')
      .get('/apps/testapp')
      .reply(200, { name: 'testapp' })

    let dockerfiles = sandbox.stub(Sanbashi, 'getDockerfiles')
      .returns(['/path/to/Dockerfile'])
    let build = sandbox.stub(Sanbashi, 'buildImage')
      .withArgs('/path/to/Dockerfile', 'registry.heroku.com/testapp/web', [], '/custom/context/path')
    let push = sandbox.stub(Sanbashi, 'pushImage')
      .withArgs('registry.heroku.com/testapp/web')

    return cmd.run({ app: 'testapp', args: ['web'], flags: { 'context-path': '/custom/context/path' } })
    // .then(() => expect(cli.stderr, 'to be empty'))
      .then(() => expect(cli.stdout, 'to contain', 'Building web (/path/to/Dockerfile)'))
      .then(() => expect(cli.stdout, 'to contain', 'Pushing web (/path/to/Dockerfile)'))
      .then(() => sandbox.assert.calledOnce(dockerfiles))
      .then(() => sandbox.assert.calledOnce(build))
      .then(() => sandbox.assert.calledOnce(push))
      .then(() => api.done())
  })

  it('does not find an image to push', () => {
    let api = nock('https://api.heroku.com:443')
      .get('/apps/testapp')
      .reply(200, { name: 'testapp' })

    let dockerfiles = sandbox.stub(Sanbashi, 'getDockerfiles')
      .returns([])

    return cmd.run({ app: 'testapp', args: ['web'], flags: {} })
      .then(() => expect(cli.stderr, 'to contain', 'No images to push'))
      .then(() => expect(cli.stdout, 'to be empty'))
      .then(() => sandbox.assert.calledOnce(dockerfiles))
      .then(() => api.done())
  })

  it('requires a process type if we are not recursive', () => {
    return cmd.run({ app: 'testapp', args: [], flags: {} })
      .then(() => expect(cli.stderr, 'to contain', 'Requires either --recursive or one or more process types'))
      .then(() => expect(cli.stdout, 'to be empty'))
  })

  it('rejects multiple process types if we are not recursive', () => {
    return cmd.run({ app: 'testapp', args: ['web', 'worker'], flags: {} })
      .then(() => expect(cli.stderr, 'to contain', 'Requires exactly one target process type, or --recursive option'))
      .then(() => expect(cli.stdout, 'to be empty'))
  })
})
