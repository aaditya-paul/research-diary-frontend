import { useState, useRef, useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
import Link from "@tiptap/extension-link";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Highlighter,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  CodeSquare,
  Code as CodeIcon,
  Maximize2,
  Minimize2,
  ChevronDown,
  Eraser,
  Undo,
  Redo,
  Link as LinkIcon,
  Unlink,
} from "lucide-react";

const HIGHLIGHT_COLORS = [
  { name: "Yellow", color: "#fdfb82", dark: "rgba(253,251,130,0.35)" },
  { name: "Green", color: "#a7f3d0", dark: "rgba(167,243,208,0.35)" },
  { name: "Purple", color: "#b1a2f6", dark: "rgba(177,162,246,0.35)" },
  { name: "Pink", color: "#f9a8d4", dark: "rgba(249,168,212,0.35)" },
  { name: "Blue", color: "#93c5fd", dark: "rgba(147,197,253,0.35)" },
  { name: "Orange", color: "#fdba74", dark: "rgba(253,186,116,0.35)" },
];

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
}

export function RichTextEditor({
  content,
  onChange,
  placeholder,
}: RichTextEditorProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);
  const highlightRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Highlight.configure({ multicolor: true }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class:
            "text-buddy-blue underline cursor-pointer hover:text-blue-600 transition-colors",
        },
      }),
      Placeholder.configure({
        placeholder: placeholder || "Start writing...",
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[200px] p-4 text-buddy-dark dark:text-gray-100 [&_pre]:bg-gray-100 dark:[&_pre]:bg-gray-800 [&_pre]:text-gray-800 dark:[&_pre]:text-gray-200 [&_pre]:p-4 [&_pre]:rounded-lg [&_code]:bg-gray-100 dark:[&_code]:bg-gray-800 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded-md [&_a]:text-blue-600 dark:[&_a]:text-blue-400",
      },
    },
  });

  // Sync external content changes
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content, false);
    }
  }, [content, editor]);

  // Close highlight picker on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        highlightRef.current &&
        !highlightRef.current.contains(e.target as Node)
      ) {
        setShowHighlightPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Lock body scroll in fullscreen
  useEffect(() => {
    if (isFullscreen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isFullscreen]);

  if (!editor) {
    return null;
  }

  const toggleBold = () => editor.chain().focus().toggleBold().run();
  const toggleItalic = () => editor.chain().focus().toggleItalic().run();
  const toggleUnderline = () => editor.chain().focus().toggleUnderline().run();
  const toggleHeading = (level: 1 | 2 | 3) => () =>
    editor.chain().focus().toggleHeading({ level }).run();
  const toggleBulletList = () =>
    editor.chain().focus().toggleBulletList().run();
  const toggleOrderedList = () =>
    editor.chain().focus().toggleOrderedList().run();
  const toggleBlockquote = () =>
    editor.chain().focus().toggleBlockquote().run();
  const toggleCodeBlock = () => editor.chain().focus().toggleCodeBlock().run();
  const toggleInlineCode = () => editor.chain().focus().toggleCode().run();

  const setLink = () => {
    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("URL", previousUrl);

    // cancelled
    if (url === null) {
      return;
    }

    // empty
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    // update link
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  const undo = () => editor.chain().focus().undo().run();
  const redo = () => editor.chain().focus().redo().run();

  const applyHighlight = (color: string) => {
    editor.chain().focus().toggleHighlight({ color }).run();
    setShowHighlightPicker(false);
  };

  const removeHighlight = () => {
    editor.chain().focus().unsetHighlight().run();
    setShowHighlightPicker(false);
  };

  const getButtonClass = (isActive: boolean) =>
    `p-1.5 sm:p-2 rounded-lg transition-all duration-200 active:scale-90 ${isActive ? "bg-buddy-yellow text-buddy-dark shadow-brutal border-2 border-buddy-dark dark:bg-buddy-green/20 dark:text-buddy-green dark:border-buddy-green dark:shadow-[2px_2px_0_0_rgba(167,243,208,0.5)]" : "text-gray-600 hover:bg-gray-100 hover:text-buddy-dark border-2 border-transparent dark:text-gray-300 dark:hover:bg-white/10 dark:hover:border-white/20"}`;

  const ToolbarSeparator = () => (
    <div className="w-px h-6 sm:h-8 rounded-full bg-gray-300 dark:bg-gray-700 mx-0.5 sm:mx-1 my-auto shrink-0" />
  );

  const editorContent = (
    <div
      className={`flex flex-col overflow-hidden transition-all duration-300 h-full ${
        isFullscreen
          ? "rounded-none border-0 shadow-none bg-[#0a0a0a]"
          : "border-2 border-buddy-dark rounded-2xl bg-white dark:bg-black/40 dark:backdrop-blur-xl dark:border-white/10 shadow-brutal dark:shadow-[4px_4px_0_0_rgba(167,243,208,0.2)]"
      }`}
    >
      {/* Toolbar */}
      <div
        className={`shrink-0 flex flex-wrap items-center gap-1 sm:gap-2 p-2 sm:p-3 ${
          isFullscreen
            ? "border-b border-white/10 bg-[#111]"
            : "border-b-2 border-buddy-dark dark:border-white/10 bg-gray-50/50 dark:bg-black/60"
        }`}
      >
        {/* Undo/Redo */}
        <button
          type="button"
          onClick={undo}
          disabled={!editor.can().undo()}
          className={`${getButtonClass(false)} disabled:opacity-50 disabled:cursor-not-allowed`}
          title="Undo"
        >
          <Undo className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>
        <button
          type="button"
          onClick={redo}
          disabled={!editor.can().redo()}
          className={`${getButtonClass(false)} disabled:opacity-50 disabled:cursor-not-allowed`}
          title="Redo"
        >
          <Redo className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>

        <ToolbarSeparator />

        {/* Text Formatting */}
        <button
          type="button"
          onClick={toggleBold}
          className={getButtonClass(editor.isActive("bold"))}
          title="Bold"
        >
          <Bold className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>
        <button
          type="button"
          onClick={toggleItalic}
          className={getButtonClass(editor.isActive("italic"))}
          title="Italic"
        >
          <Italic className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>
        <button
          type="button"
          onClick={toggleUnderline}
          className={getButtonClass(editor.isActive("underline"))}
          title="Underline"
        >
          <UnderlineIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>

        {/* Link */}
        <button
          type="button"
          onClick={setLink}
          className={getButtonClass(editor.isActive("link"))}
          title="Toggle Link"
        >
          {editor.isActive("link") ? (
            <Unlink className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          ) : (
            <LinkIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          )}
        </button>

        {/* Highlight with color picker */}
        <div className="relative" ref={highlightRef}>
          <button
            type="button"
            onClick={() => setShowHighlightPicker(!showHighlightPicker)}
            className={`${getButtonClass(editor.isActive("highlight"))} flex items-center gap-0.5`}
            title="Highlight"
          >
            <Highlighter className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <ChevronDown className="w-2.5 h-2.5 sm:w-3 sm:h-3 opacity-60" />
          </button>

          <AnimatePresence>
            {showHighlightPicker && (
              <motion.div
                initial={{ opacity: 0, y: -4, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute top-full left-0 mt-2 z-50 bg-white dark:bg-gray-900 border-2 border-buddy-dark dark:border-white/20 rounded-xl shadow-brutal dark:shadow-[4px_4px_0_0_rgba(167,243,208,0.3)] p-2 min-w-[160px]"
              >
                <div className="grid grid-cols-3 gap-1.5 mb-2">
                  {HIGHLIGHT_COLORS.map((hl) => (
                    <button
                      key={hl.name}
                      type="button"
                      onClick={() => applyHighlight(hl.color)}
                      className="group relative w-9 h-9 rounded-lg border-2 border-transparent hover:border-buddy-dark dark:hover:border-white/40 transition-all hover:scale-110 active:scale-95"
                      style={{ backgroundColor: hl.color }}
                      title={hl.name}
                    >
                      <span className="sr-only">{hl.name}</span>
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={removeHighlight}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-bold text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors uppercase tracking-wider"
                >
                  <Eraser className="w-3.5 h-3.5" />
                  Remove
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <ToolbarSeparator />

        {/* Headings */}
        <button
          type="button"
          onClick={toggleHeading(1)}
          className={getButtonClass(editor.isActive("heading", { level: 1 }))}
          title="Heading 1"
        >
          <Heading1 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>
        <button
          type="button"
          onClick={toggleHeading(2)}
          className={getButtonClass(editor.isActive("heading", { level: 2 }))}
          title="Heading 2"
        >
          <Heading2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>
        <button
          type="button"
          onClick={toggleHeading(3)}
          className={getButtonClass(editor.isActive("heading", { level: 3 }))}
          title="Heading 3"
        >
          <Heading3 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>

        <ToolbarSeparator />

        {/* Lists */}
        <button
          type="button"
          onClick={toggleBulletList}
          className={getButtonClass(editor.isActive("bulletList"))}
          title="Bullet List"
        >
          <List className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>
        <button
          type="button"
          onClick={toggleOrderedList}
          className={getButtonClass(editor.isActive("orderedList"))}
          title="Numbered List"
        >
          <ListOrdered className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>

        <ToolbarSeparator />

        {/* Block elements */}
        <button
          type="button"
          onClick={toggleBlockquote}
          className={getButtonClass(editor.isActive("blockquote"))}
          title="Quote"
        >
          <Quote className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>
        <button
          type="button"
          onClick={toggleCodeBlock}
          className={getButtonClass(editor.isActive("codeBlock"))}
          title="Code Block"
        >
          <CodeSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>
        <button
          type="button"
          onClick={toggleInlineCode}
          className={getButtonClass(editor.isActive("code"))}
          title="Inline Code"
        >
          <CodeIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>

        {/* Spacer + Fullscreen */}
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => setIsFullscreen(!isFullscreen)}
          className="p-1.5 sm:p-2 rounded-lg transition-all duration-200 active:scale-90 text-gray-500 hover:bg-buddy-purple/10 hover:text-buddy-purple dark:text-gray-400 dark:hover:bg-buddy-purple/20 dark:hover:text-buddy-purple border-2 border-transparent hover:border-buddy-purple/30"
          title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
        >
          {isFullscreen ? (
            <Minimize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          ) : (
            <Maximize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          )}
        </button>
      </div>

      {/* Editor Content */}
      <div className="flex-1 overflow-y-auto">
        <EditorContent editor={editor} />
      </div>
    </div>
  );

  if (isFullscreen) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-100 bg-[#0a0a0a] flex flex-col"
        >
          {/* Fullscreen toolbar area — reuse the same editor content but override styles */}
          <div className="shrink-0 flex items-center justify-between px-4 sm:px-6 py-2 bg-[#111] border-b border-white/10">
            <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-buddy-green animate-pulse" />
              Focus Mode
            </h3>
            <button
              type="button"
              onClick={() => setIsFullscreen(false)}
              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-gray-300 hover:text-white text-sm font-bold border border-white/10 hover:border-white/25 transition-all active:scale-95 flex items-center gap-2"
            >
              <Minimize2 className="w-4 h-4" />
              Exit
            </button>
          </div>

          {/* Full-bleed editor */}
          <div className="flex-1 min-h-0 flex flex-col">{editorContent}</div>
        </motion.div>
      </AnimatePresence>
    );
  }

  return editorContent;
}
