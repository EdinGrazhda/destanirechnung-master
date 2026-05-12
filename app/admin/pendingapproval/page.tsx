"use client";
import { AdminOwnerPageNavColumn } from "@/components";
import { getPdfEditorHref } from "@/utils/uploadedFilename";
import Link from "next/link";
import React, { useEffect, useState } from "react";

const page = () => {
  const [pendingInvoices, setPendingInvoices] = useState<Array<any>>([]);
  const [invoiceUploadCompanyName, setInvoiceUploadCompanyName] = useState("");
  const [invoiceUploadCustomID, setInvoiceUploadCustomID] = useState("");
  const [invoiceUploadCompanyPrice, setInvoiceUploadCompanyPrice] =
    useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
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

  const uploadInvoice = async () => {
    let invoiceUploadFormData = new FormData();
    invoiceUploadFormData.append("company", invoiceUploadCompanyName);
    invoiceUploadFormData.append("customID", invoiceUploadCustomID);
    invoiceUploadFormData.append("price", invoiceUploadCompanyPrice);

    const invoiceFile = (document.getElementById(
      "invoiceupload",
    ) as HTMLInputElement)!.files![0];
    invoiceUploadFormData.append("files", invoiceFile);

    try {
      let request_options = { method: "POST", body: invoiceUploadFormData };
      const response = await fetch("/api/admin/invoice", request_options);
      const json_res = await response.json();

      if (response.ok) {
        setInvoiceUploadCompanyName("");
        setInvoiceUploadCustomID("");
        setInvoiceUploadCompanyPrice("");
        (document.getElementById("invoiceupload") as HTMLInputElement).value =
          "";
        setPendingInvoices((prev) => [...prev, json_res.newSavedInvoice]);
      } else {
        alert(json_res.message);
      }
    } catch (err) {
      console.log(err);
      alert("Network Connectivity Issues.");
    }
  };

  const loadPendingInvoices = async () => {
    try {
      const response = await fetch(`/api/admin/invoice?invoiceStatus=pending`);
      const json_res = await response.json();
      if (response.ok) {
        setPendingInvoices(json_res.foundInvoices);
      } else {
        alert(json_res.message);
      }
    } catch (err) {
      console.log(err);
      alert("Network Connectivity Issues.");
    }
  };

  const approveInvoice = async (invoiceId: string) => {
    try {
      const response = await fetch("/api/admin/invoice", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ invoiceId, newStatus: "approved" }),
      });
      if (response.ok) {
        setPendingInvoices((prev) =>
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
        setPendingInvoices((prev) =>
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
        setPendingInvoices((prev) =>
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
    loadPendingInvoices();
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

  const filteredInvoices = pendingInvoices.filter((inv) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      inv.company?.toLowerCase().includes(q) ||
      inv.textId?.toLowerCase().includes(q)
    );
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
      <AdminOwnerPageNavColumn activePage="pendingapproval" />

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
        </div>

        {/* Upload form */}
        <div className="dash-upload-card">
          <h3 className="dash-upload-card__title">Neue Rechnung hochladen</h3>
          <div className="dash-upload-card__fields">
            <input
              type="text"
              className="dash-input"
              placeholder="Rechnungs-ID"
              value={invoiceUploadCustomID}
              onChange={(e) => setInvoiceUploadCustomID(e.target.value)}
            />
            <input
              type="text"
              className="dash-input"
              placeholder="Firma"
              value={invoiceUploadCompanyName}
              onChange={(e) => setInvoiceUploadCompanyName(e.target.value)}
            />
            <input
              type="number"
              className="dash-input"
              placeholder="Summe"
              inputMode="decimal"
              value={invoiceUploadCompanyPrice}
              onChange={(e) => setInvoiceUploadCompanyPrice(e.target.value)}
            />
          </div>
          <div className="dash-upload-card__file-row">
            <label className="dash-upload-btn" htmlFor="invoiceupload">
              <i className="fa-solid fa-cloud-arrow-up"></i> Datei auswählen
            </label>
            <input
              type="file"
              id="invoiceupload"
              style={{ display: "none" }}
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) uploadInvoice();
              }}
            />
          </div>
        </div>

        {/* Table section */}
        <div className="dash-section__header">
          <h2 className="dash-section__title">
            Rechnungen zur Prüfung
            <span className="dash-section__badge">
              {pendingInvoices.length}
            </span>
          </h2>
          <p className="dash-section__subtitle">Rechnungsübersicht</p>
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
                  <th className="dash-th">Kommentar</th>
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
                      <span className="dash-badge dash-badge--pending">
                        Ausstehend
                      </span>
                    </td>
                    <td className="dash-td">{inv.textId}</td>
                    <td className="dash-td">{formatPrice(inv.price)}</td>
                    <td className="dash-td">{formatDate(inv.createdOn)}</td>
                    <td className="dash-td">
                      {inv.comment ? (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            fontSize: "12px",
                            color: "#6b4c9a",
                            fontWeight: 500,
                          }}
                        >
                          <i className="fa-regular fa-comment"></i> Ja
                        </span>
                      ) : (
                        <span style={{ fontSize: "12px", color: "#aaa" }}>
                          —
                        </span>
                      )}
                    </td>
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
              const inv = pendingInvoices.find((i) => i._id === openMenuId);
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
                    onClick={() => approveInvoice(inv._id)}
                  >
                    <i className="fa-regular fa-circle-check"></i> Genehmigen
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
