import { hsl2rgb } from '../hsl'
import { remap } from '../lib'
import type { UniformsStruct } from '../render-wgpu'
import * as sdf from '@typegpu/sdf'
import tgpu from 'typegpu'
import * as d from 'typegpu/data'
import * as std from 'typegpu/std'

const GRID_SIZE = tgpu.const(d.f32, 0.25)
const LINE_WIDTH = tgpu.const(d.f32, 0.015)

export function sdWalls(p: d.v3f) {
  'use gpu'
  let dist = -sdf.sdBox3d(p, d.vec3f(1, 1, 10)) + 0.34

  dist = sdf.opSmoothDifference(
    dist,
    sdf.sdBox3d(p.sub(d.vec3f(0, -1, 0)), d.vec3f(1.15, 2, 1)),
    0.3,
  )
  return dist
}

export function renderWalls(uniforms: d.Infer<UniformsStruct>, p: d.v3f) {
  'use gpu'

  let v = grid(p, LINE_WIDTH.$, GRID_SIZE.$)
  const zFade = std.pow(remap(p.z, 0, -10, 1, 0), 5)

  const hue = std.fract(
    (p.x + p.y + p.z) * 0.2 +
      uniforms.time * 0.2 +
      std.sin(uniforms.time * 0.25 + p.x * 0.5 + p.y * 0.5),
  )

  return hsl2rgb(
    d.vec3f(
      hue, //
      std.mix(0.2, 0.5, v),
      std.mix(0.3, 0.6, v),
    ),
  ).mul(zFade)
}

function grid(pos: d.v3f, lineWidth: number, spacing: number) {
  'use gpu'

  const grid = std.abs(
    std
      .fract(
        pos
          .add(GRID_SIZE.$ / 2)
          .div(spacing)
          .sub(0.5),
      )
      .sub(0.5),
  )
  const gridLine = std.smoothstep(
    d.vec3f(lineWidth / spacing),
    d.vec3f(lineWidth / (spacing + 1)),
    grid,
  )

  return std.max(std.max(gridLine.x, gridLine.y), gridLine.z)
}
