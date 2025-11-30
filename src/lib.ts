import * as d from 'typegpu/data'
import * as std from 'typegpu/std'

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

export function easeOutBack(x: number): number {
  'use gpu'
  const c1 = 1.70158
  const c3 = c1 + 1

  return 1 + c3 * std.pow(x - 1, 3) + c1 * std.pow(x - 1, 2)
}

export function easeInBack(x: number): number {
  'use gpu'
  const c1 = 1.70158
  const c3 = c1 + 1

  return c3 * x * x * x - c1 * x * x
}

export function easeInQuart(x: number): number {
  'use gpu'
  return x * x * x * x
}

export function easeInExpo(x: number): number {
  'use gpu'
  if (x === 0) return 0
  return std.pow(2, 10 * x - 10)
}

export function easeInSine(x: number): number {
  'use gpu'
  return 1 - std.cos((x * Math.PI) / 2)
}

export function lighting(
  color: d.v3f,
  normal: d.v3f,
  lightDirection: d.v3f,
  ambient: number,
) {
  'use gpu'
  const light = std.max(std.dot(normal, lightDirection), 0)
  return std.mix(color.mul(ambient), color, light)
}

export function specular(
  normal: d.v3f,
  viewDirection: d.v3f,
  lightDirection: d.v3f,
  shininess: number,
) {
  'use gpu'
  const h = std.normalize(viewDirection.add(lightDirection))
  const v = std.max(std.dot(h, normal), 0.0)
  return std.pow(v, shininess)
}

export function raySphereIntersect(
  rayOrigin: d.v3f,
  rayDirection: d.v3f,
  center: d.v3f,
  radius: number,
): boolean {
  'use gpu'
  let oc = rayOrigin.sub(center)
  let b = std.dot(oc, rayDirection)
  let c = std.dot(oc, oc) - radius * radius
  let disc = b * b - c
  return disc >= 0.0
}

export function remap(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number,
): number {
  'use gpu'
  return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin
}
