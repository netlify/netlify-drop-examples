import { useState, type ReactNode } from 'react'
import { toast } from 'app-packs-ui'
import {
  lessonInputSchema,
  lessonPriorityValues,
  createLessonServer,
  updateLessonServer,
  type LessonFormValues,
} from '@/server/learning'
import type { Lesson } from '@/db/schema'
import { useAppForm } from '@/components/forms/use-app-form'
import { useSubmission } from '@/lib/submission'
import { FieldGroup } from '@/components/ui/field'
import { SubmitButton } from '@/components/forms/submit-button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

function toFormValues(lesson?: Lesson, nextOrder = 1): LessonFormValues {
  return {
    title: lesson?.title ?? '',
    description: lesson?.description ?? '',
    resourceUrl: lesson?.resourceUrl ?? '',
    durationMinutes: String(lesson?.durationMinutes ?? 15),
    priority: (lesson?.priority as LessonFormValues['priority']) ?? 'medium',
    required: lesson?.required ?? true,
    sortOrder: String(lesson?.sortOrder ?? nextOrder),
  }
}

/** Add/edit lesson dialog. Pass `lesson` to edit, or `courseId` to create. */
export function LessonDialog({
  trigger,
  courseId,
  lesson,
  nextOrder,
  onSaved,
}: {
  trigger: ReactNode
  courseId: string
  lesson?: Lesson
  nextOrder?: number
  onSaved: () => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{lesson ? 'Edit lesson' : 'Add a lesson'}</DialogTitle>
          <DialogDescription>Lessons appear as checklist items employees tick off.</DialogDescription>
        </DialogHeader>
        {open ? (
          <LessonForm
            courseId={courseId}
            lesson={lesson}
            nextOrder={nextOrder}
            onDone={() => {
              setOpen(false)
              onSaved()
            }}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function LessonForm({
  courseId,
  lesson,
  nextOrder,
  onDone,
}: {
  courseId: string
  lesson?: Lesson
  nextOrder?: number
  onDone: () => void
}) {
  const create = useSubmission(createLessonServer)
  const update = useSubmission(updateLessonServer)
  const state = lesson ? update.state : create.state

  const form = useAppForm({
    defaultValues: toFormValues(lesson, nextOrder),
    validators: { onSubmit: lessonInputSchema },
    onSubmit: async ({ value }) => {
      try {
        if (lesson) await update.run({ data: { id: lesson.id, ...value } })
        else await create.run({ data: { courseId, ...value } })
        toast({ title: lesson ? 'Lesson updated' : 'Lesson added', variant: 'success' })
        onDone()
      } catch (err) {
        toast({
          title: 'Could not save lesson',
          description: err instanceof Error ? err.message : undefined,
          variant: 'destructive',
        })
      }
    },
  })

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        e.stopPropagation()
        form.handleSubmit()
      }}
    >
      <FieldGroup>
        <form.AppField name="title">{(field) => <field.TextField label="Title" />}</form.AppField>
        <form.AppField name="description">
          {(field) => <field.TextareaField label="Description" rows={3} />}
        </form.AppField>
        <form.AppField name="resourceUrl">
          {(field) => (
            <field.TextField
              label="Resource link"
              type="url"
              placeholder="https://"
              description="Optional — a policy page, video, or article."
            />
          )}
        </form.AppField>
        <div className="grid gap-6 sm:grid-cols-3">
          <form.AppField name="durationMinutes">
            {(field) => <field.TextField label="Minutes" type="number" />}
          </form.AppField>
          <form.AppField name="priority">
            {(field) => (
              <field.SelectField
                label="Priority"
                options={lessonPriorityValues.map((p) => ({
                  value: p,
                  label: p[0].toUpperCase() + p.slice(1),
                }))}
              />
            )}
          </form.AppField>
          <form.AppField name="sortOrder">
            {(field) => <field.TextField label="Order" type="number" />}
          </form.AppField>
        </div>
        <form.AppField name="required">
          {(field) => <field.CheckboxField label="Required lesson" />}
        </form.AppField>
        <SubmitButton state={state} className="w-full">
          {lesson ? 'Save lesson' : 'Add lesson'}
        </SubmitButton>
      </FieldGroup>
    </form>
  )
}
