'use client';

import { useState } from 'react';
import { GitBranch, Plus, Play, Trash2 } from 'lucide-react';

interface WorkflowStep {
  id: string;
  agent: string;
  inputs: Record<string, string>;
  depends_on: string[];
}

interface Workflow {
  id: string;
  display_name: string;
  trigger: string;
  steps: WorkflowStep[];
  created_at: string;
}

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [showEditor, setShowEditor] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<Partial<Workflow>>({
    display_name: '',
    trigger: 'manual',
    steps: [],
  });

  const addStep = () => {
    const steps = [...(editingWorkflow.steps || [])];
    steps.push({
      id: `step_${steps.length + 1}`,
      agent: '',
      inputs: {},
      depends_on: [],
    });
    setEditingWorkflow({ ...editingWorkflow, steps });
  };

  const removeStep = (index: number) => {
    const steps = [...(editingWorkflow.steps || [])];
    steps.splice(index, 1);
    setEditingWorkflow({ ...editingWorkflow, steps });
  };

  const updateStep = (index: number, field: string, value: string) => {
    const steps = [...(editingWorkflow.steps || [])];
    if (field === 'depends_on') {
      steps[index] = { ...steps[index], depends_on: value.split(',').map((s) => s.trim()).filter(Boolean) };
    } else {
      steps[index] = { ...steps[index], [field]: value };
    }
    setEditingWorkflow({ ...editingWorkflow, steps });
  };

  const saveWorkflow = () => {
    const newWorkflow: Workflow = {
      id: `wf_${Date.now()}`,
      display_name: editingWorkflow.display_name || 'Untitled',
      trigger: editingWorkflow.trigger || 'manual',
      steps: editingWorkflow.steps || [],
      created_at: new Date().toISOString(),
    };
    setWorkflows([...workflows, newWorkflow]);
    setShowEditor(false);
    setEditingWorkflow({ display_name: '', trigger: 'manual', steps: [] });
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Workflows</h1>
          <p className="mt-1 text-[var(--muted-foreground)]">
            Design and manage multi-agent workflow DAGs.
          </p>
        </div>
        <button
          onClick={() => setShowEditor(true)}
          className="flex items-center gap-2 rounded-md bg-[var(--primary)] px-4 py-2 text-sm font-medium text-[var(--primary-foreground)] hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          New Workflow
        </button>
      </div>

      {showEditor && (
        <div className="mt-6 rounded-lg border border-[var(--border)] p-6">
          <h2 className="font-semibold">Workflow Editor</h2>

          <div className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium">Name</label>
              <input
                type="text"
                value={editingWorkflow.display_name}
                onChange={(e) =>
                  setEditingWorkflow({ ...editingWorkflow, display_name: e.target.value })
                }
                className="mt-1 block w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
                placeholder="My Workflow"
              />
            </div>

            <div>
              <label className="block text-sm font-medium">Trigger</label>
              <select
                value={editingWorkflow.trigger}
                onChange={(e) =>
                  setEditingWorkflow({ ...editingWorkflow, trigger: e.target.value })
                }
                className="mt-1 block w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
              >
                <option value="manual">Manual</option>
                <option value="api">API</option>
                <option value="schedule">Schedule</option>
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium">Steps</label>
                <button
                  onClick={addStep}
                  className="text-sm text-[var(--primary)] hover:underline"
                >
                  + Add Step
                </button>
              </div>

              <div className="mt-2 space-y-3">
                {(editingWorkflow.steps || []).map((step, i) => (
                  <div
                    key={i}
                    className="flex gap-3 rounded-md border border-[var(--border)] p-3"
                  >
                    <div className="flex-1 space-y-2">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={step.id}
                          onChange={(e) => updateStep(i, 'id', e.target.value)}
                          placeholder="Step ID"
                          className="w-1/3 rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-sm"
                        />
                        <input
                          type="text"
                          value={step.agent}
                          onChange={(e) => updateStep(i, 'agent', e.target.value)}
                          placeholder="Agent ID"
                          className="w-1/3 rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-sm"
                        />
                        <input
                          type="text"
                          value={step.depends_on.join(', ')}
                          onChange={(e) => updateStep(i, 'depends_on', e.target.value)}
                          placeholder="Depends on (comma-sep)"
                          className="w-1/3 rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-sm"
                        />
                      </div>
                    </div>
                    <button
                      onClick={() => removeStep(i)}
                      className="text-[var(--muted-foreground)] hover:text-[var(--destructive)]"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={saveWorkflow}
                className="rounded-md bg-[var(--primary)] px-4 py-2 text-sm font-medium text-[var(--primary-foreground)]"
              >
                Save Workflow
              </button>
              <button
                onClick={() => setShowEditor(false)}
                className="rounded-md border border-[var(--border)] px-4 py-2 text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {workflows.length === 0 && !showEditor ? (
        <div className="mt-8 flex flex-col items-center justify-center rounded-lg border border-dashed border-[var(--border)] p-12">
          <GitBranch className="h-12 w-12 text-[var(--muted-foreground)]" />
          <h3 className="mt-4 font-semibold">No workflows yet</h3>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Create a multi-agent workflow to orchestrate complex tasks.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {workflows.map((wf) => (
            <div
              key={wf.id}
              className="flex items-center justify-between rounded-lg border border-[var(--border)] p-4"
            >
              <div className="flex items-center gap-3">
                <GitBranch className="h-5 w-5 text-[var(--primary)]" />
                <div>
                  <p className="font-medium">{wf.display_name}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {wf.steps.length} steps · {wf.trigger} trigger
                  </p>
                </div>
              </div>
              <button className="flex items-center gap-1 rounded-md bg-[var(--primary)] px-3 py-1.5 text-xs font-medium text-[var(--primary-foreground)]">
                <Play className="h-3 w-3" />
                Run
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
