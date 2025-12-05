import { BrickState } from '../bricks'
import { easeOutBack, lighting, specular } from '../lib'
import type { UniformsStruct } from '../render-wgpu'
import { MarchResult, Obj } from './march-result'
import * as sdf from '@typegpu/sdf'
import * as d from 'typegpu/data'
import * as std from 'typegpu/std'

const EMPTY = d.f32(1e20)

export function sdBricks(
  uniforms: d.Infer<UniformsStruct>,
  p: d.v3f,
  brickVisibility: boolean[],
): MarchResult {
  'use gpu'

  let dist = EMPTY
  let brickIndex = d.i32(-1)
  for (let i = 0; i < uniforms.bricks.length; i++) {
    if (!brickVisibility[i]) continue
    const brick = uniforms.bricks[i]

    let scale = d.f32(1)
    if (brick.state === BrickState.BIRTH) {
      scale = easeOutBack(brick.stateProgress)
    } else if (brick.state === BrickState.DYING) {
      scale = easeOutBack(1 - brick.stateProgress)
    }

    const newDist = sdBrick(
      p,
      brick.position,
      brick.size.mul(scale),
      uniforms.time,
    )
    if (newDist < dist) {
      brickIndex = i
    }
    dist = sdf.opSmoothUnion(dist, newDist, 0.04)
  }

  return MarchResult({
    id: Obj.BRICK,
    pos: p,
    distance: dist,
    brickIndex,
  })
}

function sdBrick(p: d.v3f, position: d.v2f, size: d.v3f, time: number) {
  'use gpu'
  const shrinkage = std.min(0.04, std.min(size.x, size.y) / 2)
  const expansion = std.min(0.06, std.min(size.x, size.y))
  const pulse =
    (std.clamp(std.sin(-position.x + position.y + time * 2), 0.9, 1) - 0.9) *
    0.1
  return (
    sdf.sdBox3d(
      p.sub(d.vec3f(position, 0)),
      d.vec3f(size.div(2).add(pulse).sub(shrinkage)),
    ) - expansion
  )
}

export function renderBrick(
  uniforms: d.Infer<UniformsStruct>,
  result: d.Infer<typeof MarchResult>,
  normal: d.v3f,
  rayDirection: d.v3f,
  lightDirection: d.v3f,
): d.v3f {
  'use gpu'

  if (result.brickIndex < 0) return d.vec3f()

  let brick = uniforms.bricks[result.brickIndex]

  let baseColor = brick.color

  let ambient = 0.5
  if (brick.state === BrickState.DYING) {
    baseColor = std.mix(
      d.vec3f(1, 1, 1),
      baseColor,
      std.max(0, 0.25 * brick.stateProgress) * 4,
    )
    ambient = 0.8
  }

  const base = lighting(baseColor, normal, lightDirection, ambient)
  const spec = specular(normal, rayDirection, lightDirection, d.f32(2))
  return base.add(spec)
}
