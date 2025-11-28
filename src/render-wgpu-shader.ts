import type { UniformsStruct } from './render-wgpu'
import * as sdf from '@typegpu/sdf'
import tgpu, { type TgpuBufferReadonly } from 'typegpu'
import * as d from 'typegpu/data'
import * as std from 'typegpu/std'

const MAX_STEPS = d.i32(64)
const MAX_DISTANCE = d.f32(6)
const EPSILON = d.f32(0.001)
const CAMERA_POSTITION = d.vec3f(0, 0, 3.2)
const LIGHT_DIRECTION = d.vec3f(0.6, 0.6, 1)

/** Large distance used for empty space. */
const EMPTY = d.f32(1e20)

const enum Obj {
  NONE,
  PADDLE,
  BALL,
  BRICK,
}

const MarchResult = d.struct({
  id: d.i32,
  distance: d.f32,
  color: d.vec3f,
})

export function createFragmentShader(
  uniforms: TgpuBufferReadonly<UniformsStruct>,
) {
  return tgpu['~unstable'].fragmentFn({
    in: { uv: d.vec2f },
    out: d.vec4f,
  })(({ uv }) => {
    let v = raymarch(uniforms.$, uv)
    return d.vec4f(v, 1)
    // return d.vec4f(
    //   std.fract(
    //     d
    //       .vec3f(
    //         sdBricks(uniforms.$, d.vec3f(uv, 0)),
    //         sdPaddle(uniforms.$, d.vec3f(uv, 0)),
    //         sdBall(uniforms.$, d.vec3f(uv, 0)),
    //       )
    //       .mul(10),
    //   ),
    //   1,
    // )
  })
}

function scene(
  uniforms: d.Infer<UniformsStruct>,
  p: d.v3f,
): d.Infer<typeof MarchResult> {
  'use gpu'
  let paddle = sdPaddle(uniforms, p)
  let ball = sdBall(uniforms, p)
  let bricks = sdBricks(uniforms, p)

  if (paddle < ball && paddle < bricks.distance) {
    return MarchResult({
      id: Obj.PADDLE,
      distance: paddle,
      color: d.vec3f(1),
    })
  }

  if (ball < paddle && ball < bricks.distance)
    return MarchResult({
      id: Obj.BALL,
      distance: ball,
      color: d.vec3f(0, 1, 0),
    })

  return MarchResult({
    id: Obj.BRICK,
    distance: bricks.distance,
    color: bricks.color,
  })
}

