import { ALIVE_COUNT } from '../bricks'
import { lighting, raySphereIntersect, specular } from '../lib'
import type { UniformsStruct } from '../render-wgpu'
import { renderBrick, sdBricks } from './bricks'
import { MarchResult, Obj } from './march-result'
import { renderPaddle, sdPaddle } from './paddle'
import { renderWalls, sdWalls } from './walls'
import * as sdf from '@typegpu/sdf'
import tgpu, { type TgpuBufferReadonly } from 'typegpu'
import * as d from 'typegpu/data'
import * as std from 'typegpu/std'

const MAX_STEPS = tgpu.const(d.i32, d.i32(80))
const MAX_DISTANCE = tgpu.const(d.f32, d.f32(10))
const EPSILON = tgpu.const(d.f32, d.f32(0.003))
const CAMERA_POSTITION = tgpu.const(d.vec3f, d.vec3f(0, 0, 2))

const allBricks = tgpu.const(
  d.arrayOf(d.bool, ALIVE_COUNT),
  Array(ALIVE_COUNT).fill(true),
)

export function createFragmentShader(
  uniforms: TgpuBufferReadonly<UniformsStruct>,
) {
  return tgpu['~unstable'].fragmentFn({
    in: { uv: d.vec2f },
    out: d.vec4f,
  })(({ uv }) => {
    const rayDirection = std.normalize(d.vec3f(uv, -1.65))

    const brickVisibility = d.arrayOf(d.bool, ALIVE_COUNT)()
    for (let i = 0; i < brickVisibility.length; i++) {
      const position = uniforms.$.bricks[i].position
      const size = uniforms.$.bricks[i].size
      brickVisibility[i] = raySphereIntersect(
        CAMERA_POSTITION.$,
        rayDirection,
        d.vec3f(position, 0),
        std.max(std.max(size.x, size.y), size.z) * 0.65 + 0.05,
      )
    }

    const result = raymarch(uniforms.$, rayDirection, brickVisibility)
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

function raymarch(
  uniforms: d.Infer<UniformsStruct>,
  rayDirection: d.v3f,
  brickVisibility: boolean[],
): MarchResult {
  'use gpu'

  let totalDist = d.f32()
  let result = MarchResult()
  let hit = false

  for (let i = 0; i < MAX_STEPS.$; i++) {
    const p = CAMERA_POSTITION.$.add(rayDirection.mul(totalDist))
    result = scene(uniforms, p, brickVisibility)

    if (result.distance < EPSILON.$) {
      hit = true
      break
    }
    totalDist += result.distance

    if (totalDist > MAX_DISTANCE.$) break
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
      3,
    ),
  )

  if (result.id === Obj.PADDLE)
    return renderPaddle(uniforms, result, normal, rayDirection, lightDirection)

  if (result.id === Obj.BALL) {
    const base = lighting(d.vec3f(1, 1, 0), normal, lightDirection, 0.1)
    const spec = specular(normal, rayDirection, lightDirection, d.f32(3))
    return base.add(spec)
  }

  if (result.id === Obj.BRICK) {
    return renderBrick(uniforms, result, normal, rayDirection, lightDirection)
  }

  if (result.id === Obj.WALL) {
    return renderWalls(uniforms, result.pos, normal, lightDirection)
  }

  return d.vec3f(0.35)
}

function scene(
  uniforms: d.Infer<UniformsStruct>,
  p: d.v3f,
  brickVisibility: boolean[],
): MarchResult {
  'use gpu'
  let paddle = sdPaddle(uniforms, p)
  let ball = sdBall(uniforms, p)
  let bricks = sdBricks(uniforms, p, brickVisibility)
  let walls = sdWalls(uniforms, p)

  if (paddle < ball && paddle < bricks.distance && paddle < walls) {
    return MarchResult({
      id: Obj.PADDLE,
      pos: p,
      distance: paddle,
      brickIndex: -1,
    })
  }

  if (ball < paddle && ball < bricks.distance && ball < walls) {
    return MarchResult({
      id: Obj.BALL,
      pos: p,
      distance: ball,
      brickIndex: -1,
    })
  }

  if (walls < paddle && walls < bricks.distance && walls < ball) {
    return MarchResult({
      id: Obj.WALL,
      pos: p,
      distance: walls,
      brickIndex: -1,
    })
  }

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

  let n1 = d.vec3f(0, 1, 0)
  let n2 = d.vec3f()
  let n3 = d.vec3f()
  let n4 = d.vec3f()

  if (id === Obj.PADDLE) {
    n1 = k1.mul(sdPaddle(uniforms, p.add(k1.mul(EPSILON.$))))
    n2 = k2.mul(sdPaddle(uniforms, p.add(k2.mul(EPSILON.$))))
    n3 = k3.mul(sdPaddle(uniforms, p.add(k3.mul(EPSILON.$))))
    n4 = k4.mul(sdPaddle(uniforms, p.add(k4.mul(EPSILON.$))))
  }

  if (id === Obj.BALL) {
    n1 = k1.mul(sdBall(uniforms, p.add(k1.mul(EPSILON.$))))
    n2 = k2.mul(sdBall(uniforms, p.add(k2.mul(EPSILON.$))))
    n3 = k3.mul(sdBall(uniforms, p.add(k3.mul(EPSILON.$))))
    n4 = k4.mul(sdBall(uniforms, p.add(k4.mul(EPSILON.$))))
  }

  if (id === Obj.WALL) {
    n1 = k1.mul(sdWalls(uniforms, p.add(k1.mul(EPSILON.$))))
    n2 = k2.mul(sdWalls(uniforms, p.add(k2.mul(EPSILON.$))))
    n3 = k3.mul(sdWalls(uniforms, p.add(k3.mul(EPSILON.$))))
    n4 = k4.mul(sdWalls(uniforms, p.add(k4.mul(EPSILON.$))))
  }

  if (id === Obj.BRICK) {
    n1 = k1.mul(
      sdBricks(uniforms, p.add(k1.mul(EPSILON.$)), allBricks.$).distance,
    )
    n2 = k2.mul(
      sdBricks(uniforms, p.add(k2.mul(EPSILON.$)), allBricks.$).distance,
    )
    n3 = k3.mul(
      sdBricks(uniforms, p.add(k3.mul(EPSILON.$)), allBricks.$).distance,
    )
    n4 = k4.mul(
      sdBricks(uniforms, p.add(k4.mul(EPSILON.$)), allBricks.$).distance,
    )
  }

  return std.normalize(n1.add(n2).add(n3).add(n4))
}

function sdBall(uniforms: d.Infer<UniformsStruct>, p: d.v3f) {
  'use gpu'
  const position3 = d.vec3f(uniforms.ball.position, 0)
  return sdf.sdSphere(p.sub(position3), uniforms.ball.radius)
}
