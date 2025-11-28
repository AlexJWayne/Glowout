import { addBrick } from './bricks'
import { mouse } from './input'
import type { GameWorld, Queries } from './world'

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
    position.x = 2 - radius - position.x
    velocity.x = -velocity.x
  }
  if (position.x - radius < -1 && velocity.x < 0) {
    position.x = -2 + radius - position.x
    velocity.x = -velocity.x
  }
  if (position.y + radius > 1 && velocity.y > 0) {
    position.y = 2 - radius - position.y
    velocity.y = -velocity.y
  }
  if (position.y - radius < -1 && velocity.y < 0) {
    position.y = -2 + radius - position.y
    velocity.y = -velocity.y
  }
}

export function hitBallWithPaddle(queries: Queries) {
  const ballEntity = queries.ball.first
  if (!ballEntity) return
  if (ballEntity.velocity.y > 0) return

  const paddle = queries.paddle.first!

  const ballBottom = ballEntity.position.y + ballEntity.ball.radius
  const paddleTop = paddle.position.y - paddle.size.y / 2

  if (ballBottom > paddleTop) return

  const left = paddle.position.x - paddle.size.x / 2
  const right = paddle.position.x + paddle.size.x / 2

  if (ballEntity.position.x > left && ballEntity.position.x < right) {
    ballEntity.velocity.y = -ballEntity.velocity.y
  }
}

export function hitBricksWithBall(world: GameWorld, queries: Queries) {
  const ballEntity = queries.ball.first
  if (!ballEntity) return

  const ballPosition = ballEntity.position
  const ballRadius = ballEntity.ball.radius

  for (const brickEntity of queries.bricks.entities) {
    const { position, size } = brickEntity
    if (ballPosition.y + ballRadius < position.y - size.y / 2) continue
    if (ballPosition.y - ballRadius > position.y + size.y / 2) continue
    if (ballPosition.x + ballRadius < position.x - size.x / 2) continue
    if (ballPosition.x - ballRadius > position.x + size.x / 2) continue

    ballEntity.velocity.y = -ballEntity.velocity.y
    world.remove(brickEntity)
    addBrick(world, queries)
  }
}
