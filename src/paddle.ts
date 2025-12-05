import type { Entity, GameWorld } from './world'
import * as d from 'typegpu/data'

export function addPaddle(world: GameWorld) {
  world.add(createPaddle())
}

function createPaddle(): Entity {
  return {
    paddle: true,
    position: d.vec2f(0, -0.9),
    size: d.vec3f(0.5, 0.06, 0.2),
  }
}
