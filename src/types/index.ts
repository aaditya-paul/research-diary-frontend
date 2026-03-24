export interface Entry {
  id: number;
  title: string | null;
  content: string;
  entry_type: 'project' | 'daily';
  created_at: string;
  updated_at: string;
}

export interface EntryCreate {
  title?: string;
  content: string;
  entry_type: 'project' | 'daily';
}

export interface EntryUpdate {
  title?: string;
  content?: string;
  entry_type?: 'project' | 'daily';
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

export interface ReportSections {
  [key: string]: ReportSection;
}

export interface ReportGenerateResponse {
  sections: ReportSections;
  references: Reference[];
}

export interface ReportContent {
  hypothesis?: { selected_texts: string[] };
  methodology?: { selected_texts: string[] };
  findings?: { selected_texts: string[] };
  conclusions?: { selected_texts: string[] };
  timeline?: { selected_texts: string[] };
  references?: Reference[];
}

export interface Report {
  id: number;
  title: string;
  report_type: 'project' | 'timeline';
  content: ReportContent;
  entry_ids: number[];
  created_at: string;
}

export interface ReportCreate {
  title: string;
  report_type: 'project' | 'timeline';
  content: ReportContent;
  entry_ids: number[];
}
