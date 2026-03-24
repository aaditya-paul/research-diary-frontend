export interface Entry {
  id: number;
  title: string | null;
  content: string;
  entry_type: "project" | "daily";
  created_at: string;
  updated_at: string;
}

export interface EntryCreate {
  title?: string;
  content: string;
  entry_type: "project" | "daily";
}

export interface EntryUpdate {
  title?: string;
  content?: string;
  entry_type?: "project" | "daily";
}

export interface ReportSectionSuggestion {
  text: string;
  source_entry_id: number;
  confidence: number;
}

export interface ReportSection {
  suggestions: ReportSectionSuggestion[];
  selected: number[];
}

export interface ReferenceMention {
  text: string;
  entry_id: number;
}

export interface Reference {
  type: string;
  value: string;
  mentions: ReferenceMention[];
}

export interface CitationReference {
  id: number;
  type: string;
  value: string;
  entry_ids: number[];
}

export interface DraftQualityMetrics {
  word_count: number;
  min_words_required: number;
  min_words_passed: boolean;
  citation_count: number;
  min_citations_required: number;
  citations_passed: boolean;
  structure_passed: boolean;
}

export interface DraftDiagnostics {
  status: string;
  attempts_used: number;
  provider_used: string;
  issues: string[];
}

export interface DraftRegenerateResult {
  draft: string;
  inline_citation_ids: number[];
  citation_registry: CitationReference[];
  quality: DraftQualityMetrics;
  diagnostics: DraftDiagnostics;
}

export interface ReportSections {
  [key: string]: ReportSection;
}

export interface ReportGenerateResponse {
  sections: ReportSections;
  references: Reference[];
}

export interface ReportSectionContent {
  selected_texts: string[];
  draft?: string;
  inline_citation_ids?: number[];
  citation_registry?: CitationReference[];
  quality?: DraftQualityMetrics;
  diagnostics?: DraftDiagnostics;
}

export interface ReportContent {
  hypothesis?: ReportSectionContent;
  methodology?: ReportSectionContent;
  findings?: ReportSectionContent;
  conclusions?: ReportSectionContent;
  timeline?: ReportSectionContent;
  references?: Reference[];
  [key: string]: any;
}

export interface Report {
  id: number;
  title: string;
  report_type: "project" | "timeline";
  content: ReportContent;
  entry_ids: number[];
  created_at: string;
}

export interface ReportCreate {
  title: string;
  report_type: "project" | "timeline";
  content: ReportContent;
  entry_ids: number[];
}
