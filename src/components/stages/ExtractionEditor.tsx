'use client'

import * as React from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Trash2, Save, X, PlusCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { usePipelineStore } from '@/lib/store'

interface Entity {
  id: string
  label: string
  type: string
  role?: string
}

interface Relationship {
  from: string
  to: string
  label: string
  kind?: string
}

interface ExtractionEditorProps {
  runId: string
  initialData: {
    diagramType: string
    summary: string
    entities: Entity[]
    relationships: Relationship[]
    layoutNotes?: string
  }
  onClose: () => void
}

export function ExtractionEditor({ runId, initialData, onClose }: ExtractionEditorProps) {
  const [diagramType, setDiagramType] = React.useState(initialData.diagramType)
  const [summary, setSummary] = React.useState(initialData.summary)
  const [layoutNotes, setLayoutNotes] = React.useState(initialData.layoutNotes || '')
  
  const [entities, setEntities] = React.useState<Entity[]>([...initialData.entities])
  const [relationships, setRelationships] = React.useState<Relationship[]>([...initialData.relationships])
  
  const [saving, setSaving] = React.useState(false)

  const handleAddEntity = () => {
    const newId = `e${entities.length + 1}`
    setEntities([...entities, { id: newId, label: 'New Entity', type: 'node', role: '' }])
  }

  const handleDeleteEntity = (id: string) => {
    setEntities(entities.filter((e) => e.id !== id))
    // Clean up relationships referencing this entity
    setRelationships(relationships.filter((r) => r.from !== id && r.to !== id))
  }

  const handleUpdateEntity = (id: string, key: keyof Entity, value: string) => {
    setEntities(entities.map((e) => (e.id === id ? { ...e, [key]: value } : e)))
  }

  const handleAddRelationship = () => {
    if (entities.length < 2) {
      toast.error('Need at least 2 entities to create a relationship')
      return
    }
    setRelationships([...relationships, { from: entities[0].id, to: entities[1].id, label: 'connects to', kind: 'flow' }])
  }

  const handleDeleteRelationship = (idx: number) => {
    setRelationships(relationships.filter((_, i) => i !== idx))
  }

  const handleUpdateRelationship = (idx: number, key: keyof Relationship, value: string) => {
    setRelationships(relationships.map((r, i) => (i === idx ? { ...r, [key]: value } : r)))
  }

  const handleSave = async () => {
    setSaving(true)
    const payload = {
      diagramType,
      summary,
      entities,
      relationships,
      layoutNotes: layoutNotes || undefined,
    }

    try {
      const res = await fetch(`/api/runs/${runId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'running', // Keep the run active
          diagramType,
          extraction: payload,
        }),
      })

      if (!res.ok) throw new Error()
      
      // Update store
      usePipelineStore.setState({ extraction: payload })
      toast.success('Diagram extraction corrected successfully')
      onClose()
    } catch {
      toast.error('Failed to save corrected extraction')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="p-6 border-2 border-primary/20 space-y-6 rounded-2xl bg-card">
      <div className="flex items-center justify-between border-b border-border/40 pb-3">
        <h3 className="text-base font-bold flex items-center gap-2">
          <span>🛠️</span>
          <span>Correct Diagram Extraction</span>
        </h3>
        <Button size="sm" variant="ghost" onClick={onClose} className="size-8 p-0 rounded-full">
          <X className="size-4" />
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs font-mono uppercase text-muted-foreground">Diagram Type</Label>
          <Input 
            value={diagramType} 
            onChange={(e) => setDiagramType(e.target.value)} 
            placeholder="e.g. architecture, flowchart"
            className="h-9 text-xs"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-mono uppercase text-muted-foreground">Layout Notes</Label>
          <Input 
            value={layoutNotes} 
            onChange={(e) => setLayoutNotes(e.target.value)} 
            placeholder="e.g. left-to-right flow"
            className="h-9 text-xs"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-mono uppercase text-muted-foreground">Diagram Summary</Label>
        <textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          className="w-full h-16 rounded-md border border-border bg-background p-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
          placeholder="Brief description of the diagram"
        />
      </div>

      {/* Entities Editor */}
      <div className="space-y-3 pt-3 border-t border-border/20">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Entities</h4>
          <Button size="xs" variant="outline" onClick={handleAddEntity} className="gap-1 text-[10px] font-bold">
            <Plus className="size-3" /> Add Entity
          </Button>
        </div>

        <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
          {entities.map((e) => (
            <div key={e.id} className="flex gap-2 items-center bg-muted/20 p-2.5 rounded-lg border border-border/50 text-xs">
              <span className="font-mono font-bold text-[10px] text-muted-foreground bg-muted border rounded px-1.5 py-0.5">{e.id}</span>
              <Input
                value={e.label}
                onChange={(eVal) => handleUpdateEntity(e.id, 'label', eVal.target.value)}
                placeholder="Label"
                className="h-8 text-xs flex-1"
              />
              <select
                value={e.type}
                onChange={(eVal) => handleUpdateEntity(e.id, 'type', eVal.target.value)}
                className="h-8 rounded-md border border-border bg-background px-2 text-[11px]"
              >
                {['component', 'process', 'decision', 'datastore', 'module', 'node', 'device', 'actor', 'state', 'class', 'layer'].map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <Input
                value={e.role || ''}
                onChange={(eVal) => handleUpdateEntity(e.id, 'role', eVal.target.value)}
                placeholder="Role (optional)"
                className="h-8 text-xs flex-1"
              />
              <Button size="xs" variant="ghost" onClick={() => handleDeleteEntity(e.id)} className="h-8 text-destructive hover:bg-destructive/10">
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Relationships Editor */}
      <div className="space-y-3 pt-3 border-t border-border/20">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Relationships</h4>
          <Button size="xs" variant="outline" onClick={handleAddRelationship} className="gap-1 text-[10px] font-bold">
            <Plus className="size-3" /> Add Relationship
          </Button>
        </div>

        <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
          {relationships.map((r, idx) => (
            <div key={idx} className="flex gap-2 items-center bg-muted/20 p-2.5 rounded-lg border border-border/50 text-xs">
              <select
                value={r.from}
                onChange={(e) => handleUpdateRelationship(idx, 'from', e.target.value)}
                className="h-8 rounded-md border border-border bg-background px-1.5 text-[11px] w-24"
              >
                {entities.map((e) => (
                  <option key={e.id} value={e.id}>{e.label} ({e.id})</option>
                ))}
              </select>
              <span className="font-mono text-muted-foreground">→</span>
              <select
                value={r.to}
                onChange={(e) => handleUpdateRelationship(idx, 'to', e.target.value)}
                className="h-8 rounded-md border border-border bg-background px-1.5 text-[11px] w-24"
              >
                {entities.map((e) => (
                  <option key={e.id} value={e.id}>{e.label} ({e.id})</option>
                ))}
              </select>
              <Input
                value={r.label}
                onChange={(e) => handleUpdateRelationship(idx, 'label', e.target.value)}
                placeholder="Relation verb"
                className="h-8 text-xs flex-1"
              />
              <Input
                value={r.kind || ''}
                onChange={(e) => handleUpdateRelationship(idx, 'kind', e.target.value)}
                placeholder="Kind"
                className="h-8 text-xs w-20"
              />
              <Button size="xs" variant="ghost" onClick={() => handleDeleteRelationship(idx)} className="h-8 text-destructive hover:bg-destructive/10">
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          ))}
          {relationships.length === 0 && (
            <div className="text-center py-4 text-xs text-muted-foreground border border-dashed border-border rounded-xl">
              No relationships. Click Add to create one.
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-3 justify-end pt-3 border-t border-border/40">
        <Button variant="outline" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving} className="gap-1.5 font-bold">
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Save Corrections
        </Button>
      </div>
    </Card>
  )
}
