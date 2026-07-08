import React, { useEffect, useMemo, useState } from 'react';
import { StatusBadge } from '../../design-system';
import { useManuals, type ManualEntry } from './useManuals';
import { setSelectedManualFile, useSelectedManualFile } from './manualStore';
import './Manual.css';

/**
 * raw.githubusercontent serves PDFs as application/octet-stream with
 * X-Frame-Options: deny, so the raw URL can't be framed directly. Fetch the
 * bytes and embed a same-origin blob URL typed as application/pdf instead.
 * Object URLs are kept for the session so switching versions back and forth
 * doesn't refetch.
 */
const objectUrlCache = new Map<string, string>();

async function fetchPdfObjectUrl(url: string): Promise<string> {
  const cached = objectUrlCache.get(url);
  if (cached) return cached;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`manual pdf: ${res.status}`);
  const bytes = await res.arrayBuffer();
  const objectUrl = URL.createObjectURL(
    new Blob([bytes], { type: 'application/pdf' }),
  );
  objectUrlCache.set(url, objectUrl);
  return objectUrl;
}

export const Manual: React.FC = () => {
  const { manuals, loading, error, fromCache } = useManuals();
  const selectedFile = useSelectedManualFile();

  // Selected manual if it exists in the listing, else the latest.
  const manual: ManualEntry | undefined = useMemo(
    () => manuals.find((m) => m.file === selectedFile) ?? manuals[0],
    [manuals, selectedFile],
  );

  // Keep the shared store pointing at the resolved manual so the TopBar
  // selector reflects the fallback-to-latest choice.
  useEffect(() => {
    if (manual && manual.file !== selectedFile) {
      setSelectedManualFile(manual.file);
    }
  }, [manual, selectedFile]);

  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);

  useEffect(() => {
    if (!manual) {
      setPdfUrl(null);
      return;
    }
    let cancelled = false;
    setPdfUrl(null);
    setPdfError(null);
    fetchPdfObjectUrl(manual.url)
      .then((url) => {
        if (!cancelled) setPdfUrl(url);
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setPdfError(e instanceof Error ? e.message : 'failed to load pdf');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [manual]);

  const status = error ?? pdfError;

  return (
    <div className="manual-tool">
      {(status || fromCache) && (
        <div className="manual-tool__meta">
          {status && <StatusBadge kind="err">{status}</StatusBadge>}
          {!status && fromCache && (
            <StatusBadge kind="info">cached manuals listing</StatusBadge>
          )}
        </div>
      )}

      {pdfUrl && manual ? (
        <iframe
          className="manual-tool__frame"
          src={pdfUrl}
          title={`eisei manual ${manual.label}`}
        />
      ) : (
        !status && (
          <div className="manual-tool__placeholder">
            {loading || (manual && !pdfError)
              ? 'loading manual…'
              : 'no manuals available'}
          </div>
        )
      )}
    </div>
  );
};
