"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import "./image-viewer.css";

function ImageViewer() {
  const searchParams = useSearchParams();
  const [index, setIndex] = useState(0);
  const [urls, setUrls] = useState<string[]>([]);

  useEffect(() => {
    try {
      const idx = parseInt(searchParams.get("index") || "0", 10);
      const rawUrls = searchParams.get("urls");
      if (rawUrls) {
        const decoded = JSON.parse(decodeURIComponent(rawUrls));
        if (Array.isArray(decoded)) {
          setUrls(decoded.filter(Boolean));
          setIndex(idx >= 0 && idx < decoded.length ? idx : 0);
        }
      }
    } catch (e) {
      console.error("Failed to parse image-viewer params", e);
    }
  }, [searchParams]);

  if (urls.length === 0) {
    return (
      <div className="viewer-error">
        <p>No valid images provided.</p>
        <button onClick={() => window.close()} className="viewer-btn">
          Close Window
        </button>
      </div>
    );
  }

  const currentUrl = urls[index];

  const handlePrev = () => {
    setIndex((prev) => (prev === 0 ? urls.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setIndex((prev) => (prev === urls.length - 1 ? 0 : prev + 1));
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "ArrowRight") handleNext();
      if (e.key === "Escape") window.close();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [urls, index]);

  return (
    <div className="viewer-container">
      {/* Top Header */}
      <header className="viewer-header">
        <div className="viewer-info">
          Image {index + 1} of {urls.length}
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
        {urls.length > 1 && (
          <button onClick={handlePrev} className="viewer-nav-btn viewer-nav-btn--left" aria-label="Previous image">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>
        )}

        {(() => {
          const isPdf = currentUrl.toLowerCase().includes(".pdf");
          const isDoc = currentUrl.toLowerCase().includes(".doc") || currentUrl.toLowerCase().includes(".docx") || currentUrl.toLowerCase().includes(".xls") || currentUrl.toLowerCase().includes(".xlsx");

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
              <img src={currentUrl} alt={`Uploaded file ${index + 1}`} className="viewer-image" />
            </div>
          );
        })()}

        {urls.length > 1 && (
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
    <Suspense fallback={<div className="viewer-loading">Loading...</div>}>
      <ImageViewer />
    </Suspense>
  );
}
