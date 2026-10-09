// Loaders and minimal local types for the official YouTube IFrame Player API and SoundCloud Widget API.
// Only what the music player uses is typed here (no @types packages).

export interface YTPlayer {
  loadVideoById(videoId: string): void;
  playVideo(): void;
  pauseVideo(): void;
  setVolume(volume: number): void;
  destroy(): void;
}

export interface YTNamespace {
  Player: new (
    element: HTMLElement,
    options: {
      width: number;
      height: number;
      videoId: string;
      playerVars?: Record<string, number>;
      events: {
        onReady?: () => void;
        onStateChange?: (event: { data: number }) => void;
        onError?: () => void;
      };
    },
  ) => YTPlayer;
}

export interface SCWidget {
  bind(event: string, listener: () => void): void;
  load(url: string, options: { auto_play: boolean; callback?: () => void }): void;
  play(): void;
  pause(): void;
  setVolume(volume: number): void;
}

export interface SCNamespace {
  Widget: ((iframe: HTMLIFrameElement) => SCWidget) & {
    Events: { READY: string; PLAY: string; PAUSE: string; FINISH: string; ERROR: string };
  };
}

declare global {
  interface Window {
    YT?: YTNamespace;
    SC?: SCNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let youTubePromise: Promise<YTNamespace> | null = null;
let soundCloudPromise: Promise<SCNamespace> | null = null;

const injectScript = (src: string, onError: () => void) => {
  const script = document.createElement('script');
  script.src = src;
  script.async = true;
  script.addEventListener('error', onError);
  document.head.appendChild(script);
  return script;
};

/** Resolves with window.YT once YouTube's API is ready; the script is injected only once. */
export function loadYouTubeApi(): Promise<YTNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (youTubePromise) return youTubePromise;

  youTubePromise = new Promise<YTNamespace>((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve(window.YT as YTNamespace);
    };
    injectScript('https://www.youtube.com/iframe_api', () => {
      youTubePromise = null; // let a later call try again
      reject(new Error('Không tải được trình phát YouTube.'));
    });
  });
  return youTubePromise;
}

/** Resolves with window.SC once SoundCloud's widget API has loaded; the script is injected only once. */
export function loadSoundCloudApi(): Promise<SCNamespace> {
  if (window.SC?.Widget) return Promise.resolve(window.SC);
  if (soundCloudPromise) return soundCloudPromise;

  soundCloudPromise = new Promise<SCNamespace>((resolve, reject) => {
    const script = injectScript('https://w.soundcloud.com/player/api.js', () => {
      soundCloudPromise = null;
      reject(new Error('Không tải được trình phát SoundCloud.'));
    });
    script.addEventListener('load', () => resolve(window.SC as SCNamespace));
  });
  return soundCloudPromise;
}
