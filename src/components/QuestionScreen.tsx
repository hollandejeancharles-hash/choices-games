import { useEffect, useRef, useState } from 'react';
import type { Locale, Question } from '../core/types';
import { copy } from '../i18n';
interface Props { question: Question; locale: Locale; index: number; length: number; reversed: boolean; onAnswer: (option: 0 | 1, durationMs: number) => void; onPause: () => void; name: string; }
export function QuestionScreen({ question, locale, index, length, reversed, onAnswer, onPause, name }: Props) {
  const t = copy[locale];
  const [paused, setPaused] = useState(false), [selected, setSelected] = useState<number | null>(null);
  const clock = useRef({ start: performance.now(), elapsed: 0, running: true });
  const locked = useRef(false), timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pointer = useRef<{ x: number; y: number } | null>(null);
  const order: readonly [0 | 1, 0 | 1] = reversed ? [1, 0] : [0, 1];
  function stopClock() { if (clock.current.running) { clock.current.elapsed += performance.now() - clock.current.start; clock.current.running = false; } }
  function resumeClock() { if (!clock.current.running) { clock.current.start = performance.now(); clock.current.running = true; } }
  function pause() { if (locked.current) return; stopClock(); setPaused(true); }
  function choose(displayIndex: 0 | 1) {
    if (paused || locked.current || document.hidden) return;
    locked.current = true; stopClock(); setSelected(displayIndex);
    const duration = clock.current.elapsed;
    timer.current = setTimeout(() => onAnswer(order[displayIndex], duration), 320);
  }
  useEffect(() => {
    const visibility = () => { if (document.hidden) { stopClock(); setPaused(true); } };
    document.addEventListener('visibilitychange', visibility);
    return () => { document.removeEventListener('visibilitychange', visibility); if (timer.current) clearTimeout(timer.current); };
  }, []);
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (event.repeat || event.altKey || event.metaKey || event.ctrlKey) return;
      const element = event.target;
      if (element instanceof HTMLElement && (element.closest('header') || ['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName))) return;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); choose(event.key === 'ArrowLeft' ? 0 : 1); }
      if (event.key === 'Escape') pause();
    };
    document.addEventListener('keydown', keydown);
    return () => document.removeEventListener('keydown', keydown);
  });
  useEffect(() => { document.getElementById('question-title')?.focus(); }, [question.id]);
  return <section className="question-screen page-in">
    <div className="progress-meta"><span>{name || t.ready}</span><span>{String(index).padStart(2, '0')} <span className="muted">/ {length}</span></span></div>
    <progress value={index - 1} max={length} aria-label={`${t.question} ${index} / ${length}`} />
    {paused ? <div className="pause-panel"><span className="eyebrow">PAUSE</span><h1>{t.paused}</h1><p>{t.pausedCopy}</p><button className="primary" onClick={() => { resumeClock(); setPaused(false); }}>{t.next} <span>→</span></button><button className="text-button" onClick={onPause}>{t.quit}</button></div> : <>
      <div className="question-heading"><span className="eyebrow">{t.themeNames[question.theme]} <span className="dot">/</span> {t.question} {index}</span><h1 id="question-title" tabIndex={-1}>{question.prompt[locale]}</h1></div>
      <div className="choices" onPointerDown={event => { if (event.pointerType === 'touch') pointer.current = { x: event.clientX, y: event.clientY }; }} onPointerUp={event => {
        if (!pointer.current) return; const dx = event.clientX - pointer.current.x, dy = event.clientY - pointer.current.y; pointer.current = null;
        if (Math.abs(dx) > 75 && Math.abs(dx) > Math.abs(dy) * 1.5) choose(dx < 0 ? 0 : 1);
      }} onPointerCancel={() => { pointer.current = null; }}>
        {order.map((option, i) => <button key={option} disabled={selected !== null} className={`choice choice-${i} ${selected === i ? 'chosen' : ''}`} onClick={() => choose(i as 0 | 1)}><span className="choice-label">{i === 0 ? 'A' : 'B'} <span>{i === 0 ? '↙' : '↗'}</span></span><span className="choice-text">{question.options[option].text[locale]}</span><span className="choice-bottom">{selected === i ? '✓' : i === 0 ? '←' : '→'}</span></button>)}
        <span className="or" aria-hidden="true">{t.or}</span>
      </div><div className="question-footer"><span>{t.keyboard}</span><button className="text-button" onClick={pause}>{t.pause} Ⅱ</button></div>
    </>}
  </section>;
}
