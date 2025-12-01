import { hsl2rgb } from '../hsl'
import { lighting, specular } from '../lib'
import type { UniformsStruct } from '../render-wgpu'
import type { MarchResult } from './march-result'
import * as sdf from '@typegpu/sdf'
import tgpu from 'typegpu'
import * as d from 'typegpu/data'
import * as std from 'typegpu/std'

export function sdBall(uniforms: d.Infer<UniformsStruct>, p: d.v3f): number {
  'use gpu'
  const ballPosition = d.vec3f(uniforms.ball.position, 0)

  return sdf.sdSphere(p.sub(ballPosition), uniforms.ball.radius)
}

export function renderBall(
  uniforms: d.Infer<UniformsStruct>,
  result: d.Infer<MarchResult>,
  normal: d.v3f,
  rayDirection: d.v3f,
  lightDirection: d.v3f,
): d.v3f {
  'use gpu'

  const hue = std.fract(
    std.atan2(normal.y, normal.x) / (Math.PI * 2) + uniforms.time * 0.2,
  )
  const color = hsl2rgb(d.vec3f(hue, 1, 0.7))
  const fade = std.abs(std.dot(normal, rayDirection))
  return std.mix(color, d.vec3f(1), fade)
}
