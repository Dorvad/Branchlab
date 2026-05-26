// Minimal YouTube IFrame Player API type declarations.
// Only covers the subset of the API used by BranchLab.

declare namespace YT {
  const enum PlayerState {
    UNSTARTED = -1,
    ENDED = 0,
    PLAYING = 1,
    PAUSED = 2,
    BUFFERING = 3,
    CUED = 5,
  }

  interface PlayerVars {
    autoplay?: 0 | 1
    controls?: 0 | 1
    playsinline?: 0 | 1
    rel?: 0 | 1
    enablejsapi?: 0 | 1
    origin?: string
    start?: number
    end?: number
    modestbranding?: 0 | 1
  }

  interface PlayerEvent {
    target: Player
    data: number
  }

  interface PlayerOptions {
    videoId?: string
    width?: string | number
    height?: string | number
    playerVars?: PlayerVars
    events?: {
      onReady?: (event: { target: Player }) => void
      onStateChange?: (event: PlayerEvent) => void
      onError?: (event: PlayerEvent) => void
    }
  }

  interface LoadVideoByIdOptions {
    videoId: string
    startSeconds?: number
    endSeconds?: number
  }

  class Player {
    constructor(elementOrId: HTMLElement | string, options: PlayerOptions)
    loadVideoById(options: LoadVideoByIdOptions): void
    playVideo(): void
    pauseVideo(): void
    seekTo(seconds: number, allowSeekAhead: boolean): void
    getCurrentTime(): number
    getDuration(): number
    getPlayerState(): number
    destroy(): void
  }
}

interface Window {
  YT?: typeof YT & { Player: typeof YT.Player }
  onYouTubeIframeAPIReady?: () => void
}
