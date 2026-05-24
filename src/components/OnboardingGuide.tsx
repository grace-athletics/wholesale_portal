import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, X } from "lucide-react";

export type OnboardingStep = "logos" | "order" | null;

interface OnboardingGuideProps {
  step: OnboardingStep;
  onAdvance: () => void;
  onDismiss: () => void;
}

const STEPS = {
  logos: {
    label: "Step 1 of 2",
    title: "First, upload your logo",
    description:
      "Add your team or brand logo to your account before placing an order. We'll apply it to every glove you order.",
    action: "Go to My Logos",
    target: "logos",
    href: "/account/logos",
  },
  order: {
    label: "Step 2 of 2",
    title: "Now place your first order",
    description:
      "Your logo is saved! Select a glove, configure it, and check out — your order goes straight into production.",
    action: "Place Order",
    target: "order",
    href: "/order/new",
  },
} as const;

export function OnboardingGuide({ step, onAdvance, onDismiss }: OnboardingGuideProps) {
  const navigate = useNavigate();
  const cardRef = useRef<HTMLDivElement>(null);
  const [cardPos, setCardPos] = useState<{ top: number; left: number } | null>(null);

  // Position card next to the highlighted sidebar item
  useEffect(() => {
    if (!step) return;

    const position = () => {
      const el = document.querySelector(`[data-onboarding="${STEPS[step].target}"]`);
      if (el && cardRef.current) {
        const rect = el.getBoundingClientRect();
        setCardPos({
          top: Math.max(12, rect.top + rect.height / 2 - 100),
          left: rect.right + 16,
        });
      }
    };

    position();
    // Re-position on resize
    window.addEventListener("resize", position);
    return () => window.removeEventListener("resize", position);
  }, [step]);

  if (!step) return null;

  const config = STEPS[step];

  const handleAction = () => {
    onAdvance();
    navigate(config.href);
  };

  return (
    <>
      {/* Dark overlay — z-[45] sits above header (z-40) but below sidebar override (z-[50]) */}
      <div className="fixed inset-0 bg-black/60 z-[45] pointer-events-none" />

      {/* Tooltip card */}
      <div
        ref={cardRef}
        className="fixed z-[55] w-72 rounded-xl border bg-card shadow-2xl p-5 space-y-3"
        style={
          cardPos
            ? { top: cardPos.top, left: cardPos.left }
            : { top: "50%", left: "50%", transform: "translate(-50%, -50%)" }
        }
      >
        {/* Left arrow pointing at sidebar */}
        {cardPos && (
          <div className="absolute -left-2.5 top-1/2 -translate-y-1/2 w-0 h-0 border-y-[10px] border-y-transparent border-r-[10px] border-r-border" />
        )}

        <div className="flex items-start justify-between gap-2">
          <div className="space-y-0.5">
            <p className="text-[11px] font-semibold text-primary uppercase tracking-wider">
              {config.label} — Getting Started
            </p>
            <p className="font-semibold text-sm leading-snug">{config.title}</p>
          </div>
          <button
            onClick={onDismiss}
            className="text-muted-foreground hover:text-foreground shrink-0 mt-0.5"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed">{config.description}</p>

        <Button size="sm" className="w-full" onClick={handleAction}>
          {config.action}
          <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
        </Button>

        <button
          onClick={onDismiss}
          className="text-xs text-muted-foreground hover:underline w-full text-center block"
        >
          Skip guide
        </button>
      </div>
    </>
  );
}
