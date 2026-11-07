const MAXIMUM_FONT_SIZE = 26;
const MINIMUM_COLUMN_WIDTH = 220;
const MINIMUM_FONT_SIZE = 0.01;
const SEARCH_STEPS = 11;
const ROUNDING_TOLERANCE = 1;

function apply(container, columns, size) {
  container.style.columnCount = String(columns);
  container.style.fontSize = `${size}px`;
}

// Each stanza must occupy one column fragment, wholly inside the available page.
function isContained(container) {
  const page = container.getBoundingClientRect();
  if (container.scrollWidth > container.clientWidth + ROUNDING_TOLERANCE) return false;
  return Array.from(container.children).every(stanza => {
    const fragments = Array.from(stanza.getClientRects());
    return fragments.length === 1 && fragments.every(rect =>
      rect.top >= page.top - ROUNDING_TOLERANCE && rect.bottom <= page.bottom + ROUNDING_TOLERANCE &&
      rect.left >= page.left - ROUNDING_TOLERANCE && rect.right <= page.right + ROUNDING_TOLERANCE);
  });
}

export function fitPage(container) {
  if (!container.children.length || !container.clientWidth || !container.clientHeight) return;
  const gap = Number.parseFloat(getComputedStyle(container).columnGap) || 0;
  const maximumColumns = Math.min(container.children.length,
    Math.max(1, Math.floor((container.clientWidth + gap) / (MINIMUM_COLUMN_WIDTH + gap))));
  const minimumColumns = Math.min(2, maximumColumns);
  let best = { columns: maximumColumns, size: MINIMUM_FONT_SIZE };
  for (let columns = minimumColumns; columns <= maximumColumns; columns++) {
    let lower = MINIMUM_FONT_SIZE;
    let upper = MAXIMUM_FONT_SIZE;
    apply(container, columns, upper);
    if (isContained(container)) { best = { columns, size: upper }; break; }
    for (let step = 0; step < SEARCH_STEPS; step++) {
      const middle = (lower + upper) / 2;
      apply(container, columns, middle);
      if (isContained(container)) lower = middle; else upper = middle;
    }
    if (lower > best.size + 0.05) best = { columns, size: lower };
  }
  apply(container, best.columns, best.size);
}
