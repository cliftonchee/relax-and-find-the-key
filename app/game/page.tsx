'use client'

import { useEffect, useReducer } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Suspense } from 'react'
import { generateQuestions, Problem, Difficulty } from '@/lib/generate'
import { calculateQuestionScore, isCorrectAnswer, TIME_PER_QUESTION } from '@/lib/scoring'
import { traceClosureSteps, ClosureTrace } from '@/lib/solver'
import { TimerRing } from '@/components/TimerRing'
import { AttributeChip } from '@/components/AttributeChip'
import { FDDisplay } from '@/components/FDDisplay'
import { FDChainVisualizer } from '@/components/FDChainVisualizer'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

type Phase = 'loading' | 'playing' | 'feedback' | 'finished'

interface GameState {
  difficulty: Difficulty
  questions: Problem[]
  currentIndex: number
  score: number
  selectedAttrs: string[]
  submittedKeys: string[][]
  timeRemaining: number
  phase: Phase
  lastCorrect: boolean
  pointsEarned: number
  closureTrace: ClosureTrace | null
}

type Action =
  | { type: 'INIT'; questions: Problem[] }
  | { type: 'TOGGLE_ATTR'; attr: string }
  | { type: 'ADD_KEY' }
  | { type: 'SUBMIT_ANSWER' }
  | { type: 'TICK' }
  | { type: 'TIMEOUT' }
  | { type: 'NEXT_QUESTION' }

function initialState(difficulty: Difficulty): GameState {
  return {
    difficulty,
    questions: [],
    currentIndex: 0,
    score: 0,
    selectedAttrs: [],
    submittedKeys: [],
    timeRemaining: TIME_PER_QUESTION[difficulty],
    phase: 'loading',
    lastCorrect: false,
    pointsEarned: 0,
    closureTrace: null,
  }
}

function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'INIT':
      return { ...state, questions: action.questions, phase: 'playing' }

    case 'TOGGLE_ATTR': {
      if (state.phase !== 'playing') return state
      const selected = state.selectedAttrs.includes(action.attr)
        ? state.selectedAttrs.filter(a => a !== action.attr)
        : [...state.selectedAttrs, action.attr]
      return { ...state, selectedAttrs: selected }
    }

    case 'ADD_KEY': {
      if (state.selectedAttrs.length === 0) return state
      return {
        ...state,
        submittedKeys: [...state.submittedKeys, [...state.selectedAttrs].sort()],
        selectedAttrs: [],
      }
    }

    case 'SUBMIT_ANSWER': {
      const question = state.questions[state.currentIndex]
      // Include any currently selected attrs as a final key
      const allKeys = [
        ...state.submittedKeys,
        ...(state.selectedAttrs.length > 0 ? [[...state.selectedAttrs].sort()] : []),
      ]
      if (allKeys.length === 0) return state
      const correct = isCorrectAnswer(allKeys, question.candidateKeys)
      const points = correct ? calculateQuestionScore(state.timeRemaining, state.difficulty) : 0
      const closureTrace = traceClosureSteps(question.candidateKeys[0], question.fds)
      return {
        ...state,
        score: state.score + points,
        submittedKeys: allKeys,
        selectedAttrs: [],
        phase: 'feedback',
        lastCorrect: correct,
        pointsEarned: points,
        closureTrace,
      }
    }

    case 'TICK':
      return { ...state, timeRemaining: state.timeRemaining - 1 }

    case 'TIMEOUT': {
      const question = state.questions[state.currentIndex]
      const closureTrace = traceClosureSteps(question.candidateKeys[0], question.fds)
      return {
        ...state,
        phase: 'feedback',
        lastCorrect: false,
        pointsEarned: 0,
        submittedKeys: question.candidateKeys, // show correct answer
        closureTrace,
      }
    }

    case 'NEXT_QUESTION': {
      if (state.currentIndex >= state.questions.length - 1) {
        return { ...state, phase: 'finished' }
      }
      return {
        ...state,
        currentIndex: state.currentIndex + 1,
        selectedAttrs: [],
        submittedKeys: [],
        timeRemaining: TIME_PER_QUESTION[state.difficulty],
        phase: 'playing',
        closureTrace: null,
      }
    }

    default:
      return state
  }
}

