"use client";

import React, { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

const PDFEditorContent = () => {
  const searchParams = useSearchParams();
  const filename = searchParams.get("file");
  const invoiceId = searchParams.get("id");

  const [pdfUrl, setPdfUrl] = useState("");
  const isDrawingRef = useRef(false);
  const [drawColor, setDrawColor] = useState("#ff0000");
  const [lineWidth, setLineWidth] = useState(3);
  const [tool, setTool] = useState<"pen" | "eraser">("pen");
  const [drawMode, setDrawMode] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">(
    "idle",
  );
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [annotationsLoaded, setAnnotationsLoaded] = useState(false);
  const [iframeScrollOffset, setIframeScrollOffset] = useState({
    x: 0,
    y: 0,
  });
  const iframeScrollSyncUnavailableRef = useRef(false);

  useEffect(() => {
    if (filename) {
      setPdfUrl(`/api/getuploadedfiles/${filename}`);
    }
  }, [filename]);

  const loadExistingAnnotations = async (filename: string) => {
    try {
      const response = await fetch(
        `/api/admin/getannotations?filename=${filename}`,
      );
      const data = await response.json();

      if (data.hasAnnotations && canvasRef.current) {
        const img = new Image();

        img.onload = () => {
          const context = canvasRef.current!.getContext("2d");

          if (context) {
            const rect = canvasRef.current!.getBoundingClientRect();
            context.drawImage(img, 0, 0, rect.width, rect.height);
          }

          setAnnotationsLoaded(true);
        };

        img.onerror = () => {
          setAnnotationsLoaded(true);
        };

        img.src = data.annotationData;
      } else {
        setAnnotationsLoaded(true);
      }
    } catch (error) {
      console.error("Error loading annotations:", error);
      setAnnotationsLoaded(true);
    }
  };

  useEffect(() => {
    if (ctx) {
      if (tool === "pen") {
        ctx.strokeStyle = drawColor;
        ctx.lineWidth = lineWidth;
        ctx.globalCompositeOperation = "source-over";
      } else {
        ctx.lineWidth = lineWidth * 3;
        ctx.globalCompositeOperation = "destination-out";
      }
    }
  }, [tool, drawColor, lineWidth, ctx]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (canvasRef.current) {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();

        if (rect.width > 0 && rect.height > 0) {
          const scale = window.devicePixelRatio || 2;
          canvas.width = rect.width * scale;
          canvas.height = rect.height * scale;

          const context = canvas.getContext("2d");

          if (context) {
            context.scale(scale, scale);
            setCtx(context);
            context.lineCap = "round";
            context.lineJoin = "round";
            context.lineWidth = lineWidth;
            context.strokeStyle = drawColor;

            if (filename) {
              loadExistingAnnotations(filename);
            }
          }
        }
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [pdfUrl]);

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
    let rafId: number | null = null;

    const syncIframeScroll = () => {
      if (iframeScrollSyncUnavailableRef.current || !iframeRef.current) {
        rafId = requestAnimationFrame(syncIframeScroll);
        return;
      }

      try {
        const iframeWindow = iframeRef.current.contentWindow;

        if (!iframeWindow) {
          rafId = requestAnimationFrame(syncIframeScroll);
          return;
        }

        const scrollEl =
          iframeWindow.document.scrollingElement ||
          iframeWindow.document.documentElement ||
          iframeWindow.document.body;

        const nextX = scrollEl ? scrollEl.scrollLeft : iframeWindow.scrollX;
        const nextY = scrollEl ? scrollEl.scrollTop : iframeWindow.scrollY;

        setIframeScrollOffset((prev) => {
          if (prev.x === nextX && prev.y === nextY) {
            return prev;
          }
          return { x: nextX, y: nextY };
        });
      } catch {
        iframeScrollSyncUnavailableRef.current = true;
      }

      rafId = requestAnimationFrame(syncIframeScroll);
    };

    iframeScrollSyncUnavailableRef.current = false;
    setIframeScrollOffset({ x: 0, y: 0 });
    rafId = requestAnimationFrame(syncIframeScroll);

    return () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [pdfUrl]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!ctx || !canvasRef.current || !drawMode) return;

    e.preventDefault();
    isDrawingRef.current = true;

    const rect = canvasRef.current.getBoundingClientRect();
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

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !ctx || !canvasRef.current || !drawMode)
      return;

    e.preventDefault();

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!ctx || !isDrawingRef.current) return;

    isDrawingRef.current = false;
    ctx.closePath();
    setHasChanges(true);
    triggerAutoSave();
  };

  const triggerAutoSave = () => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    autoSaveTimeoutRef.current = setTimeout(() => {
      savePDF(true);
    }, 5000);
  };

  const clearCanvas = () => {
    if (!ctx || !canvasRef.current) return;

    if (
      hasChanges &&
      confirm("Möchten Sie wirklich alle Anmerkungen löschen?")
    ) {
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      setHasChanges(false);
    } else if (!hasChanges) {
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  };

  const savePDF = async (isAutoSave = false) => {
    if (!canvasRef.current || !filename || !hasChanges) return;

    setSaving(true);
    setSaveStatus("saving");

    try {
      const blob = await new Promise<Blob>((resolve) => {
        canvasRef.current!.toBlob((blob) => {
          resolve(blob!);
        }, "image/png");
      });

      const formData = new FormData();
      formData.append("annotationImage", blob, "annotations.png");
      formData.append("originalFilename", filename);

      if (invoiceId) {
        formData.append("invoiceId", invoiceId);
      }

      const response = await fetch("/api/admin/saveannotatedpdf", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        setSaveStatus("saved");
        setHasChanges(false);

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

  return (
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
          gap: "15px",
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

        {!annotationsLoaded && (
          <div
            style={{
              padding: "6px 12px",
              backgroundColor: "#0066cc",
              color: "white",
              borderRadius: "4px",
              fontSize: "12px",
            }}
          >
            ⟳ Lade Anmerkungen...
          </div>
        )}

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
            drawMode ? "Klicken für Scrollmodus" : "Klicken für Zeichenmodus"
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
          <label style={{ color: !drawMode ? "#666" : "white" }}>Farbe:</label>
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
          <label style={{ color: !drawMode ? "#666" : "white" }}>Breite:</label>
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
          🗑️ Löschen
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
          ✖️ Schließen
        </button>
      </div>

      <div style={{ flex: 1, position: "relative" }}>
        <div
          ref={containerRef}
          style={{
            position: "absolute",
            inset: 0,
            overflow: "auto",
            backgroundColor: "#525252",
          }}
        >
          {pdfUrl && (
            <div
              style={{
                position: "relative",
                width: "100%",
                minHeight: "100%",
                display: "flex",
                justifyContent: "center",
                alignItems: "flex-start",
                padding: "20px",
              }}
            >
              <div
                style={{
                  position: "relative",
                  width: "100%",
                  maxWidth: "210mm",
                  minHeight: "297mm",
                }}
              >
                <iframe
                  ref={iframeRef}
                  src={pdfUrl}
                  style={{
                    width: "100%",
                    height: "297mm",
                    border: "none",
                    display: "block",
                    backgroundColor: "white",
                  }}
                />

                <canvas
                  ref={canvasRef}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "297mm",
                    zIndex: 2,
                    cursor: drawMode
                      ? tool === "pen"
                        ? "crosshair"
                        : "pointer"
                      : "default",
                    pointerEvents: drawMode ? "auto" : "none",
                    touchAction: "none",
                    border: drawMode
                      ? "2px solid rgba(0, 160, 0, 0.5)"
                      : "none",
                    transform: `translate(${-iframeScrollOffset.x}px, ${-iframeScrollOffset.y}px)`,
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
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
