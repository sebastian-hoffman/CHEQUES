"use client";

import React, { useState, useRef } from "react";
import { bulkAssignProjectAction } from "@/app/actions";

interface BulkAssignFormProps {
  projects: Array<{ name: string }>;
  children: React.ReactNode;
}

export function BulkAssignForm({ projects, children }: BulkAssignFormProps) {
  const [selectedCount, setSelectedCount] = useState(0);
  const [projectName, setProjectName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const handleCheckboxChange = () => {
    if (formRef.current) {
      const allCheckboxes = formRef.current.querySelectorAll('input[name="chequeIds"]') as NodeListOf<HTMLInputElement>;
      const checked = Array.from(allCheckboxes).filter((cb) => cb.checked).length;
      setSelectedCount(checked);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (formRef.current) {
      const allCheckboxes = formRef.current.querySelectorAll('input[name="chequeIds"]') as NodeListOf<HTMLInputElement>;
      const checked = Array.from(allCheckboxes).filter((cb) => cb.checked);

      if (checked.length === 0) {
        setError("Selecciona al menos un cheque marcando las casillas");
        return;
      }
    }

    if (!projectName.trim()) {
      setError("Ingresa un proyecto para asignar");
      return;
    }

    setError(null);
    try {
      if (!formRef.current) throw new Error("Formulario no disponible");
      
      const formData = new FormData(formRef.current);
      formData.set("projectName", projectName);
      await bulkAssignProjectAction(formData);
      setSelectedCount(0);
      setProjectName("");
      if (formRef.current) {
        const allCheckboxes = formRef.current.querySelectorAll('input[name="chequeIds"]') as NodeListOf<HTMLInputElement>;
        allCheckboxes.forEach((cb) => (cb.checked = false));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al asignar proyecto");
    }
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-3 md:grid-cols-[2fr_auto]">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium">Asignar proyecto a seleccionados</label>
            <span className="text-xs text-[var(--muted)]">{selectedCount} seleccionados</span>
          </div>
          <input
            className="field"
            name="projectName"
            list="project-options"
            placeholder="Proyecto / negocio"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
          />
          <datalist id="project-options">
            {projects.map((project) => (
              <option key={project.name} value={project.name} />
            ))}
          </datalist>
          {error && <p className="text-xs text-[var(--danger)]">{error}</p>}
        </div>
        <button className="button button-secondary self-end" type="submit" disabled={selectedCount === 0}>
          Asignar proyecto
        </button>
      </div>

      <div className="table-wrap" onClick={handleCheckboxChange}>
        {children}
      </div>

      <style jsx>{`
        button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </form>
  );
}
