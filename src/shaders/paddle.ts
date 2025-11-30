import { hsl2rgb } from '../hsl'
import { easeInQuart, easeInSine, lighting, remap, specular } from '../lib'
import type { UniformsStruct } from '../render-wgpu'
import type { MarchResult } from './march-result'
import * as sdf from '@typegpu/sdf'
import * as d from 'typegpu/data'
import * as std from 'typegpu/std'

export function sdPaddle(uniforms: d.Infer<UniformsStruct>, p: d.v3f) {
  'use gpu'

  return (
    sdf.sdBox3d(
      p.sub(d.vec3f(uniforms.paddle.position, 0)),
      uniforms.paddle.size.div(2).sub(0.02),
    ) - 0.02
  )
}

export function renderPaddle(
  uniforms: d.Infer<UniformsStruct>,
  result: MarchResult,
  normal: d.v3f,
  rayDirection: d.v3f,
  lightDirection: d.v3f,
): d.v3f {
  'use gpu'

  const uv = result.pos
    .sub(d.vec3f(uniforms.paddle.position, 0))
    .div(uniforms.paddle.size)
    .mul(2)

  // line =
  let color = d.vec3f(0.2)
  color = applyLighting(color, normal, rayDirection, lightDirection)

  let line = 1 - std.abs(uv.z)
  line = std.clamp(line, d.f32(0), d.f32(1))
  line = easeInSine(line)

  const hue = uniforms.time * 0.2 - std.abs(uv.x) * 0.3
  color = color.add(hsl2rgb(d.vec3f(hue % 1, 1, line)))

  return std.clamp(color, d.vec3f(0), d.vec3f(1))
}

export function applyLighting(
  color: d.v3f,
  normal: d.v3f,
  rayDirection: d.v3f,
  lightDirection: d.v3f,
): d.v3f {
  'use gpu'
  return lighting(color, normal, lightDirection, 0.6).add(
    specular(normal, rayDirection, lightDirection, d.f32(4)),
  )
}
