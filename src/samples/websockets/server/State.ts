import { updateAll } from './ConnectedClients'

let state = {
  isDoorClosed: false
}

export function getState(): typeof state {
  return state
}

export function setState(deltaState: Partial<typeof state>) {
  state = { ...state, ...deltaState }
  console.log('new state:')
  console.dir(state)
  updateAll()
}
