import * as d from 'typegpu/data'

function hue2rgb(f1: number, f2: number, hue: number) {
  if (hue < 0.0) hue += 1.0
  else if (hue > 1.0) hue -= 1.0
  let res = d.f32()
  if (6.0 * hue < 1.0) res = f1 + (f2 - f1) * 6.0 * hue
  else if (2.0 * hue < 1.0) res = f2
  else if (3.0 * hue < 2.0) res = f1 + (f2 - f1) * (2.0 / 3.0 - hue) * 6.0
  else res = f1
  return res
}

export function hsl2rgb(hsl: d.v3f) {
  let rgb = d.vec3f()

  if (hsl.y == 0.0) {
    rgb = d.vec3f(hsl.z) // Luminance
  } else {
    let f2 = d.f32()

    if (hsl.z < 0.5) f2 = hsl.z * (1.0 + hsl.y)
    else f2 = hsl.z + hsl.y - hsl.y * hsl.z

    const f1 = 2.0 * hsl.z - f2

    rgb.x = hue2rgb(f1, f2, hsl.x + 1.0 / 3.0)
    rgb.y = hue2rgb(f1, f2, hsl.x)
    rgb.z = hue2rgb(f1, f2, hsl.x - 1.0 / 3.0)
  }
  return rgb
}
