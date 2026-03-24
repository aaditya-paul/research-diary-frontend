import { useState, useEffect } from "react";
import axios from "axios";
import type { Report } from "../types";
import { reportApi, exportApi } from "../services/api";

type CitationRef = {
  id: number;
  type: string;
  value: string;
};

interface ReportsListProps {
  refreshTrigger: number;
}

export function ReportsList({ refreshTrigger }: ReportsListProps) {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  useEffect(() => {
    loadReports();
  }, [refreshTrigger]);

  const loadReports = async () => {
    try {
      const data = await reportApi.getAll();
      setReports(data);
    } catch (error) {
      console.error("Failed to load reports:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this report?")) return;

    try {
      await reportApi.delete(id);
      loadReports();
    } catch (error) {
      console.error("Failed to delete report:", error);
    }
  };

  const handleExport = async (
    reportId: number,
    format: "markdown" | "html" | "pdf",
  ) => {
    try {
      let response;

      switch (format) {
        case "markdown":
          response = await exportApi.markdown(reportId);
          downloadFile(response.content, response.filename, "text/markdown");
          break;
        case "html":
          response = await exportApi.html(reportId);
          downloadFile(response.content, response.filename, "text/html");
          break;
        case "pdf":
          response = await exportApi.pdf(reportId);
          const normalizedBase64 = response.content.replace(/\s+/g, "");
          const byteCharacters = atob(normalizedBase64);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: "application/pdf" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = response.filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          break;
      }
    } catch (error) {
      console.error(`Failed to export ${format}:`, error);
      let message = `Failed to export as ${format.toUpperCase()}`;
      if (axios.isAxiosError(error)) {
        const detail = error.response?.data?.detail;
        if (typeof detail === "string" && detail.trim()) {
          message = `${message}: ${detail}`;
        }
      }
      alert(message);
    }
  };

  const downloadFile = (
    content: string,
    filename: string,
    mimeType: string,
  ) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const collectNumericReferences = (report: Report): CitationRef[] => {
    const merged = new Map<number, CitationRef>();

    // ── 1. Primary: shared global citation_registry (authoritative inline IDs) ──
    const globalReg: any[] = report.content?.citation_registry || [];
    globalReg.forEach((ref: any) => {
      if (typeof ref?.id === "number" && !merged.has(ref.id)) {
        merged.set(ref.id, {
          id: ref.id,
          type: ref.type || "source",
          value: ref.value || "Unknown source",
        });
      }
    });

    // ── 2. Per-section registries fallback (manual mode / old reports) ────────
    if (merged.size === 0) {
      ["hypothesis", "methodology", "findings", "conclusions", "timeline"].forEach((section) => {
        const refs: any[] = report.content?.[section]?.citation_registry || [];
        refs.forEach((ref: any) => {
          if (typeof ref?.id === "number" && !merged.has(ref.id)) {
            merged.set(ref.id, {
              id: ref.id,
              type: ref.type || "source",
              value: ref.value || "Unknown source",
            });
          }
        });
      });
    }

    // ── 3. Supplement with content.references (richer extraction from modal) ──
    // Adds any references the extraction found but that didn't make it into
    // the numeric registry (e.g. sources seen after chunk cutoff).
    // De-duplicated by value; assigned IDs continue from the highest existing ID.
    const existingValues = new Set(
      [...merged.values()].map((r) => r.value.toLowerCase().trim())
    );
    let nextId = merged.size > 0 ? Math.max(...merged.keys()) + 1 : 1;
    const rawRefs: any[] = report.content?.references || [];
    rawRefs.forEach((ref: any) => {
      const val: string = (ref?.value || "").trim();
      if (!val) return;
      if (existingValues.has(val.toLowerCase())) return;
      merged.set(nextId, {
        id: nextId,
        type: ref.type || "source",
        value: val,
      });
      existingValues.add(val.toLowerCase());
      nextId++;
    });

    return [...merged.values()].sort((a, b) => a.id - b.id);
  };


  const jumpToReference = (reportId: number, citationId: number) => {
    const el = document.getElementById(`ref-${reportId}-${citationId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("ring-2", "ring-buddy-purple", "dark:ring-buddy-green");
      window.setTimeout(() => {
        el.classList.remove(
          "ring-2",
          "ring-buddy-purple",
          "dark:ring-buddy-green",
        );
      }, 1200);
    }
  };

  const renderDraftWithCitationAnchors = (text: string, reportId: number) => {
    return text.split("\n\n").map((paragraph, pIdx) => {
      const parts = paragraph.split(/(\[\d+\])/g);
      return (
        <p key={pIdx}>
          {parts.map((part, idx) => {
            const match = part.match(/^\[(\d+)\]$/);
            if (!match) {
              return <span key={`${pIdx}-${idx}`}>{part}</span>;
            }
            const citationId = Number(match[1]);
            return (
              <button
                key={`${pIdx}-${idx}`}
                type="button"
                onClick={() => jumpToReference(reportId, citationId)}
                className="mx-0.5 inline-flex items-center rounded px-1 text-xs font-black text-buddy-purple dark:text-buddy-green underline decoration-dotted hover:bg-buddy-purple/10 dark:hover:bg-buddy-green/10"
                title={`Jump to reference [${citationId}]`}
              >
                [{citationId}]
              </button>
            );
          })}
        </p>
      );
    });
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-buddy-dark dark:text-gray-400 font-bold uppercase tracking-widest">
        Loading reports...
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="p-8 text-center text-buddy-dark dark:text-gray-400 border-2 border-dashed border-buddy-dark/20 dark:border-white/10 rounded-xl bg-white/50 dark:bg-black/20 backdrop-blur-sm font-bold uppercase tracking-wide">
        No reports yet. Select diary entries and generate a report!
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {reports.map((report) => (
        <div
          key={report.id}
          className="bg-white/80 dark:bg-black/40 backdrop-blur-md rounded-2xl border-2 border-buddy-dark dark:border-white/10 p-5 transition-all hover:shadow-[4px_4px_0_0_rgba(167,243,208,0.2)]"
        >
          <div className="flex items-start justify-between mb-2">
            <div>
              <h3 className="font-extrabold uppercase text-lg text-buddy-dark dark:text-gray-100 tracking-tight">
                {report.title}
              </h3>
              <div className="flex items-center gap-3 mt-2">
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-bold border-2 ${
                    report.report_type === "project"
                      ? "bg-buddy-purple/20 text-buddy-dark border-buddy-dark dark:border-buddy-purple dark:text-buddy-purple"
                      : "bg-buddy-green/20 text-buddy-dark border-buddy-dark dark:border-buddy-green dark:text-buddy-green"
                  }`}
                >
                  {report.report_type}
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-buddy-dark/70 dark:text-gray-400">
                  {formatDate(report.created_at)}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() =>
                  setSelectedReport(
                    selectedReport?.id === report.id ? null : report,
                  )
                }
                className="px-3 py-1.5 text-sm font-bold border-2 border-transparent hover:border-buddy-dark dark:hover:border-white/20 text-buddy-dark dark:text-gray-300 hover:bg-white/50 dark:hover:bg-white/10 rounded-full transition-all"
              >
                {selectedReport?.id === report.id ? "Hide" : "View"}
              </button>
              <button
                onClick={() => handleDelete(report.id)}
                className="px-3 py-1.5 text-sm font-bold border-2 border-transparent hover:border-red-400 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-all"
              >
                Delete
              </button>
            </div>
          </div>

          {selectedReport?.id === report.id && (
            <div className="mt-5 pt-5 border-t-2 border-buddy-dark/10 dark:border-white/10">
              {(() => {
                const numericRefs = collectNumericReferences(report);
                return (
                  <>
                    {[
                      "hypothesis",
                      "methodology",
                      "findings",
                      "conclusions",
                    ].map((section) => {
                      const sectionData = report.content[section];
                      if (!sectionData) return null;
                      return (
                        <div key={section} className="mb-5">
                          <h4 className="font-black uppercase tracking-widest text-sm text-buddy-dark dark:text-buddy-green mb-2">
                            {section}
                          </h4>
                          <div className="text-sm space-y-2 text-buddy-dark dark:text-gray-300 font-medium leading-relaxed">
                            {sectionData.draft
                              ? renderDraftWithCitationAnchors(
                                  sectionData.draft,
                                  report.id,
                                )
                              : (sectionData.selected_texts || []).map(
                                  (text: string, i: number) => (
                                    <p key={i}>{text}</p>
                                  ),
                                )}
                          </div>
                          {sectionData.quality && (
                            <p className="mt-2 text-xs font-bold uppercase tracking-wide text-buddy-dark/60 dark:text-gray-500">
                              {sectionData.quality.word_count} words |
                              citations: {sectionData.quality.citation_count}
                            </p>
                          )}

                        </div>
                      );
                    })}

                    {report.content.timeline && (
                      <div className="mb-5">
                        <h4 className="font-black uppercase tracking-widest text-sm text-buddy-dark dark:text-buddy-green mb-2">
                          Timeline
                        </h4>
                        <div className="text-sm space-y-2 text-buddy-dark dark:text-gray-300 font-medium leading-relaxed">
                          {report.content.timeline.draft ? (
                            renderDraftWithCitationAnchors(
                              report.content.timeline.draft,
                              report.id,
                            )
                          ) : (
                            <ol className="list-decimal pl-5 space-y-2">
                              {(
                                report.content.timeline.selected_texts || []
                              ).map((text: string, i: number) => (
                                <li key={i}>{text}</li>
                              ))}
                            </ol>
                          )}
                        </div>
                      </div>
                    )}

                    {numericRefs.length > 0 && (
                      <div className="mb-5">
                        <h4 className="font-black uppercase tracking-widest text-sm text-buddy-dark dark:text-buddy-green mb-2">
                          References
                        </h4>
                        <div className="text-sm space-y-2 text-buddy-dark dark:text-gray-300 font-medium leading-relaxed">
                          {numericRefs.map((ref) => (
                            <div
                              key={ref.id}
                              id={`ref-${report.id}-${ref.id}`}
                              className="rounded border border-buddy-dark/20 dark:border-white/20 px-3 py-2 transition"
                            >
                              <span className="font-black">[{ref.id}]</span>{" "}
                              {ref.type}: {ref.value}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}



                    <div className="flex flex-wrap gap-3 mt-6">
                      <button
                        onClick={() => handleExport(report.id, "markdown")}
                        className="px-4 py-2 text-sm font-bold border-2 border-buddy-dark dark:border-white/20 text-buddy-dark dark:text-gray-200 bg-white/50 dark:bg-black/40 hover:bg-buddy-yellow dark:hover:bg-buddy-green/20 dark:hover:text-buddy-green rounded-full shadow-brutal dark:shadow-[2px_2px_0_0_rgba(167,243,208,0.3)] transition-all active:translate-y-1 active:shadow-none"
                      >
                        Export Markdown
                      </button>
                      <button
                        onClick={() => handleExport(report.id, "html")}
                        className="px-4 py-2 text-sm font-bold border-2 border-buddy-dark dark:border-white/20 text-buddy-dark dark:text-gray-200 bg-white/50 dark:bg-black/40 hover:bg-buddy-yellow dark:hover:bg-buddy-purple/20 dark:hover:text-buddy-purple rounded-full shadow-brutal dark:shadow-[2px_2px_0_0_rgba(177,162,246,0.3)] transition-all active:translate-y-1 active:shadow-none"
                      >
                        Export HTML
                      </button>
                      <button
                        onClick={() => handleExport(report.id, "pdf")}
                        className="px-4 py-2 text-sm font-bold border-2 border-buddy-dark dark:border-white/20 text-buddy-dark dark:text-gray-200 bg-white/50 dark:bg-black/40 hover:bg-buddy-yellow dark:hover:bg-buddy-green/20 dark:hover:text-buddy-green rounded-full shadow-brutal dark:shadow-[2px_2px_0_0_rgba(167,243,208,0.3)] transition-all active:translate-y-1 active:shadow-none"
                      >
                        Export PDF
                      </button>
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
