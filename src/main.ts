// import { renderGame2d } from './render-2d'
import { renderGameWgpu } from './render-wgpu'
import {
  bounceBallOnWalls,
  hitBallWithPaddle,
  hitBricksWithBall,
  moveBall,
  movePaddle,
} from './systems'
import { createWorld } from './world'

const { world, queries } = createWorld()

let lastTimestampMs = 0

async function tick(timestampMs: DOMHighResTimeStamp) {
  const elapsed = (timestampMs - lastTimestampMs) / 1000
  lastTimestampMs = timestampMs

  movePaddle(queries)
  moveBall(queries, elapsed)
  bounceBallOnWalls(queries)
  hitBallWithPaddle(queries)
  hitBricksWithBall(world, queries)

  // renderGame2d(queries)
  renderGameWgpu(queries, timestampMs)

  requestAnimationFrame(tick)
}
requestAnimationFrame(tick)