function GameContent({ difficulty }: { difficulty: Difficulty }) {
  const router = useRouter()
  const [state, dispatch] = useReducer(reducer, initialState(difficulty))

  // Generate questions on mount
  useEffect(() => {
    const questions = generateQuestions(difficulty)
    dispatch({ type: 'INIT', questions })
  }, [difficulty])

  // Countdown timer
  useEffect(() => {
    if (state.phase !== 'playing') return
    if (state.timeRemaining <= 0) {
      dispatch({ type: 'TIMEOUT' })
      return
    }
    const id = setTimeout(() => dispatch({ type: 'TICK' }), 1000)
    return () => clearTimeout(id)
  }, [state.phase, state.timeRemaining])

  // Auto-advance after feedback — give enough time for the FD chain animation
  useEffect(() => {
    if (state.phase !== 'feedback') return
    const steps = state.closureTrace?.steps.length ?? 0
    const delay = Math.max(3000, steps * 650 + 1800)
    const id = setTimeout(() => dispatch({ type: 'NEXT_QUESTION' }), delay)
    return () => clearTimeout(id)
  }, [state.phase, state.closureTrace])

  // Redirect when finished
  useEffect(() => {
    if (state.phase === 'finished') {
      router.push(`/result?score=${state.score}&difficulty=${difficulty}`)
    }
  }, [state.phase, state.score, difficulty, router])

  if (state.phase === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground text-lg">Generating questions...</p>
      </div>
    )
  }

  if (state.questions.length === 0) return null

  const question = state.questions[state.currentIndex]
  const isFeedback = state.phase === 'feedback'
  const questionNumber = state.currentIndex + 1

  return (
    <main className="min-h-screen flex flex-col items-center p-6 gap-6 max-w-2xl mx-auto">
      {/* Top bar */}
      <div className="w-full flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Question <span className="font-bold text-foreground">{questionNumber}</span> / {state.questions.length}
        </div>
        <div className="text-lg font-bold">Score: {state.score}</div>
      </div>

      <Progress value={(questionNumber / state.questions.length) * 100} className="w-full h-2" />

      {/* Timer + Schema */}
      <div className="w-full flex items-start gap-6">
        <TimerRing timeRemaining={state.timeRemaining} total={TIME_PER_QUESTION[state.difficulty]} />
        <Card className="flex-1">
          <CardHeader className="pb-2">
            <CardTitle className="font-mono text-xl">
              R({question.attributes.join(', ')})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-2">Functional Dependencies:</p>
            <FDDisplay fds={question.fds} />
          </CardContent>
        </Card>
      </div>

      {/* Instruction */}
      <p className="text-muted-foreground text-sm text-center">
        {question.candidateKeys.length === 1
          ? 'Select the attributes that form the candidate key, then submit.'
          : `Find all ${question.candidateKeys.length} candidate keys. Add each key then submit.`}
      </p>

      {/* Attribute chips */}
      <div className="flex flex-wrap gap-3 justify-center">
        {question.attributes.map(attr => (
          <AttributeChip
            key={attr}
            attr={attr}
            selected={state.selectedAttrs.includes(attr)}
            disabled={isFeedback}
            onClick={() => dispatch({ type: 'TOGGLE_ATTR', attr })}
          />
        ))}
      </div>

      {/* Submitted keys so far */}
      {state.submittedKeys.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <span className="text-sm text-muted-foreground">Submitted keys:</span>
          {state.submittedKeys.map((key, i) => (
            <Badge key={i} variant="secondary" className="font-mono">
              {'{' + key.join(', ') + '}'}
            </Badge>
          ))}
        </div>
      )}

      {/* Actions */}
      {!isFeedback && (
        <div className="flex gap-3">
          {question.candidateKeys.length > 1 && (
            <Button
              variant="outline"
              onClick={() => dispatch({ type: 'ADD_KEY' })}
              disabled={state.selectedAttrs.length === 0}
            >
              Add Key
            </Button>
          )}
          <Button
            onClick={() => dispatch({ type: 'SUBMIT_ANSWER' })}
            disabled={state.selectedAttrs.length === 0 && state.submittedKeys.length === 0}
          >
            Submit Answer
          </Button>
        </div>
      )}

      {/* Feedback banner */}
      {isFeedback && (
        <div className="w-full space-y-2">
          <div
            className={cn(
              'w-full rounded-lg p-4 text-center space-y-1 transition-all',
              state.lastCorrect
                ? 'bg-green-500/20 border border-green-500/40'
                : 'bg-red-500/20 border border-red-500/40'
            )}
          >
            <p className="text-lg font-bold">
              {state.lastCorrect ? `+${state.pointsEarned} points!` : 'Wrong answer'}
            </p>
            <p className="text-sm text-muted-foreground">
              Correct keys:{' '}
              {question.candidateKeys.map(k => '{' + k.join(', ') + '}').join(' and ')}
            </p>
          </div>
          {state.closureTrace && (
            <FDChainVisualizer
              trace={state.closureTrace}
              allAttributes={question.attributes}
            />
          )}
        </div>
      )}
    </main>
  )
}

export default function GamePage() {
  return (
    <Suspense>
      <GamePageInner />
    </Suspense>
  )
}

function GamePageInner() {
  const searchParams = useSearchParams()
  const difficulty = (searchParams.get('difficulty') ?? 'easy') as Difficulty
  return <GameContent difficulty={difficulty} />
}
