import { Router } from '@well-known-components/http-server'
import { PreviewComponents } from '../Preview'
import * as path from 'path'
import * as fs from 'fs'
import { sync as globSync } from 'glob'
import { WearableJson } from '@dcl/schemas/dist/sdk'
import { ContentMapping, Entity, EntityType, sdk } from '@dcl/schemas'
import ignore from 'ignore'
import fetch, { Headers } from 'node-fetch'
import { fetchEntityByPointer } from '../../utils/catalystPointers'
import { smartWearableNameToId } from '../../project/projectInfo'
import { getConfig } from '../../config'

export function setupEcs6Endpoints(
  components: PreviewComponents,
  router: Router<PreviewComponents>
) {
  // handle old preview scene.json
  router.get('/scene.json', async () => {
    return {
      headers: { 'content-type': 'application/json' },
      body: fs.createReadStream(
        path.join(components.dcl.getWorkingDir(), 'scene.json')
      )
    }
  })

  router.get('/lambdas/explore/realms', async (ctx) => {
    return {
      body: [
        {
          serverName: 'localhost',
          url: `http://${ctx.url.host}`,
          layer: 'stub',
          usersCount: 0,
          maxUsers: 100,
          userParcels: []
        }
      ]
    }
  })

  router.get('/lambdas/contracts/servers', async (ctx) => {
    return {
      body: [
        {
          address: `http://${ctx.url.host}`,
          owner: '0x0000000000000000000000000000000000000000',
          id: '0x0000000000000000000000000000000000000000000000000000000000000000'
        }
      ]
    }
  })

  router.get('/lambdas/profiles', async (ctx, next) => {
    const baseUrl = `${ctx.url.protocol}//${ctx.url.host}/content/contents`

    try {
      const previewWearables = await getAllPreviewWearables({
        baseFolders,
        baseUrl
      }).map((wearable) => wearable.id)

      if (previewWearables.length === 1) {
        const catalystUrl = new URL(
          getConfig().catalystUrl ?? 'https://peer.decentraland.org'
        )

        const u = new URL(ctx.url.toString())
        u.host = catalystUrl.host
        u.protocol = catalystUrl.protocol
        u.port = ''
        const req = await fetch(u.toString(), {
          headers: {
            connection: 'close'
          },
          method: ctx.request.method,
          body: ctx.request.method === 'get' ? undefined : ctx.request.body
        })

        const deployedProfile = (await req.json()) as any[]

        if (deployedProfile?.length === 1) {
          deployedProfile[0].avatars[0].avatar.wearables.push(
            ...previewWearables
          )
          return {
            headers: {
              'content-type':
                req.headers.get('content-type') || 'application/binary'
            },
            body: deployedProfile
          }
        }
      }
    } catch (err) {
      console.warn(
        `Failed to catch profile and fill with preview wearables.`,
        err
      )
    }

    return next()
  })

  router.all('/lambdas/:path+', async (ctx) => {
    const catalystUrl = new URL(
      getConfig().catalystUrl ?? 'https://peer.decentraland.org'
    )
    const u = new URL(ctx.url.toString())
    u.host = catalystUrl.host
    u.protocol = catalystUrl.protocol
    u.port = ''
    const req = await fetch(u.toString(), {
      headers: {
        connection: 'close'
      },
      method: ctx.request.method,
      body: ctx.request.method === 'get' ? undefined : ctx.request.body
    })

    return {
      headers: {
        'content-type': req.headers.get('content-type') || 'application/binary'
      },
      body: req.body
    }
  })

  router.post('/content/entities', async (ctx) => {
    const catalystUrl =
      getConfig().catalystUrl ?? 'https://peer.decentraland.org'
    const headers = new Headers()
    console.log(ctx.request.headers)
    const res = await fetch(`${catalystUrl}/content/entities`, {
      method: 'post',
      headers,
      body: ctx.request.body
    })

    return res
  })

  serveStatic(components, router)

  let baseSceneFolders: string[] = [components.dcl.getWorkingDir()]
  let baseWearableFolders: string[] = [components.dcl.getWorkingDir()]

  // TODO: merge types from github.com/decentraland/cli
  if (components.dcl.workspace) {
    const projects = components.dcl.workspace.getAllProjects()
    if (!!projects?.length) {
      const { wearables, scenes } = projects.reduce(
        (acc: { wearables: string[]; scenes: string[] }, project) => {
          const projectType = project.getInfo().sceneType
          const projectDir = project.getProjectWorkingDir()
          if (projectType === sdk.ProjectType.SCENE) acc.scenes.push(projectDir)
          if (projectType === sdk.ProjectType.PORTABLE_EXPERIENCE)
            acc.wearables.push(projectDir)
          return acc
        },
        { wearables: [], scenes: [] }
      )

      baseSceneFolders = scenes
      baseWearableFolders = wearables
    }
  }

  const baseFolders = Array.from(
    new Set([...baseSceneFolders, ...baseWearableFolders])
  )

  serveFolders(components, router, baseFolders)
}

