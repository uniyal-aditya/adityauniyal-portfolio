import { useEffect, useState } from 'react'

const PHRASES = [
  'building scalable systems',
  'crafting Discord bots',
  'shipping web platforms',
  'writing clean architecture',
  'solving hard problems',
]

/** Types and deletes the hero phrases, exactly like the legacy script. */
export function useTypewriter(): string {
  const [text, setText] = useState('')
  useEffect(() => {
    let phrase = 0
    let chars = 0
    let deleting = false
    let timer: number | undefined

    const tick = () => {
      const word = PHRASES[phrase]
      if (!deleting) {
        chars += 1
        setText(word.slice(0, chars))
        if (chars === word.length) {
          deleting = true
          timer = window.setTimeout(tick, 2000)
          return
        }
        timer = window.setTimeout(tick, 55)
      } else {
        chars -= 1
        setText(word.slice(0, chars))
        if (chars === 0) {
          deleting = false
          phrase = (phrase + 1) % PHRASES.length
          timer = window.setTimeout(tick, 300)
          return
        }
        timer = window.setTimeout(tick, 28)
      }
    }
    timer = window.setTimeout(tick, 400)
    return () => window.clearTimeout(timer)
  }, [])
  return text
}
