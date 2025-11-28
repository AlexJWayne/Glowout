import { fillCenterRect, strokeCenterRect } from './lib'
import type { Entity, GameWorld, Queries } from './world'
import * as d from 'typegpu/data'
import * as std from 'typegpu/std'

export const COLS = 8
export const ROWS = 4
export const GRID_HEIGHT = 0.5
export const ALIVE_COUNT = 10

export const brickCount = COLS * ROWS

export function addBricks(world: GameWorld, count = ALIVE_COUNT) {
  const locations: d.v2u[] = []
  const used = new Set<string>()
  for (let i = 0; i < count; i++) {
    let location: d.v2u | null = null

    while (!location || used.has(location.toString())) {
      location = d.vec2u(
        Math.floor(Math.random() * COLS),
        Math.floor(Math.random() * ROWS),
      )
    }

    locations.push(location)
    used.add(location.toString())
  }

  for (const location of locations) {
    world.add(createBrick(location))
  }
}

export function addBrick(world: GameWorld, queries: Queries) {
  const used = new Set(
    queries.bricks.entities.map((brickEntity) => brickEntity.brick.toString()),
  )

  let location: d.v2u | null = null
  while (!location || used.has(location.toString())) {
    location = d.vec2u(
      Math.floor(Math.random() * COLS),
      Math.floor(Math.random() * ROWS),
    )
  }
  used.add(location.toString())
  world.add(createBrick(location))
}

function createBrick(gridPos: d.v2u): Entity {
  return {
    brick: {
      color: std.normalize(
        d.vec3f(Math.random(), Math.random(), Math.random()),
      ),
    },
    position: getBrickPosition(gridPos),
    size: d.vec2f(2 / COLS, (1 / ROWS) * GRID_HEIGHT),
  }
}

export function getBrickPosition(gridPos: d.v2u): d.v2f {
  'use gpu'
  return d.vec2f(
    (gridPos.x / COLS) * 2 - 1 + 1 / COLS,
    1 - (gridPos.y / ROWS + 1 / ROWS) * GRID_HEIGHT,
  )
}

export function renderBricks(ctx: CanvasRenderingContext2D, queries: Queries) {
  ctx.save()
  ctx.fillStyle = '#f0f'
  for (const brickEntity of queries.bricks.entities) {
    const { position, size } = brickEntity
    fillCenterRect(ctx, {
      x: position.x,
      y: position.y,
      width: size.x,
      height: size.y,
    })
  }

  ctx.strokeStyle = '#808'
  ctx.lineWidth = 0.005
  for (const brickEntity of queries.bricks.entities) {
    const { position, size } = brickEntity
    strokeCenterRect(ctx, {
      x: position.x,
      y: position.y,
      width: size.x,
      height: size.y,
    })
  }
  ctx.restore()
}
