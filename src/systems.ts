import { resetBall } from './ball'
import { BrickState, resetBricks } from './bricks'
import { mouse } from './input'
import { remap } from './lib'
import type { Queries } from './world'
import * as d from 'typegpu/data'
import * as std from 'typegpu/std'

export function movePaddle(queries: Queries) {
  const { size, position } = queries.paddle.first!
  position.x = mouse.x
  if (position.x + size.x / 2 > 1) position.x = 1 - size.x / 2
  if (position.x - size.x / 2 < -1) position.x = -1 + size.x / 2
}

export function moveBall(queries: Queries, elapsed: number) {
  const ball = queries.ball.first!
  if (!ball) return

  const { position, velocity } = ball
  position.x += velocity.x * elapsed
  position.y += velocity.y * elapsed
}

export function bounceBallOnWalls(queries: Queries) {
  const ballEntity = queries.ball.first
  if (!ballEntity) return

  const {
    position,
    velocity,
    ball: { radius },
  } = ballEntity

  if (position.x + radius > 1 && velocity.x > 0) {
    velocity.x = -velocity.x
  }
  if (position.x - radius < -1 && velocity.x < 0) {
    velocity.x = -velocity.x
  }
  if (position.y + radius > 1 && velocity.y > 0) {
    velocity.y = -velocity.y
  }
  if (position.y - radius < -1.5 && velocity.y < 0) {
    resetBall(ballEntity)
    resetBricks(queries)
  }
}

export function hitBallWithPaddle(queries: Queries) {
  const ballEntity = queries.ball.first
  if (!ballEntity) return
  if (ballEntity.velocity.y > 0) return

  const paddle = queries.paddle.first!

  const ballBottom = ballEntity.position.y - ballEntity.ball.radius
  const ballTop = ballEntity.position.y + ballEntity.ball.radius

  const paddleTop = paddle.position.y + paddle.size.y / 2
  const paddleBottom = paddle.position.y - paddle.size.y / 2

  if (ballBottom > paddleTop) return
  if (ballTop < paddleBottom) return

  const left = paddle.position.x - paddle.size.x / 2
  const right = paddle.position.x + paddle.size.x / 2

  if (ballEntity.position.x > left && ballEntity.position.x < right) {
    const speed = std.length(ballEntity.velocity) + 0.2
    const angle = remap(ballEntity.position.x, left, right, d.f32(-1), d.f32(1))

    ballEntity.velocity.y = -ballEntity.velocity.y
    ballEntity.velocity.x += angle * 1.5
    ballEntity.velocity = std.normalize(ballEntity.velocity).mul(speed)
  }
}

export function hitBricksWithBall(queries: Queries) {
  const ballEntity = queries.ball.first
  if (!ballEntity) return

  const ballPosition = ballEntity.position
  const ballRadius = ballEntity.ball.radius

  for (const brickEntity of queries.bricks.entities) {
    if (brickEntity.brick.state !== BrickState.ALIVE) continue

    const { position, size } = brickEntity
    if (ballPosition.y + ballRadius < position.y - size.y / 2) continue
    if (ballPosition.y - ballRadius > position.y + size.y / 2) continue
    if (ballPosition.x + ballRadius < position.x - size.x / 2) continue
    if (ballPosition.x - ballRadius > position.x + size.x / 2) continue

    ballEntity.velocity.y = -ballEntity.velocity.y
    brickEntity.brick.state = BrickState.DYING
    brickEntity.brick.stateProgress = 0
  }
}