function serveFolders(
  components: PreviewComponents,
  router: Router<PreviewComponents>,
  baseFolders: string[]
) {
  router.get('/content/contents/:hash', async (ctx, next) => {
    if (ctx.params.hash && ctx.params.hash.startsWith('b64-')) {
      const fullPath = path.resolve(
        Buffer.from(ctx.params.hash.replace(/^b64-/, ''), 'base64').toString(
          'utf8'
        )
      )

      // only return files IF the file is within a baseFolder
      if (!baseFolders.find((folder: string) => fullPath.startsWith(folder))) {
        return next()
      }

      return {
        headers: {
          'x-timestamp': Date.now(),
          'x-sent': true,
          'cache-control': 'no-cache,private,max-age=1'
        },
        body: fs.createReadStream(fullPath)
      }
    }

    return next()
  })

  async function pointerRequestHandler(pointers: string[]) {
    if (!pointers || pointers.length === 0) {
      return []
    }

    const requestedPointers = new Set<string>(
      pointers && typeof pointers === 'string'
        ? [pointers as string]
        : (pointers as string[])
    )

    const resultEntities = getSceneJson({
      baseFolders,
      pointers: Array.from(requestedPointers)
    })
    const catalystUrl =
      getConfig().catalystUrl ?? 'https://peer.decentraland.org'
    const remote = fetchEntityByPointer(
      catalystUrl,
      pointers.filter(($: string) => !$.match(/-?\d+,-?\d+/))
    )

    const serverEntities = Array.isArray(remote) ? remote : []

    return [...resultEntities, ...serverEntities]
  }

  // REVIEW RESPONSE FORMAT
  router.get('/content/entities/scene', async (ctx) => {
    return {
      body: await pointerRequestHandler(ctx.url.searchParams.getAll('pointer'))
    }
  })

  // REVIEW RESPONSE FORMAT
  router.post('/content/entities/active', async (ctx) => {
    const body = await ctx.request.json()
    return {
      body: await pointerRequestHandler(body.pointers)
    }
  })

  router.get('/preview-wearables/:id', async (ctx) => {
    const baseUrl = `${ctx.url.protocol}//${ctx.url.host}/content/contents`
    const wearables = getAllPreviewWearables({
      baseUrl,
      baseFolders
    })
    const wearableId = ctx.params.id
    return {
      body: {
        ok: true,
        data: wearables.filter(
          (wearable) => smartWearableNameToId(wearable?.name) === wearableId
        )
      }
    }
  })

  router.get('/preview-wearables', async (ctx) => {
    const baseUrl = `${ctx.url.protocol}//${ctx.url.host}/content/contents`
    return {
      body: {
        ok: true,
        data: getAllPreviewWearables({ baseUrl, baseFolders })
      }
    }
  })
}

const defaultHashMaker = (str: string) =>
  'b64-' + Buffer.from(str).toString('base64')

