type Props = {
  onDarkBackground: boolean
  compact?: boolean
}

export function HgiAttribution({ onDarkBackground, compact = false }: Props) {
  return <div className={`hgi-attribution${compact ? ' hgi-attribution--compact' : ''}`}>
    <span>{compact ? 'Provided by' : 'Door Builder & Visualizer provided by'}</span>
    <a href="https://homeguardindustries.com" target="_blank" rel="noreferrer" aria-label="Home Guard Industries website">
      {onDarkBackground
        ? <img src="/assets/branding/hgi-logo-white.png" alt="Home Guard Industries" />
        : <img src="/assets/branding/hgi-logo-black.webp" alt="Home Guard Industries" />}
    </a>
  </div>
}
