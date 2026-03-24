import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import type { Entry } from "../types";
import { entryApi } from "../services/api";

interface EntryListProps {
  onSelect: (entry: Entry) => void;
  selectedIds: number[];
  onSelectionChange: (ids: number[]) => void;
  refreshTrigger: number;
}

export function EntryList({
  onSelect,
  selectedIds,
  onSelectionChange,
  refreshTrigger,
}: EntryListProps) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEntries();
  }, [refreshTrigger]);

  const loadEntries = async () => {
    try {
      const data = await entryApi.getAll();
      setEntries(data);
    } catch (error) {
      console.error("Failed to load entries:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (
      window.confirm(
        "Are you sure you want to delete this entry? This action cannot be undone.",
      )
    ) {
      try {
        await entryApi.delete(id);
        loadEntries(); // Refresh the list
        if (selectedIds.includes(id)) {
          onSelectionChange(selectedIds.filter((i) => i !== id));
        }
      } catch (error) {
        console.error("Failed to delete entry:", error);
        alert("Failed to delete entry");
      }
    }
  };

  const toggleSelection = (id: number) => {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((i) => i !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const stripHtml = (html: string) => {
    const tmp = document.createElement("div");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
  };

  if (loading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center space-y-4 text-gray-500 dark:text-gray-400">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full"
        />
        <p>Loading entries...</p>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="p-8 text-center text-gray-500 dark:text-gray-400 border-2 border-dashed border-gray-200 dark:border-white/10 rounded-xl bg-white/50 dark:bg-black/20 backdrop-blur-sm"
      >
        No entries yet. Create your first diary entry!
      </motion.div>
    );
  }

  const container: any = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  };

  const item: any = {
    hidden: { opacity: 0, y: 10 },
    show: {
      opacity: 1,
      y: 0,
      transition: { type: "spring", stiffness: 300, damping: 24 },
    },
  };

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-3 pb-4"
    >
      {entries.map((entry) => (
        <motion.div
          key={entry.id}
          variants={item}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 ${
            selectedIds.includes(entry.id)
              ? "border-buddy-purple bg-buddy-purple/10 dark:bg-buddy-purple/20 dark:border-buddy-purple shadow-[4px_4px_0_0_rgba(177,162,246,0.6)]"
              : "border-buddy-dark hover:border-buddy-green bg-white dark:bg-black/40 dark:backdrop-blur-md dark:border-white/10 dark:hover:border-buddy-green shadow-sm hover:shadow-[4px_4px_0_0_rgba(167,243,208,0.3)]"
          }`}
        >
          <div className="flex items-start gap-4">
            <div className="pt-1 select-none">
              <input
                type="checkbox"
                checked={selectedIds.includes(entry.id)}
                onChange={() => toggleSelection(entry.id)}
                className="w-5 h-5 rounded border-2 border-buddy-dark text-buddy-purple focus:ring-buddy-purple dark:border-white/20 dark:bg-black/40 dark:focus:ring-buddy-purple transition-all cursor-pointer shadow-sm"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            <div className="flex-1 min-w-0" onClick={() => onSelect(entry)}>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-bold border-2 ${
                    entry.entry_type === "project"
                      ? "bg-buddy-purple/20 text-buddy-dark border-buddy-dark dark:border-buddy-purple dark:text-buddy-purple"
                      : "bg-buddy-green/20 text-buddy-dark border-buddy-dark dark:border-buddy-green dark:text-buddy-green"
                  }`}
                >
                  {entry.entry_type}
                </span>
                <span className="text-xs text-buddy-dark/70 dark:text-gray-400 font-bold tracking-wider uppercase">
                  {formatDate(entry.created_at)}
                </span>
              </div>
              {entry.title ? (
                <h3 className="font-extrabold text-buddy-dark dark:text-gray-100 mb-1 truncate text-lg tracking-tight">
                  {entry.title}
                </h3>
              ) : (
                <h3 className="font-extrabold text-buddy-dark/40 dark:text-gray-500 mb-1 italic text-lg tracking-tight border-b-2 border-dashed border-buddy-dark/20 dark:border-gray-600 inline-block">
                  Untitled Entry
                </h3>
              )}
              <p className="text-sm text-buddy-dark/80 dark:text-gray-400 line-clamp-2 leading-relaxed font-medium">
                {stripHtml(entry.content) || "No content..."}
              </p>
            </div>

            {/* Delete Button */}
            <div className="flex-shrink-0 flex self-center md:self-start md:pt-1 pl-2">
              <button
                onClick={(e) => handleDelete(e, entry.id)}
                className="p-2 text-red-500 hover:text-white hover:bg-red-500 dark:hover:bg-red-500/80 rounded-xl transition-all border-2 border-transparent hover:border-red-600 shadow-sm active:scale-95"
                title="Delete Entry"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            </div>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}
