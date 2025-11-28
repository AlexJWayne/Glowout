export const mouse = { x: 0, y: 0 }

export function listenForInput(canvas: HTMLCanvasElement) {
  document.addEventListener('mousemove', (event) => {
    const { clientX, clientY } = event
    const { left, top } = canvas.getBoundingClientRect()
    mouse.x = ((clientX - left) / canvas.width) * 2 - 1
    mouse.y = ((clientY - top) / canvas.height) * 2 - 1
  })
}
