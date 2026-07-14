'use client';

import { useState, useRef, useCallback } from 'react';
import { uploadTreeImage } from '../lib/api';
import type { TreeAnalysisResult, ApiError } from '../lib/types';

type TreeState =
  | { status: 'idle' }
  | { status: 'uploading' }
  | { status: 'success'; result: TreeAnalysisResult }
  | { status: 'error'; message: string };

export default function TreeUploadPanel() {
  const [state, setState] = useState<TreeState>({ status: 'idle' });
  const [dragging, setDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setState({ status: 'error', message: 'Please upload an image file (JPEG, PNG, or WebP).' });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setState({ status: 'error', message: 'Image must be under 10MB.' });
      return;
    }

    setSelectedFile(file);
    setState({ status: 'uploading' });

    try {
      const result = await uploadTreeImage(file);
      setState({ status: 'success', result });
    } catch (err: unknown) {
      const e = err as { apiError?: ApiError };
      setState({
        status: 'error',
        message: e.apiError?.message ?? 'Failed to analyse image. Please try again.',
      });
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const reset = () => {
    setState({ status: 'idle' });
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <section className="tree-section" aria-labelledby="tree-panel-label">
      <p className="section-label" id="tree-panel-label">Tree Analysis <span style={{ color: 'var(--text-muted)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>— optional</span></p>
      <div className="glass-card tree-card">

        <div className="tree-card-header">
          <div className="icon-wrap" aria-hidden="true">🌳</div>
          <div>
            <h3>Farm Tree Analysis</h3>
            <p>Upload a farm aerial/ground image to count trees and assess canopy health</p>
          </div>
        </div>

        <p className="tree-quota-note">
          ⚠️ Free plan includes 5 tree analyses/month. Each upload consumes one analysis.
        </p>

        {state.status === 'idle' && (
          <div
            id="tree-drop-zone"
            className={`drop-zone${dragging ? ' dragging' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            aria-label="Click or drag to upload farm image"
            onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
          >
            <div className="dz-icon" aria-hidden="true">📷</div>
            <p className="dz-title">Click to upload or drag & drop</p>
            <p className="dz-sub">JPEG, PNG, WebP — max 10MB</p>
            <input
              ref={fileInputRef}
              id="tree-file-input"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleInputChange}
              style={{ display: 'none' }}
              aria-hidden="true"
            />
          </div>
        )}

        {state.status === 'uploading' && (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div className="btn-spinner" style={{ display: 'inline-block', width: '32px', height: '32px', border: '3px solid rgba(255,255,255,0.15)', borderTopColor: 'var(--flag-rain)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginBottom: '12px' }} />
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
              Analysing {selectedFile?.name}…
            </p>
          </div>
        )}

        {state.status === 'success' && (
          <div className="tree-results">
            <div className="tree-stats">
              <div className="stat-box">
                <p className="stat-value">{state.result.total_tree_count ?? '—'}</p>
                <p className="stat-label">Trees</p>
              </div>
              <div className="stat-box">
                <p className="stat-value">
                  {state.result.canopy_coverage_pct !== null && state.result.canopy_coverage_pct !== undefined
                    ? `${state.result.canopy_coverage_pct.toFixed(1)}%`
                    : '—'}
                </p>
                <p className="stat-label">Canopy Cover</p>
              </div>
              <div className="stat-box">
                <p className="stat-value" style={{ fontSize: '1rem' }}>
                  {state.result.health_status ?? '—'}
                </p>
                <p className="stat-label">Health</p>
              </div>
            </div>

            {state.result.overlay_image_url && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={state.result.overlay_image_url}
                alt="Tree detection overlay"
                className="overlay-image"
              />
            )}

            <button
              id="tree-reset-btn"
              type="button"
              className="retry-btn"
              onClick={reset}
              style={{ marginTop: '16px' }}
            >
              Analyse another image
            </button>
          </div>
        )}

        {state.status === 'error' && (
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <p style={{ fontSize: '2rem', marginBottom: '8px' }}>⚠️</p>
            <p className="error-message">{state.message}</p>
            <button id="tree-retry-btn" type="button" className="retry-btn" onClick={reset}>
              Try again
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
