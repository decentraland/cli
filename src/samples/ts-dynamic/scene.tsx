import * as DCL from 'decentraland-api'

// This is an interface, you can use it to enforce the types of your state
export interface IState {
  isDoorClosed: boolean
}

export default class HouseScene extends DCL.ScriptableScene<any, IState> {
  // This is your initial state and it respects the given IState interface
  state = {
    isDoorClosed: false
  }

  sceneDidMount() {
    this.eventSubscriber.on('door_click', () => {
      // setState() will update the state and trigger an update, causing the scene to rerender
      this.setState({ isDoorClosed: !this.state.isDoorClosed })
    })
  }

  async render() {
    const doorRotation = {
      x: 0,
      y: this.state.isDoorClosed ? 0 : 90,
      z: 0
    }

    return (
      <scene position={{ x: 5, y: 0, z: 5 }}>
        <entity rotation={doorRotation} transition={{ rotation: { duration: 1000, timing: 'ease-in' } }}>
          <box id="door" scale={{ x: 1, y: 2, z: 0.05 }} position={{ x: 0.5, y: 1, z: 0 }} color="#00FF00" />
        </entity>
        <box position={{ x: 2, y: 1, z: 0 }} scale={{ x: 2, y: 2, z: 0.05 }} color="#0000FF" />
        <box position={{ x: -1, y: 1, z: 0 }} scale={{ x: 2, y: 2, z: 0.05 }} color="#0000FF" />
      </scene>
    )
  }
}
