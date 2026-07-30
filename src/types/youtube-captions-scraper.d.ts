declare module 'youtube-captions-scraper' {
  interface SubtitleEntry {
    start: number
    dur: number
    text: string
  }

  interface GetSubtitlesOptions {
    videoID: string
    language: string
  }

  export function getSubtitles(options: GetSubtitlesOptions): Promise<SubtitleEntry[]>
}
