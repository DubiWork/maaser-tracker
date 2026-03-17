import { Box, Chip, Skeleton, Tooltip } from '@mui/material';
import { Add } from '@mui/icons-material';
import { useLanguage } from '../contexts/useLanguage';
import { usePresets } from '../hooks/usePresets';

/**
 * NotePresetButtons
 *
 * A horizontal scrollable row of preset chips that appears below the notes
 * field in income/donation entry forms. Tapping a chip fills the note field
 * with that preset's text. A [+] chip at the end opens preset management.
 *
 * Props:
 *   type           — 'income' | 'donation'
 *   onSelect       — (text: string) => void  — called when a preset chip is tapped
 *   selectedText   — current notes value; chip matching this text is highlighted
 *   onManageClick  — () => void  — called when the [+] button is tapped
 */
export default function NotePresetButtons({ type, onSelect, selectedText = '', onManageClick }) {
  const { direction } = useLanguage();
  const { data: presets, isLoading } = usePresets(type);

  const handlePresetClick = (text) => {
    if (onSelect) {
      onSelect(text);
    }
  };

  const handleManageClick = () => {
    if (onManageClick) {
      onManageClick();
    }
  };

  return (
    <Box
      data-testid="preset-buttons-scroll"
      dir={direction}
      sx={{
        display: 'flex',
        flexDirection: 'row',
        overflowX: 'auto',
        gap: 1,
        py: 0.5,
        // Hide scrollbar on WebKit while keeping scroll
        '&::-webkit-scrollbar': { display: 'none' },
        scrollbarWidth: 'none',
        // Smooth scroll on mobile
        WebkitOverflowScrolling: 'touch',
        // Prevent vertical scroll issues
        alignItems: 'center',
        flexWrap: 'nowrap',
      }}
    >
      {isLoading ? (
        // Loading state: skeleton chips
        <>
          {[1, 2, 3].map((i) => (
            <Skeleton
              key={i}
              data-testid="preset-skeleton"
              variant="rounded"
              width={72}
              height={32}
              sx={{ borderRadius: '16px', flexShrink: 0 }}
            />
          ))}
        </>
      ) : (
        // Loaded state: preset chips
        <>
          {(presets || []).map((preset) => {
            const isSelected = preset.text === selectedText;
            return (
              <Chip
                key={preset.id}
                label={preset.text}
                onClick={() => handlePresetClick(preset.text)}
                variant={isSelected ? 'filled' : 'outlined'}
                color={isSelected ? 'primary' : 'default'}
                data-selected={isSelected ? 'true' : undefined}
                data-testid={`preset-chip-${preset.id}`}
                size="medium"
                sx={{
                  flexShrink: 0,
                  whiteSpace: 'nowrap',
                  minHeight: '44px',
                  cursor: 'pointer',
                  fontWeight: isSelected ? 600 : 400,
                }}
              />
            );
          })}
        </>
      )}

      {/* [+] manage button — always shown (unless loading) */}
      {!isLoading && (
        <Tooltip title="Manage presets" arrow>
          <Chip
            icon={<Add />}
            label="+"
            onClick={handleManageClick}
            variant="outlined"
            size="medium"
            aria-label="add preset"
            sx={{
              flexShrink: 0,
              minHeight: '44px',
              cursor: 'pointer',
              borderStyle: 'dashed',
            }}
          />
        </Tooltip>
      )}
    </Box>
  );
}