function getAllPreviewWearables({
  baseFolders,
  baseUrl
}: {
  baseFolders: string[]
  baseUrl: string
}) {
  const wearablePathArray: string[] = []
  for (const wearableDir of baseFolders) {
    const wearableJsonPath = path.resolve(wearableDir, 'wearable.json')
    if (fs.existsSync(wearableJsonPath)) {
      wearablePathArray.push(wearableJsonPath)
    }
  }

  const ret = []
  for (const wearableJsonPath of wearablePathArray) {
    try {
      ret.push(serveWearable({ wearableJsonPath, baseUrl }))
    } catch (err) {
      console.error(
        `Couldn't mock the wearable ${wearableJsonPath}. Please verify the correct format and scheme.`,
        err
      )
    }
  }
  return ret
}

function serveWearable({
  wearableJsonPath,
  baseUrl
}: {
  wearableJsonPath: string
  baseUrl: string
}) {
  const wearableDir = path.dirname(wearableJsonPath)
  const wearableJson = JSON.parse(fs.readFileSync(wearableJsonPath).toString())

  if (!WearableJson.validate(wearableJson)) {
    const errors = (WearableJson.validate.errors || [])
      .map((a) => `${a.data} ${a.message}`)
      .join('')

    console.error(
      `Unable to validate wearable.json properly, please check it.`,
      errors
    )
    throw new Error(`Invalid wearable.json (${wearableJsonPath})`)
  }

  const dclIgnorePath = path.resolve(wearableDir, '.dclignore')
  let ignoreFileContent = ''
  if (fs.existsSync(dclIgnorePath)) {
    ignoreFileContent = fs.readFileSync(
      path.resolve(wearableDir, '.dclignore'),
      'utf-8'
    )
  }

  const hashedFiles = getFilesFromFolder({
    folder: wearableDir,
    addOriginalPath: false,
    ignorePattern: ignoreFileContent
  })

  const thumbnailFiltered = hashedFiles.filter(
    ($) => $?.file === 'thumbnail.png'
  )
  const thumbnail =
    thumbnailFiltered.length > 0 &&
    thumbnailFiltered[0]?.hash &&
    `${baseUrl}/${thumbnailFiltered[0].hash}`

  const wearableId = '8dc2d7ad-97e3-44d0-ba89-e8305d795a6a'

  const representations = wearableJson.data.representations.map(
    (representation) => ({
      ...representation,
      mainFile: `male/${representation.mainFile}`,
      contents: hashedFiles.map(($) => ({
        key: `male/${$?.file}`,
        url: `${baseUrl}/${$?.hash}`,
        hash: $?.hash
      }))
    })
  )

  return {
    id: wearableId,
    rarity: wearableJson.rarity,
    i18n: [{ code: 'en', text: wearableJson.name }],
    description: wearableJson.description,
    thumbnail: thumbnail || '',
    baseUrl: `${baseUrl}/`,
    name: wearableJson.name || '',
    data: {
      category: wearableJson.data.category,
      replaces: [],
      hides: [],
      tags: [],
      scene: hashedFiles,
      representations: representations as any
    }
  }
}

function getSceneJson({
  baseFolders,
  pointers,
  customHashMaker
}: {
  baseFolders: string[]
  pointers: string[]
  customHashMaker?: (str: string) => string
}): Entity[] {
  const requestedPointers = new Set<string>(pointers)
  const resultEntities: Entity[] = []

  const allDeployments = baseFolders.map((folder) => {
    const dclIgnorePath = path.resolve(folder, '.dclignore')
    let ignoreFileContent = ''
    if (fs.existsSync(dclIgnorePath)) {
      ignoreFileContent = fs.readFileSync(
        path.resolve(folder, '.dclignore'),
        'utf-8'
      )
    }

    return entityV3FromFolder({
      folder,
      addOriginalPath: false,
      ignorePattern: ignoreFileContent,
      customHashMaker
    })
  })

  for (const pointer of Array.from(requestedPointers)) {
    // get deployment by pointer
    const theDeployment = allDeployments.find(
      ($) => $ && $.pointers.includes(pointer)
    )
    if (theDeployment) {
      // remove all the required pointers from the requestedPointers set
      // to prevent sending duplicated entities
      theDeployment.pointers.forEach(($) => requestedPointers.delete($))

      // add the deployment to the results
      resultEntities.push(theDeployment)
    }
  }

  return resultEntities
}

