import { useState } from 'react';
import type { ReportGenerateResponse, ReportSectionSuggestion, Reference, ReferenceMention } from '../types';
import { reportApi } from '../services/api';

interface ReportBuilderProps {
  selectedEntries: number[];
  onComplete: () => void;
  onCancel: () => void;
}

export function ReportBuilder({ selectedEntries, onComplete, onCancel }: ReportBuilderProps) {
  const [reportType, setReportType] = useState<'project' | 'timeline'>('project');
  const [suggestions, setSuggestions] = useState<ReportGenerateResponse | null>(null);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reportTitle, setReportTitle] = useState('');

  const generateSuggestions = async () => {
    if (selectedEntries.length === 0) {
      alert('Please select at least one entry');
      return;
    }

    setGenerating(true);
    try {
      const result = await reportApi.generateSuggestions(selectedEntries, reportType);
      setSuggestions(result);
    } catch (error) {
      console.error('Failed to generate suggestions:', error);
      alert('Failed to generate report suggestions');
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

  const buildReportContent = () => {
    if (!suggestions) return {};

    const content: Record<string, any> = {};

    Object.entries(suggestions.sections).forEach(([sectionName, sectionData]) => {
      content[sectionName] = {
        selected_texts: sectionData.selected.map((idx) => sectionData.suggestions[idx]?.text || ''),
      };
    });

    content.references = suggestions.references.map((ref) => ({
      type: ref.type,
      value: ref.value,
      mentions: ref.mentions.map((m) => ({ text: m.text, entry_id: m.entry_id })),
    }));

    return content;
  };

  const saveReport = async () => {
    if (!reportTitle.trim()) {
      alert('Please enter a report title');
      return;
    }

    if (!suggestions) {
      alert('Please generate suggestions first');
      return;
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
      console.error('Failed to save report:', error);
      alert('Failed to save report');
    } finally {
      setSaving(false);
    }
  };

  const getSectionTitle = (section: string) => {
    const titles: Record<string, string> = {
      hypothesis: 'Hypothesis',
      methodology: 'Methodology',
      findings: 'Findings',
      conclusions: 'Conclusions',
      timeline: 'Timeline',
    };
    return titles[section] || section.charAt(0).toUpperCase() + section.slice(1);
  };

  return (
    <div className="bg-white/90 dark:bg-black/80 backdrop-blur-2xl rounded-3xl border-2 border-buddy-dark dark:border-white/20 shadow-brutal dark:shadow-[8px_8px_0_0_rgba(167,243,208,0.2)] p-8 max-h-[85vh] overflow-y-auto w-full">
      <h2 className="text-3xl font-black uppercase tracking-tighter text-buddy-dark dark:text-gray-100 mb-6">Build Report</h2>

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
                checked={reportType === 'project'}
                onChange={() => {
                  setReportType('project');
                  setSuggestions(null);
                }}
                className="w-5 h-5 text-buddy-purple focus:ring-buddy-purple border-2 border-buddy-dark dark:border-buddy-purple dark:bg-black/40 transition-all cursor-pointer shadow-sm"
              />
              <span className="font-bold uppercase tracking-wide text-buddy-dark dark:text-gray-200 text-sm">Project Research</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="reportType"
                value="timeline"
                checked={reportType === 'timeline'}
                onChange={() => {
                  setReportType('timeline');
                  setSuggestions(null);
                }}
                className="w-5 h-5 text-buddy-green focus:ring-buddy-green border-2 border-buddy-dark dark:border-buddy-green dark:bg-black/40 transition-all cursor-pointer shadow-sm"
              />
              <span className="font-bold uppercase tracking-wide text-buddy-dark dark:text-gray-200 text-sm">Timeline</span>
            </label>
          </div>
        </div>

        <div>
          <p className="text-sm font-bold text-buddy-dark/70 dark:text-gray-400 uppercase tracking-widest mt-4">
            Selected <span className="text-buddy-purple dark:text-buddy-green">{selectedEntries.length}</span> entries
          </p>
        </div>

        {!suggestions ? (
          <button
            onClick={generateSuggestions}
            disabled={generating}
            className="w-full mt-4 py-4 bg-buddy-green dark:bg-buddy-purple/20 text-buddy-dark dark:text-buddy-purple font-black uppercase tracking-widest rounded-full border-2 border-buddy-dark dark:border-buddy-purple shadow-brutal dark:shadow-[4px_4px_0_0_rgba(177,162,246,0.5)] hover:-translate-y-1 active:translate-y-0 active:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generating ? 'Analyzing entries...' : 'Generate Report Suggestions'}
          </button>
        ) : (
          <div className="space-y-8 mt-8 border-t-2 border-buddy-dark/10 dark:border-white/10 pt-8">
            {Object.entries(suggestions.sections).map(([sectionName, sectionData]) => (
              <div key={sectionName} className="border-2 border-buddy-dark/20 dark:border-white/10 rounded-2xl p-6 bg-white/50 dark:bg-black/20">
                <h3 className="font-black uppercase tracking-tight text-xl text-buddy-dark dark:text-buddy-green mb-5">{getSectionTitle(sectionName)}</h3>
                {sectionData.suggestions.length === 0 ? (
                  <p className="text-buddy-dark/50 dark:text-gray-500 text-sm font-bold italic">No relevant content found</p>
                ) : (
                  <div className="space-y-3">
                    {sectionData.suggestions.map((suggestion: ReportSectionSuggestion, idx: number) => (
                      <label
                        key={idx}
                        className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 ${
                          sectionData.selected.includes(idx)
                            ? 'border-buddy-purple bg-buddy-purple/10 dark:bg-buddy-purple/20 shadow-[4px_4px_0_0_rgba(177,162,246,0.4)]'
                            : 'border-buddy-dark/20 dark:border-white/10 hover:border-buddy-green dark:hover:border-buddy-green shadow-sm hover:shadow-[4px_4px_0_0_rgba(167,243,208,0.2)]'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={sectionData.selected.includes(idx)}
                          onChange={() => toggleSuggestion(sectionName, idx)}
                          className="mt-1 w-5 h-5 rounded border-2 border-buddy-dark text-buddy-purple focus:ring-buddy-purple dark:border-white/20 dark:bg-black/40 transition-all cursor-pointer shadow-sm"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-buddy-dark dark:text-gray-200 leading-relaxed">{suggestion.text}</p>
                          <p className="text-xs font-bold uppercase text-buddy-dark/50 dark:text-gray-500 mt-2">
                            Confidence: {(suggestion.confidence * 100).toFixed(0)}%
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {suggestions.references.length > 0 && (
              <div className="border-2 border-buddy-dark/20 dark:border-white/10 rounded-2xl p-6 bg-white/50 dark:bg-black/20">
                <h3 className="font-black uppercase tracking-tight text-xl text-buddy-dark dark:text-buddy-purple mb-5">References</h3>
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
                        <span className="font-bold text-buddy-dark dark:text-gray-100">{ref.value}</span>
                      </div>
                      <div className="text-sm space-y-2">
                        {ref.mentions.map((mention: ReferenceMention, mIdx: number) => (
                          <p key={mIdx} className="text-xs font-medium italic text-buddy-dark/70 dark:text-gray-400 border-l-2 border-buddy-purple pl-3 py-1">
                            "{mention.text.substring(0, 100)}..."
                          </p>
                        ))}
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
            {saving ? 'Saving...' : 'Save Report'}
          </button>
        )}
      </div>
    </div>
  );
}
