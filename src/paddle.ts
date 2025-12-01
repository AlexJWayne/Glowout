import { fillCenterRect } from './lib'
import type { Entity, GameWorld, Queries } from './world'
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

export function renderPaddle(ctx: CanvasRenderingContext2D, queries: Queries) {
  const { position, size } = queries.paddle.first!
  ctx.save()

  ctx.fillStyle = '#fff'
  fillCenterRect(ctx, {
    x: position.x,
    y: position.y,
    width: size.x,
    height: size.y,
  })
  ctx.fill()

  ctx.restore()
}
