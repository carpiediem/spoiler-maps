import { Markdown, type MarkdownStorage } from 'tiptap-markdown';
import CloseIcon from '@mui/icons-material/Close';
import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered';
import FormatQuoteIcon from '@mui/icons-material/FormatQuote';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  ToggleButton,
  Tooltip,
} from '@mui/material';
import { EditorContent, useEditor, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useState, type ReactNode } from 'react';

interface ToolbarButtonProps {
  editor: Editor | null;
  label: string;
  isActive: boolean;
  onClick: () => void;
  children: ReactNode;
}

function ToolbarButton({ editor, label, isActive, onClick, children }: ToolbarButtonProps) {
  return (
    <Tooltip title={label} arrow>
      <ToggleButton
        value={label}
        size="small"
        selected={isActive}
        disabled={!editor}
        onClick={onClick}
        aria-label={label}
      >
        {children}
      </ToggleButton>
    </Tooltip>
  );
}

interface DescriptionEditorDialogProps {
  open: boolean;
  onClose: () => void;
  description: string | null;
  onSave: (description: string) => Promise<void>;
}

/** A rich-text (Markdown-backed) modal for editing a story's description. */
export function DescriptionEditorDialog({
  open,
  onClose,
  description,
  onSave,
}: DescriptionEditorDialogProps) {
  const [isSaving, setIsSaving] = useState(false);

  const editor = useEditor(
    {
      extensions: [StarterKit, Markdown],
      content: description ?? '',
      editorProps: {
        attributes: {
          style: 'min-height: 200px; outline: none;',
        },
      },
    },
    [open],
  );

  async function handleSave() {
    if (!editor) return;
    const markdown = (
      editor.storage as unknown as Record<string, MarkdownStorage>
    ).markdown.getMarkdown();
    setIsSaving(true);
    try {
      await onSave(markdown);
      onClose();
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ pr: 6 }}>
        Edit Description
        <IconButton
          aria-label="Close"
          onClick={onClose}
          sx={{ position: 'absolute', top: 8, right: 8 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Stack direction="row" spacing={0.5} sx={{ mb: 1 }}>
          <ToolbarButton
            editor={editor}
            label="Bold"
            isActive={!!editor?.isActive('bold')}
            onClick={() => editor?.chain().focus().toggleBold().run()}
          >
            <FormatBoldIcon fontSize="small" />
          </ToolbarButton>
          <ToolbarButton
            editor={editor}
            label="Italic"
            isActive={!!editor?.isActive('italic')}
            onClick={() => editor?.chain().focus().toggleItalic().run()}
          >
            <FormatItalicIcon fontSize="small" />
          </ToolbarButton>
          <ToolbarButton
            editor={editor}
            label="Bulleted list"
            isActive={!!editor?.isActive('bulletList')}
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
          >
            <FormatListBulletedIcon fontSize="small" />
          </ToolbarButton>
          <ToolbarButton
            editor={editor}
            label="Numbered list"
            isActive={!!editor?.isActive('orderedList')}
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          >
            <FormatListNumberedIcon fontSize="small" />
          </ToolbarButton>
          <ToolbarButton
            editor={editor}
            label="Quote"
            isActive={!!editor?.isActive('blockquote')}
            onClick={() => editor?.chain().focus().toggleBlockquote().run()}
          >
            <FormatQuoteIcon fontSize="small" />
          </ToolbarButton>
        </Stack>
        <Box
          sx={{
            border: 1,
            borderColor: 'divider',
            borderRadius: 1,
            p: 1.5,
            '& .ProseMirror': { minHeight: 200, outline: 'none' },
          }}
        >
          <EditorContent editor={editor} />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isSaving}>
          Cancel
        </Button>
        <Button onClick={handleSave} variant="contained" disabled={isSaving}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}
