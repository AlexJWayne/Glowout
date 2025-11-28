export function fillCenterRect(
  ctx: CanvasRenderingContext2D,
  rect: { x: number; y: number; width: number; height: number },
) {
  ctx.fillRect(
    rect.x - rect.width / 2,
    rect.y - rect.height / 2,
    rect.width,
    rect.height,
  )
}

export function strokeCenterRect(
  ctx: CanvasRenderingContext2D,
  rect: { x: number; y: number; width: number; height: number },
) {
  ctx.strokeRect(
    rect.x - rect.width / 2,
    rect.y - rect.height / 2,
    rect.width,
    rect.height,
  )
}

export function fillCircle(
  ctx: CanvasRenderingContext2D,
  circle: { x: number; y: number; radius: number },
) {
  ctx.beginPath()
  ctx.arc(circle.x, circle.y, circle.radius, 0, Math.PI * 2)
  ctx.fill()
}
