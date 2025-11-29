import { addBall } from './ball'
import { BrickState, addBricks } from './bricks'
import { addPaddle } from './paddle'
import { World } from 'miniplex'
import * as d from 'typegpu/data'

export type Queries = ReturnType<typeof createQueries>

export type Entity = {
  position?: d.v2f
  size?: d.v3f
  velocity?: d.v2f

  paddle?: true
  ball?: { radius: number }
  brick?: {
    color: d.v3f
    state: BrickState
    stateProgress: number
  }
}

export type GameWorld = World<Entity>

export function createWorld(): { world: GameWorld; queries: Queries } {
  const world = new World<Entity>()

  addPaddle(world)
  addBall(world)
  addBricks(world)

  return { world, queries: createQueries(world) }
}

function createQueries(world: GameWorld) {
  return {
    paddle: world.with('paddle', 'position', 'size'),
    ball: world.with('ball', 'position', 'velocity'),
    bricks: world.with('brick', 'position', 'size'),
  }
}