function getEcsPath(workingDir: string) {
  try {
    return require.resolve('decentraland-ecs/package.json', {
      paths: [workingDir]
    })
  } catch (e) {
    return require.resolve('@dcl/sdk/package.json', {
      paths: [workingDir]
    })
  }
}

function serveStatic(
  components: PreviewComponents,
  router: Router<PreviewComponents>
) {
  const ecsPath = path.dirname(getEcsPath(components.dcl.getWorkingDir()))
  const dclKernelPath = path.dirname(
    require.resolve('@dcl/kernel/package.json', {
      paths: [components.dcl.getWorkingDir(), ecsPath]
    })
  )
  const dclKernelDefaultProfilePath = path.resolve(
    dclKernelPath,
    'default-profile'
  )
  const dclKernelImagesDecentralandConnect = path.resolve(
    dclKernelPath,
    'images',
    'decentraland-connect'
  )
  const dclKernelLoaderPath = path.resolve(dclKernelPath, 'loader')
  const dclUnityRenderer = path.dirname(
    require.resolve('@dcl/unity-renderer/package.json', {
      paths: [components.dcl.getWorkingDir(), ecsPath]
    })
  )

  const routes = [
    {
      route: '/',
      path: path.resolve(dclKernelPath, 'preview.html'),
      type: 'text/html'
    },
    {
      route: '/favicon.ico',
      path: path.resolve(dclKernelPath, 'favicon.ico'),
      type: 'text/html'
    },
    {
      route: '/@/artifacts/index.js',
      path: path.resolve(dclKernelPath, 'index.js'),
      type: 'text/javascript'
    }
  ]

  for (const route of routes) {
    router.get(route.route, async (_ctx) => {
      return {
        headers: { 'Content-Type': route.type },
        body: fs.createReadStream(route.path)
      }
    })
  }

  function createStaticRoutes(
    route: string,
    folder: string,
    transform = (str: string) => str
  ) {
    router.get(route, async (ctx, next) => {
      const file = ctx.params.path
      const fullPath = path.resolve(folder, transform(file))

      // only return files IF the file is within a baseFolder
      if (!fs.existsSync(fullPath)) {
        return next()
      }

      const headers: Record<string, any> = {
        'x-timestamp': Date.now(),
        'x-sent': true,
        'cache-control': 'no-cache,private,max-age=1'
      }

      if (fullPath.endsWith('.wasm')) {
        headers['content-type'] = 'application/wasm'
      }

      return {
        headers,
        body: fs.createReadStream(fullPath)
      }
    })
  }

  createStaticRoutes(
    '/images/decentraland-connect/:path+',
    dclKernelImagesDecentralandConnect
  )
  createStaticRoutes(
    '/@/artifacts/unity-renderer/:path+',
    dclUnityRenderer,
    (filePath) => filePath.replace(/.br+$/, '')
  )
  createStaticRoutes('/@/artifacts/loader/:path+', dclKernelLoaderPath)
  createStaticRoutes('/default-profile/:path+', dclKernelDefaultProfilePath)

  router.get('/feature-flags/:file', async (ctx) => {
    const res = await fetch(
      `https://feature-flags.decentraland.zone/${ctx.params.file}`,
      {
        headers: {
          connection: 'close'
        }
      }
    )
    return {
      body: await res.arrayBuffer()
    }
  })
}

