import { WebSocketServer } from 'ws'
import { PreviewComponents } from '../Preview'
import { IBaseComponent } from '@well-known-components/interfaces'

export type WebSocketComponent = IBaseComponent & {
  ws: WebSocketServer
}

/**
 * Creates a http-server component
 * @public
 */
export async function createWsComponent(_: Pick<PreviewComponents, 'logs'>): Promise<WebSocketComponent> {
  const ws = new WebSocketServer({ noServer: true })

  async function stop() {
    ws.close()
  }

  return {
    stop,
    ws
  }
}
