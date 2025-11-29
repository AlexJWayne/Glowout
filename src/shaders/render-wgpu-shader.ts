import { lighting, specular } from '../lib'
import type { UniformsStruct } from '../render-wgpu'
import { renderBrick, sdBricks } from './bricks'
import { MarchResult, Obj } from './march-result'
import * as sdf from '@typegpu/sdf'
import tgpu, { type TgpuBufferReadonly } from 'typegpu'
import * as d from 'typegpu/data'
import * as std from 'typegpu/std'

const MAX_STEPS = d.i32(80)
const MAX_DISTANCE = d.f32(6)
const EPSILON = d.f32(0.001)
const CAMERA_POSTITION = d.vec3f(0, 0, 3.2)

export function createFragmentShader(
  uniforms: TgpuBufferReadonly<UniformsStruct>,
) {
  return tgpu['~unstable'].fragmentFn({
    in: { uv: d.vec2f },
    out: d.vec4f,
  })(({ uv }) => {
    const rayDirection = std.normalize(d.vec3f(uv, -3))

    const result = raymarch(uniforms.$, rayDirection)
    const normal = getNormal(uniforms.$, result)
    const color = renderHit(uniforms.$, result, normal, rayDirection)
    return d.vec4f(color, 1)

    // return d.vec4f(
    //   std.fract(
    //     d
    //       .vec3f(
    //         sdBricks(uniforms.$, d.vec3f(uv, 0)).distance,
    //         // sdPaddle(uniforms.$, d.vec3f(uv, 0)),
    //         // sdBall(uniforms.$, d.vec3f(uv, 0)),
    //       )
    //       .mul(10),
    //   ),
    //   1,
    // )
  })
}

function renderHit(
  uniforms: d.Infer<UniformsStruct>,
  result: MarchResult,
  normal: d.v3f,
  rayDirection: d.v3f,
) {
  'use gpu'

  const lightDirection = std.normalize(
    d.vec3f(
      std.sin(uniforms.time * 0.5), //
      std.cos(uniforms.time * 0.5),
      4,
    ),
  )
  const lightIntensity = std.max(std.dot(normal, lightDirection), 0)

  if (result.id === Obj.PADDLE) return d.vec3f(1, 1, 1).mul(lightIntensity)

  if (result.id === Obj.BALL) {
    const base = lighting(d.vec3f(1, 1, 0), normal, lightDirection, 0.1)
    const spec = specular(normal, rayDirection, lightDirection, d.f32(3))
    return base.add(spec)
  }

  if (result.id === Obj.BRICK) {
    return renderBrick(uniforms, result, normal, rayDirection, lightDirection)
  }

  return d.vec3f(0)
}

function scene(uniforms: d.Infer<UniformsStruct>, p: d.v3f): MarchResult {
  'use gpu'
  let paddle = sdPaddle(uniforms, p)
  let ball = sdBall(uniforms, p)
  let bricks = sdBricks(uniforms, p)

  if (paddle < ball && paddle < bricks.distance) {
    return MarchResult({
      id: Obj.PADDLE,
      pos: p,
      distance: paddle,
      brickIndex: -1,
    })
  }

  if (ball < paddle && ball < bricks.distance)
    return MarchResult({
      id: Obj.BALL,
      pos: p,
      distance: ball,
      brickIndex: -1,
    })

  return MarchResult({
    id: Obj.BRICK,
    pos: p,
    distance: bricks.distance,
    brickIndex: bricks.brickIndex,
  })
}

function getNormal(
  uniforms: d.Infer<UniformsStruct>,
  result: MarchResult,
): d.v3f {
  'use gpu'

  const id = result.id
  const p = result.pos

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

function raymarch(
  uniforms: d.Infer<UniformsStruct>,
  rayDirection: d.v3f,
): MarchResult {
  'use gpu'

  let totalDist = d.f32()
  let result = MarchResult()
  let hit = false

  for (let i = 0; i < MAX_STEPS; i++) {
    const p = CAMERA_POSTITION.add(rayDirection.mul(totalDist))
    result = scene(uniforms, p)

    if (result.distance < EPSILON) {
      hit = true
      break
    }
    totalDist += result.distance

    if (totalDist > MAX_DISTANCE) break
  }

  if (!hit) {
    return MarchResult({
      id: Obj.NONE,
      pos: result.pos,
      distance: totalDist,
      brickIndex: -1,
    })
  }

  return result
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
