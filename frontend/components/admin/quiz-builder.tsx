import { useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import type { AdminQuiz, AdminQuizQuestionType } from "@/lib/types"

const generateId = () => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2))

export type QuizFormQuestionType = AdminQuizQuestionType

export interface QuizFormChoice {
  id: string
  text: string
  isCorrect: boolean
}

export interface QuizFormQuestion {
  id: string
  prompt: string
  type: QuizFormQuestionType
  points: number
  choices: QuizFormChoice[]
}

export interface QuizFormState {
  title: string
  passScore: number
  questions: QuizFormQuestion[]
}

export const createEmptyQuizForm = (): QuizFormState => ({
  title: "",
  passScore: 70,
  questions: [createEmptyQuestion()],
})

export const quizFormFromAdminQuiz = (quiz?: AdminQuiz | null): QuizFormState =>
  quiz
    ? {
        title: quiz.title,
        passScore: quiz.passScore,
        questions:
          quiz.questions?.map((question) => ({
            id: question.id || generateId(),
            prompt: question.promptHtml,
            type: question.type,
            points: question.points,
            choices:
              question.choices?.map((choice) => ({
                id: choice.id || generateId(),
                text: choice.choiceHtml,
                isCorrect: choice.isCorrect,
              })) ?? [],
          })) ?? [createEmptyQuestion()],
      }
    : createEmptyQuizForm()

export const validateQuizForm = (quiz: QuizFormState): string | null => {
  if (!quiz.title.trim()) {
    return "Quiz title is required."
  }
  if (quiz.passScore <= 0 || quiz.passScore > 100) {
    return "Quiz pass score must be between 1 and 100."
  }
  if (quiz.questions.length === 0) {
    return "Add at least one quiz question."
  }
  for (const question of quiz.questions) {
    if (!question.prompt.trim()) {
      return "Each quiz question needs a prompt."
    }
    if (question.points <= 0) {
      return "Question points must be greater than zero."
    }
    if (question.choices.length < 2) {
      return "Each question needs at least two answer choices."
    }
    if (!question.choices.some((choice) => choice.isCorrect)) {
      return "Each question must have at least one correct choice."
    }
    if (question.choices.some((choice) => !choice.text.trim())) {
      return "All answer choices require text."
    }
  }
  return null
}

const createEmptyQuestion = (): QuizFormQuestion => ({
  id: generateId(),
  prompt: "",
  type: "single",
  points: 1,
  choices: [
    { id: generateId(), text: "", isCorrect: true },
    { id: generateId(), text: "", isCorrect: false },
  ],
})

export const quizFormToPayload = (quiz: QuizFormState) => ({
  title: quiz.title.trim(),
  passScore: quiz.passScore,
  questions: quiz.questions.map((question) => ({
    promptHtml: question.prompt.trim(),
    type: question.type,
    points: question.points,
    choices: question.choices.map((choice) => ({
      choiceHtml: choice.text.trim(),
      isCorrect: choice.isCorrect,
    })),
  })),
})

interface QuizBuilderProps {
  value: QuizFormState
  onChange: (value: QuizFormState) => void
  defaultTitle?: string
}

