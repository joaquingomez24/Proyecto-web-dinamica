const base = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, 'aria-hidden': true } as const;

export const SearchIcon = () => (
  <svg {...base}>
    <circle cx="10.5" cy="10.5" r="6.5" />
    <path d="M15.5 15.5 21 21" />
  </svg>
);

export const BagIcon = () => (
  <svg {...base}>
    <path d="M4.5 8h15l-1.2 12.5H5.7L4.5 8Z" />
    <path d="M8.5 8V6.5a3.5 3.5 0 0 1 7 0V8" />
  </svg>
);

export const ArrowIcon = () => (
  <svg {...base} width={16} height={16}>
    <path d="M4 12h15M13 6l6 6-6 6" />
  </svg>
);
