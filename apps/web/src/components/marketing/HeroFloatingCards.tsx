"use client";

import { motion, useReducedMotion } from "motion/react";
import { Check, Code2, MousePointer2, Send, ServerCog } from "lucide-react";
import type { ReactNode } from "react";

type FloatingCardProps = {
  children: ReactNode;
  className: string;
  delay: number;
  duration: number;
  label: string;
  labelClassName?: string;
  tilt: number;
};

function CursorLabel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`absolute flex items-start gap-1 ${className}`}>
      <MousePointer2
        aria-hidden="true"
        className="mt-0.5 size-4 -rotate-12 fill-foreground text-foreground drop-shadow-sm"
      />
      <span className="rounded-md bg-foreground px-2.5 py-1 font-mono text-[9px] font-medium text-background shadow-md">
        {children}
      </span>
    </div>
  );
}

function FloatingCard({
  children,
  className,
  delay,
  duration,
  label,
  labelClassName,
  tilt,
}: FloatingCardProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className={`absolute ${className}`}
      initial={reduceMotion ? false : { opacity: 0, y: 12, rotate: tilt }}
      animate={
        reduceMotion
          ? { opacity: 1, y: 0, rotate: tilt }
          : {
              opacity: 1,
              y: [0, -7, 0],
              rotate: [tilt, tilt + 0.7, tilt],
            }
      }
      transition={
        reduceMotion
          ? { duration: 0 }
          : {
              opacity: { delay, duration: 0.45 },
              y: {
                delay: delay + 0.45,
                duration,
                ease: "easeInOut",
                repeat: Infinity,
              },
              rotate: {
                delay: delay + 0.45,
                duration,
                ease: "easeInOut",
                repeat: Infinity,
              },
            }
      }
    >
      {children}
      <CursorLabel className={labelClassName}>{label}</CursorLabel>
    </motion.div>
  );
}

function WindowChrome({
  icon,
  title,
}: {
  icon: ReactNode;
  title: string;
}) {
  return (
    <div className="flex h-7 items-center border-b border-border bg-surface-secondary/70 px-2.5">
      <div className="flex gap-1">
        <span className="size-1.5 rounded-full bg-foreground/20" />
        <span className="size-1.5 rounded-full bg-foreground/20" />
        <span className="size-1.5 rounded-full bg-success" />
      </div>
      <span className="ml-2 flex items-center gap-1 font-mono text-[7px] text-muted-foreground">
        {icon}
        {title}
      </span>
    </div>
  );
}

export default function HeroFloatingCards() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-0 z-[5] hidden h-[540px] min-[1440px]:block"
    >
      <FloatingCard
        className="left-[max(1.5rem,calc(50vw-46rem))] top-[7.5rem] w-[172px]"
        delay={0.08}
        duration={6.4}
        label="Build"
        labelClassName="-bottom-4 -right-10"
        tilt={-2.2}
      >
        <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-overlay">
          <WindowChrome
            icon={<Code2 className="size-2.5" />}
            title="App.tsx"
          />
          <div className="grid h-[112px] grid-cols-[48px_1fr]">
            <div className="border-r border-border bg-surface-secondary/45 px-2 py-2 font-mono text-[6px] leading-4 text-subtle-foreground">
              <p className="text-foreground">src</p>
              <p className="pl-1.5">App</p>
              <p className="pl-1.5">styles</p>
            </div>
            <div className="space-y-2.5 p-3">
              <div className="h-1.5 w-16 rounded-full bg-foreground/18" />
              <div className="h-1.5 w-20 rounded-full bg-foreground/10" />
              <div className="rounded-md border border-border bg-surface-secondary/60 p-2">
                <div className="h-1.5 w-12 rounded-full bg-foreground/20" />
                <div className="mt-2 h-1.5 w-16 rounded-full bg-foreground/10" />
              </div>
            </div>
          </div>
        </div>
      </FloatingCard>

      <FloatingCard
        className="right-[max(1.5rem,calc(50vw-46rem))] top-[11rem] w-[184px]"
        delay={0.22}
        duration={7.1}
        label="Test"
        labelClassName="-bottom-3 -left-9 flex-row-reverse"
        tilt={1.8}
      >
        <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-overlay">
          <WindowChrome
            icon={<Send className="size-2.5" />}
            title="REST request"
          />
          <div className="p-3">
            <div className="flex items-center gap-1.5">
              <span className="rounded bg-foreground px-1.5 py-1 font-mono text-[6px] text-background">
                GET
              </span>
              <div className="h-6 min-w-0 flex-1 rounded border border-border bg-background px-2 font-mono text-[6px] leading-6 text-muted-foreground">
                /api/projects
              </div>
            </div>
            <div className="mt-2.5 flex items-center rounded-md border border-border bg-surface-secondary/50 px-2.5 py-2">
              <span className="size-1.5 rounded-full bg-success" />
              <span className="ml-1.5 font-mono text-[7px] text-foreground">
                200 OK
              </span>
              <span className="ml-auto font-mono text-[6px] text-subtle-foreground">
                82 ms
              </span>
            </div>
            <div className="mt-2 space-y-1.5 px-1">
              <div className="h-1 w-[88%] rounded-full bg-foreground/12" />
              <div className="h-1 w-[68%] rounded-full bg-foreground/8" />
            </div>
          </div>
        </div>
      </FloatingCard>

      <FloatingCard
        className="left-[max(2.5rem,calc(50vw-44.5rem))] top-[22.5rem] w-[166px]"
        delay={0.36}
        duration={7.6}
        label="Deploy"
        labelClassName="-right-11 top-9"
        tilt={1.3}
      >
        <div className="rounded-xl border border-border bg-surface p-3 shadow-overlay">
          <div className="flex items-center gap-2">
            <span className="grid size-7 place-items-center rounded-md border border-border bg-surface-secondary text-muted-foreground">
              <ServerCog className="size-3.5" />
            </span>
            <div>
              <p className="font-mono text-[8px] text-foreground">api-service</p>
              <p className="mt-0.5 font-mono text-[6px] text-subtle-foreground">
                iad1 · production
              </p>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1.5 rounded-md border border-border bg-surface-secondary/55 px-2.5 py-2">
            <span className="grid size-4 place-items-center rounded-full bg-success text-white">
              <Check className="size-2.5" strokeWidth={3} />
            </span>
            <span className="font-mono text-[7px] text-foreground">Ready</span>
            <span className="ml-auto font-mono text-[6px] text-subtle-foreground">
              14s
            </span>
          </div>
        </div>
      </FloatingCard>
    </div>
  );
}
