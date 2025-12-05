import { hsl2rgb } from './hsl'
import type { Entity, GameWorld, Queries } from './world'
import type { With } from 'miniplex'
import * as d from 'typegpu/data'

export const COLS = 6
export const ROWS = 4
export const GRID_HEIGHT = 0.8
export const ALIVE_COUNT = 8

export const brickCount = COLS * ROWS

export const enum BrickState {
  BIRTH,
  ALIVE,
  DYING,
}

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

function createBrick(
  gridPos: d.v2u,
  existing?: With<Entity, 'brick' | 'position' | 'size'>,
): Entity {
  const entity = existing ?? ({} as With<Entity, 'brick' | 'position' | 'size'>)

  entity.brick = {
    color: hsl2rgb(d.vec3f(Math.random(), 1, 0.7)),
    state: BrickState.BIRTH,
    stateProgress: 0,
    location: gridPos,
  }
  entity.position = getBrickPosition(gridPos)
  entity.size = d.vec3f(
    2 / COLS,
    (1 / ROWS) * GRID_HEIGHT,
    Math.random() * 0.4 + 0.1,
  )

  return entity
}

export function getBrickPosition(gridPos: d.v2u): d.v2f {
  'use gpu'
  return d.vec2f(
    (gridPos.x / COLS) * 2 - 1 + 1 / COLS,
    1 - (gridPos.y / ROWS + 1 / ROWS) * GRID_HEIGHT + 0.1,
  )
}

function getRandomBrickLocation(entities: With<Entity, 'brick'>[]): d.v2u {
  const used = new Set<string>()
  for (const { brick } of entities) {
    used.add(brick.location.toString())
  }

  let location: d.v2u | null = null
  while (!location || used.has(location.toString())) {
    location = d.vec2u(
      Math.floor(Math.random() * COLS),
      Math.floor(Math.random() * ROWS),
    )
  }
  return location
}

export function updateBricksState(queries: Queries, elapsed: number) {
  for (const brickEntity of queries.bricks.entities) {
    const { brick } = brickEntity
    switch (brick.state) {
      case BrickState.BIRTH:
        brick.stateProgress += elapsed * 2
        if (brick.stateProgress > 1) brick.state = BrickState.ALIVE
        break

      case BrickState.ALIVE:
        break

      case BrickState.DYING:
        brick.stateProgress += elapsed * 2

        if (brick.stateProgress > 1) {
          createBrick(
            getRandomBrickLocation(queries.bricks.entities),
            brickEntity,
          )
        }
        break
    }
  }
}
