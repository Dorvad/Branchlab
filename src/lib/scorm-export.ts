'use client'

import type { Scenario, ScenarioVersion } from '@/types'
import { slugify } from './local-store'

type ScenarioLike = Scenario | ScenarioVersion

function getTitle(s: ScenarioLike): string {
  return ('title' in s ? (s as Scenario | ScenarioVersion).title : undefined) ?? 'Scenario'
}

function getSlug(s: ScenarioLike): string {
  return s.slug ?? slugify(getTitle(s))
}

function getPublishedSlug(s: ScenarioLike): string | null {
  if ('publishedAt' in s) return s.slug ?? null
  return (s as Scenario).publishedVersion?.slug ?? null
}

function appBase(): string {
  if (typeof window !== 'undefined') return window.location.origin
  return (process.env.NEXT_PUBLIC_APP_URL ?? '').replace(/\/$/, '')
}

function buildImsManifest(title: string, slug: string): string {
  const id = `com.branchlab.${slug.replace(/[^a-z0-9]/g, '_')}`
  return `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="${id}" version="1"
  xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.imsproject.org/xsd/imscp_rootv1p1p2 imscp_rootv1p1p2.xsd
                      http://www.adlnet.org/xsd/adlcp_rootv1p2 adlcp_rootv1p2.xsd">
  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>1.2</schemaversion>
  </metadata>
  <organizations default="org_${slug}">
    <organization identifier="org_${slug}">
      <title>${title}</title>
      <item identifier="item_1" identifierref="resource_1" isvisible="true">
        <title>${title}</title>
        <adlcp:masteryscore>80</adlcp:masteryscore>
      </item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="resource_1" type="webcontent" adlcp:scormtype="sco" href="index.html">
      <file href="index.html"/>
      <file href="scorm-api.js"/>
    </resource>
  </resources>
</manifest>`
}

function buildScormApiJs(): string {
  return `/* BranchLab SCORM 1.2 API bridge */
(function(){
  var api=null;
  function findApi(w){
    var tries=0;
    while(w.API==null&&w.parent&&w.parent!==w&&tries<10){w=w.parent;tries++;}
    return w.API||null;
  }
  api=findApi(window);
  if(api){try{api.LMSInitialize("");}catch(e){}}

  window.addEventListener("message",function(e){
    if(!e.data||e.data.type!=="branchlab:ending_reached")return;
    if(!api)return;
    try{
      api.LMSSetValue("cmi.core.lesson_status","completed");
      if(e.data.score!=null){
        api.LMSSetValue("cmi.core.score.raw",String(Math.round(e.data.score)));
        api.LMSSetValue("cmi.core.score.min","0");
        api.LMSSetValue("cmi.core.score.max","100");
      }
      api.LMSCommit("");
      api.LMSFinish("");
    }catch(err){}
  });
})();`
}

function buildScormIndexHtml(playUrl: string, title: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <script src="scorm-api.js"><\/script>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    html,body{width:100%;height:100%;overflow:hidden;background:#08090d}
    iframe{width:100%;height:100%;border:none;display:block}
  </style>
</head>
<body>
  <iframe src="${playUrl}?embed=1" allow="autoplay; fullscreen"></iframe>
</body>
</html>`
}

function buildXapiStatements(scenario: ScenarioLike): object[] {
  const title = getTitle(scenario)
  const activityId = `https://branchlab.com/scenarios/${getSlug(scenario)}`
  const activity = {
    objectType: 'Activity',
    id: activityId,
    definition: { name: { 'en-US': title }, type: 'http://adlnet.gov/expapi/activities/course' },
  }
  const statements: object[] = [
    {
      verb: { id: 'http://adlnet.gov/expapi/verbs/experienced', display: { 'en-US': 'experienced' } },
      object: activity,
      _note: 'Send this statement when the learner starts the scenario',
    },
  ]
  for (const node of scenario.nodes) {
    if (node.choices.length === 0) continue
    statements.push({
      verb: { id: 'http://adlnet.gov/expapi/verbs/answered', display: { 'en-US': 'answered' } },
      object: {
        objectType: 'Activity',
        id: `${activityId}/nodes/${node.id}`,
        definition: {
          name: { 'en-US': node.title },
          type: 'http://adlnet.gov/expapi/activities/interaction',
          interactionType: 'choice',
          choices: node.choices.map(c => ({ id: c.id, description: { 'en-US': c.label } })),
        },
      },
      result: { response: '<choice_id_here>' },
      _note: `Send when learner picks a choice at node "${node.title}"`,
    })
  }
  statements.push({
    verb: { id: 'http://adlnet.gov/expapi/verbs/completed', display: { 'en-US': 'completed' } },
    object: activity,
    result: { completion: true, success: true },
    _note: 'Send when the learner reaches any ending node',
  })
  return statements
}

function triggerDownload(data: Uint8Array, filename: string): void {
  const blob = new Blob([data.buffer as ArrayBuffer], { type: 'application/zip' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export async function exportScorm12(scenario: ScenarioLike): Promise<void> {
  const publishedSlug = getPublishedSlug(scenario)
  if (!publishedSlug) throw new Error('Scenario must be published before exporting SCORM')

  const { zip, strToU8 } = await import('fflate')

  const base = appBase()
  const playUrl = `${base}/play/${publishedSlug}`
  const title = getTitle(scenario)
  const slug = getSlug(scenario)

  const files: Record<string, Uint8Array> = {
    'imsmanifest.xml': strToU8(buildImsManifest(title, publishedSlug)),
    'index.html': strToU8(buildScormIndexHtml(playUrl, title)),
    'scorm-api.js': strToU8(buildScormApiJs()),
  }

  const zipped = await new Promise<Uint8Array>((resolve, reject) => {
    zip(files, { level: 6 }, (err, data) => {
      if (err) reject(err)
      else resolve(data)
    })
  })

  triggerDownload(zipped, `${slug}-scorm.zip`)
}

export function exportXapiStatements(scenario: ScenarioLike): void {
  const statements = buildXapiStatements(scenario)
  const json = JSON.stringify(statements, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${getSlug(scenario)}-xapi-statements.json`
  a.click()
  URL.revokeObjectURL(url)
}
