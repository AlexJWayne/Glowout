import * as d from 'typegpu/data'

export const MarchResult = d.struct({
  id: d.i32,
  pos: d.vec3f,
  distance: d.f32,
  brickIndex: d.i32,
})
export type MarchResult = d.Infer<typeof MarchResult>

export const enum Obj {
  NONE,
  PADDLE,
  BALL,
  BRICK,
}
