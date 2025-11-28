import { ALIVE_COUNT, COLS, ROWS, brickCount } from './bricks'
import { listenForInput } from './input'
import { createFragmentShader } from './render-wgpu-shader'
import type { Queries } from './world'
import tgpu from 'typegpu'
import * as d from 'typegpu/data'

const canvas = document.getElementById('wgpu') as HTMLCanvasElement
canvas.width = 500
canvas.height = 500
listenForInput(canvas)

const root = await tgpu.init()
const ctx = canvas.getContext('webgpu')!
const presentationFormat = navigator.gpu.getPreferredCanvasFormat()
ctx.configure({
  device: root.device,
  format: presentationFormat,
  alphaMode: 'premultiplied',
})

const UniformsStruct = d.struct({
  time: d.f32,
  paddle: d.struct({
    position: d.vec2f,
    size: d.vec2f,
  }),
  ball: d.struct({
    position: d.vec2f,
    radius: d.f32,
  }),
  bricks: d.arrayOf(
    d.struct({
      position: d.vec2f,
      size: d.vec2f,
    }),
    ALIVE_COUNT,
  ),
})
export type UniformsStruct = typeof UniformsStruct

const uniformsBuffer = root.createBuffer(UniformsStruct).$usage('storage')
const indexBuffer = root
  .createBuffer(d.arrayOf(d.u16, 6), [0, 2, 1, 0, 3, 2])
  .$usage('index')

const vertexLayout = tgpu.vertexLayout(d.arrayOf(d.vec4f))

const vertexShader = tgpu['~unstable'].vertexFn({
  in: { idx: d.builtin.vertexIndex },
  out: {
    pos: d.builtin.position,
    uv: d.vec2f,
  },
})(({ idx }) => {
  const vertices = [
    d.vec2f(-1, -1),
    d.vec2f(1, -1),
    d.vec2f(1, 1),
    d.vec2f(-1, 1),
  ]
  const vertex = vertices[idx]
  return {
    pos: d.vec4f(vertex, 0, 1),
    uv: vertex,
  }
})

const pipeline = root['~unstable']
  .withVertex(vertexShader, { foo: vertexLayout.attrib })
  .withFragment(createFragmentShader(uniformsBuffer.as('readonly')), {
    format: presentationFormat,
  })
  .createPipeline()
  .withIndexBuffer(indexBuffer)

console.log(
  tgpu.resolve({
    externals: {
      fragmentShader: createFragmentShader(uniformsBuffer.as('readonly')),
    },
  }),
)

export function renderGameWgpu(queries: Queries, timestamp: number) {
  const paddleEntity = queries.paddle.first!
  const ballEntity = queries.ball.first!
  const bricks = queries.bricks.entities.map((entity) => ({
    position: entity.position,
    size: entity.size,
  }))

  uniformsBuffer.write({
    time: timestamp / 1000,
    paddle: paddleEntity,
    ball: {
      position: ballEntity.position,
      radius: ballEntity.ball.radius,
    },
    bricks,
  })
  pipeline
    .withColorAttachment({
      view: ctx.getCurrentTexture().createView(),
      loadOp: 'clear',
      storeOp: 'store',
    })
    .drawIndexed(6)
}
