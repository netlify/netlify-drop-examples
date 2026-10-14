import { Alert, AlertDescription, AlertTitle } from 'app-packs-ui'

/**
 * There is no in-app role-management UI by design (see README > Roles) —
 * this tells an admin where to actually go, so the absence doesn't read as
 * a bug.
 */
export function AdminRoleNote() {
  return (
    <Alert>
      <AlertTitle>Managing roles</AlertTitle>
      <AlertDescription>
        Promoting or demoting a user isn't done in this app. Use the Netlify
        Identity dashboard (Users → select a user → edit their Roles) to
        change someone's <code>admin</code>/<code>respondent</code> role.
      </AlertDescription>
    </Alert>
  )
}
