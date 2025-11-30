import { fillCircle } from './lib'
import type { Entity, GameWorld, Queries } from './world'
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
      .mul(1),
  }
}

export function renderBall(ctx: CanvasRenderingContext2D, queries: Queries) {
  const ballEntity = queries.ball.first
  if (!ballEntity) return

  const {
    position: { x, y },
    ball: { radius },
  } = ballEntity

  ctx.save()
  ctx.fillStyle = '#ff0'
  fillCircle(ctx, { x, y, radius })
  ctx.restore()
}
