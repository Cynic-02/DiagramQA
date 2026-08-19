"use client";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import React, { useMemo } from "react";

interface ThreeDMarqueeProps {
  images: string[];
  className?: string;
}

export function ThreeDMarquee({ images, className }: ThreeDMarqueeProps) {
  // Split images into 4 rows for the marquee effect
  const chunkSize = Math.ceil(images.length / 4);
  const rows = useMemo(() => {
    const result: string[][] = [];
    for (let i = 0; i < 4; i++) {
      const start = i * chunkSize;
      // Duplicate the images for seamless looping
      const chunk = images.slice(start, start + chunkSize);
      result.push([...chunk, ...chunk]);
    }
    return result;
  }, [images, chunkSize]);

  return (
    <div className={cn("relative mx-auto h-[400px] w-full max-w-7xl overflow-hidden rounded-3xl", className)}>
      {/* 3D perspective container */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-8"
        style={{
          perspective: "800px",
          perspectiveOrigin: "center center",
        }}
      >
        <div
          className="flex flex-col gap-4"
          style={{
            transform: "rotateX(30deg) rotateY(-10deg) rotateZ(10deg) scale(1.5)",
            transformStyle: "preserve-3d",
          }}
        >
          {rows.map((row, rowIdx) => (
            <motion.div
              key={rowIdx}
              className="flex gap-4"
              animate={{
                x: rowIdx % 2 === 0 ? ["-50%", "0%"] : ["0%", "-50%"],
              }}
              transition={{
                duration: rowIdx % 2 === 0 ? 30 : 40,
                repeat: Infinity,
                ease: "linear",
              }}
            >
              {row.map((src, imgIdx) => (
                <div
                  key={`${rowIdx}-${imgIdx}`}
                  className="relative h-24 w-40 flex-shrink-0 overflow-hidden rounded-lg border border-border/30"
                >
                  <img
                    src={src}
                    alt={`showcase-${rowIdx}-${imgIdx}`}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </div>
              ))}
            </motion.div>
          ))}
        </div>
      </div>
      {/* Gradient overlays for fade effect */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background via-transparent to-background" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-background via-transparent to-background" />
    </div>
  );
}
