import { randomUUID } from 'node:crypto'
import type { Config } from '@netlify/functions'
import { getStore } from '@netlify/blobs'
const allowed=new Set(['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
export default async(req:Request)=>{const form=await req.formData();const file=form.get('file');if(!(file instanceof File)||!file.size)return Response.json({error:'Resume required'},{status:400});if(file.size>4*1024*1024)return Response.json({error:'Resume exceeds 4 MB'},{status:413});if(!allowed.has(file.type))return Response.json({error:'Please upload a PDF or Word document'},{status:415});const safe=file.name.replace(/[^a-zA-Z0-9._-]/g,'-');const key=`candidate-resumes/${randomUUID()}-${safe}`;await getStore('uploads').set(key,file,{metadata:{name:file.name,type:file.type,size:String(file.size)}});return Response.json({key})}
export const config:Config={path:'/api/candidate-resume',method:'POST'}
