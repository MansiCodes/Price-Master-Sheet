"use client";

import { Suspense, useMemo, useState, useEffect, Component, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import "./image-viewer.css";

class ViewerErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="viewer-error">
          <p>Could not display the image or document.</p>
          <button onClick={() => window.close()} className="viewer-btn">
            Close Window
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function parseViewerUrls(searchParams: ReturnType<typeof useSearchParams>): string[] {
  const rawUrls = searchParams.get("urls");
  const singleUrl = searchParams.get("url");
  let list: string[] = [];

  if (rawUrls) {
    try {
      const parsed = JSON.parse(rawUrls);
      if (Array.isArray(parsed)) {
        list = parsed.map(String).filter(Boolean);
      } else if (typeof parsed === "string" && parsed.trim()) {
        list = [parsed.trim()];
      }
    } catch {
      try {
        const decodedStr = decodeURIComponent(rawUrls);
        const parsed = JSON.parse(decodedStr);
        if (Array.isArray(parsed)) {
          list = parsed.map(String).filter(Boolean);
        } else if (typeof parsed === "string" && parsed.trim()) {
          list = [parsed.trim()];
        }
      } catch {
        if (rawUrls.trim()) {
          // Handle comma-separated or raw string
          list = rawUrls.split(",").map((s) => s.trim().replace(/^["']|["']$/g, "")).filter(Boolean);
        }
      }
    }
  }

  if (singleUrl && !list.includes(singleUrl.trim())) {
    list.push(singleUrl.trim());
  }

  return list;
}

function ImageViewer() {
  const searchParams = useSearchParams();
  const parsedUrls = useMemo(() => parseViewerUrls(searchParams), [searchParams]);
  const initialIndex = useMemo(() => {
    const idx = parseInt(searchParams.get("index") || "0", 10);
    return idx >= 0 && idx < parsedUrls.length ? idx : 0;
  }, [searchParams, parsedUrls.length]);

  const [index, setIndex] = useState(initialIndex);

  useEffect(() => {
    setIndex(initialIndex);
  }, [initialIndex]);

  if (parsedUrls.length === 0) {
    return (
      <div className="viewer-error">
        <p>No valid images provided.</p>
        <button onClick={() => window.close()} className="viewer-btn">
          Close Window
        </button>
      </div>
    );
  }

  const safeIndex = Math.min(Math.max(0, index), parsedUrls.length - 1);
  const currentUrl = parsedUrls[safeIndex] || "";

  const handlePrev = () => {
    setIndex((prev) => (prev === 0 ? parsedUrls.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setIndex((prev) => (prev === parsedUrls.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className="viewer-container">
      {/* Top Header */}
      <header className="viewer-header">
        <div className="viewer-info">
          Image {safeIndex + 1} of {parsedUrls.length}
        </div>
        <button onClick={() => window.close()} className="viewer-close-btn" aria-label="Close tab">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </header>

      {/* Main Content Area */}
      <main className="viewer-main">
        {parsedUrls.length > 1 && (
          <button onClick={handlePrev} className="viewer-nav-btn viewer-nav-btn--left" aria-label="Previous image">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>
        )}

        {(() => {
          if (!currentUrl) {
            return (
              <div className="viewer-error">
                <p>Invalid image link.</p>
              </div>
            );
          }

          const urlLower = currentUrl.toLowerCase();
          const isPdf = urlLower.includes(".pdf");
          const isDoc = urlLower.includes(".doc") || urlLower.includes(".docx") || urlLower.includes(".xls") || urlLower.includes(".xlsx");

          if (isPdf) {
            return (
              <div className="viewer-image-wrapper" style={{ height: "100%", width: "100%", maxWidth: "calc(100% - 160px)" }}>
                <iframe src={currentUrl} title="PDF Viewer" width="100%" height="100%" style={{ border: "none", borderRadius: "8px" }} />
              </div>
            );
          }

          if (isDoc) {
            return (
              <div className="viewer-image-wrapper" style={{ flexDirection: "column", gap: "1.5rem", justifyContent: "center" }}>
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: "#10b981" }}>
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                </svg>
                <p style={{ fontSize: "1.1rem", color: "#9ca3af", textAlign: "center" }}>This document format cannot be previewed natively.</p>
                <a href={currentUrl} download className="viewer-btn" target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
                  Download Document
                </a>
              </div>
            );
          }

          return (
            <div className="viewer-image-wrapper">
              <img
                src={currentUrl}
                alt={`Uploaded file ${safeIndex + 1}`}
                className="viewer-image"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = "none";
                  const fallback = e.currentTarget.parentElement?.querySelector(".viewer-fallback");
                  if (fallback) (fallback as HTMLElement).style.display = "flex";
                }}
              />
              <div className="viewer-fallback" style={{ display: "none", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
                <p style={{ color: "#9ca3af" }}>Image failed to load in preview.</p>
                <a href={currentUrl} target="_blank" rel="noreferrer" className="viewer-btn" style={{ textDecoration: "none" }}>
                  Open Direct Link
                </a>
              </div>
            </div>
          );
        })()}

        {parsedUrls.length > 1 && (
          <button onClick={handleNext} className="viewer-nav-btn viewer-nav-btn--right" aria-label="Next image">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
        )}
      </main>
    </div>
  );
}

export default function ImageViewerPage() {
  return (
    <ViewerErrorBoundary>
      <Suspense fallback={<div className="viewer-loading">Loading...</div>}>
        <ImageViewer />
      </Suspense>
    </ViewerErrorBoundary>
  );
}
