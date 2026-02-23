export const COLOR_PALETTE = [
  '#F97316', '#14B8A6', '#8B5CF6', '#EC4899', '#F59E0B',
  '#06B6D4', '#EF4444', '#84CC16', '#6366F1', '#D946EF',
  '#0EA5E9', '#10B981',
];

export const DEFAULT_COLOR = '#F97316';

export function colorVariants(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return {
    bg: `rgba(${r}, ${g}, ${b}, 0.12)`,
    text: hex,
    border: `rgba(${r}, ${g}, ${b}, 0.3)`,
  };
}

export function getCategoryColor(cat) {
  return cat?.color || DEFAULT_COLOR;
}
