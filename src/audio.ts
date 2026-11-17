type Effect = 'tap' | 'mix' | 'serve'

let context: AudioContext | undefined

export function sound(effect: Effect, muted: boolean): void {
  if (muted) return
  try {
    context ??= new AudioContext()
    const audio = context
    if (audio.state === 'suspended') void audio.resume().catch(() => {})
    const melody = effect === 'serve' ? [659, 784, 1046] : effect === 'mix' ? [234, 286, 259, 312] : [480]
    const beat = effect === 'serve' ? 0.085 : 0.073
    melody.forEach((pitch, index) => {
      const start = audio.currentTime + index * beat
      const note = audio.createOscillator()
      const gain = audio.createGain()
      note.type = effect === 'mix' ? 'triangle' : 'sine'
      note.frequency.setValueAtTime(pitch, start)
      note.frequency.exponentialRampToValueAtTime(pitch * (effect === 'tap' ? 0.76 : 0.96), start + 0.08)
      gain.gain.setValueAtTime(0.001, start)
      gain.gain.exponentialRampToValueAtTime(effect === 'serve' ? 0.085 : 0.036, start + 0.012)
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.12)
      note.connect(gain)
      gain.connect(audio.destination)
      note.start(start)
      note.stop(start + 0.13)
    })
  } catch {
    // Audio is optional on browsers that block or do not support Web Audio.
  }
}