const QuizBuilder = ({ value, onChange, defaultTitle }: QuizBuilderProps) => {
  const questionTypes = useMemo(
    () => [
      { label: "Single Answer", value: "single" },
      { label: "Multiple Answer", value: "multiple" },
      { label: "True / False", value: "true_false" },
    ],
    [],
  )

  const updateQuiz = (partial: Partial<QuizFormState>) => {
    const next = { ...value, ...partial }
    if (defaultTitle && !next.title.trim()) {
      next.title = defaultTitle
    }
    onChange(next)
  }

  const updateQuestion = (questionId: string, partial: Partial<QuizFormQuestion>) => {
    updateQuiz({
      questions: value.questions.map((question) =>
        question.id === questionId ? { ...question, ...partial } : question,
      ),
    })
  }

  const updateChoice = (questionId: string, choiceId: string, partial: Partial<QuizFormChoice>) => {
    updateQuestion(questionId, {
      choices: value.questions
        .find((question) => question.id === questionId)
        ?.choices.map((choice) => (choice.id === choiceId ? { ...choice, ...partial } : choice)) ?? [],
    })
  }

  const addQuestion = () => {
    updateQuiz({
      questions: [...value.questions, createEmptyQuestion()],
    })
  }

  const removeQuestion = (questionId: string) => {
    if (value.questions.length === 1) {
      return
    }
    updateQuiz({
      questions: value.questions.filter((question) => question.id !== questionId),
    })
  }

  const addChoice = (questionId: string) => {
    updateQuestion(questionId, {
      choices: [
        ...(value.questions.find((question) => question.id === questionId)?.choices ?? []),
        { id: generateId(), text: "", isCorrect: false },
      ],
    })
  }

  const removeChoice = (questionId: string, choiceId: string) => {
    const question = value.questions.find((item) => item.id === questionId)
    if (!question || question.choices.length <= 2) {
      return
    }
    updateQuestion(questionId, {
      choices: question.choices.filter((choice) => choice.id !== choiceId),
    })
  }

  const handleQuestionTypeChange = (questionId: string, type: QuizFormQuestionType) => {
    const question = value.questions.find((item) => item.id === questionId)
    if (!question) {
      return
    }
    if (type === "true_false") {
      updateQuestion(questionId, {
        type,
        choices: [
          { id: generateId(), text: "True", isCorrect: true },
          { id: generateId(), text: "False", isCorrect: false },
        ],
      })
      return
    }
    updateQuestion(questionId, { type })
  }

  const handleCorrectToggle = (questionId: string, choiceId: string, isCorrect: boolean) => {
    const question = value.questions.find((item) => item.id === questionId)
    if (!question) return

    if (question.type === "single" || question.type === "true_false") {
      updateQuestion(questionId, {
        choices: question.choices.map((choice) => ({
          ...choice,
          isCorrect: choice.id === choiceId,
        })),
      })
      return
    }
    updateChoice(questionId, choiceId, { isCorrect })
  }

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="quiz-title">Quiz Title *</Label>
          <Input
            id="quiz-title"
            value={value.title}
            onChange={(event) => updateQuiz({ title: event.target.value })}
            placeholder={defaultTitle ?? "Quiz Title"}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="quiz-pass-score">Pass Score (%) *</Label>
          <Input
            id="quiz-pass-score"
            type="number"
            min={1}
            max={100}
            value={value.passScore}
            onChange={(event) =>
              updateQuiz({ passScore: Math.max(1, Math.min(100, Number(event.target.value) || 0)) })
            }
          />
        </div>
      </div>

      {value.questions.map((question, index) => (
        <div key={question.id} className="rounded-lg border border-border/60 bg-card/80 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">Question {index + 1}</h4>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => removeQuestion(question.id)} disabled={value.questions.length === 1}>
                Remove
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Prompt *</Label>
            <Textarea
              value={question.prompt}
              onChange={(event) => updateQuestion(question.id, { prompt: event.target.value })}
              placeholder="Enter the question prompt..."
              rows={3}
            />
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Question Type</Label>
              <Select value={question.type} onValueChange={(value: QuizFormQuestionType) => handleQuestionTypeChange(question.id, value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {questionTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Points *</Label>
              <Input
                type="number"
                min={1}
                value={question.points}
                onChange={(event) => updateQuestion(question.id, { points: Math.max(1, Number(event.target.value) || 1) })}
              />
            </div>
          </div>

          <div className="space-y-3">
            <Label>Choices *</Label>
            {question.type === "single" || question.type === "true_false" ? (
              <RadioGroup
                value={question.choices.find((choice) => choice.isCorrect)?.id}
                onValueChange={(choiceId) => handleCorrectToggle(question.id, choiceId, true)}
                className="space-y-2"
              >
                {question.choices.map((choice) => (
                  <div key={choice.id} className="flex items-center gap-3">
                    <RadioGroupItem value={choice.id} />
                    <Input
                      value={choice.text}
                      onChange={(event) => updateChoice(question.id, choice.id, { text: event.target.value })}
                      placeholder="Choice text"
                    />
                    {question.type !== "true_false" && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeChoice(question.id, choice.id)}
                        disabled={question.choices.length <= 2}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                ))}
              </RadioGroup>
            ) : (
              <div className="space-y-2">
                {question.choices.map((choice) => (
                  <div key={choice.id} className="flex items-center gap-3">
                    <Checkbox
                      checked={choice.isCorrect}
                      onCheckedChange={(checked) => handleCorrectToggle(question.id, choice.id, Boolean(checked))}
                    />
                    <Input
                      value={choice.text}
                      onChange={(event) => updateChoice(question.id, choice.id, { text: event.target.value })}
                      placeholder="Choice text"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeChoice(question.id, choice.id)}
                      disabled={question.choices.length <= 2}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
            {question.type !== "true_false" && (
              <Button type="button" variant="outline" size="sm" onClick={() => addChoice(question.id)}>
                Add Choice
              </Button>
            )}
          </div>
        </div>
      ))}

      <Button type="button" variant="outline" onClick={addQuestion}>
        Add Question
      </Button>
    </div>
  )
}

export default QuizBuilder
