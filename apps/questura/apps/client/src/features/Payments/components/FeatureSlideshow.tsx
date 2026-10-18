'use client';

import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react';

export type FeatureSlide = {
  key: string;
  /** What the slide shows, for screen readers: the artwork inside is aria-hidden. */
  label: string;
  content: ReactNode;
};

export type FeatureChoice = {
  /** Visible text on a word choice; dot choices show nothing. */
  text?: string;
  /** Accessible name, needed when the choice is a dot. */
  label?: string;
};

/** Each slide's stack position for the photo-pile shuffle: 0 is on top. */
const stackDepth = (index: number, current: number, count: number) => (index - current + count) % count;

const LEAVE_MS = 800;

/**
 * One "What membership unlocks" picture on /join: a few stills that advance on
 * their own while on screen, with choices under them and a pause button.
 *
 * `fade` cross-fades the stills. `stack` is the section mastheads' photo pile:
 * the top print slides off and the rest move up a place.
 *
 * Motion stops for a reader who asks for reduced motion, while the picture is
 * off screen or the tab is hidden, and for good once the reader picks a still
 * or presses pause.
 */
export default function FeatureSlideshow({
  label,
  slides,
  choices,
  variant = 'fade',
  className = '',
}: {
  label: string;
  slides: FeatureSlide[];
  choices: FeatureChoice[];
  variant?: 'fade' | 'stack';
  className?: string;
}) {
  const [current, setCurrent] = useState(0);
  const [leaving, setLeaving] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);
  const [onScreen, setOnScreen] = useState(false);
  const [near, setNear] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const regionRef = useRef<HTMLDivElement | null>(null);
  const choiceRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const isStack = variant === 'stack';
  const interval = isStack ? 4500 : 5500;
  const count = slides.length;

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (reduced.matches) setPaused(true);
    const onReducedChange = () => {
      if (reduced.matches) setPaused(true);
    };
    reduced.addEventListener('change', onReducedChange);

    const onVisibility = () => setPageVisible(!document.hidden);
    onVisibility();
    document.addEventListener('visibilitychange', onVisibility);

    const region = regionRef.current;
    const observer = region
      ? new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting), { threshold: 0.35 })
      : null;
    // The stills join the page a screen before they scroll into view. Plain
    // `loading="lazy"` is not enough here: on a slow phone Chrome starts lazy
    // images up to 2,500px ahead, and these ~450 kB would share the link with
    // the hero globe, the page's LCP. It also means a map image is only asked
    // of Google when a reader gets near it.
    const approach = region
      ? new IntersectionObserver(
          ([entry]) => {
            if (!entry.isIntersecting) return;
            setNear(true);
            approach?.disconnect();
          },
          { rootMargin: '100% 0px' },
        )
      : null;
    if (region) {
      observer?.observe(region);
      approach?.observe(region);
    }

    return () => {
      reduced.removeEventListener('change', onReducedChange);
      document.removeEventListener('visibilitychange', onVisibility);
      observer?.disconnect();
      approach?.disconnect();
    };
  }, []);

  const show = (index: number, animate: boolean) => {
    if (index === current) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setLeaving(isStack && animate && !reduced ? current : null);
    setCurrent(index);
  };

  useEffect(() => {
    if (leaving === null) return;
    const timer = window.setTimeout(() => setLeaving(null), LEAVE_MS);
    return () => window.clearTimeout(timer);
  }, [leaving]);

  useEffect(() => {
    if (paused || !onScreen || !pageVisible || count < 2) return;
    const timer = window.setTimeout(() => show((current + 1) % count, true), interval);
    return () => window.clearTimeout(timer);
    // `show` closes over `current`, which is already a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, paused, onScreen, pageVisible, count, interval]);

  const choose = (index: number) => {
    setPaused(true);
    show(index, true);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const next = (current + (event.key === 'ArrowRight' ? 1 : -1) + count) % count;
    choose(next);
    choiceRefs.current[next]?.focus();
  };

  return (
    <div
      ref={regionRef}
      className={`feature-pair ${className}`}
      role="region"
      aria-roledescription="carousel"
      aria-label={label}
      onKeyDown={onKeyDown}
      style={isStack ? ({ '--stack-count': count } as CSSProperties) : undefined}
    >
      <div className={`feature-images${isStack ? ' category-stack' : ''}`}>
        {slides.map((slide, index) => {
          const depth = stackDepth(index, current, count);
          const classes = [
            'feature-still',
            isStack ? 'category-stack-card' : '',
            index === current ? 'is-current' : '',
            index === leaving ? 'is-leaving' : '',
          ]
            .filter(Boolean)
            .join(' ');
          return (
            <figure
              key={slide.key}
              className={classes}
              role="img"
              aria-label={slide.label}
              aria-hidden={index !== current}
              data-depth={isStack ? depth : undefined}
              style={isStack ? ({ '--stack-depth': depth } as CSSProperties) : undefined}
            >
              {near ? slide.content : null}
            </figure>
          );
        })}
      </div>
      <div className="feature-controls">
        <div className="feature-choices" aria-label={isStack ? 'Choose a photo' : 'Choose a view'}>
          {choices.map((choice, index) => (
            <button
              key={choice.label ?? choice.text}
              ref={(button) => {
                choiceRefs.current[index] = button;
              }}
              type="button"
              className={`feature-choice${choice.text ? '' : ' feature-choice--dot'}`}
              aria-label={choice.label}
              title={choice.text ? undefined : choice.label}
              aria-pressed={index === current}
              onClick={() => choose(index)}
            >
              {choice.text}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="feature-pause"
          aria-label={`${paused ? 'Play' : 'Pause'} ${label} slideshow`}
          onClick={() => setPaused((value) => !value)}
        >
          <span aria-hidden="true">{paused ? '▷' : 'Ⅱ'}</span>
        </button>
      </div>
    </div>
  );
}
