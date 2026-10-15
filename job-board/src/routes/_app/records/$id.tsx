import { createFileRoute } from '@tanstack/react-router'
import { Card, CardContent, CardHeader, CardTitle, toast } from 'app-packs-ui'
import { getJobServer, updateJobServer } from '@/server/recruiting'
import { JobForm } from '@/components/job-form'
import { useSubmission } from '@/lib/submission'
export const Route=createFileRoute('/_app/records/$id')({loader:({params})=>getJobServer({data:{id:params.id}}),component:EditJob})
function EditJob(){const job=Route.useLoaderData();const {state,run}=useSubmission(updateJobServer);return <div className="mx-auto max-w-3xl space-y-6"><div><h1 className="text-3xl font-semibold">{job.title}</h1><p className="text-muted-foreground">Edit details or change whether this role is publicly visible.</p></div><Card><CardHeader><CardTitle>Role details</CardTitle></CardHeader><CardContent><JobForm job={job} submitting={state.status==='submitting'} onSubmit={async value=>{await run({data:{id:job.id,...value} as any});toast({title:'Job updated'})}}/></CardContent></Card></div>}
