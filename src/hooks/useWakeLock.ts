import { useEffect, useRef, useCallback } from 'react';

// Tiny 1-second silent MP4 loop fallback
const SILENT_MP4 = "data:video/mp4;base64,AAAAIGZ0eXBpc29tAAACAGlzb21pc28ybXA0MQAAAAhmcmVlAAAAG21kYXQAAAGzABAAABIQAAABkAAKABAAAAEAAAAAEAAJABAQAAABAAAAHgAAAAAAAAMAAAACAAAACAAAABAAAAAEAAAAOAAAAHQAAAApAAAADgAAABIAAAAuAAAASQAAAA8AAAAVAAAAEQAAABsAAAAXAAAAFAAAABYAAAARAAAAGQAAAB0AAAAJAAAAIwAAADUAAAAQAAAAIQAAADcAAAAXAAAAIwAAADgAAAAoAAAAPQAAAB4AAAAOAAAANQAAABkAAAAKAAAAEQAAABEAAAAdAAAALgAAABkAAAAaAAAABgAAABIAAAAeAAAAHAAAADAAAAAkAAAALwAAACMAAAAsAAAALgAAACIAAAA5AAAAEgAAACMAAAARAAAAAwAAABwAAAANAAAAKQAAACkAAAAaAAAADgAAABwAAAAOAAAAGAAAABEAAAAWAAAAKgAAACYAAAAJAAAAAwAAACYAAAAZAAAAIQAAADIAAAApAAAAOgAAAC8AAAAOAAAAEwAAACIAAAAbAAAAIAAAACYAAAAPAAAAAgAAABEAAAAgAAAAHgAAACYAAAApAAAAGwAAAAQAAAAIAAAAFAAAABoAAAAgAAAASQAAADoAAAAzAAAAVgAAAHoAAACuAAAA3gAAAQUAAAI1AAADZQAAA+UAAAT5AAAF8QAABtEAAAdlAAAIDQAACS0AAAouAAALJgAADCUAAA1JAAAORgAADwcAABAVAAARFwAAEjMAABNbAAAUbAAAFVgAABaMAAAXVgAAGCUAABlhAAAaeAAAGwAAABwQAAAdHAAAHm8AAB7qAAAfoAAAIAsAACCKAAAhhQA=";

/**
 * Enhanced Screen Wake Lock Hook
 * - Automatically stays awake while the tab is visible by listening to user gestures.
 * - Handles native Screen Wake Lock API with auto-reacquisition on visibility change.
 * - Falls back to a DOM-attached video loop for iOS/older browsers.
 */
export function useWakeLock() {
    const wakeLockRef = useRef<any>(null);
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const isLockedRef = useRef<boolean>(false);

    const releaseWakeLock = useCallback(async () => {
        isLockedRef.current = false;
        
        // Stop video fallback
        if (videoRef.current) {
            videoRef.current.pause();
            console.log('[WakeLock] Fallback video paused');
        }

        // Release native lock
        if (wakeLockRef.current) {
            try {
                await wakeLockRef.current.release();
                console.log('[WakeLock] Native lock released');
            } catch (err) {}
            wakeLockRef.current = null;
        }
    }, []);

    const requestWakeLock = useCallback(async () => {
        if (document.visibilityState !== 'visible') return;

        // 1. Fallback Video (Essential for mobile Safari/PWA)
        if (!videoRef.current) {
            const video = document.createElement('video');
            video.setAttribute('playsinline', '');
            video.setAttribute('muted', '');
            video.setAttribute('loop', '');
            video.src = SILENT_MP4;
            video.style.cssText = 'position:absolute;width:1px;height:1px;opacity:0.01;pointer-events:none;z-index:-9999;';
            document.body.appendChild(video);
            videoRef.current = video;
        }

        try {
            await videoRef.current.play();
            console.log('[WakeLock] Fallback video active');
        } catch (err) {
            console.warn('[WakeLock] Video playback failed', err);
        }

        // 2. Native API (Chrome/Edge/Modern Mobile)
        if ('wakeLock' in navigator) {
            try {
                // @ts-ignore
                const lock = await navigator.wakeLock.request('screen');
                lock.addEventListener('release', () => {
                    console.log('[WakeLock] Native lock was released by system');
                    wakeLockRef.current = null;
                });
                wakeLockRef.current = lock;
                isLockedRef.current = true;
                console.log('[WakeLock] Native lock active');
            } catch (err) {
                console.error('[WakeLock] Native request failed', err);
            }
        } else {
            isLockedRef.current = true;
        }
    }, []);

    useEffect(() => {
        const handleInteraction = async () => {
            if (!isLockedRef.current) {
                console.log('[WakeLock] User interaction gesture detected, requesting lock');
                await requestWakeLock();
            }
        };

        // Add broad user gesture listeners to capture the first interaction
        window.addEventListener('click', handleInteraction);
        window.addEventListener('touchstart', handleInteraction, { passive: true });
        window.addEventListener('keydown', handleInteraction);

        const handleVisibilityChange = async () => {
            if (document.visibilityState === 'visible') {
                await requestWakeLock();
            } else {
                await releaseWakeLock();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        
        // Initial request on load
        handleVisibilityChange();

        return () => {
            window.removeEventListener('click', handleInteraction);
            window.removeEventListener('touchstart', handleInteraction);
            window.removeEventListener('keydown', handleInteraction);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            releaseWakeLock();
            if (videoRef.current?.parentNode) {
                videoRef.current.parentNode.removeChild(videoRef.current);
                videoRef.current = null;
            }
        };
    }, [requestWakeLock, releaseWakeLock]);

    return { requestWakeLock, releaseWakeLock };
}
