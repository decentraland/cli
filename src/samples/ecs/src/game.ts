export class RotatorSystem extends ComponentSystem {
  constructor() {
    super(Rotation)
  }
  update(dt: number) {
    for (let i in this.entities) {
      const rotation = this.entities[i].get(Rotation)
      rotation.y += dt * 10
    }
  }
}

function spawn(x: number, y: number, z: number) {
  const cube = new Entity()

  cube.set(new Position(x, y, z))
  cube.set(new BoxShape())
  cube.set(new Rotation(0, 0, 0))

  engine.addEntity(cube)

  return cube
}

engine.addSystem(new RotatorSystem())
