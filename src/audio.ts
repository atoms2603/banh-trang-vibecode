type Effect = 'tap' | 'serve' | 'even'

const riceSounds = [
  new URL('../sound/sfx/paper-rice-mixed-1.mp3', import.meta.url).href,
  new URL('../sound/sfx/paper-rice-mixed-2.mp3', import.meta.url).href,
]

let context: AudioContext | undefined
let music: HTMLAudioElement | undefined
let pendingPlay: Promise<void> | undefined
let mixTracks: HTMLAudioElement[] | undefined
let mixing = false
let nextMixTrack = 0
let activeMixTrack: HTMLAudioElement | undefined
let mixRequest = 0
let foldTrack: HTMLAudioElement | undefined
let foldStop = 0
let nextFold = 0

export function stopFoldSound(): void {
  if (foldStop) window.clearTimeout(foldStop)
  foldStop = 0
  foldTrack?.pause()
}

export function foldSound(muted: boolean): void {
  if (muted || document.hidden || foldStop) return
  try {
    foldTrack ??= document.createElement('audio')
    foldTrack.volume = .5
    const index = nextFold++
    foldTrack.src = riceSounds[index % riceSounds.length]
    void foldTrack.play().catch(() => { if (nextFold === index + 1) stopFoldSound() })
    foldStop = window.setTimeout(stopFoldSound, 280)
  } catch {
    stopFoldSound()
  }
}

function playMixTrack(): void {
  if (!mixing || !mixTracks) return
  const track = mixTracks[nextMixTrack]
  nextMixTrack = (nextMixTrack + 1) % mixTracks.length
  activeMixTrack = track
  track.currentTime = 0
  const request = ++mixRequest
  void track.play().catch(() => {
    if (request === mixRequest) mixing = false
  })
}

export function mixingSound(active: boolean, muted: boolean, hidden = document.hidden): void {
  const shouldPlay = active && !muted && !hidden
  if (shouldPlay === mixing) return
  mixing = shouldPlay
  try {
    if (!mixing) {
      ++mixRequest
      activeMixTrack = undefined
      for (const track of mixTracks ?? []) {
        track.pause()
        track.currentTime = 0
      }
      return
    }
    mixTracks ??= riceSounds.map((src, index) => {
      const track = document.createElement('audio')
      track.id = `mix-sfx-${index + 1}`
      track.src = src
      track.preload = 'auto'
      track.volume = .65
      track.hidden = true
      track.addEventListener('ended', () => {
        if (mixing && activeMixTrack === track) playMixTrack()
      })
      document.body.append(track)
      return track
    })
    playMixTrack()
  } catch {
    mixing = false
  }
}

export function backgroundMusic(muted: boolean, hidden = document.hidden): void {
  try {
    if (!music) {
      music = document.createElement('audio')
      music.id = 'background-music'
      music.src = new URL('../sound/bgm/Cozy Game Groove.mp3', import.meta.url).href
      music.loop = true
      music.volume = .28
      music.preload = 'auto'
      music.hidden = true
      document.body.append(music)
    }
    music.muted = muted
    if (muted || hidden) {
      music.pause()
      pendingPlay = undefined
      return
    }
    if (!music.paused || pendingPlay) return
    const attempt = music.play()
    pendingPlay = attempt
    // Autoplay may be blocked; the next user interaction retries the same track.
    void attempt.catch(() => {}).finally(() => {
      if (pendingPlay === attempt) pendingPlay = undefined
    })
  } catch {
    // Music is optional if media playback is unavailable.
  }
}

export function sound(effect: Effect, muted: boolean): void {
  if (muted) return
  try {
    context ??= new AudioContext()
    const audio = context
    if (audio.state === 'suspended') void audio.resume().catch(() => {})
    const melody = effect === 'serve' ? [659, 784, 1046] : effect === 'even' ? [659, 880] : [480]
    const beat = effect === 'serve' ? 0.085 : 0.073
    melody.forEach((pitch, index) => {
      const start = audio.currentTime + index * beat
      const note = audio.createOscillator()
      const gain = audio.createGain()
      note.type = 'sine'
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
