import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Card, CardContent, CardHeader, CardTitle, toast } from 'app-packs-ui'
import { createJobServer } from '@/server/recruiting'
import { JobForm } from '@/components/job-form'
import { useSubmission } from '@/lib/submission'
export const Route=createFileRoute('/_app/records/new')({component:NewJob})
function NewJob(){const nav=useNavigate();const {state,run}=useSubmission(createJobServer);return <div className="mx-auto max-w-3xl space-y-6"><div><h1 className="text-3xl font-semibold">Create a job</h1><p className="text-muted-foreground">Open a new role for candidates.</p></div><Card><CardHeader><CardTitle>Role details</CardTitle></CardHeader><CardContent><JobForm submitting={state.status==='submitting'} onSubmit={async value=>{const job=await run({data:value as any});toast({title:'Job created'});nav({to:'/records/$id',params:{id:job.id}})}}/></CardContent></Card></div>}
