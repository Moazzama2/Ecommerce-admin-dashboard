import { Avatar, Box, Card, Typography } from '@mui/material';

/**
 * KPI tile for the overview screen.
 * `delta` is optional: pass { value: '+12%', up: true } when the API
 * grows to provide comparisons — omitted here, it simply isn't shown.
 * Pass `onClick` to turn the tile into a drill-down into the matching
 * screen (keyboard accessible, shows a "View …" hint on hover/focus).
 *
 * Marked with the `tile` class so the theme's hover-lift applies to
 * this card but not to every Card in the app.
 */
export default function StatCard({
  icon,
  label,
  value,
  subheader,
  color = '#2563eb',
  tone,
  delta,
  onClick,
  hint,
}) {
  const accent = tone || color;
  const deltaUp = delta?.up !== false;
  const clickable = Boolean(onClick);

  return (
    <Card
      className="tile"
      onClick={onClick}
      onKeyDown={(event) => {
        if (!onClick) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClick(event);
        }
      }}
      tabIndex={clickable ? 0 : undefined}
      role={clickable ? 'button' : undefined}
      aria-label={clickable ? `${label} — ${hint || 'view details'}` : undefined}
      sx={{
        p: { xs: 2, sm: 2.5 },
        display: 'flex',
        gap: 2,
        alignItems: 'flex-start',
        position: 'relative',
        overflow: 'hidden',
        ...(clickable && {
          cursor: 'pointer',
          '&:focus-visible': {
            outline: '2px solid',
            outlineColor: accent,
            outlineOffset: 2,
          },
        }),
        '&::after': {
          // Hairline accent along the top edge — quiet, but gives each
          // tile its own identity at a glance.
          content: '""',
          position: 'absolute',
          inset: '0 0 auto 0',
          height: 3,
          bgcolor: accent,
          opacity: 0.85,
        },
      }}
    >
      <Avatar
        variant="rounded"
        sx={{
          bgcolor: `color-mix(in srgb, ${accent} 12%, transparent)`,
          color: accent,
          border: '1px solid',
          borderColor: `color-mix(in srgb, ${accent} 25%, transparent)`,
          width: 46,
          height: 46,
          flexShrink: 0,
        }}
      >
        {icon}
      </Avatar>
      <Box sx={{ minWidth: 0 }}>
        <Typography
          variant="body2"
          color="text.secondary"
          fontWeight={600}
          sx={{ textTransform: 'uppercase', letterSpacing: '.06em', fontSize: 11.5 }}
        >
          {label}
        </Typography>
        <Typography
          variant="h5"
          fontWeight={700}
          noWrap
          // Fits long money values inside the narrowest KPI column.
          sx={{ fontSize: { xs: 24, lg: 20, xl: 24 }, fontVariantNumeric: 'tabular-nums', mt: 0.25 }}
        >
          {value}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.25 }}>
          {delta ? (
            <Typography
              variant="caption"
              fontWeight={700}
              sx={{ color: deltaUp ? 'success.main' : 'error.main' }}
            >
              {deltaUp ? '▲' : '▼'} {delta.value}
            </Typography>
          ) : null}
          {subheader ? (
            <Typography variant="caption" color="text.secondary" noWrap>
              {subheader}
            </Typography>
          ) : null}
        </Box>
        {clickable ? (
          <Typography
            variant="caption"
            fontWeight={700}
            sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, color: accent, mt: 1 }}
          >
            {hint || 'View'}
            <Box
              component="span"
              sx={{
                transition: 'transform .2s ease',
                '.tile:hover &': { transform: 'translateX(3px)' },
              }}
            >
              →
            </Box>
          </Typography>
        ) : null}
      </Box>
    </Card>
  );
}

export function formatMoney(amount, currency = 'PKR') {
  const value = Number(amount) || 0;
  return `${currency} ${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}
