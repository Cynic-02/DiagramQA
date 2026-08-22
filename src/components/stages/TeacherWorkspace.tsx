'use client'

import * as React from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Sparkles, Trash2, ArrowRightLeft, Sliders, Loader2, Check, AlertTriangle, Eye, EyeOff
} from 'lucide-react'
import { toast } from 'sonner'
import { BLOOM_META } from '@/lib/bloom'
import type { BloomLevel } from '@/lib/types'

interface QuestionRow {
  id: string
  bloomLevel: string
  type: string
  text: string
  options: string[] | null
  correctOptionIndex?: number | null
  answer: string
  explanation?: string | null
  verificationScore?: number | null
  verificationVerdict?: string | null
  isApproved: boolean
}

interface TeacherWorkspaceProps {
  runId: string
  questions: QuestionRow[]
  onQuestionsUpdate: (updated: QuestionRow[]) => void
}

export function TeacherWorkspace({ runId, questions, onQuestionsUpdate }: TeacherWorkspaceProps) {
  const [loadingId, setLoadingId] = React.useState<string | null>(null)
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [editedText, setEditedText] = React.useState('')
  const [editedAnswer, setEditedAnswer] = React.useState('')
  const [editedExplanation, setEditedExplanation] = React.useState('')
  const [editedOptions, setEditedOptions] = React.useState<string[]>([])
  const [editedCorrectIndex, setEditedCorrectIndex] = React.useState<number>(0)

  const handleStartEdit = (q: QuestionRow) => {
    setEditingId(q.id)
    setEditedText(q.text)
    setEditedAnswer(q.answer)
    setEditedExplanation(q.explanation || '')
    setEditedOptions(q.options ? [...q.options] : [])
    setEditedCorrectIndex(q.correctOptionIndex || 0)
  }

  const handleSaveEdit = async (q: QuestionRow) => {
    setLoadingId(q.id)
    try {
      const res = await fetch(`/api/questions/${q.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: editedText,
          answer: editedAnswer,
          explanation: editedExplanation,
          options: q.type === 'MCQ' ? editedOptions : null,
          correctOptionIndex: q.type === 'MCQ' ? editedCorrectIndex : null,
        })
      })
      if (!res.ok) throw new Error('Failed to update question')
      const updatedQ = await res.json()
      
      const newQs = questions.map((item) => (item.id === q.id ? {
        ...item,
        text: updatedQ.text,
        answer: updatedQ.answer,
        explanation: updatedQ.explanation,
        options: updatedQ.options,
        correctOptionIndex: updatedQ.correctOptionIndex,
      } : item))
      
      onQuestionsUpdate(newQs)
      setEditingId(null)
      toast.success('Question updated successfully')
    } catch (e) {
      toast.error('Could not save edits')
    } finally {
      setLoadingId(null)
    }
  }

  const handleRegenerate = async (qId: string) => {
    setLoadingId(qId)
    toast.info('Regenerating question with AI...')
    try {
      const res = await fetch(`/api/questions/${qId}/regenerate`, { method: 'POST' })
      if (!res.ok) throw new Error()
      const updatedQ = await res.json()
      
      const newQs = questions.map((item) => (item.id === qId ? {
        ...item,
        text: updatedQ.text,
        answer: updatedQ.answer,
        explanation: updatedQ.explanation,
        options: updatedQ.options,
        correctOptionIndex: updatedQ.correctOptionIndex,
        verificationScore: updatedQ.verificationScore,
        verificationVerdict: updatedQ.verificationVerdict,
      } : item))
      
      onQuestionsUpdate(newQs)
      toast.success('New question generated!')
    } catch {
      toast.error('AI regeneration failed')
    } finally {
      setLoadingId(null)
    }
  }

  const handleConvertType = async (q: QuestionRow) => {
    setLoadingId(q.id)
    const targetType = q.type === 'MCQ' ? 'SHORT' : 'MCQ'
    toast.info(`Converting to ${targetType === 'MCQ' ? 'Multiple Choice' : 'Short Answer'}...`)
    try {
      const res = await fetch(`/api/questions/${q.id}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetType }),
      })
      if (!res.ok) throw new Error()
      const updatedQ = await res.json()
      
      const newQs = questions.map((item) => (item.id === q.id ? {
        ...item,
        type: updatedQ.type,
        text: updatedQ.text,
        answer: updatedQ.answer,
        explanation: updatedQ.explanation,
        options: updatedQ.options,
        correctOptionIndex: updatedQ.correctOptionIndex,
      } : item))
      
      onQuestionsUpdate(newQs)
      toast.success(`Converted to ${targetType === 'MCQ' ? 'MCQ' : 'Short Answer'}`)
    } catch {
      toast.error('Conversion failed')
    } finally {
      setLoadingId(null)
    }
  }

  const handleAdjustDifficulty = async (qId: string, action: 'easier' | 'harder') => {
    setLoadingId(qId)
    toast.info(`Making question ${action}...`)
    try {
      const res = await fetch(`/api/questions/${qId}/difficulty`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      if (!res.ok) throw new Error()
      const updatedQ = await res.json()
      
      const newQs = questions.map((item) => (item.id === qId ? {
        ...item,
        text: updatedQ.text,
        answer: updatedQ.answer,
        explanation: updatedQ.explanation,
        options: updatedQ.options,
        correctOptionIndex: updatedQ.correctOptionIndex,
      } : item))
      
      onQuestionsUpdate(newQs)
      toast.success(`Question is now ${action}!`)
    } catch {
      toast.error('Failed to adjust difficulty')
    } finally {
      setLoadingId(null)
    }
  }

  const handleDelete = async (qId: string) => {
    if (!confirm('Are you sure you want to delete this question?')) return
    setLoadingId(qId)
    try {
      const res = await fetch(`/api/questions/${qId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      
      const newQs = questions.filter((item) => item.id !== qId)
      onQuestionsUpdate(newQs)
      toast.success('Question deleted')
    } catch {
      toast.error('Delete failed')
    } finally {
      setLoadingId(null)
    }
  }

  return (
    /* Review mode was still a single column of full-width rows while
       View mode had already moved to a grid, so the same four questions
       changed shape depending on which tab you were on. Same grid, same
       even rows — the only difference between the two modes should be
       what you can do to a question, not how wide it is. */
    <div className="grid gap-6 xl:grid-cols-2 min-[2000px]:grid-cols-3">
      {questions.map((q, idx) => {
        const isEditing = editingId === q.id
        const isLoading = loadingId === q.id
        const isMcq = q.type === 'MCQ'
        
        const hue = BLOOM_META[q.bloomLevel as BloomLevel]?.hue ?? 'var(--line)'

        return (
          /* Three grounds, one card, and the hue is the card's own Bloom
             level rather than a decoration: a tinted header strip, the
             graph-paper working area where the answer lives, and the
             card ground under the controls. It costs one colour per
             card and it is the difference between reading a page of
             questions and scanning a stack of forms. */
          <Card
            key={q.id}
            className="lift glass-surface relative h-full gap-0 overflow-hidden p-0 shadow-[2px_2px_0_var(--line)]"
            style={{ '--sh': '2px' } as React.CSSProperties}
          >
            <span
              className="absolute inset-y-0 left-0 w-[6px] rounded-none"
              style={{ background: hue }}
              aria-hidden
            />
            {isLoading && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--card)]/75">
                <Loader2 className="size-6 animate-spin text-[var(--red)]" />
              </div>
            )}

            <div className="flex h-full flex-col pl-[6px]">
              {/* Header */}
              <div
                className="flex items-center justify-between gap-3 border-b-2 border-[var(--line)]/12 px-4 py-2.5"
                style={{ background: `color-mix(in srgb, ${hue} 13%, transparent)` }}
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-muted-foreground uppercase">
                    Question {idx + 1}
                  </span>
                  <span className="text-[10px] bg-primary/10 border border-primary/20 text-primary px-2 py-0.5 rounded-full font-bold">
                    {q.bloomLevel}
                  </span>
                  <span className="text-[10px] bg-secondary/10 border border-secondary/20 text-secondary px-2 py-0.5 rounded-full font-bold">
                    {q.type}
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={() => handleConvertType(q)}
                    disabled={isEditing}
                    className="h-7 text-[10px] font-bold text-muted-foreground hover:text-foreground gap-1"
                  >
                    <ArrowRightLeft className="size-3" />
                    Convert to {isMcq ? 'Short' : 'MCQ'}
                  </Button>
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={() => handleDelete(q.id)}
                    className="h-7 text-[10px] font-bold text-destructive hover:bg-destructive/10 hover:text-destructive gap-1"
                  >
                    <Trash2 className="size-3" />
                    Delete
                  </Button>
                </div>
              </div>

              {/* Main Editing / Viewing Pane */}
              {isEditing ? (
                <div className="space-y-3">
                  {/* Question input */}
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Question Text</Label>
                    <Input
                      type="text"
                      value={editedText}
                      onChange={(e) => setEditedText(e.target.value)}
                      className="text-xs"
                    />
                  </div>

                  {/* MCQ Options */}
                  {isMcq && editedOptions.length > 0 && (
                    <div className="space-y-2 pl-2 border-l-2 border-border/40">
                      <Label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Options</Label>
                      {editedOptions.map((opt, oIdx) => (
                        <div key={oIdx} className="flex gap-2 items-center">
                          <span className="font-mono text-xs font-bold">{String.fromCharCode(65 + oIdx)}</span>
                          <Input
                            type="text"
                            value={opt}
                            onChange={(e) => {
                              const opts = [...editedOptions]
                              opts[oIdx] = e.target.value
                              setEditedOptions(opts)
                              // If correct choice matches the text, keep index
                              if (oIdx === editedCorrectIndex) {
                                setEditedAnswer(e.target.value)
                              }
                            }}
                            className="text-xs flex-1 h-8"
                          />
                          <input
                            type="radio"
                            name={`edit-correct-${q.id}`}
                            checked={oIdx === editedCorrectIndex}
                            onChange={() => {
                              setEditedCorrectIndex(oIdx)
                              setEditedAnswer(editedOptions[oIdx])
                            }}
                            title="Mark as correct choice"
                            className="size-3.5 text-primary cursor-pointer"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Short Answer */}
                  {!isMcq && (
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Correct Answer</Label>
                      <Input
                        type="text"
                        value={editedAnswer}
                        onChange={(e) => setEditedAnswer(e.target.value)}
                        className="text-xs"
                      />
                    </div>
                  )}

                  {/* Explanation */}
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Explanation / Reasoning</Label>
                    <textarea
                      value={editedExplanation}
                      onChange={(e) => setEditedExplanation(e.target.value)}
                      className="w-full min-h-16 rounded-md border border-border bg-card p-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                    />
                  </div>

                  <div className="-mx-4 -mb-4 mt-auto flex justify-end gap-2 border-t-2 border-[var(--line)]/12 bg-[color-mix(in_srgb,var(--card)_45%,transparent)] px-4 py-2.5">
                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                      Cancel
                    </Button>
                    <Button size="sm" onClick={() => handleSaveEdit(q)}>
                      Save Changes
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="glass-inner flex flex-1 flex-col gap-3 px-4 py-4">
                  {/* Viewing */}
                  <p className="text-sm font-bold text-foreground">{q.text}</p>
                  
                  {isMcq && q.options && (
                    <ul className="space-y-1.5 pl-2">
                      {q.options.map((opt, oIdx) => {
                        const isCorrect = oIdx === q.correctOptionIndex
                        return (
                          <li 
                            key={oIdx} 
                            className={`flex items-center gap-2 rounded-[var(--r-s)] border-[1.5px] px-3 py-1.5 text-xs ${
                              isCorrect
                                ? 'border-[var(--line)] bg-[var(--bloom-3)] font-bold text-[#0a0a0a]'
                                : 'border-[var(--line)]/20 bg-[var(--card)] text-[var(--ink-2)]'
                            }`}
                          >
                            <span className="font-mono text-[10px] font-bold">{String.fromCharCode(65 + oIdx)}</span>
                            <span className="flex-1">{opt}</span>
                            {isCorrect && <Check className="size-3.5" />}
                          </li>
                        )
                      })}
                    </ul>
                  )}

                  {!isMcq && (
                    <div
                      className="rounded-[var(--r-s)] border-[1.5px] border-[var(--line)]/25 bg-[var(--card)] px-3.5 py-2.5"
                      style={{ borderLeft: `4px solid ${hue}` }}
                    >
                      <div className="fig-label mb-1">Correct answer</div>
                      <p className="text-xs font-bold leading-relaxed">{q.answer}</p>
                    </div>
                  )}

                  {q.explanation && (
                    <div className="rounded-[var(--r-s)] border-[1.5px] border-dashed border-[var(--line)]/25 px-3.5 py-2.5 text-[11px] leading-relaxed text-[var(--ink-2)]">
                      <span className="fig-label mb-1">Explanation</span>
                      {q.explanation}
                    </div>
                  )}

                  <div className="-mx-4 -mb-4 mt-auto flex flex-wrap items-center justify-between gap-2 border-t-2 border-[var(--line)]/12 bg-[color-mix(in_srgb,var(--card)_45%,transparent)] px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => handleStartEdit(q)}
                        className="h-8 text-xs font-bold"
                      >
                        Edit Inline
                      </Button>
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => handleRegenerate(q.id)}
                        className="h-8 text-xs font-bold gap-1 text-primary hover:text-primary"
                      >
                        <Sparkles className="size-3" />
                        Regenerate
                      </Button>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={() => handleAdjustDifficulty(q.id, 'easier')}
                        className="h-8 text-[11px] font-bold text-muted-foreground hover:text-foreground gap-1"
                      >
                        <Sliders className="size-3 text-emerald-500" />
                        Make Easier
                      </Button>
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={() => handleAdjustDifficulty(q.id, 'harder')}
                        className="h-8 text-[11px] font-bold text-muted-foreground hover:text-foreground gap-1"
                      >
                        <Sliders className="size-3 text-destructive" />
                        Make Harder
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>
        )
      })}
    </div>
  )
}
