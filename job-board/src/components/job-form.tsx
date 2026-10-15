import { Button } from 'app-packs-ui'
import type { Job } from '@/db/schema'
export function JobForm({
  job,
  submitting,
  onSubmit,
}: {
  job?: Job
  submitting: boolean
  onSubmit: (value: Record<string, string>) => void
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit(Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>)
      }}
      className="space-y-6"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <Field name="title" label="Job title" value={job?.title} />
        <Field name="department" label="Department" value={job?.department} />
        <Field name="location" label="Location" value={job?.location} />
        <Field name="employmentType" label="Employment type" value={job?.employmentType} />
        <Field
          name="postedDate"
          label="Posted date"
          type="date"
          value={job?.postedDate ?? new Date().toISOString().slice(0, 10)}
        />
        <label className="text-sm font-medium">
          Status
          <select
            name="status"
            defaultValue={job?.status ?? 'open'}
            className="mt-2 h-10 w-full rounded-md border bg-background px-3"
          >
            <option value="open">Open</option>
            <option value="closed">Closed</option>
          </select>
        </label>
      </div>
      {[
        ['description', 'Description'],
        ['responsibilities', 'Responsibilities'],
        ['qualifications', 'Qualifications'],
        ['benefits', 'Benefits'],
      ].map(([name, label]) => (
        <label key={name} className="block text-sm font-medium">
          {label}
          <textarea
            name={name}
            defaultValue={(job?.[name as keyof Job] as string) ?? ''}
            required
            minLength={10}
            rows={name === 'description' ? 4 : 5}
            className="mt-2 w-full rounded-md border bg-background p-3 text-sm"
            placeholder={
              name === 'description' ? 'Describe the role and its impact.' : 'Use one item per line.'
            }
          />
        </label>
      ))}
      <Button type="submit" disabled={submitting}>
        {submitting ? 'Saving…' : job ? 'Save changes' : 'Create job'}
      </Button>
    </form>
  )
}
function Field({ label, value, ...p }: { label: string; value?: string; name: string; type?: string }) {
  return (
    <label className="text-sm font-medium">
      {label}
      <input
        {...p}
        defaultValue={value}
        required
        className="mt-2 h-10 w-full rounded-md border bg-background px-3"
      />
    </label>
  )
}
