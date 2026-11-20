import assert from 'node:assert/strict'
import test from 'node:test'
import { setImmediate } from 'node:timers/promises'
import { backgroundMusic, mixingSound } from '../src/audio.ts'

test('background music retries blocked autoplay, loops once, and preserves position when muted or hidden', async t => {
  const originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document')
  t.after(() => {
    if (originalDocument) Object.defineProperty(globalThis, 'document', originalDocument)
    else Reflect.deleteProperty(globalThis, 'document')
  })
  let blocked = true
  let playCalls = 0
  let elements = 0
  const track = {
    id: '', src: '', loop: false, volume: 1, preload: '', hidden: false,
    muted: false, paused: true, currentTime: 0,
    play() {
      playCalls++
      if (blocked) return Promise.reject(new Error('NotAllowedError'))
      this.paused = false
      return Promise.resolve()
    },
    pause() { this.paused = true },
  }
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: { hidden: false, createElement: () => track, body: { append: () => elements++ } },
  })
  backgroundMusic(false)
  backgroundMusic(false)
  assert.equal(playCalls, 1, 'avoid overlapping attempts while play is pending')
  await setImmediate()
  assert.equal(track.paused, true)
  blocked = false
  backgroundMusic(false)
  await setImmediate()
  assert.equal(track.paused, false)
  assert.equal(track.loop, true)
  assert.ok(track.volume > 0 && track.volume < .5)
  assert.match(track.src, /Cozy%20Game%20Groove\.mp3$/)
  assert.equal(elements, 1)
  track.currentTime = 42
  backgroundMusic(true)
  assert.equal(track.muted, true)
  assert.equal(track.paused, true)
  backgroundMusic(false)
  await setImmediate()
  assert.equal(track.muted, false)
  assert.equal(track.paused, false)
  assert.equal(track.currentTime, 42)
  backgroundMusic(false, true)
  assert.equal(track.paused, true)
  backgroundMusic(false, false)
  await setImmediate()
  assert.equal(track.paused, false)
  assert.equal(track.currentTime, 42)
  backgroundMusic(false)
  assert.equal(playCalls, 4)
  assert.equal(elements, 1)
})

test('mixing alternates the two recordings, never overlaps and stops immediately on completion or pause', async t => {
  const originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document')
  t.after(() => {
    mixingSound(false, false, false)
    if (originalDocument) Object.defineProperty(globalThis, 'document', originalDocument)
    else Reflect.deleteProperty(globalThis, 'document')
  })
  function makeTrack() {
    const listeners = new Map<string, () => void>()
    return {
      id: '', src: '', volume: 1, preload: '', hidden: false, paused: true, currentTime: 0, plays: 0, rejectNext: false,
      play() {
        this.plays++
        if (this.rejectNext) {
          this.rejectNext = false
          return Promise.reject(new Error('NotAllowedError'))
        }
        this.paused = false
        return Promise.resolve()
      },
      pause() { this.paused = true },
      addEventListener(name: string, callback: () => void) { listeners.set(name, callback) },
      end() { this.paused = true; listeners.get('ended')?.() },
    }
  }
  const tracks: ReturnType<typeof makeTrack>[] = []
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: {
      hidden: false,
      createElement: () => { const track = makeTrack(); tracks.push(track); return track },
      body: { append: () => {} },
    },
  })
  mixingSound(false, false)
  assert.equal(tracks.length, 0)
  mixingSound(true, false)
  assert.equal(tracks.length, 2)
  assert.match(tracks[0].src, /paper-rice-mixed-1\.mp3$/)
  assert.match(tracks[1].src, /paper-rice-mixed-2\.mp3$/)
  assert.deepEqual(tracks.map(track => track.plays), [1, 0])
  mixingSound(true, false)
  assert.deepEqual(tracks.map(track => track.plays), [1, 0])
  tracks[0].end()
  assert.deepEqual(tracks.map(track => track.plays), [1, 1])
  assert.equal(tracks.filter(track => !track.paused).length, 1)
  tracks[1].end()
  assert.deepEqual(tracks.map(track => track.plays), [2, 1])
  tracks[0].currentTime = .3
  mixingSound(false, false) // 100%, or pausing the mix midway through a clip.
  assert.ok(tracks.every(track => track.paused && track.currentTime === 0))
  tracks[0].end() // An already queued ended callback must not restart playback.
  assert.deepEqual(tracks.map(track => track.plays), [2, 1])
  mixingSound(true, true)
  assert.ok(tracks.every(track => track.paused))
  mixingSound(true, false)
  assert.equal(tracks[1].paused, false)
  mixingSound(true, false, true)
  assert.ok(tracks.every(track => track.paused))
  tracks[0].rejectNext = true
  mixingSound(true, false, false)
  mixingSound(false, false)
  mixingSound(true, false)
  await setImmediate()
  const calls = tracks.reduce((sum, track) => sum + track.plays, 0)
  mixingSound(true, false)
  assert.equal(tracks.reduce((sum, track) => sum + track.plays, 0), calls, 'an older rejected attempt cannot stop a newer mix')
  assert.equal(tracks.filter(track => !track.paused).length, 1)
})
