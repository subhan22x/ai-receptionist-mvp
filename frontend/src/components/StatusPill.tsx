import { ReactNode } from "react";

type Tone = "neutral" | "success" | "warning" | "danger" | "info";

const TONE_CLASSES: Record<Tone, string> = {
  neutral: "bg-sand-200 text-ink-700",
  success: "bg-leaf-100 text-leaf-600",
  warning: "bg-flame-50 text-flame-700",
  danger: "bg-red-100 text-red-700",
  info: "bg-flame-50 text-flame-600",
};

export function StatusPill({
  tone = "neutral",
  children,
  icon,
}: {
  tone?: Tone;
  children: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <span className={`pill ${TONE_CLASSES[tone]}`}>
      {icon}
      {children}
    </span>
  );
}
