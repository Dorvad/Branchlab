'use client'
/// <reference types="youtube" />

import { useState, useEffect, useRef, useCallback } from 'react'
import { X, Play, Pause, RotateCcw, Scissors, ChevronLeft, ChevronRight, Youtube, AlertTriangle } from 'lucide-react'
import { motion } from 'framer-motion'
import { parseTimestampToSeconds, formatSecondsToTimestamp, timelineTicks } from '@/lib/timestamp'
import { loadYouTubeIframeAPI } from '@/lib/youtube'
import type { ScenarioNode, YouTubeClipRef } from '@/types'

interface YouTubeClipRangeEditorProps {
  node: ScenarioNode
  youtubeAsset: YouTubeClipRef
  onSave: (startTime: number | undefined, endTime: number | null) => void
  onClose: () => void
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
  const editingRef = useRef(false)

  useEffect(() => {
    if (!editingRef.current) setText(formatSecondsToTimestamp(value))
  }, [value])

  const commit = () => {
    editingRef.current = false
    const parsed = parseTimestampToSeconds(text)
    if (parsed === null || parsed < 0 || parsed > max) {
      setError(true)
      setText(formatSecondsToTimestamp(value))
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
          onKeyDown={e => {
            if (e.key === 'Enter') e.currentTarget.blur()
            else if (e.key === 'Escape') { editingRef.current = false; setText(formatSecondsToTimestamp(value)); e.currentTarget.blur() }
          }}
          className="flex-1 bg-transparent px-3 py-2 text-sm font-mono outline-none min-w-0"
          style={{ color: error ? 'oklch(70% 0.18 25)' : 'var(--fg-0)' }}
          spellCheck={false}
          autoComplete="off"
        />
        <div className="flex items-center border-l shrink-0" style={{ borderColor: 'var(--line-2)' }}>
          {([-1, -0.1, 0.1, 1] as const).map(delta => (
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

// ── YouTubeClipRangeEditor ────────────────────────────────────────────────────

export function YouTubeClipRangeEditor({ node, youtubeAsset, onSave, onClose }: YouTubeClipRangeEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<YT.Player | null>(null)
  const timelineRef = useRef<HTMLDivElement>(null)
  const doneRef = useRef(false)

  const [duration, setDuration] = useState<number | null>(youtubeAsset.duration ?? null)
  const [currentTime, setCurrentTime] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPreviewing, setIsPreviewing] = useState(false)
  const [playerReady, setPlayerReady] = useState(false)
  const [playerError, setPlayerError] = useState(false)
  const [apiError, setApiError] = useState(false)

  const [startTime, setStartTime] = useState(node.youtubeStartTime ?? 0)
  const [endTime, setEndTime] = useState<number>(
    node.youtubeEndTime ?? youtubeAsset.duration ?? 0
  )

  // Keep stable refs for use in polling interval
  const startTimeRef = useRef(startTime)
  const endTimeRef = useRef(endTime)
  const isPreviewingRef = useRef(isPreviewing)
  useEffect(() => { startTimeRef.current = startTime }, [startTime])
  useEffect(() => { endTimeRef.current = endTime }, [endTime])
  useEffect(() => { isPreviewingRef.current = isPreviewing }, [isPreviewing])

  // ── Load YouTube IFrame API + create player ───────────────────────────────

  useEffect(() => {
    doneRef.current = false
    let destroyed = false

    loadYouTubeIframeAPI()
      .then(() => {
        if (destroyed || !containerRef.current) return

        playerRef.current = new YT.Player(containerRef.current, {
          videoId: youtubeAsset.youtubeVideoId,
          width: '100%',
          height: '100%',
          playerVars: {
            controls: 0 as 0,
            playsinline: 1 as 1,
            rel: 0 as 0,
            enablejsapi: 1 as 1,
            origin: window.location.origin,
            modestbranding: 1 as 1,
          },
          events: {
            onReady: (e) => {
              if (destroyed) return
              const dur = e.target.getDuration()
              if (dur > 0) {
                setDuration(dur)
                // Correct endTime if we initialized from stored duration which might be stale
                if (node.youtubeEndTime == null) setEndTime(dur)
              }
              // Seek to start point for convenience
              if (startTimeRef.current > 0) e.target.seekTo(startTimeRef.current, true)
              setPlayerReady(true)
            },
            onStateChange: (e) => {
              setIsPlaying(e.data === YT.PlayerState.PLAYING)
              if (e.data === YT.PlayerState.ENDED) {
                setIsPlaying(false)
                setIsPreviewing(false)
              }
            },
            onError: () => setPlayerError(true),
          },
        })
      })
      .catch(() => setApiError(true))

    return () => {
      destroyed = true
      try { playerRef.current?.destroy() } catch {}
      playerRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Polling for current time (YouTube has no timeupdate event) ────────────

  useEffect(() => {
    const id = window.setInterval(() => {
      const p = playerRef.current
      if (!p?.getCurrentTime) return
      const t = p.getCurrentTime()
      setCurrentTime(t)
      if (isPreviewingRef.current && endTimeRef.current > 0 && t >= endTimeRef.current) {
        p.pauseVideo()
        setIsPreviewing(false)
      }
    }, 100)
    return () => clearInterval(id)
  }, [])

  // ── Drag state ────────────────────────────────────────────────────────────

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
        const clamped = Math.max(0, Math.min(t, endTime - 0.05))
        setStartTime(clamped)
        playerRef.current?.seekTo(clamped, true)
      } else if (draggingRef.current === 'end') {
        const clamped = Math.max(startTime + 0.05, Math.min(t, duration ?? Infinity))
        setEndTime(clamped)
        playerRef.current?.seekTo(clamped, true)
      } else {
        playerRef.current?.seekTo(t, true)
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

  // ── Controls ──────────────────────────────────────────────────────────────

  const togglePlay = useCallback(() => {
    const p = playerRef.current
    if (!p) return
    const state = p.getPlayerState()
    if (state === YT.PlayerState.PLAYING) p.pauseVideo()
    else p.playVideo()
  }, [])

  const previewClip = useCallback(() => {
    const p = playerRef.current
    if (!p) return
    p.seekTo(startTimeRef.current, true)
    setIsPreviewing(true)
    p.playVideo()
  }, [])

  const resetToFull = useCallback(() => {
    setStartTime(0)
    setEndTime(duration ?? youtubeAsset.duration ?? 0)
  }, [duration, youtubeAsset.duration])

  const handleApply = useCallback(() => {
    const effectiveStart = startTime <= 0.001 ? undefined : startTime
    const effectiveEnd = duration != null && Math.abs(endTime - duration) < 0.01 ? null : endTime
    onSave(effectiveStart, effectiveEnd)
  }, [startTime, endTime, duration, onSave])

  // ── Computed layout ───────────────────────────────────────────────────────

  const dur = duration ?? 0
  const startPct = dur > 0 ? (startTime / dur) * 100 : 0
  const endPct = dur > 0 ? (endTime / dur) * 100 : 100
  const playheadPct = dur > 0 ? (currentTime / dur) * 100 : 0
  const clipDuration = Math.max(0, endTime - startTime)
  const ticks = timelineTicks(dur)

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
        {/* Header */}
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
            <span
              className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono ml-1"
              style={{ background: 'rgba(255,0,0,0.1)', border: '1px solid rgba(255,0,0,0.25)', color: '#ff4444' }}
            >
              <Youtube size={9} />
              YouTube
            </span>
          </div>
          <button onClick={onClose} className="p-1 transition-colors hover:text-ink-1" style={{ color: 'var(--fg-3)' }}>
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {/* YouTube player area */}
          <div className="relative bg-black" style={{ aspectRatio: '16/9', maxHeight: '42vh' }}>
            {apiError || playerError ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
                <AlertTriangle size={24} style={{ color: 'oklch(80% 0.16 60)' }} />
                <p className="text-sm" style={{ color: 'var(--fg-2)' }}>
                  This YouTube video can&apos;t be loaded in the editor.
                </p>
                <p className="text-[11px]" style={{ color: 'var(--fg-4)' }}>
                  It may be private, unavailable, or embedding is disabled. You can still set start/end times manually.
                </p>
              </div>
            ) : (
              <div ref={containerRef} className="absolute inset-0 w-full h-full" />
            )}

            {/* Time overlay */}
            {!apiError && !playerError && (
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                <span className="text-[11px] font-mono px-2 py-1 rounded-lg"
                  style={{ background: 'rgba(0,0,0,0.65)', color: 'white' }}>
                  {formatSecondsToTimestamp(currentTime)}
                </span>
                <span className="text-[11px] font-mono px-2 py-1 rounded-lg"
                  style={{ background: 'rgba(0,0,0,0.65)', color: 'rgba(255,255,255,0.6)' }}>
                  {dur > 0 ? formatSecondsToTimestamp(dur) : '…'}
                </span>
              </div>
            )}

            {/* Loading overlay */}
            {!playerReady && !apiError && !playerError && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 pointer-events-none">
                <div className="flex flex-col items-center gap-2">
                  <Youtube size={32} style={{ color: '#ff0000', opacity: 0.8 }} />
                  <p className="text-[11px] font-mono" style={{ color: 'rgba(255,255,255,0.5)' }}>Loading player…</p>
                </div>
              </div>
            )}
          </div>

          {/* Playback controls */}
          <div className="px-5 py-3 flex items-center gap-3 border-b" style={{ borderColor: 'var(--line-1)' }}>
            <button
              onClick={togglePlay}
              disabled={!playerReady}
              className="flex items-center justify-center w-8 h-8 rounded-lg transition-all hover:bg-[var(--tint-3)] disabled:opacity-40"
              style={{ border: '1px solid var(--line-2)', color: 'var(--fg-1)' }}
            >
              {isPlaying ? <Pause size={14} /> : <Play size={14} />}
            </button>
            <button
              onClick={() => playerRef.current?.seekTo(startTime, true)}
              disabled={!playerReady}
              className="flex items-center justify-center w-8 h-8 rounded-lg transition-all hover:bg-[var(--tint-3)] disabled:opacity-40"
              style={{ border: '1px solid var(--line-2)', color: 'var(--fg-2)' }}
              title="Go to start point"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={() => playerRef.current?.seekTo(endTime, true)}
              disabled={!playerReady}
              className="flex items-center justify-center w-8 h-8 rounded-lg transition-all hover:bg-[var(--tint-3)] disabled:opacity-40"
              style={{ border: '1px solid var(--line-2)', color: 'var(--fg-2)' }}
              title="Go to end point"
            >
              <ChevronRight size={14} />
            </button>

            <div className="h-4 w-px mx-1" style={{ background: 'var(--line-2)' }} />

            <button
              onClick={previewClip}
              disabled={!playerReady}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all hover:brightness-110 disabled:opacity-40"
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

          {/* Timeline */}
          <div className="px-5 pt-5 pb-3 select-none">
            {dur === 0 ? (
              <div
                className="py-4 rounded-xl text-center text-[11px] font-mono border"
                style={{ borderColor: 'var(--line-1)', color: 'var(--fg-4)' }}
              >
                Timeline available once the player loads the video duration.
              </div>
            ) : (
              <>
                {/* Tick labels */}
                <div className="relative h-4 mb-1">
                  {ticks.map(t => (
                    <span
                      key={t}
                      className="absolute text-[9px] font-mono -translate-x-1/2"
                      style={{ left: `${(t / dur) * 100}%`, color: 'var(--fg-4)' }}
                    >
                      {formatSecondsToTimestamp(t)}
                    </span>
                  ))}
                </div>

                {/* Bar */}
                <div
                  ref={timelineRef}
                  className="relative rounded-full overflow-visible cursor-pointer"
                  style={{ height: 8, background: 'var(--tint-3)' }}
                  onMouseDown={e => {
                    const t = getTimeFromPointer(e.clientX)
                    draggingRef.current = 'playhead'
                    playerRef.current?.seekTo(t, true)
                  }}
                >
                  {ticks.map(t => (
                    <div key={t} className="absolute top-0 bottom-0 pointer-events-none"
                      style={{ left: `${(t / dur) * 100}%`, width: 1, background: 'var(--line-2)' }} />
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
                      width: 2, height: 20,
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
                      className="rounded-full"
                      style={{
                        width: 20, height: 20,
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
                      className="rounded-full"
                      style={{
                        width: 20, height: 20,
                        background: 'oklch(82% 0.18 165)',
                        boxShadow: '0 2px 8px oklch(82% 0.18 165 / 0.5)',
                        border: '2px solid white',
                      }}
                    />
                  </div>
                </div>

                {/* Labels under handles */}
                <div className="relative h-5 mt-1 pointer-events-none">
                  <span className="absolute text-[9px] font-mono -translate-x-1/2"
                    style={{ left: `${startPct}%`, color: 'oklch(82% 0.18 165)' }}>
                    {formatSecondsToTimestamp(startTime)}
                  </span>
                  <span className="absolute text-[9px] font-mono -translate-x-1/2"
                    style={{ left: `${endPct}%`, color: 'oklch(82% 0.18 165)' }}>
                    {formatSecondsToTimestamp(endTime)}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Timestamp inputs */}
          <div className="px-5 pb-5 grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <TimestampInput
                label="Start point"
                value={startTime}
                max={Math.max(0, endTime - 0.05)}
                onChange={v => { setStartTime(v); playerRef.current?.seekTo(v, true) }}
              />
              <button
                onClick={() => setStartTime(Math.min(currentTime, endTime - 0.05))}
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
                max={dur || 99999}
                onChange={v => { setEndTime(Math.max(startTime + 0.05, Math.min(v, dur || 99999))); playerRef.current?.seekTo(v, true) }}
              />
              <button
                onClick={() => setEndTime(Math.max(currentTime, startTime + 0.05))}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-mono transition-all hover:bg-[var(--tint-3)]"
                style={{ border: '1px solid var(--line-2)', color: 'var(--fg-3)' }}
              >
                Set end to {formatSecondsToTimestamp(currentTime)}
              </button>
            </div>
          </div>

          {/* Info row */}
          <div className="px-5 pb-5 space-y-2">
            <div
              className="flex items-center justify-between px-4 py-3 rounded-xl text-[11px] font-mono"
              style={{ background: 'var(--tint-1)', border: '1px solid var(--line-1)' }}
            >
              <span style={{ color: 'var(--fg-3)' }}>
                Clip duration: <span style={{ color: 'var(--fg-1)' }}>{formatSecondsToTimestamp(clipDuration)}</span>
              </span>
              <span style={{ color: 'var(--fg-4)' }}>
                Full video: {dur > 0 ? formatSecondsToTimestamp(dur) : '…'}
              </span>
            </div>
            <p className="text-[10px] font-mono text-center" style={{ color: 'var(--fg-4)' }}>
              Start/end times are approximate — YouTube seeks to the nearest keyframe.
            </p>
          </div>
        </div>

        {/* Footer */}
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
