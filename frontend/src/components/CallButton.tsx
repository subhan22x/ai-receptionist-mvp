import { RealtimeStatus } from "../lib/realtimeClient";

type Props = {
  status: RealtimeStatus;
  onStart: () => void;
  onStop: () => void;
};

const PRIMARY_LABEL: Record<RealtimeStatus, string> = {
  idle: "Tap to call our AI receptionist",
  connecting: "Connecting…",
  in_call: "End call",
  ending: "Ending…",
  ended: "Call ended. Tap to call again",
  error: "Try again",
};

export function CallButton({ status, onStart, onStop }: Props) {
  const isLive = status === "in_call";
  const isBusy = status === "connecting" || status === "ending";

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        disabled={isBusy}
        onClick={isLive ? onStop : onStart}
        className={`relative grid place-items-center h-32 w-32 rounded-full transition-transform active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed shadow-lg
          ${
            isLive
              ? "bg-red-500 text-white"
              : "bg-gradient-to-br from-flame-400 to-flame-600 text-white"
          }
        `}
        aria-label={PRIMARY_LABEL[status]}
      >
        {isLive && (
          <span className="absolute inset-0 rounded-full bg-red-500/40 animate-ping" />
        )}
        <PhoneIcon />
      </button>
      <p className={`text-sm font-medium ${isLive ? "text-red-600" : "text-flame-600"}`}>
        {PRIMARY_LABEL[status]}
      </p>
    </div>
  );
}

function PhoneIcon() {
  return (
    <svg
      width="44"
      height="44"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
      <path d="M15.5 6.5a4 4 0 0 1 2 2" />
      <path d="M17 4a7 7 0 0 1 3 3" />
    </svg>
  );
}
