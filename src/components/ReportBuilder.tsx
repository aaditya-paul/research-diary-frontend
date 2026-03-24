import { useState, useEffect, useRef } from "react";
import type {
  CitationReference,
  DraftRegenerateResult,
  Entry,
  ReportGenerateResponse,
  ReportSectionSuggestion,
  Reference,
  ReferenceMention,
} from "../types";
import { entryApi, reportApi } from "../services/api";

interface ReportBuilderProps {
  selectedEntries: number[];
  onComplete: () => void;
  onCancel: () => void;
}

export function ReportBuilder({
  selectedEntries,
  onComplete,
  onCancel,
}: ReportBuilderProps) {
  const [reportType, setReportType] = useState<"project" | "timeline">(
    "project",
  );
  const [suggestions, setSuggestions] = useState<ReportGenerateResponse | null>(
    null,
  );
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reportTitle, setReportTitle] = useState("");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [draftMetadata, setDraftMetadata] = useState<
    Record<string, DraftRegenerateResult>
  >({});
  const [sectionStatus, setSectionStatus] = useState<Record<string, string>>(
    {},
  );
  const [drafting, setDrafting] = useState<Record<string, boolean>>({});
  const [isManualMode, setIsManualMode] = useState(false);
  const [progressTimeline, setProgressTimeline] = useState<string[]>([]);
  const [globalCitationRegistry, setGlobalCitationRegistry] = useState<
    CitationReference[]
  >([]);
  const timelineEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll progress timeline to bottom whenever a new item is added.
  useEffect(() => {
    timelineEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [progressTimeline]);

  const pushProgress = (message: string) => {
    setProgressTimeline((prev) => [
      ...prev,
      `${new Date().toLocaleTimeString()} - ${message}`,
    ]);
  };

  const generateDraftForSectionData = async (
    sectionName: string,
    selectedTexts: string[],
    fullDiaryContext: string,
  ) => {
    if (selectedTexts.length === 0) return;
    setSectionStatus((prev) => ({ ...prev, [sectionName]: "generating" }));
    setDrafting((prev) => ({ ...prev, [sectionName]: true }));
    try {
      const response = await reportApi.regenerateDraft(
        sectionName,
        selectedTexts,
        fullDiaryContext,
      );
      setDrafts((prev) => ({ ...prev, [sectionName]: response.draft }));
      setDraftMetadata((prev) => ({ ...prev, [sectionName]: response }));
      setSectionStatus((prev) => ({
        ...prev,
        [sectionName]: response.diagnostics?.status || "done",
      }));
    } catch (error) {
      console.error(`Failed to generate draft for ${sectionName}:`, error);
      setSectionStatus((prev) => ({ ...prev, [sectionName]: "failed" }));
    } finally {
      setDrafting((prev) => ({ ...prev, [sectionName]: false }));
    }
  };

  const generateSuggestions = async () => {
    if (selectedEntries.length === 0) {
      alert("Please select at least one entry");
      return;
    }

    setGenerating(true);
    setProgressTimeline([]);
    try {
      if (!isManualMode) {
        pushProgress("Initializing auto-generation stream...");
        await new Promise<void>((resolve, reject) => {
          const streamUrl = reportApi.draftStreamUrl(
            selectedEntries,
            reportType,
          );
          const source = new EventSource(streamUrl);

          source.onmessage = (event) => {
            try {
              const data = JSON.parse(event.data || "{}");
              const eventType = data?.type;

              if (eventType === "started") {
                pushProgress("Analyzing selected entries...");
                return;
              }

              if (eventType === "suggestions_ready") {
                const nextStatus: Record<string, string> = {};
                Object.keys(data.sections || {}).forEach((sectionName) => {
                  nextStatus[sectionName] = "queued";
                });
                setSectionStatus(nextStatus);
                pushProgress("Suggestions ready. Starting section drafting...");
                return;
              }

              if (eventType === "section_started") {
                const section = data.section as string;
                setSectionStatus((prev) => ({
                  ...prev,
                  [section]: "generating",
                }));
                setDrafting((prev) => ({ ...prev, [section]: true }));
                pushProgress(`Generating ${getSectionTitle(section)}...`);
                return;
              }

              if (eventType === "section_skipped") {
                const section = data.section as string;
                setSectionStatus((prev) => ({ ...prev, [section]: "skipped" }));
                pushProgress(
                  `Skipped ${getSectionTitle(section)} (no selected snippets)`,
                );
                return;
              }

              if (eventType === "section_completed") {
                const section = data.section as string;
                setDrafting((prev) => ({ ...prev, [section]: false }));
                setSectionStatus((prev) => ({
                  ...prev,
                  [section]: data.status || "done",
                }));
                if (typeof data.draft === "string") {
                  setDrafts((prev) => ({ ...prev, [section]: data.draft }));
                }
                if (data.metadata) {
                  setDraftMetadata((prev) => ({
                    ...prev,
                    [section]: data.metadata as DraftRegenerateResult,
                  }));
                }
                pushProgress(
                  `Completed ${getSectionTitle(section)} (${data.status || "done"})`,
                );
                return;
              }

              if (eventType === "completed") {
                const payload = data.payload || {};
                setSuggestions({
                  sections: payload.sections || {},
                  references: payload.references || [],
                });
                setDrafts(payload.drafts || {});
                setDraftMetadata(payload.draft_metadata || {});
                setSectionStatus(payload.section_status || {});
                setGlobalCitationRegistry(
                  payload.global_citation_registry || [],
                );
                setDrafting({});
                pushProgress("All sections completed.");
                source.close();
                resolve();
                return;
              }

              if (eventType === "error") {
                const errMsg = data.message || "Streaming failed";
                source.close();
                reject(new Error(errMsg));
              }
            } catch (err) {
              source.close();
              reject(err);
            }
          };

          source.onerror = () => {
            source.close();
            reject(new Error("Lost connection to generation stream."));
          };
        });
      } else {
        const result = await reportApi.generateSuggestions(
          selectedEntries,
          reportType,
        );
        setSuggestions(result);
        pushProgress("Suggestions ready (manual mode).");
      }
    } catch (error) {
      console.error("Failed to generate suggestions:", error);
      alert("Failed to generate report suggestions");
    } finally {
      setGenerating(false);
    }
  };

  const toggleSuggestion = (section: string, index: number) => {
    if (!suggestions) return;

    const newSections = { ...suggestions.sections };
    const sectionData = newSections[section];

    if (sectionData.selected.includes(index)) {
      sectionData.selected = sectionData.selected.filter((i) => i !== index);
    } else {
      sectionData.selected = [...sectionData.selected, index];
    }

    setSuggestions({
      ...suggestions,
      sections: newSections,
    });
  };

  const generateAllDrafts = async () => {
    if (!suggestions) return;
    const fullDiaryContext = await buildFullDiaryContext();
    const promises = Object.keys(suggestions.sections).map((sectionName) => {
      const sectionData = suggestions.sections[sectionName];
      const selectedTexts = sectionData.selected.map(
        (idx) => sectionData.suggestions[idx]?.text || "",
      );
      return generateDraftForSectionData(
        sectionName,
        selectedTexts,
        fullDiaryContext,
      );
    });
    await Promise.all(promises);
  };

  const generateDraftForSection = async (sectionName: string) => {
    if (!suggestions) return;
    const fullDiaryContext = await buildFullDiaryContext();
    const sectionData = suggestions.sections[sectionName];
    const selectedTexts = sectionData.selected.map(
      (idx) => sectionData.suggestions[idx]?.text || "",
    );
    return generateDraftForSectionData(
      sectionName,
      selectedTexts,
      fullDiaryContext,
    );
  };

  const buildFullDiaryContext = async (): Promise<string> => {
    const allEntries: Entry[] = await entryApi.getAll();
    const selected = allEntries
      .filter((entry) => selectedEntries.includes(entry.id))
      .sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      );

    return selected
      .map((entry) => {
        const titlePart = entry.title ? `Title: ${entry.title}\n` : "";
        return `Entry ID: ${entry.id}\n${titlePart}${entry.content}`;
      })
      .join("\n\n---\n\n");
  };

  const buildReportContent = () => {
    if (!suggestions) return {};

    const content: Record<string, any> = {};

    Object.entries(suggestions.sections).forEach(
      ([sectionName, sectionData]) => {
        content[sectionName] = {
          selected_texts: sectionData.selected.map(
            (idx) => sectionData.suggestions[idx]?.text || "",
          ),
          draft: drafts[sectionName] || "",
          inline_citation_ids:
            draftMetadata[sectionName]?.inline_citation_ids || [],
          citation_registry:
            draftMetadata[sectionName]?.citation_registry || [],
          quality: draftMetadata[sectionName]?.quality,
          diagnostics: draftMetadata[sectionName]?.diagnostics,
        };
      },
    );

    content.references = suggestions.references.map((ref) => ({
      type: ref.type,
      value: ref.value,
      mentions: ref.mentions.map((m) => ({
        text: m.text,
        entry_id: m.entry_id,
      })),
    }));

    // Write the shared numeric citation registry at the top level so the
    // export service can find it without merging per-section registries.
    // Per-section registries may have conflicting IDs; this is the ground truth.
    if (globalCitationRegistry.length > 0) {
      content.citation_registry = globalCitationRegistry;
    }

    return content;
  };

  const saveReport = async () => {
    if (!reportTitle.trim()) {
      alert("Please enter a report title");
      return;
    }

    if (!suggestions) {
      alert("Please generate suggestions first");
      return;
    }

    const failingSections = Object.keys(suggestions.sections).filter(
      (sectionName) => {
        const sectionData = suggestions.sections[sectionName];
        if (sectionData.selected.length === 0) return false;
        const quality = draftMetadata[sectionName]?.quality;
        if (!quality) return true;
        return (
          !quality.min_words_passed ||
          !quality.citations_passed ||
          !quality.structure_passed
        );
      },
    );

    if (failingSections.length > 0) {
      alert(
        `Quality gates failed for: ${failingSections.join(", ")}. Regenerate these sections before saving.`,
      );
      return;
    }

    const warningSections = Object.keys(suggestions.sections).filter(
      (sectionName) => {
        const sectionData = suggestions.sections[sectionName];
        if (sectionData.selected.length === 0) return false;
        const quality = draftMetadata[sectionName]?.quality;
        const diagnostics = draftMetadata[sectionName]?.diagnostics;
        const hasUnsupportedNumericClaim = (diagnostics?.issues ?? []).some(
          (issue) => issue.toLowerCase().includes("unsupported numeric claim"),
        );
        const hasQuantifierMismatch = (diagnostics?.issues ?? []).some(
          (issue) => issue.toLowerCase().includes("quantifier mismatch"),
        );
        const weakGrounding = (quality?.factual_grounding_score ?? 1) < 0.45;
        return (
          hasUnsupportedNumericClaim || hasQuantifierMismatch || weakGrounding
        );
      },
    );

    if (warningSections.length > 0) {
      const shouldContinue = window.confirm(
        `Potential factual-risk sections detected: ${warningSections.join(", ")}. You can still save, but review these drafts first. Continue saving?`,
      );
      if (!shouldContinue) {
        return;
      }
    }

    setSaving(true);
    try {
      const content = buildReportContent();

      await reportApi.create({
        title: reportTitle,
        report_type: reportType,
        content,
        entry_ids: selectedEntries,
      });

      onComplete();
    } catch (error) {
      console.error("Failed to save report:", error);
      alert("Failed to save report");
    } finally {
      setSaving(false);
    }
  };

  const getSectionTitle = (section: string) => {
    const titles: Record<string, string> = {
      hypothesis: "Hypothesis",
      methodology: "Methodology",
      findings: "Findings",
      conclusions: "Conclusions",
      timeline: "Timeline",
    };
    return (
      titles[section] || section.charAt(0).toUpperCase() + section.slice(1)
    );
  };

  return (
    <div className="bg-white/90 dark:bg-black/80 backdrop-blur-2xl rounded-3xl border-2 border-buddy-dark dark:border-white/20 shadow-brutal dark:shadow-[8px_8px_0_0_rgba(167,243,208,0.2)] p-8 max-h-[85vh] overflow-y-auto w-full">
      <h2 className="text-3xl font-black uppercase tracking-tighter text-buddy-dark dark:text-gray-100 mb-6">
        Build Report
      </h2>

      <div className="space-y-6 mb-8">
        <div>
          <label className="block text-sm font-bold uppercase tracking-wider text-buddy-dark dark:text-gray-300 mb-2">
            Report Title
          </label>
          <input
            type="text"
            value={reportTitle}
            onChange={(e) => setReportTitle(e.target.value)}
            placeholder="Enter a title for your report"
            className="w-full px-4 py-3 bg-white dark:bg-black/40 dark:backdrop-blur-md border-2 border-buddy-dark dark:border-white/20 rounded-xl focus:outline-none focus:border-buddy-green dark:focus:border-buddy-green focus:shadow-[4px_4px_0_0_rgba(167,243,208,0.5)] transition-all text-buddy-dark dark:text-gray-100 placeholder-buddy-dark/40 dark:placeholder-gray-500 font-bold"
          />
        </div>

        <div>
          <label className="block text-sm font-bold uppercase tracking-wider text-buddy-dark dark:text-gray-300 mb-3">
            Report Type
          </label>
          <div className="flex gap-6 p-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="reportType"
                value="project"
                checked={reportType === "project"}
                onChange={() => {
                  setReportType("project");
                  setSuggestions(null);
                }}
                className="w-5 h-5 text-buddy-purple focus:ring-buddy-purple border-2 border-buddy-dark dark:border-buddy-purple dark:bg-black/40 transition-all cursor-pointer shadow-sm"
              />
              <span className="font-bold uppercase tracking-wide text-buddy-dark dark:text-gray-200 text-sm">
                Project Research
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="reportType"
                value="timeline"
                checked={reportType === "timeline"}
                onChange={() => {
                  setReportType("timeline");
                  setSuggestions(null);
                }}
                className="w-5 h-5 text-buddy-green focus:ring-buddy-green border-2 border-buddy-dark dark:border-buddy-green dark:bg-black/40 transition-all cursor-pointer shadow-sm"
              />
              <span className="font-bold uppercase tracking-wide text-buddy-dark dark:text-gray-200 text-sm">
                Timeline
              </span>
            </label>
          </div>
        </div>

        <div>
          <label className="flex items-center gap-2 cursor-pointer pt-2 group">
            <input
              type="checkbox"
              checked={isManualMode}
              onChange={(e) => setIsManualMode(e.target.checked)}
              className="w-5 h-5 rounded border-2 border-buddy-dark text-buddy-green focus:ring-buddy-green dark:border-white/20 dark:bg-black/40 transition-all cursor-pointer shadow-sm group-hover:shadow-[4px_4px_0_0_rgba(167,243,208,0.5)]"
            />
            <span className="font-bold text-sm tracking-wide text-buddy-dark/80 dark:text-gray-300">
              Enable manual snippet selection (Advanced)
            </span>
          </label>
        </div>

        <div>
          <p className="text-sm font-bold text-buddy-dark/70 dark:text-gray-400 uppercase tracking-widest mt-4">
            Selected{" "}
            <span className="text-buddy-purple dark:text-buddy-green">
              {selectedEntries.length}
            </span>{" "}
            entries
          </p>
        </div>

        {/* ── Generate button — shown only before generation completes ── */}
        {!suggestions && (
          <button
            onClick={generateSuggestions}
            disabled={generating}
            className="w-full mt-4 py-4 bg-buddy-green dark:bg-buddy-purple/20 text-buddy-dark dark:text-buddy-purple font-black uppercase tracking-widest rounded-full border-2 border-buddy-dark dark:border-buddy-purple shadow-brutal dark:shadow-[4px_4px_0_0_rgba(177,162,246,0.5)] hover:-translate-y-1 active:translate-y-0 active:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generating
              ? isManualMode
                ? "Analyzing entries..."
                : "Auto-generating Report Drafts..."
              : isManualMode
                ? "Generate Report Suggestions"
                : "Auto-Generate Report"}
          </button>
        )}

        {/* ── Live progress timeline — visible immediately when generation starts ── */}
        {(generating || progressTimeline.length > 0) && (
          <div className="mt-2 bg-gray-50 dark:bg-black/40 border-2 border-buddy-dark/10 dark:border-white/10 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-black uppercase tracking-widest text-buddy-dark dark:text-buddy-green">
                Generation Timeline
              </h4>
              {generating && (
                <span className="flex items-center gap-1.5 text-xs font-bold text-buddy-purple dark:text-buddy-green animate-pulse uppercase tracking-widest">
                  <span className="w-1.5 h-1.5 rounded-full bg-buddy-purple dark:bg-buddy-green inline-block animate-bounce" />
                  Live
                </span>
              )}
            </div>
            {progressTimeline.length === 0 ? (
              <p className="text-xs text-buddy-dark/50 dark:text-gray-500 italic">
                Starting...
              </p>
            ) : (
              <ul className="space-y-1 text-xs max-h-52 overflow-auto pr-1">
                {progressTimeline.map((item, idx) => (
                  <li
                    key={idx}
                    className={`font-medium flex items-start gap-1.5 ${
                      idx === progressTimeline.length - 1 && generating
                        ? "text-buddy-purple dark:text-buddy-green"
                        : "text-buddy-dark/70 dark:text-gray-400"
                    }`}
                  >
                    <span className="mt-0.5 shrink-0">
                      {idx === progressTimeline.length - 1 && generating
                        ? "▶"
                        : "✓"}
                    </span>
                    {item}
                  </li>
                ))}
                <div ref={timelineEndRef} />
              </ul>
            )}
          </div>
        )}

        {/* ── Sections panel — shown once suggestions are ready ── */}
        {suggestions && (
          <div className="space-y-8 mt-8 border-t-2 border-buddy-dark/10 dark:border-white/10 pt-8">
            <div className="flex justify-between items-center bg-gray-50 dark:bg-white/5 p-4 rounded-2xl border-2 border-buddy-dark/10 dark:border-white/10">
              <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
                {isManualMode
                  ? "Found semantic matches. Choose what to include, then generate drafts."
                  : "Drafts auto-generated from the most relevant semantic matches."}
              </span>
              {isManualMode && (
                <button
                  onClick={generateAllDrafts}
                  disabled={Object.values(drafting).some(Boolean)}
                  className="px-4 py-2 bg-buddy-purple text-white font-bold uppercase tracking-wider text-xs rounded-xl border-2 border-buddy-dark shadow-brutal hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50"
                >
                  {Object.values(drafting).some(Boolean)
                    ? "Generating..."
                    : "Generate All Drafts"}
                </button>
              )}
            </div>

            {Object.entries(suggestions.sections).map(
              ([sectionName, sectionData]) => (
                <div
                  key={sectionName}
                  className="border-2 border-buddy-dark/20 dark:border-white/10 rounded-2xl p-6 bg-white/50 dark:bg-black/20"
                >
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="font-black uppercase tracking-tight text-xl text-buddy-dark dark:text-buddy-green">
                      {getSectionTitle(sectionName)}
                    </h3>
                    <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border border-buddy-dark/20 dark:border-white/20 text-buddy-dark/70 dark:text-gray-300 bg-white/60 dark:bg-black/30">
                      {sectionStatus[sectionName] || "idle"}
                    </span>
                  </div>

                  {isManualMode &&
                    (sectionData.suggestions.length === 0 ? (
                      <p className="text-buddy-dark/50 dark:text-gray-500 text-sm font-bold italic">
                        No relevant content found
                      </p>
                    ) : (
                      <div className="space-y-3 mb-6">
                        {sectionData.suggestions.map(
                          (
                            suggestion: ReportSectionSuggestion,
                            idx: number,
                          ) => (
                            <label
                              key={idx}
                              className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 ${
                                sectionData.selected.includes(idx)
                                  ? "border-buddy-purple bg-buddy-purple/10 dark:bg-buddy-purple/20 shadow-[4px_4px_0_0_rgba(177,162,246,0.4)]"
                                  : "border-buddy-dark/20 dark:border-white/10 hover:border-buddy-green dark:hover:border-buddy-green shadow-sm hover:shadow-[4px_4px_0_0_rgba(167,243,208,0.2)]"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={sectionData.selected.includes(idx)}
                                onChange={() =>
                                  toggleSuggestion(sectionName, idx)
                                }
                                className="mt-1 w-5 h-5 rounded border-2 border-buddy-dark text-buddy-purple focus:ring-buddy-purple dark:border-white/20 dark:bg-black/40 transition-all cursor-pointer shadow-sm"
                              />
                              <div className="flex-1">
                                <p className="text-sm font-medium text-buddy-dark dark:text-gray-200 leading-relaxed">
                                  {suggestion.text}
                                </p>
                                <p className="text-xs font-bold uppercase text-buddy-dark/50 dark:text-gray-500 mt-2">
                                  Confidence:{" "}
                                  {(suggestion.confidence * 100).toFixed(0)}%
                                </p>
                              </div>
                            </label>
                          ),
                        )}
                      </div>
                    ))}

                  {(sectionData.selected.length > 0 || !isManualMode) && (
                    <div
                      className={`pt-4 ${isManualMode ? "border-t-2 border-buddy-dark/10 dark:border-white/10" : ""}`}
                    >
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="text-sm font-black uppercase text-buddy-purple dark:text-buddy-green">
                          Academic Draft
                        </h4>
                        <button
                          onClick={() => generateDraftForSection(sectionName)}
                          disabled={drafting[sectionName]}
                          className="text-xs font-bold px-3 py-1.5 bg-white/50 dark:bg-black/40 border-2 border-buddy-dark/20 dark:border-white/20 rounded-lg hover:border-buddy-purple dark:hover:border-buddy-green transition-all shadow-sm active:scale-95 disabled:opacity-50"
                        >
                          {drafting[sectionName]
                            ? "Generating..."
                            : drafts[sectionName]
                              ? "Regenerate / Variant"
                              : "Generate Draft"}
                        </button>
                      </div>
                      {drafts[sectionName] ? (
                        <div className="p-4 bg-white dark:bg-black/60 border-2 border-buddy-dark/30 dark:border-white/20 rounded-xl shadow-inner relative group">
                          {drafting[sectionName] && (
                            <div className="absolute inset-0 bg-white/50 dark:bg-black/50 backdrop-blur-sm z-10 flex items-center justify-center rounded-xl font-bold uppercase tracking-widest text-buddy-dark dark:text-white">
                              Regenerating...
                            </div>
                          )}
                          <textarea
                            value={drafts[sectionName]}
                            onChange={(e) =>
                              setDrafts((prev) => ({
                                ...prev,
                                [sectionName]: e.target.value,
                              }))
                            }
                            className="w-full bg-transparent border-none focus:outline-none focus:ring-0 text-sm font-medium text-gray-800 dark:text-gray-200 leading-relaxed min-h-[150px] resize-y"
                          />
                          {draftMetadata[sectionName]?.quality && (
                            <div className="mt-4 pt-3 border-t border-buddy-dark/10 dark:border-white/10 text-xs space-y-1">
                              <p className="font-bold uppercase tracking-wide text-buddy-dark/70 dark:text-gray-400">
                                Quality:{" "}
                                {draftMetadata[sectionName].quality.word_count}{" "}
                                words | citations{" "}
                                {
                                  draftMetadata[sectionName].quality
                                    .citation_count
                                }
                              </p>
                              {!draftMetadata[sectionName].quality
                                .min_words_passed && (
                                <p className="text-red-600 dark:text-red-400 font-semibold">
                                  Below minimum length (
                                  {
                                    draftMetadata[sectionName].quality
                                      .min_words_required
                                  }{" "}
                                  words).
                                </p>
                              )}
                              {!draftMetadata[sectionName].quality
                                .citations_passed && (
                                <p className="text-red-600 dark:text-red-400 font-semibold">
                                  Inline citations are missing or invalid.
                                </p>
                              )}
                              {draftMetadata[sectionName].diagnostics?.issues
                                ?.length > 0 && (
                                <p className="text-yellow-700 dark:text-yellow-300">
                                  {draftMetadata[
                                    sectionName
                                  ].diagnostics.issues.join(" ")}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="p-4 bg-white/30 dark:bg-white/5 border-2 border-buddy-dark/10 dark:border-white/10 rounded-xl">
                          {drafting[sectionName] ? (
                            <p className="text-sm font-bold animate-pulse text-buddy-purple dark:text-buddy-green text-center py-4 uppercase tracking-widest">
                              Drafting...
                            </p>
                          ) : (
                            <p className="text-xs italic text-gray-500 dark:text-gray-400 text-center py-4">
                              No draft generated yet.{" "}
                              {isManualMode
                                ? "Click generate to rephrase selected entries."
                                : ""}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ),
            )}

            {suggestions.references.length > 0 && (
              <div className="border-2 border-buddy-dark/20 dark:border-white/10 rounded-2xl p-6 bg-white/50 dark:bg-black/20">
                <h3 className="font-black uppercase tracking-tight text-xl text-buddy-dark dark:text-buddy-purple mb-5">
                  References
                </h3>
                <div className="space-y-4">
                  {suggestions.references.map((ref: Reference, idx: number) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl border-2 border-buddy-dark/20 dark:border-white/10 bg-white/50 dark:bg-black/40"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-xs font-bold uppercase px-2.5 py-1 bg-buddy-dark/10 dark:bg-white/10 text-buddy-dark dark:text-gray-300 rounded-lg">
                          {ref.type}
                        </span>
                        <span className="font-bold text-buddy-dark dark:text-gray-100">
                          {ref.value}
                        </span>
                      </div>
                      <div className="text-sm space-y-2">
                        {ref.mentions.map(
                          (mention: ReferenceMention, mIdx: number) => (
                            <p
                              key={mIdx}
                              className="text-xs font-medium italic text-buddy-dark/70 dark:text-gray-400 border-l-2 border-buddy-purple pl-3 py-1"
                            >
                              "{mention.text.substring(0, 100)}..."
                            </p>
                          ),
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-4 mt-8 pt-6 border-t-2 border-buddy-dark dark:border-white/10">
        <button
          onClick={onCancel}
          className="px-6 py-2.5 font-bold border-2 border-transparent hover:border-buddy-dark dark:hover:border-white/20 text-buddy-dark dark:text-gray-300 hover:bg-white/50 dark:hover:bg-white/10 rounded-full transition-all"
        >
          Cancel
        </button>
        {suggestions && (
          <button
            onClick={saveReport}
            disabled={saving}
            className="px-8 py-2.5 bg-buddy-yellow dark:bg-buddy-green/20 text-buddy-dark dark:text-buddy-green font-black uppercase tracking-widest rounded-full border-2 border-buddy-dark dark:border-buddy-green shadow-brutal dark:shadow-[4px_4px_0_0_rgba(167,243,208,0.5)] hover:-translate-y-1 active:translate-y-0 active:shadow-none transition-all disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Report"}
          </button>
        )}
      </div>
    </div>
  );
}
