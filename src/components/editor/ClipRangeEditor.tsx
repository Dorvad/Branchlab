'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { X, Play, Pause, RotateCcw, Scissors, ChevronLeft, ChevronRight } from 'lucide-react'
import { motion } from 'framer-motion'
import { parseTimestampToSeconds, formatSecondsToTimestamp } from '@/lib/timestamp'
import type { ScenarioNode, ClipAsset } from '@/types'

interface ClipRangeEditorProps {
  node: ScenarioNode
  clip: ClipAsset
  onSave: (startTime: number | undefined, endTime: number | null) => void
  onClose: () => void
}

// ── Tick interval based on video duration ────────────────────────────────────

function tickInterval(duration: number): number {
  if (duration <= 30)  return 1
  if (duration <= 90)  return 5
  if (duration <= 300) return 15
  if (duration <= 900) return 30
  return 60
}

// ── TimestampInput ────────────────────────────────────────────────────────────

function TimestampInput({
  label,
  value,
  max,
  onChange,
}: {
  label: string
  value: number
  max: number
  onChange: (v: number) => void
}) {
  const [text, setText] = useState(formatSecondsToTimestamp(value))
  const [error, setError] = useState(false)

  // Sync external value changes when not being edited
  const editingRef = useRef(false)
  useEffect(() => {
    if (!editingRef.current) setText(formatSecondsToTimestamp(value))
  }, [value])

  const commit = () => {
    editingRef.current = false
    const parsed = parseTimestampToSeconds(text)
    if (parsed === null || parsed < 0 || parsed > max) {
      setError(true)
      setText(formatSecondsToTimestamp(value)) // revert
      setTimeout(() => setError(false), 1200)
    } else {
      setError(false)
      onChange(parsed)
    }
  }

  const step = (delta: number) => {
    const clamped = Math.max(0, Math.min(max, value + delta))
    onChange(parseFloat(clamped.toFixed(3)))
  }

  return (
    <div className="space-y-1">
      <p className="text-[10px] font-mono tracking-widest uppercase" style={{ color: 'var(--fg-4)' }}>{label}</p>
      <div
        className="flex items-center rounded-xl overflow-hidden"
        style={{ border: `1px solid ${error ? 'oklch(70% 0.18 25 / 0.6)' : 'var(--line-2)'}`, background: 'var(--tint-1)' }}
      >
        <input
          value={text}
          onChange={e => { editingRef.current = true; setText(e.target.value); setError(false) }}
          onBlur={commit}
          onKeyDown={e => { if (e.key === 'Enter') { e.currentTarget.blur() } else if (e.key === 'Escape') { editingRef.current = false; setText(formatSecondsToTimestamp(value)); e.currentTarget.blur() } }}
          className="flex-1 bg-transparent px-3 py-2 text-sm font-mono outline-none min-w-0"
          style={{ color: error ? 'oklch(70% 0.18 25)' : 'var(--fg-0)' }}
          spellCheck={false}
          autoComplete="off"
        />
        <div className="flex items-center border-l shrink-0" style={{ borderColor: 'var(--line-2)' }}>
          {[-1, -0.1, 0.1, 1].map(delta => (
            <button
              key={delta}
              onClick={() => step(delta)}
              className="px-1.5 py-2 text-[10px] font-mono transition-colors hover:bg-[var(--tint-3)]"
              style={{ color: 'var(--fg-3)' }}
              title={`${delta > 0 ? '+' : ''}${delta}s`}
            >
              {delta === -1 ? '−1' : delta === -0.1 ? '−.1' : delta === 0.1 ? '+.1' : '+1'}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── ClipRangeEditor ───────────────────────────────────────────────────────────

export function ClipRangeEditor({ node, clip, onSave, onClose }: ClipRangeEditorProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const timelineRef = useRef<HTMLDivElement>(null)

  const [duration, setDuration] = useState<number | null>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPreviewing, setIsPreviewing] = useState(false)

  const [startTime, setStartTime] = useState(node.clipStartTime ?? 0)
  const [endTime, setEndTime] = useState<number>(
    node.clipEndTime ?? clip.duration
  )

  // After metadata loads, correct endTime if it was clip.duration but node has no range
  const metaLoadedRef = useRef(false)
  const handleLoadedMetadata = useCallback(() => {
    const v = videoRef.current
    if (!v) return
    const dur = v.duration
    setDuration(dur)
    if (!metaLoadedRef.current) {
      metaLoadedRef.current = true
      // If no clip range is set, default end to actual duration
      if (node.clipEndTime == null) setEndTime(dur)
    }
  }, [node.clipEndTime])

  const handleTimeUpdate = useCallback(() => {
    const v = videoRef.current
    if (!v) return
    setCurrentTime(v.currentTime)
    setIsPlaying(!v.paused)
    if (isPreviewing && v.currentTime >= endTime) {
      v.pause()
      setIsPreviewing(false)
    }
  }, [isPreviewing, endTime])

  const handleEnded = useCallback(() => {
    setIsPlaying(false)
    setIsPreviewing(false)
  }, [])

  // Dragging state
  const draggingRef = useRef<'start' | 'end' | 'playhead' | null>(null)

  const getTimeFromPointer = useCallback((clientX: number): number => {
    const rect = timelineRef.current?.getBoundingClientRect()
    if (!rect || !duration) return 0
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    return ratio * duration
  }, [duration])

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!draggingRef.current) return
      const t = getTimeFromPointer(e.clientX)
      if (draggingRef.current === 'start') {
        setStartTime(prev => Math.max(0, Math.min(t, endTime - 0.05)))
        if (videoRef.current) videoRef.current.currentTime = Math.max(0, Math.min(t, endTime - 0.05))
      } else if (draggingRef.current === 'end') {
        setEndTime(prev => Math.max(startTime + 0.05, Math.min(t, duration ?? Infinity)))
        if (videoRef.current) videoRef.current.currentTime = Math.max(startTime + 0.05, Math.min(t, duration ?? Infinity))
      } else {
        if (videoRef.current) videoRef.current.currentTime = t
      }
    }
    const onUp = () => { draggingRef.current = null }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [getTimeFromPointer, startTime, endTime, duration])

  const togglePlay = useCallback(() => {
    const v = videoRef.current
    if (!v) return
    if (v.paused) v.play().catch(() => {})
    else v.pause()
  }, [])

  const previewClip = useCallback(() => {
    const v = videoRef.current
    if (!v) return
    v.currentTime = startTime
    setIsPreviewing(true)
    v.play().catch(() => {})
  }, [startTime])

  const setStartToCurrent = useCallback(() => {
    setStartTime(Math.min(currentTime, endTime - 0.05))
  }, [currentTime, endTime])

  const setEndToCurrent = useCallback(() => {
    setEndTime(Math.max(currentTime, startTime + 0.05))
  }, [currentTime, startTime])

  const resetToFull = useCallback(() => {
    setStartTime(0)
    setEndTime(duration ?? clip.duration)
  }, [duration, clip.duration])

  const handleApply = useCallback(() => {
    const effectiveStart = startTime <= 0.001 ? undefined : startTime
    const effectiveEnd = duration != null && Math.abs(endTime - duration) < 0.01 ? null : endTime
    onSave(effectiveStart, effectiveEnd)
  }, [startTime, endTime, duration, onSave])

  // ── Computed layout values ──────────────────────────────────────────────────

  const dur = duration ?? clip.duration
  const startPct = dur > 0 ? (startTime / dur) * 100 : 0
  const endPct = dur > 0 ? (endTime / dur) * 100 : 100
  const playheadPct = dur > 0 ? (currentTime / dur) * 100 : 0
  const clipDuration = Math.max(0, endTime - startTime)

  const ticks = dur > 0 ? (() => {
    const interval = tickInterval(dur)
    const result: number[] = []
    for (let t = 0; t <= dur; t += interval) result.push(t)
    return result
  })() : []

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 12 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[720px] rounded-2xl overflow-hidden flex flex-col"
        style={{
          background: 'var(--bg-1)',
          border: '1px solid var(--line-2)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.7)',
          maxHeight: '92vh',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div
          className="flex items-center justify-between px-5 h-[52px] shrink-0 border-b"
          style={{ borderColor: 'var(--line-1)' }}
        >
          <div className="flex items-center gap-2.5">
            <Scissors size={14} style={{ color: 'oklch(82% 0.18 165)' }} />
            <div>
              <span className="text-sm font-medium" style={{ color: 'var(--fg-0)' }}>Edit scene clip</span>
              <span className="text-xs ml-2 font-mono" style={{ color: 'var(--fg-4)' }}>{node.title}</span>
            </div>
          </div>
          <button onClick={onClose} className="p-1 transition-colors hover:text-ink-1" style={{ color: 'var(--fg-3)' }}>
            <X size={14} />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto">
          {/* Video preview */}
          <div className="relative bg-black" style={{ aspectRatio: '16/9', maxHeight: '42vh' }}>
            <video
              ref={videoRef}
              src={clip.url}
              className="w-full h-full object-contain"
              playsInline
              preload="metadata"
              onLoadedMetadata={handleLoadedMetadata}
              onTimeUpdate={handleTimeUpdate}
              onEnded={handleEnded}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />

            {/* Overlay time display */}
            <div
              className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none"
            >
              <span className="text-[11px] font-mono px-2 py-1 rounded-lg"
                style={{ background: 'rgba(0,0,0,0.65)', color: 'white' }}>
                {formatSecondsToTimestamp(currentTime)}
              </span>
              <span className="text-[11px] font-mono px-2 py-1 rounded-lg"
                style={{ background: 'rgba(0,0,0,0.65)', color: 'rgba(255,255,255,0.6)' }}>
                {dur > 0 ? formatSecondsToTimestamp(dur) : '–'}
              </span>
            </div>
          </div>

          {/* Playback controls */}
          <div className="px-5 py-3 flex items-center gap-3 border-b" style={{ borderColor: 'var(--line-1)' }}>
            <button
              onClick={togglePlay}
              className="flex items-center justify-center w-8 h-8 rounded-lg transition-all hover:bg-[var(--tint-3)]"
              style={{ border: '1px solid var(--line-2)', color: 'var(--fg-1)' }}
            >
              {isPlaying ? <Pause size={14} /> : <Play size={14} />}
            </button>
            <button
              onClick={() => { if (videoRef.current) videoRef.current.currentTime = startTime }}
              className="flex items-center justify-center w-8 h-8 rounded-lg transition-all hover:bg-[var(--tint-3)]"
              style={{ border: '1px solid var(--line-2)', color: 'var(--fg-2)' }}
              title="Go to start point"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={() => { if (videoRef.current) videoRef.current.currentTime = endTime }}
              className="flex items-center justify-center w-8 h-8 rounded-lg transition-all hover:bg-[var(--tint-3)]"
              style={{ border: '1px solid var(--line-2)', color: 'var(--fg-2)' }}
              title="Go to end point"
            >
              <ChevronRight size={14} />
            </button>

            <div className="h-4 w-px mx-1" style={{ background: 'var(--line-2)' }} />

            <button
              onClick={previewClip}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all hover:brightness-110"
              style={{ background: 'oklch(82% 0.18 165 / 0.12)', border: '1px solid oklch(82% 0.18 165 / 0.35)', color: 'oklch(82% 0.18 165)' }}
            >
              <Play size={11} />
              Preview clip
            </button>

            <button
              onClick={resetToFull}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all hover:bg-[var(--tint-3)]"
              style={{ border: '1px solid var(--line-2)', color: 'var(--fg-3)' }}
            >
              <RotateCcw size={11} />
              Reset
            </button>

            <div className="ml-auto text-[11px] font-mono" style={{ color: 'var(--fg-3)' }}>
              {formatSecondsToTimestamp(clipDuration)}{' '}
              <span style={{ color: 'var(--fg-4)' }}>selected</span>
            </div>
          </div>

          {/* ── Timeline ── */}
          <div className="px-5 pt-5 pb-3 select-none">
            {/* Tick labels */}
            <div className="relative h-4 mb-1">
              {ticks.map(t => (
                <span
                  key={t}
                  className="absolute text-[9px] font-mono -translate-x-1/2"
                  style={{ left: `${dur > 0 ? (t / dur) * 100 : 0}%`, color: 'var(--fg-4)' }}
                >
                  {formatSecondsToTimestamp(t)}
                </span>
              ))}
            </div>

            {/* Main timeline bar */}
            <div
              ref={timelineRef}
              className="relative rounded-full overflow-visible cursor-pointer"
              style={{ height: 8, background: 'var(--tint-3)' }}
              onMouseDown={e => {
                const t = getTimeFromPointer(e.clientX)
                draggingRef.current = 'playhead'
                if (videoRef.current) videoRef.current.currentTime = t
              }}
            >
              {/* Tick marks */}
              {ticks.map(t => (
                <div
                  key={t}
                  className="absolute top-0 bottom-0 pointer-events-none"
                  style={{
                    left: `${dur > 0 ? (t / dur) * 100 : 0}%`,
                    width: 1,
                    background: 'var(--line-2)',
                  }}
                />
              ))}

              {/* Selected range */}
              <div
                className="absolute top-0 bottom-0 pointer-events-none"
                style={{
                  left: `${startPct}%`,
                  width: `${Math.max(0, endPct - startPct)}%`,
                  background: 'oklch(82% 0.18 165 / 0.35)',
                  borderLeft: '2px solid oklch(82% 0.18 165)',
                  borderRight: '2px solid oklch(82% 0.18 165)',
                }}
              />

              {/* Playhead */}
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 pointer-events-none z-10"
                style={{
                  left: `${playheadPct}%`,
                  width: 2,
                  height: 20,
                  background: 'white',
                  borderRadius: 1,
                  boxShadow: '0 0 4px rgba(0,0,0,0.5)',
                }}
              />

              {/* Start handle */}
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-20 cursor-ew-resize"
                style={{ left: `${startPct}%` }}
                onMouseDown={e => { e.stopPropagation(); draggingRef.current = 'start' }}
              >
                <div
                  className="flex items-center justify-center rounded-full"
                  style={{
                    width: 20,
                    height: 20,
                    background: 'oklch(82% 0.18 165)',
                    boxShadow: '0 2px 8px oklch(82% 0.18 165 / 0.5)',
                    border: '2px solid white',
                  }}
                />
              </div>

              {/* End handle */}
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-20 cursor-ew-resize"
                style={{ left: `${endPct}%` }}
                onMouseDown={e => { e.stopPropagation(); draggingRef.current = 'end' }}
              >
                <div
                  className="flex items-center justify-center rounded-full"
                  style={{
                    width: 20,
                    height: 20,
                    background: 'oklch(82% 0.18 165)',
                    boxShadow: '0 2px 8px oklch(82% 0.18 165 / 0.5)',
                    border: '2px solid white',
                  }}
                />
              </div>
            </div>

            {/* Start/end time labels under handles */}
            <div className="relative h-5 mt-1 pointer-events-none">
              <span
                className="absolute text-[9px] font-mono -translate-x-1/2"
                style={{ left: `${startPct}%`, color: 'oklch(82% 0.18 165)' }}
              >
                {formatSecondsToTimestamp(startTime)}
              </span>
              <span
                className="absolute text-[9px] font-mono -translate-x-1/2"
                style={{ left: `${endPct}%`, color: 'oklch(82% 0.18 165)' }}
              >
                {formatSecondsToTimestamp(endTime)}
              </span>
            </div>
          </div>

          {/* ── Timestamp inputs ── */}
          <div className="px-5 pb-5 grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <TimestampInput
                label="Start point"
                value={startTime}
                max={Math.max(0, endTime - 0.05)}
                onChange={v => setStartTime(v)}
              />
              <button
                onClick={setStartToCurrent}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-mono transition-all hover:bg-[var(--tint-3)]"
                style={{ border: '1px solid var(--line-2)', color: 'var(--fg-3)' }}
              >
                Set start to {formatSecondsToTimestamp(currentTime)}
              </button>
            </div>

            <div className="space-y-3">
              <TimestampInput
                label="End point"
                value={endTime}
                max={dur}
                onChange={v => setEndTime(Math.max(startTime + 0.05, Math.min(v, dur)))}
              />
              <button
                onClick={setEndToCurrent}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-mono transition-all hover:bg-[var(--tint-3)]"
                style={{ border: '1px solid var(--line-2)', color: 'var(--fg-3)' }}
              >
                Set end to {formatSecondsToTimestamp(currentTime)}
              </button>
            </div>
          </div>

          {/* Clip info row */}
          <div className="px-5 pb-5">
            <div
              className="flex items-center justify-between px-4 py-3 rounded-xl text-[11px] font-mono"
              style={{ background: 'var(--tint-1)', border: '1px solid var(--line-1)' }}
            >
              <span style={{ color: 'var(--fg-3)' }}>
                Scene duration: <span style={{ color: 'var(--fg-1)' }}>{formatSecondsToTimestamp(clipDuration)}</span>
              </span>
              <span style={{ color: 'var(--fg-4)' }}>
                Full video: {dur > 0 ? formatSecondsToTimestamp(dur) : '…'}
              </span>
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div
          className="shrink-0 px-5 py-3.5 border-t flex items-center justify-between gap-3"
          style={{ borderColor: 'var(--line-1)' }}
        >
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-mono transition-all hover:bg-[var(--tint-3)]"
            style={{ border: '1px solid var(--line-2)', color: 'var(--fg-3)' }}
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={resetToFull}
              className="px-4 py-2 rounded-xl text-xs font-mono transition-all hover:bg-[var(--tint-3)]"
              style={{ border: '1px solid var(--line-2)', color: 'var(--fg-3)' }}
            >
              Reset to full video
            </button>
            <button
              onClick={handleApply}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-mono font-medium transition-all"
              style={{
                background: 'oklch(82% 0.18 165)',
                color: '#052916',
                boxShadow: '0 0 20px oklch(82% 0.18 165 / 0.35)',
              }}
            >
              <Scissors size={12} />
              Apply clip range
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
