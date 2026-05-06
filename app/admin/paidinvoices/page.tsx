"use client";
import { AdminOwnerPageNavColumn } from "@/components";
import Link from "next/link";
import React, { useEffect, useState } from "react";

const page = () => {
  const [paidInvoices, setPaidInvoices] = useState<Array<any>>([]);
  const [paidInvoicesCount, setPaidInvoicesCount] = useState<string>("");
  const [approvedInvoicesCount, setApprovedInvoicesCount] =
    useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeFilter, setActiveFilter] = useState("all");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });

  const loadPaidInvoices = async () => {
    try {
      const response = await fetch(`/api/admin/invoice?invoiceStatus=paid`);
      const json_res = await response.json();
      if (response.ok) {
        setPaidInvoices(json_res.foundInvoices);
      } else {
        alert(json_res.message);
      }
    } catch (err) {
      console.log(err);
      alert("Network Connectivity Issues.");
    }
  };

  const loadDashboardInvoicesCounts = async () => {
    try {
      const response = await fetch("/api/admin/invoicecounter");
      const json_res = await response.json();
      if (response.ok) {
        setPaidInvoicesCount(json_res.paidInvoicesCount);
        setApprovedInvoicesCount(json_res.approvedInvoicesCount);
      } else {
        alert(json_res.message);
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
        setPaidInvoices((prev) => prev.filter((inv) => inv._id !== invoiceId));
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

  useEffect(() => {
    loadPaidInvoices();
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

  const filteredInvoices = paidInvoices.filter((inv) => {
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
      <AdminOwnerPageNavColumn activePage="paidinvoices" />

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
            onClick={() => (window.location.href = "/admin/paidinvoices")}
          >
            <p className="dash-card__title">Bezahlte Rechnungen</p>
            <div className="dash-card__footer">
              <p className="dash-card__count">{paidInvoicesCount || "0"}</p>
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
                            href={`/admin/pdf-editor?id=${inv._id}${inv.fileName ? `&file=${encodeURIComponent(inv.fileName)}` : ""}`}
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
                      <span className="dash-badge dash-badge--paid">
                        Bezahlt
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
              const inv = paidInvoices.find((i) => i._id === openMenuId);
              if (!inv) return null;
              return (
                <div
                  className="dash-menu__dropdown dash-menu__dropdown--fixed"
                  style={{ top: menuPos.top, left: menuPos.left }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Link
                    href={`/admin/pdf-editor?id=${inv._id}${inv.fileName ? `&file=${encodeURIComponent(inv.fileName)}` : ""}`}
                    target="_blank"
                    className="dash-menu__item"
                  >
                    <i className="fa-regular fa-pen-to-square"></i> Anzeigen
                  </Link>
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
    </div>
  );
};

export default page;
