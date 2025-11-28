import { renderBall } from './ball'
import { renderBricks } from './bricks'
import { renderPaddle } from './paddle'
import type { Queries } from './world'

const canvas = document.getElementById('2d') as HTMLCanvasElement
canvas.width = 500
canvas.height = 500

const ctx = canvas.getContext('2d') as CanvasRenderingContext2D
// listenForInput(canvas)

export function renderGame2d(queries: Queries) {
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.save()
  {
    ctx.scale(canvas.width / 2, canvas.height / 2)
    ctx.translate(1, 1)
    ctx.scale(1, -1)

    renderPaddle(ctx, queries)
    renderBricks(ctx, queries)
    renderBall(ctx, queries)
  }
  ctx.restore()
}
