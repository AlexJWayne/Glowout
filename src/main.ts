// import { renderGame2d } from './render-2d'
import { updateBricksState } from './bricks'
import { renderGameWgpu } from './render-wgpu'
import {
  bounceBallOnWalls,
  hitBallWithPaddle,
  hitBricksWithBall,
  moveBall,
  movePaddle,
} from './systems'
import { createWorld } from './world'

const { queries } = createWorld()

let lastTimestampMs = 0

async function tick(timestampMs: DOMHighResTimeStamp) {
  const elapsed = (timestampMs - lastTimestampMs) / 1000
  lastTimestampMs = timestampMs

  movePaddle(queries)
  moveBall(queries, elapsed)
  bounceBallOnWalls(queries)
  hitBallWithPaddle(queries)
  hitBricksWithBall(queries)
  updateBricksState(queries, elapsed)

  // renderGame2d(queries)
  renderGameWgpu(queries, timestampMs)

  requestAnimationFrame(tick)
}
requestAnimationFrame(tick)
