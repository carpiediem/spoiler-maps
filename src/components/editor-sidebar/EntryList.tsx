import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import {
  Box,
  Button,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useRef, type KeyboardEvent } from 'react';
import { sortOrderAfter } from '../../db/ordering';

export interface EntryListItem {
  id: number;
  name: string;
  url: string | null;
  sortOrder: number;
}

interface EntryListProps<T extends EntryListItem> {
  items: T[];
  onItemsChange: (items: T[]) => void;
  onCreate: (sortOrder: number) => Promise<T>;
  onUpdate: (item: T) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  nameColumnLabel: string;
  namePlaceholder: string;
  urlPlaceholder: string;
  addLabel: string;
  deleteLabel: string;
}

/**
 * A shared name/URL/delete list editor — used for a book's chapters and a
 * TV season's episodes. Up/Down arrow keys move focus between the same
 * column in adjacent rows.
 */
export function EntryList<T extends EntryListItem>({
  items,
  onItemsChange,
  onCreate,
  onUpdate,
  onDelete,
  nameColumnLabel,
  namePlaceholder,
  urlPlaceholder,
  addLabel,
  deleteLabel,
}: EntryListProps<T>) {
  const nameInputRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const urlInputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  function handleVerticalNav(
    event: KeyboardEvent<HTMLDivElement>,
    index: number,
    column: 'name' | 'url',
  ) {
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
    const targetIndex = event.key === 'ArrowUp' ? index - 1 : index + 1;
    const targetItem = items[targetIndex];
    if (!targetItem) return;

    event.preventDefault();
    const refs = column === 'name' ? nameInputRefs : urlInputRefs;
    refs.current[targetItem.id]?.focus();
  }

  function handleFieldChange(itemId: number, field: 'name' | 'url', value: string) {
    onItemsChange(
      items.map((item) =>
        item.id === itemId ? { ...item, [field]: field === 'name' ? value : value || null } : item,
      ),
    );
  }

  async function handleBlur(item: T) {
    await onUpdate(item);
  }

  async function handleDelete(itemId: number) {
    await onDelete(itemId);
    onItemsChange(items.filter((item) => item.id !== itemId));
  }

  async function handleAdd() {
    const sortOrder = sortOrderAfter(items.map((item) => item.sortOrder));
    const item = await onCreate(sortOrder);
    onItemsChange([...items, item]);
  }

  return (
    <Stack spacing={1}>
      {items.length > 0 && (
        <Stack direction="row" spacing={1}>
          <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
            {nameColumnLabel}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ flex: 2 }}>
            Wiki URL
          </Typography>
          <Box sx={{ width: 34 }} />
        </Stack>
      )}

      {items.map((item, index) => (
        <Stack key={item.id} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <TextField
            size="small"
            placeholder={namePlaceholder}
            value={item.name}
            onChange={(event) => handleFieldChange(item.id, 'name', event.target.value)}
            onBlur={() => handleBlur(item)}
            onKeyDown={(event) => handleVerticalNav(event, index, 'name')}
            inputRef={(el: HTMLInputElement | null) => {
              nameInputRefs.current[item.id] = el;
            }}
            sx={{ flex: 1 }}
          />
          <TextField
            size="small"
            placeholder={urlPlaceholder}
            value={item.url ?? ''}
            onChange={(event) => handleFieldChange(item.id, 'url', event.target.value)}
            onBlur={() => handleBlur(item)}
            onKeyDown={(event) => handleVerticalNav(event, index, 'url')}
            inputRef={(el: HTMLInputElement | null) => {
              urlInputRefs.current[item.id] = el;
            }}
            sx={{ flex: 2, '& .MuiInputBase-input': { fontSize: '0.8125rem' } }}
            slotProps={{
              input: {
                endAdornment: item.url && (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      aria-label={`Open ${urlPlaceholder}`}
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      edge="end"
                    >
                      <OpenInNewIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
          />
          <IconButton size="small" aria-label={deleteLabel} onClick={() => handleDelete(item.id)}>
            <DeleteOutlineOutlinedIcon fontSize="small" />
          </IconButton>
        </Stack>
      ))}

      <Button size="small" startIcon={<AddIcon fontSize="small" />} onClick={handleAdd}>
        {addLabel}
      </Button>
    </Stack>
  );
}
