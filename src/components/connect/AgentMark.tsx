/**
 * Vendor marks for the agent picker — monochrome, currentColor glyphs
 * standing in for the real vendor logos (third-party assets; the final
 * SVGs are swapped in here without touching the tile structure). They
 * inherit color so they read in light and dark and stay within the
 * one-accent rule.
 */
export function AgentMark({ id }: Readonly<{ id: string }>) {
  const marks: Record<string, React.ReactNode> = {
    claude: (
      <g stroke="none" fill="currentColor">
        {Array.from({ length: 12 }).map((_, i) => (
          <rect
            key={i}
            x={11.05}
            y={4}
            width={1.9}
            height={8}
            transform={`rotate(${i * 30} 12 12)`}
            rx="0.6"
          />
        ))}
      </g>
    ),
    chatgpt: (
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
        d="M12 4.4l5.4 3.1v6.9l-5.4 3.1-5.4-3.1V7.5zM12 4.4v6.2m5.4-3.1L12 10.6m0 0l-5.4-3.1M12 10.6v6.9"
      />
    ),
    grok: (
      <g fill="currentColor" stroke="none">
        <path d="M6 5h3.2l9 14h-3.2z" />
        <path d="M15 5h3.2l-4 6.2-1.7-2.6z" />
        <path d="M9 19H5.8l4-6.2 1.7 2.6z" opacity="0.55" />
      </g>
    ),
    mistral: (
      <g fill="currentColor" stroke="none">
        <rect x="4" y="5" width="4" height="3" />
        <rect x="16" y="5" width="4" height="3" />
        <rect x="4" y="10.5" width="16" height="3" />
        <rect x="4" y="16" width="4" height="3" />
        <rect x="16" y="16" width="4" height="3" opacity="0.55" />
      </g>
    ),
  };
  return (
    <svg className="agent-mark" viewBox="0 0 24 24" aria-hidden="true">
      {marks[id] ?? (
        <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.6" />
      )}
    </svg>
  );
}