function getNormal(
  uniforms: d.Infer<UniformsStruct>,
  p: d.v3f,
  id: number,
): d.v3f {
  'use gpu'

  const k1 = d.vec3f(1.0, -1.0, -1.0)
  const k2 = d.vec3f(-1.0, -1.0, 1.0)
  const k3 = d.vec3f(-1.0, 1.0, -1.0)
  const k4 = d.vec3f(1.0, 1.0, 1.0)

  if (id === Obj.PADDLE) {
    const n1 = k1.mul(sdPaddle(uniforms, p.add(k1.mul(EPSILON))))
    const n2 = k2.mul(sdPaddle(uniforms, p.add(k2.mul(EPSILON))))
    const n3 = k3.mul(sdPaddle(uniforms, p.add(k3.mul(EPSILON))))
    const n4 = k4.mul(sdPaddle(uniforms, p.add(k4.mul(EPSILON))))
    return std.normalize(n1.add(n2).add(n3).add(n4))
  }

  if (id === Obj.BALL) {
    const n1 = k1.mul(sdBall(uniforms, p.add(k1.mul(EPSILON))))
    const n2 = k2.mul(sdBall(uniforms, p.add(k2.mul(EPSILON))))
    const n3 = k3.mul(sdBall(uniforms, p.add(k3.mul(EPSILON))))
    const n4 = k4.mul(sdBall(uniforms, p.add(k4.mul(EPSILON))))
    return std.normalize(n1.add(n2).add(n3).add(n4))
  }

  if (id === Obj.BRICK) {
    const n1 = k1.mul(sdBricks(uniforms, p.add(k1.mul(EPSILON))).distance)
    const n2 = k2.mul(sdBricks(uniforms, p.add(k2.mul(EPSILON))).distance)
    const n3 = k3.mul(sdBricks(uniforms, p.add(k3.mul(EPSILON))).distance)
    const n4 = k4.mul(sdBricks(uniforms, p.add(k4.mul(EPSILON))).distance)
    return std.normalize(n1.add(n2).add(n3).add(n4))
  }

  return d.vec3f(1, 0, 0)
}
function raymarch(uniforms: d.Infer<UniformsStruct>, uv: d.v2f): d.v3f {
  'use gpu'

  const rayDirection = std.normalize(d.vec3f(uv, -3))

  let totalDist = d.f32()
  let result = MarchResult()
  let normal = d.vec3f(0)
  let hit = false

  for (let i = 0; i < MAX_STEPS; i++) {
    const p = CAMERA_POSTITION.add(rayDirection.mul(totalDist))
    result = scene(uniforms, p)

    if (result.distance < EPSILON) {
      hit = true
      normal = getNormal(uniforms, p, result.id)
      break
    }
    totalDist += result.distance

    if (totalDist > MAX_DISTANCE) break
  }

  if (!hit) return d.vec3f(0)

  const lightDirection = std.normalize(
    d.vec3f(std.sin(uniforms.time), std.cos(uniforms.time), 1),
  )
  const lightIntensity = std.max(std.dot(normal, lightDirection), 0)

  if (result.id === Obj.PADDLE) return d.vec3f(1, 1, 1).mul(lightIntensity)
  if (result.id === Obj.BALL) {
    const base = lighting(result.color, normal, 0.1)
    const spec = specular(normal, rayDirection, lightDirection, 0.95)
    return base.add(spec)
  }
  if (result.id === Obj.BRICK) {
    const base = lighting(result.color, normal, 0.2)
    const spec = specular(normal, rayDirection, lightDirection, 0.99)
    return base.add(spec)
  }

  return d.vec3f(0.5)
}

function sdPaddle(uniforms: d.Infer<UniformsStruct>, p: d.v3f) {
  'use gpu'
  const position3 = d.vec3f(uniforms.paddle.position, 0)
  const size = uniforms.paddle.size

  const offset = d.vec3f(size.x / 2, 0, 0)
  const left = position3.sub(offset)
  const right = position3.add(offset)
  return sdf.sdCapsule(p, left, right, size.y / 2)
}

function sdBall(uniforms: d.Infer<UniformsStruct>, p: d.v3f) {
  'use gpu'
  const position3 = d.vec3f(uniforms.ball.position, 0)
  return sdf.sdSphere(p.sub(position3), uniforms.ball.radius)
}

function sdBricks(uniforms: d.Infer<UniformsStruct>, p: d.v3f) {
  'use gpu'

  let dist = EMPTY
  let color = d.vec3f(1)
  for (let i = 0; i < uniforms.bricks.length; i++) {
    const brick = uniforms.bricks[i]
    const newDist = sdBrick(p, brick.position, brick.size)
    if (newDist < dist) color = brick.color
    dist = sdf.opSmoothUnion(dist, newDist, 0.04)
  }

  return MarchResult({ id: Obj.BRICK, distance: dist, color })
}

function sdBrick(p: d.v3f, position: d.v2f, size: d.v2f) {
  'use gpu'
  const position3 = d.vec3f(position, 0)
  return (
    sdf.sdBox3d(p.sub(position3), d.vec3f(size.div(2).sub(0.04), 0.1)) - 0.05
  )
}

function lighting(color: d.v3f, normal: d.v3f, ambient: number) {
  'use gpu'
  const light = std.max(std.dot(normal, LIGHT_DIRECTION), 0)
  return std.mix(color.mul(ambient), color, light)
}

function specular(
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

toString
