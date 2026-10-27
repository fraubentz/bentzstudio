import React, { useState, useEffect } from 'react';
import {
  X,
  FolderOpen,
  Save,
  Download,
  Upload,
  Trash2,
  FileMusic,
  Printer,
  Sparkles,
  Check,
} from 'lucide-react';
import { ProjectData } from '../types/music';
import { ALL_DEMOS } from '../data/demoTracks';
import { downloadMidiFile } from '../audio/midiExporter';

interface ProjectManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProject: ProjectData;
  onLoadProject: (project: ProjectData) => void;
}

const STORAGE_KEY = 'bentz_studio_saved_projects_v1';

export const ProjectManagerModal: React.FC<ProjectManagerModalProps> = ({
  isOpen,
  onClose,
  currentProject,
  onLoadProject,
}) => {
  const [savedProjects, setSavedProjects] = useState<ProjectData[]>([]);
  const [projectTitle, setProjectTitle] = useState(currentProject.title);
  const [activeTab, setActiveTab] = useState<'save-load' | 'demos' | 'export-import'>('save-load');
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // Load projects from localStorage on open
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setSavedProjects(JSON.parse(stored));
      }
    } catch (e) {
      console.warn('LocalStorage access warning:', e);
    }
  }, [isOpen]);

  useEffect(() => {
    setProjectTitle(currentProject.title);
  }, [currentProject.title]);

  if (!isOpen) return null;

  const showTemporaryFeedback = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  // Save current project to localStorage
  const handleSaveToLocalStorage = () => {
    const updatedProject: ProjectData = {
      ...currentProject,
      title: projectTitle.trim() || 'Untitled Session',
      createdAt: new Date().toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    const existsIndex = savedProjects.findIndex((p) => p.id === updatedProject.id);
    let newProjectsList: ProjectData[];
    if (existsIndex >= 0) {
      newProjectsList = [...savedProjects];
      newProjectsList[existsIndex] = updatedProject;
    } else {
      newProjectsList = [updatedProject, ...savedProjects];
    }

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newProjectsList));
      setSavedProjects(newProjectsList);
      showTemporaryFeedback('Project saved locally to browser storage!');
    } catch {
      showTemporaryFeedback('Could not write to localStorage.');
    }
  };

  // Delete project from localStorage
  const handleDeleteProject = (id: string) => {
    const updated = savedProjects.filter((p) => p.id !== id);
    setSavedProjects(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      showTemporaryFeedback('Project deleted from storage.');
    } catch {
      // Catch
    }
  };

  // Export MIDI file
  const handleExportMidi = () => {
    downloadMidiFile(
      currentProject.notes,
      currentProject.bpm,
      currentProject.timeSignature,
      `${currentProject.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}.mid`
    );
    showTemporaryFeedback('Standard MIDI (.mid) downloaded to CPU!');
  };

  // Export Project JSON
  const handleExportJson = () => {
    const jsonStr = JSON.stringify(currentProject, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentProject.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}.bentz.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showTemporaryFeedback('Project JSON exported successfully.');
  };

  // Import Project JSON
  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed.notes)) {
          onLoadProject({
            ...parsed,
            id: `imported-${Date.now()}`,
          });
          showTemporaryFeedback(`Loaded "${parsed.title || 'Imported Project'}"!`);
          onClose();
        } else {
          showTemporaryFeedback('Invalid project file structure.');
        }
      } catch {
        showTemporaryFeedback('Error parsing JSON file.');
      }
    };
    reader.readAsText(file);
  };

  const handlePrintScore = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">Project & Storage Manager</h2>
              <p className="text-xs text-slate-400">100% Client-Side Local Storage · Zero Cloud Databases</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-slate-800 bg-slate-950/40 px-6 gap-2 pt-2">
          <button
            onClick={() => setActiveTab('save-load')}
            className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'save-load'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Local Storage
          </button>
          <button
            onClick={() => setActiveTab('demos')}
            className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'demos'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Demo Masterworks ({ALL_DEMOS.length})
          </button>
          <button
            onClick={() => setActiveTab('export-import')}
            className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'export-import'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            MIDI & JSON Export / Import
          </button>
        </div>

        {/* Feedback message banner */}
        {feedbackMsg && (
          <div className="mx-6 mt-4 p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-xs flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{feedbackMsg}</span>
          </div>
        )}

        {/* Tab 1: Save / Load Projects */}
        {activeTab === 'save-load' && (
          <div className="p-6 space-y-5 text-sm max-h-[60vh] overflow-y-auto">
            {/* Save Current Session Input */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Save Current Composition
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={projectTitle}
                  onChange={(e) => setProjectTitle(e.target.value)}
                  placeholder="Composition title (e.g. Nocturne in C# Minor)..."
                  className="flex-1 bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
                <button
                  onClick={handleSaveToLocalStorage}
                  className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-sm transition-colors shrink-0"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Project</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-500">
                Notes: {currentProject.notes.length} · Tempo: {currentProject.bpm} BPM · Time: {currentProject.timeSignature.numerator}/{currentProject.timeSignature.denominator}
              </p>
            </div>

            {/* Saved Projects List */}
            <div>
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-2">
                Saved Sessions in Browser Storage ({savedProjects.length})
              </span>

              {savedProjects.length === 0 ? (
                <div className="p-6 rounded-xl border border-dashed border-slate-800 text-center text-xs text-slate-500">
                  No saved projects yet. Click <strong>Save Project</strong> above to store your composition in browser localStorage.
                </div>
              ) : (
                <div className="space-y-2">
                  {savedProjects.map((proj) => (
                    <div
                      key={proj.id}
                      className="p-3 rounded-xl bg-slate-950/40 border border-slate-800 hover:border-slate-700 flex items-center justify-between text-xs transition-colors"
                    >
                      <div>
                        <p className="font-semibold text-slate-100">{proj.title}</p>
                        <p className="text-[11px] text-slate-400">
                          {proj.notes.length} notes · {proj.bpm} BPM · {proj.timeSignature.numerator}/{proj.timeSignature.denominator} · Saved: {proj.createdAt}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            onLoadProject(proj);
                            showTemporaryFeedback(`Loaded "${proj.title}"!`);
                            onClose();
                          }}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-lg text-xs transition-colors"
                        >
                          Load
                        </button>
                        <button
                          onClick={() => handleDeleteProject(proj.id)}
                          title="Delete from local storage"
                          className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg hover:bg-slate-800 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Pre-loaded Demos */}
        {activeTab === 'demos' && (
          <div className="p-6 space-y-3 text-sm max-h-[60vh] overflow-y-auto">
            <p className="text-xs text-slate-400 mb-2">
              Explore classical scores, modern chord progressions, and arpeggios to test real-time audio playback, notation engraving, and quantization.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {ALL_DEMOS.map((demo) => (
                <div
                  key={demo.id}
                  className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-amber-500/50 flex flex-col justify-between transition-colors"
                >
                  <div className="space-y-1 mb-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                      <h3 className="font-bold text-xs text-slate-100">{demo.title}</h3>
                    </div>
                    <p className="text-[11px] text-slate-400">{demo.createdAt}</p>
                    <p className="text-[11px] font-mono text-slate-500">
                      {demo.notes.length} notes · {demo.bpm} BPM · {demo.timeSignature.numerator}/{demo.timeSignature.denominator} time · {demo.instrument}
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      onLoadProject(demo);
                      showTemporaryFeedback(`Loaded "${demo.title}"!`);
                      onClose();
                    }}
                    className="w-full py-1.5 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-200 font-semibold text-xs rounded-lg transition-colors"
                  >
                    Open Score
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: MIDI & JSON Export / Import */}
        {activeTab === 'export-import' && (
          <div className="p-6 space-y-5 text-sm max-h-[60vh] overflow-y-auto">
            {/* Standard MIDI File Download */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <FileMusic className="w-4 h-4 text-emerald-400" />
                  <h3 className="font-bold text-xs text-slate-100">Standard MIDI (.mid) Binary</h3>
                </div>
                <p className="text-[11px] text-slate-400">
                  Client-side SMF Format 0 file. Importable directly into Ableton, Logic, GarageBand, FL Studio, MuseScore, or Sibelius.
                </p>
              </div>
              <button
                onClick={handleExportMidi}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-sm transition-colors shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export .mid</span>
              </button>
            </div>

            {/* Project JSON Backup */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Download className="w-4 h-4 text-amber-400" />
                  <h3 className="font-bold text-xs text-slate-100">Full Project JSON (.bentz.json)</h3>
                </div>
                <p className="text-[11px] text-slate-400">
                  Preserves raw micro-timings, tempo, quantize parameters, and synth settings.
                </p>
              </div>
              <button
                onClick={handleExportJson}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl transition-colors shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export JSON</span>
              </button>
            </div>

            {/* Import Project JSON */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Upload className="w-4 h-4 text-blue-400" />
                  <h3 className="font-bold text-xs text-slate-100">Import Existing Project</h3>
                </div>
                <p className="text-[11px] text-slate-400">
                  Load a previously exported .bentz.json or .cadence.json file from your computer.
                </p>
              </div>
              <label className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl cursor-pointer transition-colors shrink-0">
                <Upload className="w-3.5 h-3.5" />
                <span>Choose File</span>
                <input
                  type="file"
                  accept=".json,.bentz.json,.cadence.json"
                  onChange={handleImportJson}
                  className="hidden"
                />
              </label>
            </div>

            {/* Print Sheet Music */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Printer className="w-4 h-4 text-purple-400" />
                  <h3 className="font-bold text-xs text-slate-100">Print Notation Sheet / PDF</h3>
                </div>
                <p className="text-[11px] text-slate-400">
                  Opens browser system print sheet to save score as clean vector PDF.
                </p>
              </div>
              <button
                onClick={handlePrintScore}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl transition-colors shrink-0"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Score</span>
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            All data stored securely on user CPU and browser localStorage.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs rounded-xl transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