function entityV3FromFolder({
  folder,
  addOriginalPath,
  ignorePattern,
  customHashMaker
}: {
  folder: string
  addOriginalPath?: boolean
  ignorePattern?: string
  customHashMaker?: (str: string) => string
}): Entity | null {
  const sceneJsonPath = path.resolve(folder, './scene.json')
  let isParcelScene = true

  const wearableJsonPath = path.resolve(folder, './wearable.json')
  if (fs.existsSync(wearableJsonPath)) {
    try {
      const wearableJson = JSON.parse(
        fs.readFileSync(wearableJsonPath).toString()
      )
      if (!WearableJson.validate(wearableJson)) {
        const errors = (WearableJson.validate.errors || [])
          .map((a) => `${a.data} ${a.message}`)
          .join('')

        console.error(
          `Unable to validate wearable.json properly, please check it.`,
          errors
        )
        console.error(`Invalid wearable.json (${wearableJsonPath})`)
      } else {
        isParcelScene = false
      }
    } catch (err) {
      console.error(`Unable to load wearable.json properly`, err)
    }
  }

  const hashMaker = customHashMaker ? customHashMaker : defaultHashMaker

  if (fs.existsSync(sceneJsonPath) && isParcelScene) {
    const sceneJson = JSON.parse(fs.readFileSync(sceneJsonPath).toString())
    const { base, parcels }: { base: string; parcels: string[] } =
      sceneJson.scene
    const pointers = new Set<string>()
    pointers.add(base)
    parcels.forEach(($) => pointers.add($))

    const mappedFiles = getFilesFromFolder({
      folder,
      addOriginalPath,
      ignorePattern,
      customHashMaker
    })

    return {
      version: 'v3',
      type: EntityType.SCENE,
      id: hashMaker(folder),
      pointers: Array.from(pointers),
      timestamp: Date.now(),
      metadata: sceneJson,
      content: mappedFiles
    }
  }

  return null
}

const defaultDclIgnore = () =>
  [
    '.*',
    'package.json',
    'package-lock.json',
    'yarn-lock.json',
    'build.json',
    'export',
    'tsconfig.json',
    'tslint.json',
    'node_modules',
    '*.ts',
    '*.tsx',
    'Dockerfile',
    'dist',
    'README.md',
    '*.blend',
    '*.fbx',
    '*.zip',
    '*.rar'
  ].join('\n')

export function getFilesFromFolder({
  folder,
  addOriginalPath,
  ignorePattern,
  customHashMaker
}: {
  folder: string
  addOriginalPath?: boolean
  ignorePattern?: string
  customHashMaker?: (str: string) => string
}): ContentMapping[] {
  const hashMaker = customHashMaker ? customHashMaker : defaultHashMaker

  const allFiles = globSync('**/*', {
    cwd: folder,
    dot: false,
    absolute: true
  })
    .map((file) => {
      try {
        if (!fs.statSync(file).isFile()) return
      } catch (err) {
        return
      }
      const _folder = folder.replace(/\\/gi, '/')
      const key = file.replace(_folder, '').replace(/^\/+/, '')
      return key
    })
    .filter(($) => !!$) as string[]

  const ensureIgnorePattern =
    ignorePattern && ignorePattern !== '' ? ignorePattern : defaultDclIgnore()
  const ig = ignore().add(ensureIgnorePattern)
  const filteredFiles = ig.filter(allFiles)

  const ret: (ContentMapping & { original_path: string | undefined })[] = []

  for (const file of filteredFiles) {
    const absolutePath = path.resolve(folder, file)
    try {
      if (!fs.statSync(absolutePath).isFile()) continue
    } catch (err) {
      console.log(err)
      continue
    }

    const absoluteFolder = folder.replace(/\\/gi, '/')

    const relativeFilePathToFolder = file
      .replace(absoluteFolder, '')
      .replace(/^\/+/, '')

    ret.push({
      file: relativeFilePathToFolder.toLowerCase(),
      original_path: addOriginalPath ? absolutePath : undefined,
      hash: hashMaker(absolutePath)
    })
  }

  return ret
}
