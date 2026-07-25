'use client';
import { useEffect, useState } from 'react';
import { TRACKS, DEFAULT_TRACK, getTrackId, syncTrackWithServer } from '@/lib/track';

// 現在のトラック定義を返す。初回は既定値で描画し、
// localStorage → サーバ の順に解決して差し替える。
export default function useTrack() {
  const [trackId, setTrackId] = useState(DEFAULT_TRACK);

  useEffect(() => {
    setTrackId(getTrackId());
    syncTrackWithServer().then((t) => { if (t) setTrackId(t); }).catch(() => {});
  }, []);

  return { trackId, track: TRACKS[trackId] || TRACKS[DEFAULT_TRACK] };
}
