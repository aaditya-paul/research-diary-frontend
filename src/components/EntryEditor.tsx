import { useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Save, Trash2, X } from "lucide-react";
import { RichTextEditor } from "./RichTextEditor";
import { entryApi } from "../services/api";
import type { Entry, EntryCreate } from "../types";

interface EntryEditorProps {
  entry?: Entry | null;
  onSave: () => void;
  onCancel: () => void;
}

export function EntryEditor({ entry, onSave, onCancel }: EntryEditorProps) {
  const [title, setTitle] = useState(entry?.title || "");
  const [content, setContent] = useState(entry?.content || "");
  const [entryType, setEntryType] = useState<"project" | "daily">(
    entry?.entry_type || "project",
  );
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleSave = async () => {
    if (!content.trim()) {
      alert("Please add some content");
      return;
    }

    setSaving(true);
    try {
      if (entry) {
        await entryApi.update(entry.id, {
          title: title || undefined,
          content,
          entry_type: entryType,
        });
      } else {
        const entryData: EntryCreate = {
          title: title || undefined,
          content,
          entry_type: entryType,
        };
        await entryApi.create(entryData);
      }
      onSave();
    } catch (error) {
      console.error("Failed to save entry:", error);
      alert("Failed to save entry");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!entry) return;
    if (!confirm("Are you sure you want to delete this entry?")) return;

    setDeleting(true);
    try {
      await entryApi.delete(entry.id);
      onSave();
    } catch (error) {
      console.error("Failed to delete entry:", error);
      alert("Failed to delete entry");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="form-card w-full h-full flex flex-col p-4 sm:p-6 lg:p-8">
      <div className="flex items-center justify-between mb-4 sm:mb-6 pb-4 border-b-2 border-buddy-dark dark:border-white/10 shrink-0">
        <h2 className="text-2xl font-black uppercase tracking-tight text-buddy-dark dark:text-gray-100">
          {entry ? "Edit Entry" : "New Entry"}
        </h2>
        <button
          onClick={onCancel}
          className="btn-ghost p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-900/40 hover:text-red-500 dark:text-gray-300 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-6 sm:space-y-8 flex-1 flex flex-col overflow-y-auto pr-2 -mr-2 scrollbar-hide">
        <div className="shrink-0">
          <label className="block text-sm font-bold uppercase tracking-wider text-buddy-dark dark:text-gray-300 mb-2 sm:mb-3">
            Entry Type
          </label>
          <div className="flex flex-wrap gap-4 sm:gap-6 p-1">
            <label className="flex items-center gap-2 sm:gap-3 cursor-pointer group">
              <input
                type="radio"
                name="entryType"
                value="project"
                checked={entryType === "project"}
                onChange={() => setEntryType("project")}
                className="w-5 h-5 text-buddy-purple focus:ring-buddy-purple border-2 border-buddy-dark dark:border-buddy-purple dark:bg-black/40 transition-all cursor-pointer shadow-sm"
              />
              <span className="text-sm font-bold group-hover:text-buddy-purple dark:text-gray-300 dark:group-hover:text-buddy-purple transition-colors uppercase tracking-wider">
                Project
              </span>
            </label>
            <label className="flex items-center gap-2 sm:gap-3 cursor-pointer group">
              <input
                type="radio"
                name="entryType"
                value="daily"
                checked={entryType === "daily"}
                onChange={() => setEntryType("daily")}
                className="w-5 h-5 text-buddy-green focus:ring-buddy-green border-2 border-buddy-dark dark:border-buddy-green dark:bg-black/40 transition-all cursor-pointer shadow-sm"
              />
              <span className="text-sm font-bold group-hover:text-buddy-green dark:text-gray-300 dark:group-hover:text-buddy-green transition-colors uppercase tracking-wider">
                Daily Story
              </span>
            </label>
          </div>
        </div>

        <div className="shrink-0">
          <label className="block text-sm font-bold uppercase tracking-wider text-buddy-dark dark:text-gray-300 mb-2 sm:mb-3">
            Title <span className="text-buddy-dark/50 dark:text-gray-500 font-normal normal-case">(optional)</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter a descriptive title"
            className="w-full px-4 py-3 bg-white dark:bg-black/40 dark:backdrop-blur-md border-2 border-buddy-dark dark:border-white/20 rounded-xl focus:outline-none focus:border-buddy-green dark:focus:border-buddy-green focus:shadow-[4px_4px_0_0_rgba(167,243,208,0.5)] transition-all text-buddy-dark dark:text-gray-100 placeholder-buddy-dark/40 dark:placeholder-gray-500 font-bold"
          />
        </div>

        <div className="flex-1 flex flex-col min-h-0 pb-2">
          <label className="block text-sm font-bold uppercase tracking-wider text-buddy-dark dark:text-gray-300 mb-2 sm:mb-3 shrink-0">
            Content
          </label>
          <RichTextEditor
            content={content}
            onChange={setContent}
            placeholder="Write your diary entry here..."
          />
        </div>
      </div>

      <div className="flex flex-col-reverse sm:flex-row justify-between items-center gap-4 mt-6 pt-6 border-t-2 border-buddy-dark dark:border-white/10 shrink-0">
        <div className="w-full sm:w-auto">
          {entry && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="btn-danger w-full sm:w-auto py-2 px-4 shadow-sm"
            >
              {deleting ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <Loader2 className="w-4 h-4" />
                </motion.div>
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              <span>{deleting ? "Deleting..." : "Delete"}</span>
            </button>
          )}
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <button onClick={onCancel} className="btn-ghost w-full sm:w-auto py-2 px-4">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary w-full sm:w-auto py-2 px-6 shadow-md"
          >
            {saving ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                <Loader2 className="w-4 h-4" />
              </motion.div>
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{saving ? "Saving..." : "Save Entry"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
