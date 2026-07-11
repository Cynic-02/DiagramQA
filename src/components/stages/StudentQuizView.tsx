'use client'

import * as React from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  CheckCircle, Loader2, Award, Sparkles, BookOpen, AlertCircle, RefreshCw, Layers
} from 'lucide-react'
import { toast } from 'sonner'

interface Question {
  id: string
  question: string
  answer: string
  bloomLevel: string
  cognitiveSkill: string
  questionType?: string
  options?: string[]
  correctOptionIndex?: number
}

interface StudentQuizViewProps {
  runId: string
  questions: Question[]
}

export function StudentQuizView({ runId, questions }: StudentQuizViewProps) {
  const [activeTab, setActiveTab] = React.useState<'quiz' | 'flashcards'>('quiz')
  const [currentIndex, setCurrentIndex] = React.useState(0)
  const [textAnswer, setTextAnswer] = React.useState('')
  const [pickedOption, setPickedOption] = React.useState<number | null>(null)
  
  // Quiz answers map
  const [answers, setAnswers] = React.useState<Record<number, {
    answerText: string
    pickedOption: number | null
    isCorrect: boolean
    score: number // 0-100
    feedback?: string
    studyTip?: string
    weakConcepts?: string[]
    submitted: boolean
  }>>({})

  const [grading, setGrading] = React.useState(false)
  const [quizFinished, setQuizFinished] = React.useState(false)
  const [savingAttempt, setSavingAttempt] = React.useState(false)

  // Flashcards state
  const [flashcardIndex, setFlashcardIndex] = React.useState(0)
  const [flashcardFlipped, setFlashcardFlipped] = React.useState(false)

  const currentQuestion = questions[currentIndex]
  const currentAnswer = answers[currentIndex] || {
    answerText: '',
    pickedOption: null,
    isCorrect: false,
    score: 0,
    submitted: false
  }

  const isMcq = currentQuestion.questionType === 'mcq' && !!currentQuestion.options && currentQuestion.options.length > 0

  const handlePickMCQ = (idx: number) => {
    if (currentAnswer.submitted) return
    setPickedOption(idx)
  }

  const handleSubmit = async () => {
    setGrading(true)
    const isCorrect = isMcq ? pickedOption === currentQuestion.correctOptionIndex : false
    const score = isMcq ? (isCorrect ? 100 : 0) : 0

    if (isMcq) {
      setAnswers({
        ...answers,
        [currentIndex]: {
          answerText: currentQuestion.options![pickedOption!],
          pickedOption,
          isCorrect,
          score,
          feedback: isCorrect 
            ? 'Excellent! You picked the correct option.' 
            : `Incorrect. The correct option was ${String.fromCharCode(65 + currentQuestion.correctOptionIndex!)}: ${currentQuestion.options![currentQuestion.correctOptionIndex!]}`,
          submitted: true
        }
      })
      setGrading(false)
    } else {
      // Short answer: Call AI grading
      try {
        const res = await fetch(`/api/runs/${runId}/grade`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            questionId: currentQuestion.id,
            studentAnswer: textAnswer,
          })
        })
        if (!res.ok) throw new Error()
        const gradeReport = await res.json()

        setAnswers({
          ...answers,
          [currentIndex]: {
            answerText: textAnswer,
            pickedOption: null,
            isCorrect: gradeReport.score >= 70,
            score: gradeReport.score,
            feedback: gradeReport.feedback,
            studyTip: gradeReport.studyTip,
            weakConcepts: gradeReport.weakConcepts,
            submitted: true
          }
        })
      } catch {
        toast.error('AI Grading failed. Self-grading at 50%')
        setAnswers({
          ...answers,
          [currentIndex]: {
            answerText: textAnswer,
            pickedOption: null,
            isCorrect: true,
            score: 70,
            feedback: 'AI grading service was offline. Review your answer against the reference.',
            submitted: true
          }
        })
      } finally {
        setGrading(false)
      }
    }
  }

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1)
      setTextAnswer('')
      setPickedOption(null)
    }
  }

  const handleFinish = async () => {
    setSavingAttempt(true)
    
    // Compute stats
    const totalScore = Object.values(answers).reduce((sum, a) => sum + a.score, 0)
    const avgScore = Math.round(totalScore / questions.length)

    try {
      await fetch(`/api/runs/${runId}/attempts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          score: avgScore,
          total: questions.length,
          answers: answers,
        })
      })
      toast.success('Practice session recorded in history!')
    } catch {
      console.error('Failed to log attempt')
    } finally {
      setSavingAttempt(false)
      setQuizFinished(true)
    }
  }

  const handleReset = () => {
    setCurrentIndex(0)
    setTextAnswer('')
    setPickedOption(null)
    setAnswers({})
    setQuizFinished(false)
  }

  // Aggregate Mastery stats
  const averageQuizScore = React.useMemo(() => {
    const vals = Object.values(answers)
    if (vals.length === 0) return 0
    return Math.round(vals.reduce((sum, a) => sum + a.score, 0) / vals.length)
  }, [answers])

  const weakConceptsAll = React.useMemo(() => {
    const list: string[] = []
    Object.values(answers).forEach((a) => {
      if (a.weakConcepts) {
        a.weakConcepts.forEach((c) => {
          if (!list.includes(c)) list.push(c)
        } )
      }
    })
    return list
  }, [answers])

  return (
    <div className="space-y-4">
      {/* Quiz tab selector */}
      <div className="flex border-b border-border/40 pb-2 gap-4">
        <button
          onClick={() => setActiveTab('quiz')}
          className={`pb-1 text-xs font-bold transition-all ${
            activeTab === 'quiz' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          📝 Practice Quiz
        </button>
        <button
          onClick={() => setActiveTab('flashcards')}
          className={`pb-1 text-xs font-bold transition-all ${
            activeTab === 'flashcards' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          🗂️ Ingested Flashcards
        </button>
      </div>

      {activeTab === 'flashcards' ? (
        <div className="max-w-xl mx-auto space-y-4">
          <div 
            onClick={() => setFlashcardFlipped(!flashcardFlipped)}
            className="h-64 border-2 border-dashed border-primary/20 bg-card hover:bg-muted/10 rounded-2xl flex flex-col items-center justify-center p-6 text-center cursor-pointer shadow-sm relative group"
          >
            <span className="absolute top-4 right-4 text-[10px] font-mono text-muted-foreground uppercase">
              Card {flashcardIndex + 1} of {questions.length}
            </span>

            {flashcardFlipped ? (
              <div className="space-y-3">
                <span className="text-[10px] uppercase font-mono tracking-wider text-emerald-500 font-bold bg-emerald-500/10 px-2 py-0.5 border border-emerald-500/20 rounded-full">
                  Expected Answer
                </span>
                <p className="text-sm font-bold text-foreground max-w-sm">{questions[flashcardIndex].answer}</p>
              </div>
            ) : (
              <div className="space-y-3">
                <span className="text-[10px] uppercase font-mono tracking-wider text-primary font-bold bg-primary/10 px-2 py-0.5 border border-primary/20 rounded-full">
                  Question
                </span>
                <p className="text-sm font-black text-foreground max-w-sm">{questions[flashcardIndex].question}</p>
              </div>
            )}

            <span className="absolute bottom-4 text-[10px] text-muted-foreground font-bold group-hover:text-foreground">
              Click to flip card
            </span>
          </div>

          <div className="flex justify-between items-center max-w-md mx-auto">
            <Button
              size="sm"
              variant="outline"
              disabled={flashcardIndex === 0}
              onClick={() => {
                setFlashcardIndex(flashcardIndex - 1)
                setFlashcardFlipped(false)
              }}
            >
              Previous Card
            </Button>
            <Button
              size="sm"
              disabled={flashcardIndex === questions.length - 1}
              onClick={() => {
                setFlashcardIndex(flashcardIndex + 1)
                setFlashcardFlipped(false)
              }}
            >
              Next Card
            </Button>
          </div>
        </div>
      ) : quizFinished ? (
        /* Mastery Dashboard */
        <Card className="p-8 text-center max-w-xl mx-auto space-y-6 rounded-2xl border-2 border-border/80 bg-card">
          <div className="inline-flex size-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/30">
            <Award className="size-8 animate-bounce" />
          </div>
          
          <div className="space-y-2">
            <h2 className="text-xl font-black uppercase tracking-tight">Practice Unit Finished!</h2>
            <p className="text-xs text-muted-foreground">
              You have completed all {questions.length} questions in this diagram study unit.
            </p>
          </div>

          <div className="border border-border/40 rounded-xl p-4 bg-muted/10 grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="text-[10px] font-mono uppercase text-muted-foreground">Total Questions</div>
              <div className="text-base font-black">{questions.length}</div>
            </div>
            <div className="space-y-1">
              <div className="text-[10px] font-mono uppercase text-muted-foreground">Mastery Score</div>
              <div className="text-base font-black text-emerald-500">
                {averageQuizScore}%
              </div>
            </div>
          </div>

          {/* Weak Concepts and Study Plan */}
          <div className="text-left space-y-3 pt-3 border-t border-border/30">
            <h4 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
              <Sparkles className="size-3.5" />
              AI Concept Mastery Report
            </h4>
            
            {weakConceptsAll.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Our analysis indicates you might want to review the following diagram entities:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {weakConceptsAll.map((concept, i) => (
                    <span key={i} className="text-[10px] font-bold border border-amber-500/30 bg-amber-500/10 text-amber-600 rounded-full px-2.5 py-0.5">
                      ⚠️ {concept}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-emerald-600 font-bold bg-emerald-500/10 p-2.5 border border-emerald-500/20 rounded-lg">
                🎉 Perfect understanding! You have mastered all entities and connections in this diagram.
              </p>
            )}

            <div className="bg-muted/10 p-3 rounded-lg border border-border/40 space-y-1 text-xs">
              <span className="font-bold text-[10px] uppercase text-muted-foreground flex items-center gap-1">
                <BookOpen className="size-3" /> Recommended study plan
              </span>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {weakConceptsAll.length > 0
                  ? `Focus on reviewing relationships involving "${weakConceptsAll.join(', ')}". Try creating mock flow diagrams connecting these modules.`
                  : 'Great job. Continue testing other diagrams or increase the Bloom levels to Analyze and Create to test edge conditions.'}
              </p>
            </div>
          </div>

          <div className="flex justify-center gap-3">
            <Button variant="outline" size="sm" onClick={handleReset}>
              Restart Practice
            </Button>
          </div>
        </Card>
      ) : (
        /* Quiz Mode */
        <Card className="p-6 max-w-xl mx-auto space-y-6 rounded-2xl border border-border/80 bg-card">
          <div className="flex items-center justify-between border-b border-border/30 pb-3">
            <span className="text-xs font-mono font-bold text-muted-foreground uppercase">
              Practice Unit · Q{currentIndex + 1} of {questions.length}
            </span>
            <div className="w-32 bg-muted h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-primary h-full transition-all duration-300"
                style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-[10px] bg-primary/10 border border-primary/20 text-primary px-2 py-0.5 rounded-full font-bold">
                {currentQuestion.bloomLevel}
              </span>
              <span className="text-[10px] bg-secondary/10 border border-secondary/20 text-secondary px-2 py-0.5 rounded-full font-bold">
                {currentQuestion.cognitiveSkill}
              </span>
            </div>
            
            <p className="text-base font-bold leading-relaxed text-foreground">{currentQuestion.question}</p>

            {isMcq ? (
              <ul className="space-y-2">
                {currentQuestion.options!.map((opt, i) => {
                  const isPicked = i === pickedOption
                  const isCorrect = i === currentQuestion.correctOptionIndex
                  
                  let btnCls = 'border-border bg-background hover:border-primary/50'
                  if (isPicked) btnCls = 'border-primary bg-primary/5 text-primary font-bold'
                  
                  if (currentAnswer.submitted) {
                    if (isCorrect) btnCls = 'border-emerald-500 bg-emerald-500/10 text-emerald-600 font-bold'
                    else if (isPicked) btnCls = 'border-destructive bg-destructive/10 text-destructive'
                    else btnCls = 'border-border/30 opacity-60 bg-transparent'
                  }

                  return (
                    <li key={i}>
                      <button
                        type="button"
                        disabled={currentAnswer.submitted || grading}
                        onClick={() => handlePickMCQ(i)}
                        className={`flex w-full items-center gap-3 border-2 px-3 py-2.5 text-left text-xs transition-all rounded-xl cursor-pointer ${btnCls}`}
                      >
                        <span className="font-mono font-black">{String.fromCharCode(65 + i)}</span>
                        <span className="flex-1">{opt}</span>
                        {currentAnswer.submitted && isCorrect && <CheckCircle className="size-4 text-emerald-500 shrink-0" />}
                      </button>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <div className="space-y-3">
                <Label htmlFor="short-answer-input" className="text-xs font-mono uppercase text-muted-foreground">
                  Your Answer Explanation
                </Label>
                <textarea
                  id="short-answer-input"
                  disabled={currentAnswer.submitted || grading}
                  value={textAnswer}
                  onChange={(e) => setTextAnswer(e.target.value)}
                  className="w-full h-24 rounded-lg border border-border bg-background p-3 text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                  placeholder="Explain your answer based on diagram elements..."
                />
              </div>
            )}
          </div>

          {currentAnswer.submitted && (
            <div className="border border-border/60 rounded-xl bg-muted/10 p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-border/20 pb-2">
                <span className="text-[10px] font-mono uppercase text-muted-foreground font-bold">
                  AI Evaluation Report
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  currentAnswer.score >= 70 ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'
                }`}>
                  Score: {currentAnswer.score}/100
                </span>
              </div>
              
              <div className="space-y-1.5 text-xs text-foreground">
                <p className="leading-relaxed"><strong className="text-[10.5px] uppercase text-muted-foreground block mb-0.5">Feedback</strong> {currentAnswer.feedback}</p>
                {currentAnswer.studyTip && (
                  <p className="leading-relaxed pt-2 border-t border-border/10 text-muted-foreground">
                    <strong className="text-[10.5px] uppercase text-primary block mb-0.5">Study Tip</strong> {currentAnswer.studyTip}
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-between items-center pt-3 border-t border-border/30">
            <Button
              size="sm"
              variant="outline"
              type="button"
              disabled={currentIndex === 0 || grading}
              onClick={() => {
                setCurrentIndex(currentIndex - 1)
                const prev = answers[currentIndex - 1]
                if (prev) {
                  setTextAnswer(prev.answerText)
                  setPickedOption(prev.pickedOption)
                }
              }}
            >
              Previous
            </Button>

            {!currentAnswer.submitted ? (
              <Button
                size="sm"
                type="button"
                disabled={grading || (isMcq ? pickedOption === null : !textAnswer.trim())}
                onClick={handleSubmit}
                className="gap-1.5"
              >
                {grading ? <Loader2 className="size-3 animate-spin" /> : null}
                Submit Answer
              </Button>
            ) : currentIndex < questions.length - 1 ? (
              <Button
                size="sm"
                type="button"
                onClick={handleNext}
              >
                Next Question
              </Button>
            ) : (
              <Button
                size="sm"
                type="button"
                disabled={savingAttempt}
                onClick={handleFinish}
                className="gap-1.5"
              >
                {savingAttempt ? <Loader2 className="size-3 animate-spin" /> : null}
                Finish Quiz
              </Button>
            )}
          </div>
        </Card>
      )}
    </div>
  )
}
