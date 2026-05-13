"use client";

import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { isSafePdfFilename } from "@/utils/uploadedFilename";

type PDFDocumentProxyLike = {
  numPages: number;
  getPage: (pageNumber: number) => Promise<any>;
  destroy: () => Promise<void>;
};

type PDFLoadingTaskLike = {
  promise: Promise<PDFDocumentProxyLike>;
  destroy: () => void;
};

const PDFEditorContent = () => {
  const searchParams = useSearchParams();
  const rawFile = searchParams.get("file");
  const invoiceId = searchParams.get("id");

  const [filename, setFilename] = useState<string | null>(
    isSafePdfFilename(rawFile) ? rawFile : null,
  );
  const [pdfUrl, setPdfUrl] = useState("");
  const [mergedPdfUrl, setMergedPdfUrl] = useState("");
  const [drawColor, setDrawColor] = useState("#ff0000");
  const [lineWidth, setLineWidth] = useState(3);
  const [tool, setTool] = useState<"pen" | "eraser">("pen");
  const [drawMode, setDrawMode] = useState(false);
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxyLike | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(1.2);
  const [isRendering, setIsRendering] = useState(false);
  const [pdfLoadError, setPdfLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">(
    "idle",
  );
  const [hasChanges, setHasChanges] = useState(false);
  const [clearRequested, setClearRequested] = useState(false);
  const [annotationsLoaded, setAnnotationsLoaded] = useState(false);
  const [commentModalOpen, setCommentModalOpen] = useState(false);
  const [commentDraft, setCommentDraft] = useState("");
  const [isSavingComment, setIsSavingComment] = useState(false);
  const [commentSaved, setCommentSaved] = useState(false);

  const pageCanvasRefs = useRef<Record<number, HTMLCanvasElement | null>>({});
  const annotationCanvasRefs = useRef<Record<number, HTMLCanvasElement | null>>(
    {},
  );
  const thumbCanvasRefs = useRef<Record<number, HTMLCanvasElement | null>>({});
  const pageWrapperRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const mainScrollRef = useRef<HTMLDivElement>(null);

  const isDrawingRef = useRef(false);
  const activeDrawPageRef = useRef<number | null>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const dirtyPagesRef = useRef<Set<number>>(new Set());
  const stopDrawingRefCb = useRef<() => void>(() => {});
  const scrollRafRef = useRef<number | null>(null);
  const currentPdfDocRef = useRef<PDFDocumentProxyLike | null>(null);
  const pdfJsRef = useRef<null | {
    getDocument: (src: string) => PDFLoadingTaskLike;
  }>(null);
  const pdfLibRef = useRef<null | typeof import("pdf-lib")>(null);

  const pageNumbers = useMemo(
    () => Array.from({ length: numPages }, (_, i) => i + 1),
    [numPages],
  );

  const ensurePdfJs = async () => {
    if (pdfJsRef.current) return pdfJsRef.current;

    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
    pdfJsRef.current = {
      getDocument: (src: string) =>
        pdfjs.getDocument(src) as PDFLoadingTaskLike,
    };

    return pdfJsRef.current;
  };

  const ensurePdfLib = async () => {
    if (pdfLibRef.current) return pdfLibRef.current;

    pdfLibRef.current = await import("pdf-lib");
    return pdfLibRef.current;
  };

  // If filename is missing, resolve it from the DB using the invoice ID.
  useEffect(() => {
    if (filename || !invoiceId) return;
    fetch(`/api/admin/invoice?invoiceId=${encodeURIComponent(invoiceId)}`)
      .then((r) => r.json())
      .then((data) => {
        if (isSafePdfFilename(data.fileName)) setFilename(data.fileName);
      })
      .catch(() => {});
  }, [filename, invoiceId]);

  useEffect(() => {
    if (isSafePdfFilename(filename)) {
      const safeName = encodeURIComponent(filename as string);
      setPdfUrl(`/api/getuploadedfiles/${safeName}`);
      setMergedPdfUrl(`/api/getuploadedfiles/${safeName}`);
      setPdfLoadError(null);
      return;
    }

    setPdfUrl("");
    setMergedPdfUrl("");
    setPdfDoc(null);
    setNumPages(0);
    setPdfLoadError(filename ? "Ungultiger PDF-Dateiname." : null);
  }, [filename]);

  useEffect(() => {
    return () => {
      if (currentPdfDocRef.current) {
        currentPdfDocRef.current.destroy().catch(() => {});
        currentPdfDocRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let loadingTask: PDFLoadingTaskLike | null = null;

    const loadPdf = async () => {
      if (!pdfUrl) return;

      try {
        setIsRendering(true);
        setAnnotationsLoaded(false);
        setPdfLoadError(null);

        const headResponse = await fetch(pdfUrl, {
          method: "HEAD",
          cache: "no-store",
        });

        if (!headResponse.ok) {
          if (currentPdfDocRef.current) {
            currentPdfDocRef.current.destroy().catch(() => {});
            currentPdfDocRef.current = null;
          }

          setPdfDoc(null);
          setNumPages(0);
          setCurrentPage(1);
          setAnnotationsLoaded(true);
          setPdfLoadError(
            headResponse.status === 404
              ? "Die PDF-Datei wurde im Upload-Ordner nicht gefunden."
              : "Die PDF-Datei konnte nicht geladen werden.",
          );
          return;
        }

        const pdfjs = await ensurePdfJs();
        if (cancelled) return;

        loadingTask = pdfjs.getDocument(pdfUrl);
        const loaded = await loadingTask.promise;

        if (cancelled) {
          loaded.destroy();
          return;
        }

        if (currentPdfDocRef.current) {
          currentPdfDocRef.current.destroy().catch(() => {});
        }

        currentPdfDocRef.current = loaded;
        setPdfDoc(loaded);
        setNumPages(loaded.numPages);
        setCurrentPage(1);
      } catch (error) {
        setPdfDoc(null);
        setNumPages(0);
        setCurrentPage(1);
        setAnnotationsLoaded(true);
        setPdfLoadError("Die PDF-Datei konnte nicht geladen werden.");
      } finally {
        if (!cancelled) setIsRendering(false);
      }
    };

    loadPdf();

    return () => {
      cancelled = true;
      if (loadingTask) loadingTask.destroy();
    };
  }, [pdfUrl]);

  useEffect(() => {
    let cancelled = false;

    const renderPdfAndAnnotations = async () => {
      if (!pdfDoc || numPages === 0) return;

      setIsRendering(true);
      dirtyPagesRef.current.clear();

      // Kick off the annotation fetch immediately — in parallel with page rendering
      // so the data is ready (or nearly ready) by the time pages finish rendering.
      const annotationFetchPromise = filename
        ? fetch(
            `/api/admin/getannotations?filename=${encodeURIComponent(filename)}&pages=${numPages}&t=${Date.now()}`,
            { cache: "no-store" },
          )
            .then((r) => r.json())
            .catch(() => null)
        : Promise.resolve(null);

      for (let pageNum = 1; pageNum <= numPages; pageNum += 1) {
        if (cancelled) return;

        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale: zoom });
        const ratio = window.devicePixelRatio || 1;

        const pageCanvas = pageCanvasRefs.current[pageNum];

        if (pageCanvas) {
          pageCanvas.width = Math.floor(viewport.width * ratio);
          pageCanvas.height = Math.floor(viewport.height * ratio);
          pageCanvas.style.width = `${viewport.width}px`;
          pageCanvas.style.height = `${viewport.height}px`;

          const pctx = pageCanvas.getContext("2d");

          if (pctx) {
            pctx.setTransform(ratio, 0, 0, ratio, 0, 0);

            await page.render({
              canvasContext: pctx,
              canvas: pageCanvas,
              viewport,
            }).promise;
          }
        }

        const annotationCanvas = annotationCanvasRefs.current[pageNum];

        if (annotationCanvas) {
          annotationCanvas.width = Math.floor(viewport.width * ratio);
          annotationCanvas.height = Math.floor(viewport.height * ratio);
          annotationCanvas.style.width = `${viewport.width}px`;
          annotationCanvas.style.height = `${viewport.height}px`;

          const actx = annotationCanvas.getContext("2d");

          if (actx) {
            actx.setTransform(ratio, 0, 0, ratio, 0, 0);
            actx.lineCap = "round";
            actx.lineJoin = "round";
          }
        }

        const thumbCanvas = thumbCanvasRefs.current[pageNum];

        if (thumbCanvas) {
          const thumbViewport = page.getViewport({ scale: 0.2 });

          thumbCanvas.width = Math.floor(thumbViewport.width * ratio);
          thumbCanvas.height = Math.floor(thumbViewport.height * ratio);
          thumbCanvas.style.width = `${thumbViewport.width}px`;
          thumbCanvas.style.height = `${thumbViewport.height}px`;

          const tctx = thumbCanvas.getContext("2d");

          if (tctx) {
            tctx.setTransform(ratio, 0, 0, ratio, 0, 0);

            await page.render({
              canvasContext: tctx,
              canvas: thumbCanvas,
              viewport: thumbViewport,
            }).promise;
          }
        }
      }

      if (!filename || cancelled) {
        setAnnotationsLoaded(true);
        setIsRendering(false);
        return;
      }

      try {
        // Await the fetch that started before page rendering — usually already done.
        const data = await annotationFetchPromise;

        if (data?.pages) {
          for (const [pageKey, dataUrl] of Object.entries(data.pages)) {
            const pageNum = Number(pageKey);
            const annotationCanvas = annotationCanvasRefs.current[pageNum];

            if (!annotationCanvas || typeof dataUrl !== "string") continue;

            const image = new Image();

            await new Promise<void>((resolve) => {
              image.onload = () => {
                const actx = annotationCanvas.getContext("2d");

                if (actx) {
                  // Use physical canvas dimensions with identity transform instead of
                  // getBoundingClientRect() which can return 0 if layout hasn't run yet,
                  // causing annotations to be drawn as nothing (invisible on reopen).
                  actx.save();
                  actx.setTransform(1, 0, 0, 1, 0, 0);
                  actx.drawImage(image, 0, 0);
                  actx.restore();
                }

                dirtyPagesRef.current.add(pageNum);
                resolve();
              };

              image.onerror = () => resolve();
              image.src = dataUrl;
            });
          }
        }
      } catch (error) {
        console.error("Error loading annotations:", error);
      } finally {
        if (!cancelled) {
          setAnnotationsLoaded(true);
          setHasChanges(false);
          setClearRequested(false);
          setIsRendering(false);
        }
      }
    };

    renderPdfAndAnnotations();

    return () => {
      cancelled = true;
    };
  }, [pdfDoc, numPages, zoom, filename]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasChanges && !saving) {
        savePDF(true);
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }

      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [hasChanges, saving]);

  useEffect(() => {
    const handleWindowMouseUp = () => stopDrawingRefCb.current();

    window.addEventListener("mouseup", handleWindowMouseUp);

    return () => window.removeEventListener("mouseup", handleWindowMouseUp);
  }, []);

  useEffect(() => {
    const scroller = mainScrollRef.current;

    if (!scroller) return;

    const onScroll = () => {
      if (scrollRafRef.current !== null) return;

      scrollRafRef.current = requestAnimationFrame(() => {
        scrollRafRef.current = null;

        const scrollerRect = scroller.getBoundingClientRect();
        let nearestPage = 1;
        let nearestDistance = Number.POSITIVE_INFINITY;

        for (let i = 1; i <= numPages; i += 1) {
          const pageEl = pageWrapperRefs.current[i];

          if (!pageEl) continue;

          const pageRect = pageEl.getBoundingClientRect();
          const dist = Math.abs(pageRect.top - scrollerRect.top);

          if (dist < nearestDistance) {
            nearestDistance = dist;
            nearestPage = i;
          }
        }

        setCurrentPage(nearestPage);
      });
    };

    scroller.addEventListener("scroll", onScroll);

    return () => {
      scroller.removeEventListener("scroll", onScroll);

      if (scrollRafRef.current !== null) {
        cancelAnimationFrame(scrollRafRef.current);
        scrollRafRef.current = null;
      }
    };
  }, [numPages]);

  const triggerAutoSave = () => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    autoSaveTimeoutRef.current = setTimeout(() => {
      savePDF(true);
    }, 5000);
  };

  const startDrawing = (
    pageNum: number,
    e: React.MouseEvent<HTMLCanvasElement>,
  ) => {
    if (!drawMode) return;

    const canvas = annotationCanvasRefs.current[pageNum];
    const ctx = canvas?.getContext("2d");

    if (!canvas || !ctx) return;

    e.preventDefault();

    isDrawingRef.current = true;
    activeDrawPageRef.current = pageNum;
    dirtyPagesRef.current.add(pageNum);

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (tool === "pen") {
      ctx.strokeStyle = drawColor;
      ctx.lineWidth = lineWidth;
      ctx.globalCompositeOperation = "source-over";
    } else {
      ctx.lineWidth = lineWidth * 3;
      ctx.globalCompositeOperation = "destination-out";
    }

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (pageNum: number, e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawMode || !isDrawingRef.current) return;
    if (activeDrawPageRef.current !== pageNum) return;

    const canvas = annotationCanvasRefs.current[pageNum];
    const ctx = canvas?.getContext("2d");

    if (!canvas || !ctx) return;

    e.preventDefault();

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    const pageNum = activeDrawPageRef.current;

    if (!isDrawingRef.current || !pageNum) return;

    const canvas = annotationCanvasRefs.current[pageNum];
    const ctx = canvas?.getContext("2d");

    if (!ctx) return;

    isDrawingRef.current = false;
    activeDrawPageRef.current = null;

    ctx.closePath();

    setHasChanges(true);
    triggerAutoSave();
  };

  stopDrawingRefCb.current = stopDrawing;

  const clearCanvas = () => {
    if (
      hasChanges &&
      !confirm("Möchten Sie wirklich alle Anmerkungen löschen?")
    ) {
      return;
    }

    for (const pageNum of pageNumbers) {
      const canvas = annotationCanvasRefs.current[pageNum];
      const ctx = canvas?.getContext("2d");

      if (!canvas || !ctx) continue;

      const rect = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);
    }

    dirtyPagesRef.current.clear();

    setHasChanges(true);
    setClearRequested(true);
    triggerAutoSave();
  };

  const savePDF = async (isAutoSave = false) => {
    if (!filename || !hasChanges) return;

    setSaving(true);
    setSaveStatus("saving");

    try {
      const formData = new FormData();
      formData.append("originalFilename", filename);

      if (invoiceId) {
        formData.append("invoiceId", invoiceId);
      }

      if (clearRequested) {
        formData.append("clearAll", "1");
      }

      let attachedPages = 0;

      for (let pageNum = 1; pageNum <= numPages; pageNum += 1) {
        const canvas = annotationCanvasRefs.current[pageNum];

        if (!canvas || !dirtyPagesRef.current.has(pageNum)) continue;

        const blob = await new Promise<Blob | null>((resolve) => {
          canvas.toBlob((b) => resolve(b), "image/png");
        });

        if (!blob) continue;

        formData.append(
          `annotationPage_${pageNum}`,
          blob,
          `annotation_p${pageNum}.png`,
        );

        attachedPages += 1;
      }

      if (attachedPages === 0 && !clearRequested) {
        setSaveStatus("idle");
        setSaving(false);
        return;
      }

      const response = await fetch("/api/admin/saveannotatedpdf", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        setSaveStatus("saved");
        setHasChanges(false);
        setClearRequested(false);

        if (!isAutoSave) {
          alert("PDF mit Anmerkungen erfolgreich gespeichert!");
        }

        setTimeout(() => {
          setSaveStatus("idle");
        }, 3000);
      } else {
        setSaveStatus("idle");
        alert(result.message || "Fehler beim Speichern des PDFs");
      }
    } catch (error) {
      console.error("Error saving PDF:", error);
      setSaveStatus("idle");

      if (!isAutoSave) {
        alert("Fehler beim Speichern des PDFs");
      }
    } finally {
      setSaving(false);
    }
  };

  const scrollToPage = (pageNum: number) => {
    const scroller = mainScrollRef.current;
    const pageEl = pageWrapperRefs.current[pageNum];

    if (!scroller || !pageEl) return;

    pageEl.scrollIntoView({ behavior: "smooth", block: "start" });
    setCurrentPage(pageNum);
  };

  const isValidPdfUrl = (url: string | null) => {
    if (!url) return false;
    if (url === "let") return false;
    if (url.includes("..")) return false;
    if (url.includes("\\")) return false;
    if (!url.includes(".pdf")) return false;
    if (!url.startsWith("/api/getuploadedfiles/")) return false;

    return true;
  };

  const canvasHasInk = (canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return false;
    const { width, height } = canvas;
    if (width === 0 || height === 0) return false;

    const pixels = ctx.getImageData(0, 0, width, height).data;
    for (let i = 3; i < pixels.length; i += 4) {
      if (pixels[i] !== 0) return true;
    }

    return false;
  };

  const downloadMergedPDF = async () => {
    if (!isValidPdfUrl(mergedPdfUrl) || !filename) {
      console.error("Invalid mergedPdfUrl for download:", mergedPdfUrl);
      alert("PDF URL is invalid.");
      return;
    }

    try {
      const pdfRes = await fetch(`${mergedPdfUrl}?t=${Date.now()}`, {
        cache: "no-store",
      });
      if (!pdfRes.ok) throw new Error("PDF fetch failed");

      const originalPdfBytes = await pdfRes.arrayBuffer();
      const { PDFDocument } = await ensurePdfLib();
      const mergedPdf = await PDFDocument.load(originalPdfBytes);
      const mergedPdfPages = mergedPdf.getPages();
      const pageCount = Math.min(numPages, mergedPdfPages.length);

      for (let pageNum = 1; pageNum <= pageCount; pageNum += 1) {
        const annotationCanvas = annotationCanvasRefs.current[pageNum];
        if (!annotationCanvas || !canvasHasInk(annotationCanvas)) continue;

        const annotationBlob = await new Promise<Blob | null>((resolve) =>
          annotationCanvas.toBlob((blob) => resolve(blob), "image/png"),
        );
        if (!annotationBlob) continue;

        const annotationPngBytes = await annotationBlob.arrayBuffer();
        const annotationImage = await mergedPdf.embedPng(annotationPngBytes);
        const page = mergedPdfPages[pageNum - 1];
        const { width, height } = page.getSize();

        page.drawImage(annotationImage, {
          x: 0,
          y: 0,
          width,
          height,
        });
      }

      const mergedPdfBytes = await mergedPdf.save();
      // Convert to a plain ArrayBuffer to satisfy strict BlobPart typings.
      const mergedPdfArrayBuffer = new ArrayBuffer(mergedPdfBytes.byteLength);
      new Uint8Array(mergedPdfArrayBuffer).set(mergedPdfBytes);
      const url = URL.createObjectURL(
        new Blob([mergedPdfArrayBuffer], { type: "application/pdf" }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (err) {
      console.error("Download with annotations failed:", err);
      // Fallback: download the plain PDF.
      const a = document.createElement("a");
      a.href = `${mergedPdfUrl}?t=${Date.now()}`;
      a.download = filename;
      a.click();
    }
  };

  const printMergedPDF = () => {
    if (!isValidPdfUrl(mergedPdfUrl)) {
      console.error("Invalid mergedPdfUrl for print:", mergedPdfUrl);
      alert("PDF URL is invalid.");
      return;
    }

    window.open(`${mergedPdfUrl}?t=${Date.now()}`, "_blank");
  };

  const openCommentModal = async () => {
    if (!invoiceId) return;
    try {
      const r = await fetch(
        `/api/admin/invoice?invoiceId=${encodeURIComponent(invoiceId)}`,
      );
      const data = await r.json();
      setCommentDraft(data.comment || "");
    } catch {
      setCommentDraft("");
    }
    setCommentModalOpen(true);
  };

  const saveComment = async () => {
    if (!invoiceId) return;
    setIsSavingComment(true);
    try {
      const response = await fetch("/api/admin/invoice", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ invoiceId, comment: commentDraft }),
      });
      if (response.ok) {
        setCommentModalOpen(false);
        setCommentSaved(true);
        setTimeout(() => setCommentSaved(false), 3000);
      } else {
        const json = await response.json();
        alert(json.message);
      }
    } catch {
      alert("Network Connectivity Issues.");
    } finally {
      setIsSavingComment(false);
    }
  };

  return (
    <>
      <div
        style={{
          width: "100vw",
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#2b2b2b",
        }}
      >
        <div
          style={{
            padding: "10px 20px",
            backgroundColor: "#1e1e1e",
            display: "flex",
            gap: "12px",
            alignItems: "center",
            borderBottom: "1px solid #444",
            flexWrap: "wrap",
          }}
        >
          <h3 style={{ color: "white", margin: 0 }}>PDF Editor</h3>

          <div
            style={{
              padding: "6px 12px",
              backgroundColor:
                saveStatus === "saved"
                  ? "#00aa00"
                  : saveStatus === "saving"
                    ? "#0066cc"
                    : "#555",
              color: "white",
              borderRadius: "4px",
              fontSize: "12px",
              display: "flex",
              alignItems: "center",
              gap: "5px",
            }}
          >
            {saveStatus === "saved" && "✓ Gespeichert"}
            {saveStatus === "saving" && "⟳ Speichern..."}
            {saveStatus === "idle" &&
              (hasChanges ? "● Nicht gespeichert" : "○ Keine Änderungen")}
          </div>

          {(!annotationsLoaded || isRendering) && (
            <div
              style={{
                padding: "6px 12px",
                backgroundColor: "#0066cc",
                color: "white",
                borderRadius: "4px",
                fontSize: "12px",
              }}
            >
              ⟳ Lade PDF...
            </div>
          )}

          {pdfLoadError && (
            <div
              style={{
                padding: "6px 12px",
                backgroundColor: "#b71d18",
                color: "white",
                borderRadius: "4px",
                fontSize: "12px",
              }}
            >
              {pdfLoadError}
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              onClick={() => scrollToPage(Math.max(1, currentPage - 1))}
              style={{
                padding: "6px 10px",
                backgroundColor: "#444",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              ◀
            </button>

            <span
              style={{ color: "white", minWidth: "64px", textAlign: "center" }}
            >
              {currentPage} / {numPages || 1}
            </span>

            <button
              onClick={() =>
                scrollToPage(Math.min(numPages || 1, currentPage + 1))
              }
              style={{
                padding: "6px 10px",
                backgroundColor: "#444",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              ▶
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              onClick={() =>
                setZoom((z) => Math.max(0.7, Number((z - 0.1).toFixed(2))))
              }
              disabled={isRendering}
              style={{
                padding: "6px 10px",
                backgroundColor: "#444",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: isRendering ? "not-allowed" : "pointer",
              }}
            >
              -
            </button>

            <span
              style={{ color: "white", minWidth: "54px", textAlign: "center" }}
            >
              {Math.round(zoom * 100)}%
            </span>

            <button
              onClick={() =>
                setZoom((z) => Math.min(2.2, Number((z + 0.1).toFixed(2))))
              }
              disabled={isRendering}
              style={{
                padding: "6px 10px",
                backgroundColor: "#444",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: isRendering ? "not-allowed" : "pointer",
              }}
            >
              +
            </button>
          </div>

          <div style={{ marginLeft: "auto" }} />

          <button
            onClick={() => setDrawMode(!drawMode)}
            style={{
              padding: "8px 16px",
              backgroundColor: drawMode ? "#00aa00" : "#666",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontWeight: "bold",
              fontSize: "14px",
            }}
            title={
              drawMode ? "Klicken fur Scrollmodus" : "Klicken fur Zeichenmodus"
            }
          >
            {drawMode ? "✏️ Zeichenmodus" : "👆 Scrollmodus"}
          </button>

          <button
            onClick={() => setTool("pen")}
            disabled={!drawMode}
            style={{
              padding: "8px 16px",
              backgroundColor: !drawMode
                ? "#333"
                : tool === "pen"
                  ? "#0066cc"
                  : "#444",
              color: !drawMode ? "#666" : "white",
              border: "none",
              borderRadius: "4px",
              cursor: !drawMode ? "not-allowed" : "pointer",
            }}
          >
            ✏️ Stift
          </button>

          <button
            onClick={() => setTool("eraser")}
            disabled={!drawMode}
            style={{
              padding: "8px 16px",
              backgroundColor: !drawMode
                ? "#333"
                : tool === "eraser"
                  ? "#0066cc"
                  : "#444",
              color: !drawMode ? "#666" : "white",
              border: "none",
              borderRadius: "4px",
              cursor: !drawMode ? "not-allowed" : "pointer",
            }}
          >
            🧹 Radierer
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <label style={{ color: !drawMode ? "#666" : "white" }}>
              Farbe:
            </label>

            <input
              type="color"
              value={drawColor}
              onChange={(e) => setDrawColor(e.target.value)}
              disabled={!drawMode}
              style={{
                width: "40px",
                height: "30px",
                cursor: !drawMode ? "not-allowed" : "pointer",
                opacity: !drawMode ? 0.5 : 1,
              }}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <label style={{ color: !drawMode ? "#666" : "white" }}>
              Breite:
            </label>

            <input
              type="range"
              min="1"
              max="10"
              value={lineWidth}
              onChange={(e) => setLineWidth(Number(e.target.value))}
              disabled={!drawMode}
              style={{
                width: "100px",
                cursor: !drawMode ? "not-allowed" : "pointer",
                opacity: !drawMode ? 0.5 : 1,
              }}
            />

            <span
              style={{ color: !drawMode ? "#666" : "white", minWidth: "30px" }}
            >
              {lineWidth}px
            </span>
          </div>

          <button
            onClick={clearCanvas}
            disabled={!drawMode}
            style={{
              padding: "8px 16px",
              backgroundColor: !drawMode ? "#333" : "#cc6600",
              color: !drawMode ? "#666" : "white",
              border: "none",
              borderRadius: "4px",
              cursor: !drawMode ? "not-allowed" : "pointer",
            }}
          >
            🗑️ Loschen
          </button>

          <button
            onClick={() => savePDF(false)}
            disabled={saving || !hasChanges}
            style={{
              padding: "8px 20px",
              backgroundColor: saving || !hasChanges ? "#555" : "#00aa00",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: saving || !hasChanges ? "not-allowed" : "pointer",
              fontWeight: "bold",
            }}
            title="Sofort speichern (Auto-Speicherung ist aktiviert)"
          >
            {saving ? "💾 Speichern..." : "💾 Jetzt Speichern"}
          </button>

          <button
            onClick={downloadMergedPDF}
            style={{
              padding: "8px 16px",
              backgroundColor: "#2f6cbe",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            ⬇️ Download
          </button>

          <button
            onClick={printMergedPDF}
            style={{
              padding: "8px 16px",
              backgroundColor: "#3b3b3b",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            🖨️ Print
          </button>

          {invoiceId && (
            <button
              onClick={openCommentModal}
              style={{
                padding: "8px 16px",
                backgroundColor: "#6b4c9a",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              💬 Kommentar
            </button>
          )}

          <button
            onClick={() => window.close()}
            style={{
              padding: "8px 16px",
              backgroundColor: "#cc0000",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            ✖️ SchlieBen
          </button>
        </div>

        <div style={{ flex: 1, position: "relative", display: "flex" }}>
          <div
            style={{
              width: "190px",
              backgroundColor: "#2b2d33",
              borderRight: "1px solid #444",
              overflowY: "auto",
              padding: "12px 10px",
            }}
          >
            {pageNumbers.map((pageNum) => (
              <button
                key={`thumb-${pageNum}`}
                onClick={() => scrollToPage(pageNum)}
                style={{
                  width: "100%",
                  border:
                    currentPage === pageNum
                      ? "2px solid #3b82f6"
                      : "1px solid #555",
                  backgroundColor: "#1f232b",
                  borderRadius: "6px",
                  padding: "8px",
                  marginBottom: "12px",
                  cursor: "pointer",
                }}
              >
                <canvas
                  ref={(el) => {
                    thumbCanvasRefs.current[pageNum] = el;
                  }}
                  style={{
                    display: "block",
                    margin: "0 auto",
                    background: "white",
                  }}
                />

                <div
                  style={{ color: "white", fontSize: "12px", marginTop: "6px" }}
                >
                  {pageNum}
                </div>
              </button>
            ))}
          </div>

          <div
            ref={mainScrollRef}
            style={{
              flex: 1,
              overflow: "auto",
              backgroundColor: "#525252",
              padding: "20px",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              {pageNumbers.map((pageNum) => (
                <div
                  key={`page-${pageNum}`}
                  ref={(el) => {
                    pageWrapperRefs.current[pageNum] = el;
                  }}
                  style={{
                    position: "relative",
                    marginBottom: "16px",
                    backgroundColor: "white",
                  }}
                >
                  <canvas
                    ref={(el) => {
                      pageCanvasRefs.current[pageNum] = el;
                    }}
                    style={{ display: "block" }}
                  />

                  <canvas
                    ref={(el) => {
                      annotationCanvasRefs.current[pageNum] = el;
                    }}
                    onMouseDown={(e) => startDrawing(pageNum, e)}
                    onMouseMove={(e) => draw(pageNum, e)}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    style={{
                      position: "absolute",
                      inset: 0,
                      cursor: drawMode
                        ? tool === "pen"
                          ? "crosshair"
                          : "pointer"
                        : "default",
                      pointerEvents: drawMode ? "auto" : "none",
                      touchAction: "none",
                      border:
                        drawMode && currentPage === pageNum
                          ? "2px solid rgba(0, 160, 0, 0.5)"
                          : "none",
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {commentSaved && (
        <div
          style={{
            position: "fixed",
            bottom: "32px",
            left: "50%",
            transform: "translateX(-50%)",
            backgroundColor: "#22c55e",
            color: "#fff",
            padding: "12px 24px",
            borderRadius: "8px",
            fontSize: "14px",
            fontWeight: 600,
            boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
            zIndex: 3000,
            pointerEvents: "none",
          }}
        >
          ✓ Kommentar gespeichert
        </div>
      )}

      {commentModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2000,
          }}
          onClick={() => setCommentModalOpen(false)}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "12px",
              padding: "24px",
              width: "100%",
              maxWidth: "480px",
              boxShadow: "0 8px 32px rgba(0,0,0,0.28)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              style={{ marginBottom: "4px", fontSize: "16px", fontWeight: 600 }}
            >
              Kommentar
            </h3>
            <p
              style={{ fontSize: "13px", color: "#888", marginBottom: "16px" }}
            >
              {invoiceId}
            </p>
            <textarea
              style={{
                width: "100%",
                minHeight: "120px",
                border: "1px solid #e0e0e0",
                borderRadius: "8px",
                padding: "10px 12px",
                fontSize: "14px",
                resize: "vertical",
                outline: "none",
                boxSizing: "border-box",
              }}
              placeholder="Kommentar hinzufügen (optional)…"
              value={commentDraft}
              maxLength={2000}
              onChange={(e) => setCommentDraft(e.target.value)}
            />
            <p
              style={{
                fontSize: "12px",
                color: "#aaa",
                textAlign: "right",
                marginBottom: "16px",
              }}
            >
              {commentDraft.length}/2000
            </p>
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px",
              }}
            >
              <button
                style={{
                  padding: "8px 18px",
                  borderRadius: "8px",
                  border: "1px solid #e0e0e0",
                  background: "#fff",
                  cursor: "pointer",
                  fontSize: "14px",
                }}
                onClick={() => setCommentModalOpen(false)}
              >
                Abbrechen
              </button>
              <button
                style={{
                  padding: "8px 18px",
                  borderRadius: "8px",
                  border: "none",
                  background: "#1a1a1a",
                  color: "#fff",
                  cursor: isSavingComment ? "not-allowed" : "pointer",
                  fontSize: "14px",
                  opacity: isSavingComment ? 0.6 : 1,
                }}
                onClick={saveComment}
                disabled={isSavingComment}
              >
                {isSavingComment ? "Speichern…" : "Speichern"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const PDFEditorPage = () => {
  return (
    <Suspense fallback={<div>Loading PDF Editor...</div>}>
      <PDFEditorContent />
    </Suspense>
  );
};

export default PDFEditorPage;
