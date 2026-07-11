'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { usePipelineStore } from '@/lib/store'
import { STAGES, type StageId, type BloomLevel, BLOOM_LEVELS } from '@/lib/types'
import { BLOOM_META } from '@/lib/bloom'
import {
  Upload,
  ScanEye,
  Sparkles,
  MessageSquareQuote,
  ShieldCheck,
  ListChecks,
  RotateCcw,
  CornerDownLeft,
} from 'lucide-react'

const STAGE_ICON: Record<StageId, typeof Upload> = {
  upload: Upload,
  extraction: ScanEye,
  generation: Sparkles,
  answering: MessageSquareQuote,
  verification: ShieldCheck,
  results: ListChecks,
}

/**
 * CommandPalette — Cmd/Ctrl+K quick-actions palette.
 *
 * Actions:
 *  - Navigate to any started stage
 *  - Set Bloom difficulty level
 *  - Start a new run (reset)
 *
 * Opens with Cmd/Ctrl+K or Cmd/Ctrl+J. Closes on Escape / selection.
 */
export function CommandPalette() {
  const [open, setOpen] = React.useState(false)
  const setActiveStage = usePipelineStore((s) => s.setActiveStage)
  const stages = usePipelineStore((s) => s.stages)
  const resetRun = usePipelineStore((s) => s.resetRun)
  const setBloomLevel = usePipelineStore((s) => s.setBloomLevel)
  const bloomLevel = usePipelineStore((s) => s.bloomLevel)

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'j')) {
        e.preventDefault()
        setOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="overflow-hidden border-[3px] border-border bg-popover p-0 shadow-[6px_6px_0_0_black] sm:max-w-[560px]">
        <DialogTitle className="sr-only">Command palette</DialogTitle>
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            <Command className="rounded-none">
              <CommandInput placeholder="Type a command or search…" />
              <CommandList className="max-h-[360px]">
                <CommandEmpty>No results found.</CommandEmpty>

                <CommandGroup heading="Navigate">
                  {STAGES.map((s) => {
                    const Icon = STAGE_ICON[s.id]
                    const stageState = stages[s.id]
                    const enabled = s.id === 'upload' || stageState.status !== 'idle'
                    return (
                      <CommandItem
                        key={s.id}
                        disabled={!enabled}
                        onSelect={() => {
                          setActiveStage(s.id)
                          setOpen(false)
                        }}
                        className="aria-disabled:opacity-40"
                      >
                        <Icon className="size-4 text-muted-foreground" />
                        <span>{s.label}</span>
                        <span className="ml-auto text-[10px] text-muted-foreground">
                          {s.agent}
                        </span>
                      </CommandItem>
                    )
                  })}
                </CommandGroup>

                <CommandSeparator />

                <CommandGroup heading="Difficulty (Bloom's level)">
                  {BLOOM_LEVELS.map((level: BloomLevel) => (
                    <CommandItem
                      key={level}
                      onSelect={() => {
                        setBloomLevel(level)
                        setOpen(false)
                      }}
                    >
                      <span
                        className="size-2.5 rounded-full"
                        style={{ backgroundColor: BLOOM_META[level].hue }}
                      />
                      <span>{level}</span>
                      <span className="ml-auto font-mono text-[10px] text-muted-foreground">
                        {BLOOM_META[level].verb}
                      </span>
                      {bloomLevel === level && (
                        <CornerDownLeft className="ml-1 size-3 text-primary" />
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>

                <CommandSeparator />

                <CommandGroup heading="Actions">
                  <CommandItem
                    onSelect={() => {
                      resetRun()
                      setOpen(false)
                    }}
                  >
                    <RotateCcw className="size-4 text-muted-foreground" />
                    <span>Start a new run</span>
                    <span className="ml-auto text-[10px] text-muted-foreground">
                      resets the pipeline
                    </span>
                  </CommandItem>
                </CommandGroup>
              </CommandList>
            </Command>
          </motion.div>
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  )
}
