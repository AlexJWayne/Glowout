import type { Entity, GameWorld } from './world'
import * as d from 'typegpu/data'
import * as std from 'typegpu/std'

export function addBall(world: GameWorld) {
  world.add(createBall())
}

function createBall(): Entity {
  return {
    ball: { radius: 0.06 },
    position: d.vec2f(0, 0),
    velocity: std
      .normalize(
        d.vec2f(
          Math.random() * 2 - 1, //
          Math.random() + 0.2,
        ),
      )
      .mul(0.4),
  }
}
