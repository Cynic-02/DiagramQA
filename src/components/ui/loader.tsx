"use client";
import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface LoaderFiveProps {
  text?: string;
  className?: string;
}

export function LoaderFive({ text = "Loading...", className }: LoaderFiveProps) {
  const characters = text.split("");

  return (
    <div className={cn("flex items-center justify-center gap-0.5", className)}>
      {characters.map((char, i) => (
        <motion.span
          key={`${char}-${i}`}
          className="inline-block font-mono text-sm font-semibold text-foreground"
          initial={{ opacity: 0.3 }}
          animate={{
            opacity: [0.3, 1, 0.3],
            color: [
              "var(--muted-foreground)",
              "var(--primary)",
              "var(--muted-foreground)",
            ],
          }}
          transition={{
            duration: 1.8,
            repeat: Infinity,
            delay: i * 0.08,
            ease: "easeInOut",
          }}
        >
          {char === " " ? "\u00A0" : char}
        </motion.span>
      ))}
    </div>
  );
}
