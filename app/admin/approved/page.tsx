"use client";
import { AdminOwnerPageNavColumn } from "@/components";
import { getPdfEditorHref } from "@/utils/uploadedFilename";
import Link from "next/link";
import React, { useEffect, useState } from "react";

const APPROVED_PAGE_SIZE = 20;

const page = () => {
  const [approvedInvoices, setApprovedInvoices] = useState<Array<any>>([]);
  const [approvedInvoicesCount, setApprovedInvoicesCount] =
    useState<string>("");
  const [pendingInvoicesCount, setPendingInvoicesCount] = useState<string>("");
  const [invoicesPageState, setInvoicesPageState] = useState<number>(1);
  const [isLoadingMoreInvoices, setIsLoadingMoreInvoices] =
    useState<boolean>(false);
  const [hasMoreApprovedInvoices, setHasMoreApprovedInvoices] =
    useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeFilter, setActiveFilter] = useState("all");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });
  const [commentModalInvoice, setCommentModalInvoice] = useState<any | null>(
    null,
  );
  const [commentDraft, setCommentDraft] = useState("");
  const [isSavingComment, setIsSavingComment] = useState(false);

  const loadApprovedInvoices = async () => {
    try {
      const response = await fetch(
        `/api/admin/invoice?invoiceStatus=approved&page=1&limit=${APPROVED_PAGE_SIZE}`,
        { cache: "no-store" },
      );
      const json_res = await response.json();
      if (response.ok) {
        setApprovedInvoices(json_res.foundInvoices);
        setInvoicesPageState(1);
        setHasMoreApprovedInvoices(
          json_res.foundInvoices.length === APPROVED_PAGE_SIZE,
        );
      } else {
        alert(json_res.message);
      }
    } catch (err) {
      console.log(err);
      alert("Network Connectivity Issues.");
    }
  };

  const loadExtraApprovedInvoices = async (page: number) => {
    try {
      setIsLoadingMoreInvoices(true);
      const response = await fetch(
        `/api/admin/invoice?invoiceStatus=approved&page=${page}&limit=${APPROVED_PAGE_SIZE}`,
        { cache: "no-store" },
      );
      const json_res = await response.json();
      if (response.ok) {
        const nextInvoices = Array.isArray(json_res.foundInvoices)
          ? json_res.foundInvoices
          : [];
        setApprovedInvoices((prev) => {
          const seenIds = new Set(prev.map((inv) => inv._id));
          return [
            ...prev,
            ...nextInvoices.filter((inv: any) => !seenIds.has(inv._id)),
          ];
        });
        setInvoicesPageState(page);
        setHasMoreApprovedInvoices(nextInvoices.length === APPROVED_PAGE_SIZE);
      } else {
        alert(json_res.message);
      }
    } catch (err) {
      console.log(err);
      alert("Network Connectivity Issues.");
    } finally {
      setIsLoadingMoreInvoices(false);
    }
  };

  const loadDashboardInvoicesCounts = async () => {
    try {
      const response = await fetch("/api/admin/invoicecounter");
      const json_res = await response.json();
      if (response.ok) {
        setApprovedInvoicesCount(json_res.approvedInvoicesCount);
        setPendingInvoicesCount(json_res.pendingInvoicesCount);
      } else {
        alert(json_res.message);
      }
    } catch (err) {
      console.log(err);
      alert("Network Connectivity Issues.");
    }
  };

  const payInvoice = async (invoiceId: string) => {
    try {
      const response = await fetch("/api/admin/invoice", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ invoiceId, newStatus: "paid" }),
      });
      if (response.ok) {
        setApprovedInvoices((prev) =>
          prev.filter((inv) => inv._id !== invoiceId),
        );
        setOpenMenuId(null);
      } else {
        const json = await response.json();
        alert(json.message);
      }
    } catch (err) {
      console.log(err);
      alert("Network Connectivity Issues.");
    }
  };

  const setPending = async (invoiceId: string) => {
    try {
      const response = await fetch("/api/admin/invoice", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ invoiceId, newStatus: "pending" }),
      });
      if (response.ok) {
        setApprovedInvoices((prev) =>
          prev.filter((inv) => inv._id !== invoiceId),
        );
        setOpenMenuId(null);
      } else {
        const json = await response.json();
        alert(json.message);
      }
    } catch (err) {
      console.log(err);
      alert("Network Connectivity Issues.");
    }
  };

  const deleteInvoice = async (invoiceId: string) => {
    try {
      const response = await fetch("/api/admin/invoice", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ invoiceId }),
      });
      if (response.ok) {
        setApprovedInvoices((prev) =>
          prev.filter((inv) => inv._id !== invoiceId),
        );
        setOpenMenuId(null);
      } else {
        const json = await response.json();
        alert(json.message);
      }
    } catch (err) {
      console.log(err);
      alert("Network Connectivity Issues.");
    }
  };

  const openCommentModal = (inv: any) => {
    setCommentModalInvoice(inv);
    setCommentDraft(inv.comment || "");
    setOpenMenuId(null);
  };

  const saveComment = async () => {
    if (!commentModalInvoice) return;
    setIsSavingComment(true);
    try {
      const response = await fetch("/api/admin/invoice", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          invoiceId: commentModalInvoice._id,
          comment: commentDraft,
        }),
      });
      if (response.ok) {
        setApprovedInvoices((prev) =>
          prev.map((inv) =>
            inv._id === commentModalInvoice._id
              ? { ...inv, comment: commentDraft.trim() }
              : inv,
          ),
        );
        setCommentModalInvoice(null);
      } else {
        const json = await response.json();
        alert(json.message);
      }
    } catch (err) {
      console.log(err);
      alert("Network Connectivity Issues.");
    } finally {
      setIsSavingComment(false);
    }
  };

  useEffect(() => {
    loadApprovedInvoices();
    loadDashboardInvoicesCounts();
  }, []);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (
        target.closest(".dash-menu__trigger") ||
        target.closest(".dash-menu__dropdown--fixed")
      )
        return;
      setOpenMenuId(null);
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  const totalApprovedInvoices = Number.parseInt(approvedInvoicesCount, 10);
  const canLoadMoreApprovedInvoices = Number.isNaN(totalApprovedInvoices)
    ? hasMoreApprovedInvoices
    : approvedInvoices.length < totalApprovedInvoices;

  const filteredInvoices = approvedInvoices.filter((inv) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (
        !inv.company?.toLowerCase().includes(q) &&
        !inv.textId?.toLowerCase().includes(q)
      )
        return false;
    }
    if (activeFilter !== "all" && inv.createdOn) {
      const diffMs = Date.now() - new Date(inv.createdOn).getTime();
      const diffH = diffMs / (1000 * 60 * 60);
      if (activeFilter === "24h" && diffH > 24) return false;
      if (activeFilter === "7d" && diffH > 168) return false;
      if (activeFilter === "30d" && diffH > 720) return false;
    }
    return true;
  });

  const formatDate = (d: string) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatPrice = (p: number) =>
    new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
    }).format(p || 0);

  const toggleId = (id: string) => {
    setSelectedIds((prev) => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === filteredInvoices.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filteredInvoices.map((i) => i._id)));
  };

  return (
    <div className="dash-layout">
      <AdminOwnerPageNavColumn activePage="approved" />

      <main className="dash-main">
        {/* Top bar */}
        <div className="dash-topbar">
          <div className="dash-search">
            <i className="fa-solid fa-magnifying-glass dash-search__icon"></i>
            <input
              type="text"
              className="dash-search__input"
              placeholder="Suchen"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Link href="/admin/pendingapproval" className="dash-new-btn">
            + Neue Rechnung
          </Link>
        </div>

        {/* Stat cards */}
        <div className="dash-cards">
          <div
            className="dash-card"
            onClick={() => (window.location.href = "/admin/pendingapproval")}
          >
            <p className="dash-card__title">Rechnungen zur Prüfung</p>
            <div className="dash-card__footer">
              <p className="dash-card__count">{pendingInvoicesCount || "0"}</p>
              <span className="dash-card__arrow">
                <i className="fa-solid fa-arrow-up-right-from-square"></i>
              </span>
            </div>
          </div>
          <div
            className="dash-card"
            onClick={() => (window.location.href = "/admin/approved")}
          >
            <p className="dash-card__title">Genehmigte Rechnungen</p>
            <div className="dash-card__footer">
              <p className="dash-card__count">{approvedInvoicesCount || "0"}</p>
              <span className="dash-card__arrow">
                <i className="fa-solid fa-arrow-up-right-from-square"></i>
              </span>
            </div>
          </div>
        </div>

        {/* Table section */}
        <div className="dash-section__header">
          <h2 className="dash-section__title">
            Genehmigte Rechnungen
            <span className="dash-section__badge">
              {approvedInvoicesCount || "0"}
            </span>
          </h2>
          <p className="dash-section__subtitle">Rechnungsübersicht</p>
        </div>

        <div className="dash-filters">
          {[
            { label: "24 Stunde", value: "24h" },
            { label: "7 Tage", value: "7d" },
            { label: "30 Tage", value: "30d" },
            { label: "Alle", value: "all" },
          ].map((f) => (
            <button
              key={f.value}
              className={`dash-filter ${activeFilter === f.value ? "dash-filter--active" : ""}`}
              onClick={() => setActiveFilter(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="dash-section">
          <div className="dash-table-wrap">
            <table className="dash-table">
              <thead>
                <tr>
                  <th className="dash-th dash-th--cb">
                    <label className="dash-cb">
                      <input
                        type="checkbox"
                        checked={
                          filteredInvoices.length > 0 &&
                          selectedIds.size === filteredInvoices.length
                        }
                        onChange={toggleAll}
                      />
                      <span className="dash-cb__box"></span>
                    </label>
                  </th>
                  <th className="dash-th">Kunde</th>
                  <th className="dash-th">Status</th>
                  <th className="dash-th">Id</th>
                  <th className="dash-th">Preis</th>
                  <th className="dash-th">Datum</th>
                  <th className="dash-th dash-th--act"></th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((inv: any) => (
                  <tr key={inv._id} className="dash-tr">
                    <td className="dash-td dash-td--cb">
                      <label className="dash-cb">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(inv._id)}
                          onChange={() => toggleId(inv._id)}
                        />
                        <span className="dash-cb__box"></span>
                      </label>
                    </td>
                    <td className="dash-td dash-td--kunde">
                      <div className="dash-kunde">
                        <i className="fa-regular fa-file-lines dash-kunde__icon"></i>
                        <div>
                          <Link
                            href={getPdfEditorHref(inv._id, inv.fileName)}
                            target="_blank"
                            className="dash-kunde__name"
                          >
                            {inv.company || "Name"}
                          </Link>
                          <p className="dash-kunde__id">{inv.textId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="dash-td">
                      <span className="dash-badge dash-badge--approved">
                        Genehmigte
                      </span>
                    </td>
                    <td className="dash-td">{inv.textId}</td>
                    <td className="dash-td">{formatPrice(inv.price)}</td>
                    <td className="dash-td">{formatDate(inv.createdOn)}</td>
                    <td className="dash-td dash-td--act">
                      <div
                        className="dash-menu"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          className="dash-menu__trigger"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (openMenuId === inv._id) {
                              setOpenMenuId(null);
                            } else {
                              const rect = (
                                e.currentTarget as HTMLElement
                              ).getBoundingClientRect();
                              setMenuPos({
                                top: rect.bottom + 4,
                                left: Math.min(
                                  rect.right - 170,
                                  window.innerWidth - 178,
                                ),
                              });
                              setOpenMenuId(inv._id);
                            }
                          }}
                        >
                          <i className="fa-solid fa-ellipsis-vertical"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {openMenuId &&
            (() => {
              const inv = approvedInvoices.find((i) => i._id === openMenuId);
              if (!inv) return null;
              return (
                <div
                  className="dash-menu__dropdown dash-menu__dropdown--fixed"
                  style={{ top: menuPos.top, left: menuPos.left }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Link
                    href={getPdfEditorHref(inv._id, inv.fileName)}
                    target="_blank"
                    className="dash-menu__item"
                  >
                    <i className="fa-regular fa-pen-to-square"></i> Bearbeiten
                  </Link>
                  <div
                    className="dash-menu__item"
                    onClick={() => payInvoice(inv._id)}
                  >
                    <i className="fa-regular fa-credit-card"></i> Bezahle es
                  </div>
                  <div
                    className="dash-menu__item"
                    onClick={() => setPending(inv._id)}
                  >
                    <i className="fa-solid fa-rotate-left"></i> Auf Ausstehend
                    setzen
                  </div>
                  <div
                    className="dash-menu__item"
                    onClick={() => openCommentModal(inv)}
                  >
                    <i className="fa-regular fa-comment"></i> Kommentar
                  </div>
                  <div
                    className="dash-menu__item dash-menu__item--danger"
                    onClick={() => deleteInvoice(inv._id)}
                  >
                    <i className="fa-regular fa-trash-can"></i> Löschen
                  </div>
                </div>
              );
            })()}

          <div
            className="dash-load-more"
            onClick={() => {
              if (isLoadingMoreInvoices || !canLoadMoreApprovedInvoices) return;
              loadExtraApprovedInvoices(invoicesPageState + 1);
            }}
            style={{
              opacity:
                isLoadingMoreInvoices || !canLoadMoreApprovedInvoices ? 0.6 : 1,
              pointerEvents:
                isLoadingMoreInvoices || !canLoadMoreApprovedInvoices
                  ? "none"
                  : "auto",
            }}
          >
            <p>{isLoadingMoreInvoices ? "Wird geladen..." : "Alle Anzeigen"}</p>
          </div>
        </div>
      </main>

      {commentModalInvoice && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setCommentModalInvoice(null)}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "12px",
              padding: "24px",
              width: "100%",
              maxWidth: "480px",
              boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
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
              {commentModalInvoice.textId} — {commentModalInvoice.company}
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
                onClick={() => setCommentModalInvoice(null)}
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
    </div>
  );
};

export default page;
