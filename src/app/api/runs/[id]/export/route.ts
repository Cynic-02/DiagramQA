import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { assertRunAccess } from '@/lib/api'

interface FinalQAItem {
  id: string
  question: string
  answer: string
  bloomLevel: string
  cognitiveSkill: string
  verification: string
  score: number
  questionType?: string
  options?: string[]
  correctOptionIndex?: number
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params
  const session = await getSession()
  const { run, response } = await assertRunAccess(id, session)
  if (response) return response
  if (!run) return NextResponse.json({ error: 'Run not found' }, { status: 404 })

  const searchParams = req.nextUrl.searchParams
  const format = searchParams.get('format') || 'csv' // moodle, qti, csv

  const finalQA = run.finalQA ? (JSON.parse(run.finalQA) as FinalQAItem[]) : []

  if (format === 'csv') {
    let csv = 'ID,BloomLevel,Type,Question,Answer,Options,CorrectOptionIndex\n'
    for (const q of finalQA) {
      const type = q.questionType?.toUpperCase() === 'MCQ' ? 'MCQ' : 'SHORT'
      const optionsStr = q.options ? `"${q.options.join('; ')}"` : ''
      const textEscaped = `"${q.question.replace(/"/g, '""')}"`
      const answerEscaped = `"${q.answer.replace(/"/g, '""')}"`
      
      csv += `${q.id},${q.bloomLevel},${type},${textEscaped},${answerEscaped},${optionsStr},${q.correctOptionIndex ?? ''}\n`
    }

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="diagrammind-export-${id}.csv"`,
      }
    })
  }

  if (format === 'moodle') {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<quiz>\n'
    for (const q of finalQA) {
      const isMcq = q.questionType?.toUpperCase() === 'MCQ' && q.options && q.options.length > 0
      const type = isMcq ? 'multichoice' : 'shortanswer'
      
      xml += `  <question type="${type}">\n`
      xml += `    <name><text>${q.id}</text></name>\n`
      xml += `    <questiontext format="html">\n`
      xml += `      <text><![CDATA[<p>${q.question}</p>]]></text>\n`
      xml += `    </questiontext>\n`
      xml += `    <generalfeedback format="html">\n`
      xml += `      <text><![CDATA[<p>Bloom category: ${q.bloomLevel}</p>]]></text>\n`
      xml += `    </generalfeedback>\n`

      if (isMcq && q.options) {
        q.options.forEach((opt, idx) => {
          const isCorrect = idx === q.correctOptionIndex
          const fraction = isCorrect ? 100 : 0
          xml += `    <answer fraction="${fraction}">\n`
          xml += `      <text><![CDATA[${opt}]]></text>\n`
          xml += `    </answer>\n`
        })
      } else {
        xml += `    <answer fraction="100">\n`
        xml += `      <text><![CDATA[${q.answer}]]></text>\n`
        xml += `    </answer>\n`
      }
      xml += `  </question>\n`
    }
    xml += '</quiz>\n'

    return new Response(xml, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Content-Disposition': `attachment; filename="moodle-xml-export-${id}.xml"`,
      }
    })
  }

  if (format === 'qti') {
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<questestinterop xmlns="http://www.imsglobal.org/xsd/ims_qtiasiv1p2" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.imsglobal.org/xsd/ims_qtiasiv1p2 http://www.imsglobal.org/xsd/ims_qtiasiv1p2.xsd">
  <assessment ident="assessment_${id}" title="DiagramMind Generated Quiz">
    <section ident="section_main" title="Main Section">
`
    for (const q of finalQA) {
      const isMcq = q.questionType?.toUpperCase() === 'MCQ' && q.options && q.options.length > 0
      
      xml += `      <item ident="${q.id}" title="${q.bloomLevel} Question">\n`
      xml += `        <presentation>\n`
      xml += `          <material>\n`
      xml += `            <mattext texttype="text/html"><![CDATA[${q.question}]]></mattext>\n`
      xml += `          </material>\n`
      
      if (isMcq && q.options) {
        xml += `          <response_lid ident="response_${q.id}" rcardinality="Single">\n`
        xml += `            <select_one>\n`
        q.options.forEach((opt, idx) => {
          xml += `              <response_label ident="choice_${idx}">\n`
          xml += `                <material>\n`
          xml += `                  <mattext texttype="text/plain"><![CDATA[${opt}]]></mattext>\n`
          xml += `                </material>\n`
          xml += `              </response_label>\n`
        })
        xml += `            </select_one>\n`
        xml += `          </response_lid>\n`
      } else {
        xml += `          <response_str ident="response_${q.id}" rcardinality="Single">\n`
        xml += `            <render_fib>\n`
        xml += `              <response_label ident="answer_field" />\n`
        xml += `            </render_fib>\n`
        xml += `          </response_str>\n`
      }
      xml += `        </presentation>\n`
      
      // Correct processing
      xml += `        <resprocessing>\n`
      xml += `          <outcomes>\n`
      xml += `            <decvar varname="SCORE" vartype="Decimal" defaultval="0.0" />\n`
      xml += `          </outcomes>\n`
      
      if (isMcq) {
        xml += `          <respcondition>\n`
        xml += `            <conditionvar>\n`
        xml += `              <varequal respident="response_${q.id}">choice_${q.correctOptionIndex}</varequal>\n`
        xml += `            </conditionvar>\n`
        xml += `            <setvar action="Set" varname="SCORE">10.0</setvar>\n`
        xml += `          </respcondition>\n`
      } else {
        xml += `          <respcondition>\n`
        xml += `            <conditionvar>\n`
        xml += `              <varequal respident="response_${q.id}"><![CDATA[${q.answer}]]></varequal>\n`
        xml += `            </conditionvar>\n`
        xml += `            <setvar action="Set" varname="SCORE">10.0</setvar>\n`
        xml += `          </respcondition>\n`
      }
      xml += `        </resprocessing>\n`
      xml += `      </item>\n`
    }

    xml += `    </section>
  </assessment>
</questestinterop>
`
    return new Response(xml, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Content-Disposition': `attachment; filename="qti-canvas-export-${id}.xml"`,
      }
    })
  }

  return NextResponse.json({ error: 'Unsupported format' }, { status: 400 })
}
