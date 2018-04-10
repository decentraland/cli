import { createElement } from 'dcl-sdk/JSX'
import { EventSubscriber, Script, inject, EntityController, SoundController } from 'dcl-sdk'
import { updateAll } from './ConnectedClients'

const winingCombinations = [
  [0, 1, 2], // 1 row
  [3, 4, 5], // 2 row
  [6, 7, 8], // 3 row

  [0, 3, 6], // 1 col
  [1, 4, 7], // 2 col
  [2, 5, 8], // 3 col

  [0, 4, 8], // nw - se
  [6, 4, 2] // sw - ne
]

type GameSymbol = 'x' | 'o' | null

let board: GameSymbol[] = [null, null, null, null, null, null, null, null, null]

let currentSymbol: GameSymbol = null

export default class RemoteScene extends Script {
  @inject('experimentalSoundController') audio: SoundController | null = null
  @inject('EntityController') entityController: EntityController | null = null

  eventSubscriber: EventSubscriber | null = null

  getWinner() {
    return ['x', 'o'].find($ => winingCombinations.some(combination => combination.every(position => board[position] === $)))
  }

  selectMySymbol(symbol: GameSymbol) {
    currentSymbol = symbol
  }

  setAt(position: number, symbol: GameSymbol) {
    board[position] = symbol
  }

  async systemDidEnable() {
    this.eventSubscriber = new EventSubscriber(this.entityController!)

    this.eventSubscriber.on(`reset_click`, async (evt: any) => {
      board = board.map(() => null)
      updateAll()
      await this.audio!.playSound('sounds/sound.ogg')
    })

    this.selectMySymbol('x')

    board.map(($, $$) =>
      this.eventSubscriber!.on(`position-${$$}_click`, async (evt: any) => {
        this.setAt($$, currentSymbol)

        updateAll()

        this.selectMySymbol(currentSymbol === 'x' ? 'o' : 'x')

        if (this.getWinner()) {
          await this.audio!.playSound('sounds/Nyan_cat.ogg')
        }

        await this.audio!.playSound('sounds/sound.ogg')
      })
    )

    await this.render()
  }

  async render() {
    const game = (
      <a-scene>
        <a-cube position="5 5 5" color="red" id="reset" />
        {board.map(($, ix) => (
          <a-cube
            id={`position-${ix}`}
            color={$ === null ? 'black' : $ === 'x' ? 'red' : 'green'}
            position={`${ix % 3} 0.2 ${Math.floor(ix / 3)}`}
            scale="0.8 0.1 0.8"
          />
        ))}
      </a-scene>
    )
    await this.entityController!.render(game)
  }

  /** this method is called when we want to globally update the parcels */
  update() {
    this.render()
  }
}
