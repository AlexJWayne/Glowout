import { ALIVE_COUNT } from '../bricks'
import { hsl2rgb } from '../hsl'
import { lighting, remap } from '../lib'
import type { UniformsStruct } from '../render-wgpu'
import { sdBricks } from './bricks'
import { allBricks } from './march-result'
import * as sdf from '@typegpu/sdf'
import tgpu from 'typegpu'
import * as d from 'typegpu/data'
import * as std from 'typegpu/std'

const S = tgpu.const(d.f32, d.f32(0.25))

export function sdWalls(uniforms: d.Infer<UniformsStruct>, _p: d.v3f) {
  'use gpu'
  let p = _p
  p.z -= uniforms.time * 0.1

  let rp = p
  p.x -= S.$ / 2
  p.y -= S.$ / 2

  rp = p.sub(std.round(p.div(S.$)).mul(S.$))

  // repeating spheres
  let dist = sdf.sdSphere(rp, 0.18)

  // subtract the play area
  dist = sdf.opSmoothDifference(dist, sdf.sdBox3d(_p, d.vec3f(1, 1, 10)), 0.05)

  // subtract the gutter
  dist = sdf.opSmoothDifference(
    dist,
    sdf.sdSphere(_p.mul(d.vec3f(1, 1, 4.5)).sub(d.vec3f(0, -1, 0)), 0.8) / 4.5,
    0.15,
  )

  return dist
}

export function renderWalls(
  uniforms: d.Infer<UniformsStruct>,
  p: d.v3f,
  normal: d.v3f,
  ligthDirection: d.v3f,
) {
  'use gpu'

  const huePt = d.vec2f(
    std.sin(p.x + uniforms.time * 0.2),
    std.cos(p.y + uniforms.time * 0.2),
  )
  const hue = std.fract((huePt.x + huePt.y) * 0.2 + uniforms.time * 0.2)
  let color = hsl2rgb(d.vec3f(hue, 1, 0.75))

  let fade = std.pow(
    remap(p.z, d.f32(0), d.f32(-10), d.f32(1), d.f32(0)), //
    5,
  ) // distance fade
  fade *= std.clamp(
    remap(p.y, d.f32(-1.0), d.f32(-1.25), d.f32(1), d.f32(0)),
    0,
    1,
  ) // gutter

  color = lighting(color, normal, ligthDirection, 0.5)
  color = color.add(renderBallSpot(p, uniforms.ball.position))
  color = color.add(renderBlockShadow(uniforms, p))
  color = std.mix(d.vec3f(0.35), color, fade)

  return color
}

function renderBallSpot(p: d.v3f, ballPos: d.v2f) {
  'use gpu'

  const b3 = d.vec3f(ballPos, 0)
  let v = d.f32(0)

  v = std.clamp(1 - std.length(std.abs(p.sub(b3))), 0, 1)
  v = std.pow(v, 3)

  return d.vec3f(v)
}

function renderBlockShadow(uniforms: d.Infer<UniformsStruct>, p: d.v3f) {
  'use gpu'
  const foo = sdBricks(uniforms, p, allBricks.$)
  return (
    std.pow(
      std.clamp(1 - remap(foo.distance, 0.0, 0.2, 0.0, 1.0), 0, 1), //
      3,
    ) * 0.4
  )
}
