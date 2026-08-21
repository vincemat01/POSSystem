export default function RootLoading() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-primary">
      <div className="flex flex-col items-center gap-4">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/20">
          <svg
            viewBox="0 0 48 48"
            fill="none"
            className="h-12 w-12"
            aria-hidden="true"
          >
            <path
              d="M24 4L6 14v20l18 10 18-10V14L24 4z"
              fill="white"
              fillOpacity="0.9"
            />
            <path
              d="M24 4L6 14l18 10 18-10L24 4z"
              fill="white"
            />
            <path
              d="M24 24v20l18-10V14L24 24z"
              fill="white"
              fillOpacity="0.7"
            />
            <path
              d="M24 24v20L6 34V14l18 10z"
              fill="white"
              fillOpacity="0.85"
            />
          </svg>
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white">Kompass POS</h1>
          <p className="mt-1 text-sm text-white/70">Loading your business...</p>
        </div>
        <div className="mt-4 h-1 w-32 overflow-hidden rounded-full bg-white/20">
          <div className="h-full w-full animate-pulse rounded-full bg-white/60" />
        </div>
      </div>
    </div>
  );
}
