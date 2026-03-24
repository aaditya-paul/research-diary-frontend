import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, FileText, CheckSquare, Plus, Menu } from "lucide-react";
import { EntryList } from "./components/EntryList";
import { EntryEditor } from "./components/EntryEditor";
import { ReportBuilder } from "./components/ReportBuilder";
import { ReportsList } from "./components/ReportsList";
import type { Entry } from "./types";

type View = "entries" | "reports";

function App() {
  const [view, setView] = useState<View>("entries");
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showReportBuilder, setShowReportBuilder] = useState(false);
  const [selectedEntryIds, setSelectedEntryIds] = useState<number[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleRefresh = () => {
    setRefreshTrigger((prev) => prev + 1);
    setSelectedEntry(null);
    setIsCreating(false);
  };

  const navItems = [
    { id: "entries", label: "Diary Entries", icon: BookOpen },
    { id: "reports", label: "Reports", icon: FileText },
  ];

  return (
    <div className="flex h-screen overflow-hidden text-buddy-dark dark:text-gray-100 transition-colors duration-300 font-sans selection:bg-buddy-purple selection:text-white">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-20 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        className={`fixed md:static inset-y-0 left-0 z-30 w-64 bg-buddy-yellow dark:bg-black/40 dark:backdrop-blur-2xl border-r-4 border-buddy-dark md:border-r-4 dark:border-white/10 dark:md:border-r flex flex-col transform transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
      >
        <div className="p-6 pb-2">
          <div className="flex items-center gap-3 mb-10">
            <div className="bg-buddy-dark p-2 rounded-xl text-buddy-yellow dark:text-buddy-green shadow-brutal dark:shadow-[4px_4px_0_0_rgba(167,243,208,0.5)] transform -rotate-3 hover:rotate-0 transition-transform">
              <BookOpen className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tight leading-none dark:text-gray-100">
                BUDDY
                <br />
                <span className="text-sm font-medium tracking-normal normal-case opacity-80 dark:text-buddy-green">
                  Research Diary
                </span>
              </h1>
            </div>
          </div>

          <nav className="space-y-3 flex-grow">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setView(item.id as View);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-5 py-4 rounded-full transition-all duration-200 border-2 active:scale-95 font-bold ${
                  view === item.id
                    ? "bg-buddy-dark text-buddy-yellow border-buddy-dark shadow-brutal dark:bg-buddy-green/20 dark:text-buddy-green dark:border-buddy-green dark:shadow-[4px_4px_0_0_rgba(167,243,208,0.5)]"
                    : "bg-transparent text-buddy-dark dark:text-gray-400 border-transparent hover:border-buddy-dark dark:hover:border-white/20 dark:hover:bg-white/5"
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </button>
            ))}
          </nav>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative bg-white dark:bg-[#080808]">
        {/* Neon Ambient Backgrounds */}
        <div className="fixed top-[-20%] left-[20%] w-[50%] h-[50%] bg-buddy-purple/20 rounded-full blur-[120px] pointer-events-none z-0 dark:bg-buddy-purple/10" />
        <div className="fixed bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-buddy-green/20 rounded-full blur-[150px] pointer-events-none z-0 dark:bg-buddy-green/10" />

        <header className="md:hidden flex items-center justify-between bg-buddy-yellow dark:bg-black/60 dark:backdrop-blur-md border-b-4 border-buddy-dark dark:border-white/10 p-4 relative z-10">
          <div className="flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-buddy-dark dark:text-buddy-green" />
            <span className="font-black uppercase text-xl text-buddy-dark">
              Buddy
            </span>
          </div>
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 border-2 border-buddy-dark rounded-xl bg-white shadow-brutal active:translate-y-1 active:shadow-none transition-all"
          >
            <Menu className="w-6 h-6" />
          </button>
        </header>

        <div className="flex-1 overflow-auto p-4 md:p-8 lg:p-12 relative z-10">
          <div className="max-w-7xl mx-auto h-full flex flex-col items-center">
            <div className="w-full mb-8 text-center md:text-left hidden lg:block">
              <span className="inline-flex items-center gap-2 bg-buddy-green dark:bg-buddy-purple/20 dark:text-buddy-purple dark:border-buddy-purple text-buddy-dark font-bold px-4 py-2 rounded-full border-2 border-buddy-dark shadow-brutal dark:shadow-[4px_4px_0_0_rgba(177,162,246,0.5)] text-sm uppercase translate-y-2 mb-4 -rotate-2">
                <span className="w-2 h-2 rounded-full bg-buddy-dark dark:bg-buddy-purple animate-pulse"></span>
                Your AI Scheduling Buddy
              </span>
              <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter mb-4 text-buddy-dark dark:text-gray-100">
                Diary with a{" "}
                <span className="bg-buddy-dark text-buddy-green dark:bg-buddy-green/20 dark:text-buddy-green px-3 py-1 rounded-2xl inline-block -rotate-2 shadow-brutal dark:shadow-[4px_4px_0_0_rgba(167,243,208,0.5)] dark:border-2 dark:border-buddy-green">
                  Wild Side
                </span>
              </h2>
            </div>
            <AnimatePresence mode="wait">
              {view === "entries" && (
                <motion.div
                  key="entries-view"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="w-full flex flex-col lg:flex-row gap-4 sm:gap-8 h-full min-h-[600px] relative"
                >
                  {/* Decorative Elements */}
                  <div className="absolute -top-10 -right-10 w-32 h-32 bg-buddy-yellow rounded-full blur-[80px] opacity-50 pointer-events-none" />
                  <div className="absolute bottom-10 -left-10 w-40 h-40 bg-buddy-purple rounded-full blur-[100px] opacity-30 pointer-events-none" />

                  {/* Entries List Column - hide on mobile when editor is open */}
                  <div className={`w-full lg:w-1/3 flex flex-col form-card p-4 sm:p-6 overflow-hidden lg:h-full z-10 ${(isCreating || selectedEntry) ? "hidden lg:flex" : "h-[50vh] sm:h-[calc(100vh-8rem)]"}`}>
                    <div className="flex items-center justify-between mb-6 shrink-0">
                      <h2 className="font-extrabold text-2xl tracking-tight uppercase text-buddy-dark dark:text-gray-100">
                        Entries
                      </h2>
                      <button
                        onClick={() => setIsCreating(true)}
                        className="btn-primary py-2 px-4 text-sm"
                      >
                        <Plus className="w-5 h-5" />
                        <span className="hidden sm:inline">New</span>
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto pr-2 -mr-2 scrollbar-hide">
                      <EntryList
                        onSelect={(entry) => {
                          setSelectedEntry(entry);
                          setIsCreating(false);
                        }}
                        selectedIds={selectedEntryIds}
                        onSelectionChange={setSelectedEntryIds}
                        refreshTrigger={refreshTrigger}
                      />
                    </div>

                    {selectedEntryIds.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="mt-4 pt-4 border-t-2 border-dashed border-gray-200 dark:border-white/10 shrink-0"
                      >
                        <p className="text-sm font-bold text-gray-500 mb-3 flex items-center gap-2 uppercase tracking-wider">
                          <CheckSquare className="w-4 h-4 text-buddy-dark dark:text-buddy-purple" />
                          <span className="text-buddy-dark dark:text-gray-300">
                            {selectedEntryIds.length} entry(s) selected
                          </span>
                        </p>
                        <button
                          onClick={() => setShowReportBuilder(true)}
                          className="w-full py-4 bg-buddy-dark text-buddy-green dark:bg-buddy-purple/20 dark:backdrop-blur-md dark:text-buddy-purple font-black uppercase tracking-widest rounded-full shadow-brutal dark:shadow-[4px_4px_0_0_rgba(177,162,246,0.5)] active:translate-y-1 active:shadow-none dark:active:shadow-none hover:-translate-y-1 transition-all flex items-center justify-center gap-3 border-2 border-buddy-dark dark:border-buddy-purple"
                        >
                          <FileText className="w-5 h-5" />
                          Generate Report
                        </button>
                      </motion.div>
                    )}
                  </div>

                  {/* Editor Column */}
                  <div className={`w-full lg:w-2/3 lg:h-full lg:overflow-y-auto z-10 sm:p-2 ${(isCreating || selectedEntry) ? "h-[calc(100vh-8rem)]" : ""}`}>
                    <AnimatePresence mode="wait">
                      {isCreating ? (
                        <motion.div
                          key="create"
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                        >
                          <EntryEditor
                            onSave={handleRefresh}
                            onCancel={() => setIsCreating(false)}
                          />
                        </motion.div>
                      ) : selectedEntry ? (
                        <motion.div
                          key="edit"
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                        >
                          <EntryEditor
                            entry={selectedEntry}
                            onSave={handleRefresh}
                            onCancel={() => setSelectedEntry(null)}
                          />
                        </motion.div>
                      ) : (
                        <motion.div
                          key="empty"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="h-full flex flex-col items-center justify-center text-center p-8 form-card border-none bg-black/5 dark:bg-white/5 shadow-none group transition-all duration-500"
                        >
                          <div className="bg-white dark:bg-buddy-dark p-6 rounded-[2rem] shadow-brutal border-2 border-buddy-dark mb-6 transform -rotate-3 group-hover:rotate-0 transition-transform duration-500">
                            <BookOpen className="w-16 h-16 text-buddy-green dark:text-buddy-yellow" />
                          </div>
                          <h3 className="text-3xl font-black uppercase mb-3 text-buddy-dark dark:text-white group-hover:scale-105 transition-transform duration-500">
                            Capture The Chaos
                          </h3>
                          <p className="text-gray-500 dark:text-gray-400 font-medium max-w-sm mb-8 text-lg">
                            Select an entry from the list or start a new one to
                            jot down your brilliant ideas.
                          </p>
                          <button
                            onClick={() => setIsCreating(true)}
                            className="bg-buddy-purple text-buddy-dark font-black uppercase px-8 py-4 rounded-full border-2 border-buddy-dark shadow-brutal hover:-translate-y-1 active:translate-y-0 active:shadow-none transition-all flex items-center gap-3"
                          >
                            <Plus className="w-6 h-6" /> Start Writing
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              )}

              {view === "reports" && (
                <motion.div
                  key="reports-view"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="h-full flex flex-col relative z-10"
                >
                  {/* Decorative Elements */}
                  <div className="absolute top-10 right-20 w-40 h-40 bg-buddy-green rounded-full blur-[100px] opacity-30 pointer-events-none" />

                  <div className="flex items-center justify-between mb-8">
                    <h2 className="font-black text-3xl md:text-5xl uppercase tracking-tighter">
                      Saved{" "}
                      <span className="text-white text-stroke-buddy">
                        Reports
                      </span>
                    </h2>
                  </div>
                  <div className="flex-1 form-card p-8 lg:p-12 overflow-y-auto">
                    <ReportsList refreshTrigger={refreshTrigger} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* Report Builder Modal */}
      <AnimatePresence>
        {showReportBuilder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 lg:p-8"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="max-w-4xl w-full max-h-full overflow-y-auto bg-transparent"
            >
              <ReportBuilder
                selectedEntries={selectedEntryIds}
                onComplete={() => {
                  setShowReportBuilder(false);
                  setSelectedEntryIds([]);
                  setRefreshTrigger((prev) => prev + 1);
                  setView("reports");
                }}
                onCancel={() => setShowReportBuilder(false)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
