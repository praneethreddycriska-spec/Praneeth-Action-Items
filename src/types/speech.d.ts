interface SpeechRecognitionEventResultItem {
  0: { transcript: string }
  isFinal: boolean
}
interface SpeechRecognitionEvent extends Event {
  results: ArrayLike<SpeechRecognitionEventResultItem> & { [Symbol.iterator]?: unknown }
}
interface SpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start: () => void
  stop: () => void
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => unknown) | null
  onend: ((this: SpeechRecognition, ev: Event) => unknown) | null
  onerror: ((this: SpeechRecognition, ev: Event) => unknown) | null
}
