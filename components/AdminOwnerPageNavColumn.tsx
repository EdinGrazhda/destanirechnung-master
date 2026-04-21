"use client";
import React, { useState, useEffect } from "react";

interface NavColumnProps {
  activePage?: string;
}

const AdminOwnerPageNavColumn = ({
  activePage = "dashboard",
}: NavColumnProps) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [username, setUsername] = useState("");

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch("/api/admin/profile");
        if (res.ok) {
          const data = await res.json();
          setUsername(data.username || "");
        }
      } catch (err) {
        console.error("Failed to load profile", err);
      }
    };
    fetchProfile();
  }, []);

  const logOut = async () => {
    try {
      const response = await fetch("/api/admin/logout");
      const json_res = await response.json();

      if (response.ok) {
        window.location.href = "/";
      } else alert(json_res.message);
    } catch (err) {
      console.log(err);
      alert("Network Connectivity Issues.");
    }
  };

  return (
    <>
      <button
        className="sidebar-toggle"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        <i className={`fa-solid ${mobileOpen ? "fa-xmark" : "fa-bars"}`}></i>
      </button>
      {mobileOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setMobileOpen(false)}
        ></div>
      )}
      <aside className={`sidebar ${mobileOpen ? "sidebar--open" : ""}`}>
        <div className="sidebar__top">
          <img
            className="sidebar__logo"
            src="/destanilogostandard.svg"
            alt="Destani"
          />
          <p className="sidebar__section-title">Übersicht</p>
          <nav className="sidebar__nav">
            <div
              className={`sidebar__nav-item ${activePage === "dashboard" ? "sidebar__nav-item--active" : ""}`}
              onClick={() => {
                window.location.href = "/admin";
                setMobileOpen(false);
              }}
            >
              <i className="fa-regular fa-file-lines sidebar__nav-icon"></i>
              <span>Rechnungen zur Prüfung</span>
            </div>
            <div
              className={`sidebar__nav-item ${activePage === "approved" ? "sidebar__nav-item--active" : ""}`}
              onClick={() => {
                window.location.href = "/admin/approved";
                setMobileOpen(false);
              }}
            >
              <i className="fa-regular fa-circle-check sidebar__nav-icon"></i>
              <span>Genehmigte Rechnungen</span>
            </div>
            <div
              className={`sidebar__nav-item ${activePage === "paidinvoices" ? "sidebar__nav-item--active" : ""}`}
              onClick={() => {
                window.location.href = "/admin/paidinvoices";
                setMobileOpen(false);
              }}
            >
              <i className="fa-regular fa-credit-card sidebar__nav-icon"></i>
              <span>Bezahlte Rechnungen</span>
            </div>
            <div
              className={`sidebar__nav-item ${activePage === "documents" ? "sidebar__nav-item--active" : ""}`}
              onClick={() => {
                window.location.href = "/admin/documents";
                setMobileOpen(false);
              }}
            >
              <i className="fa-regular fa-folder-open sidebar__nav-icon"></i>
              <span>Dokumente</span>
            </div>
            <div
              className={`sidebar__nav-item ${activePage === "benutzer" ? "sidebar__nav-item--active" : ""}`}
              onClick={() => {
                window.location.href = "/admin/benutzer";
                setMobileOpen(false);
              }}
            >
              <i className="fa-regular fa-user sidebar__nav-icon"></i>
              <span>Benutzer</span>
            </div>
            <div
              className={`sidebar__nav-item ${activePage === "usermanagement" ? "sidebar__nav-item--active" : ""}`}
              onClick={() => {
                window.location.href = "/admin/usermanagement";
                setMobileOpen(false);
              }}
            >
              <i className="fa-solid fa-lock sidebar__nav-icon"></i>
              <span>Benutzerverwaltung</span>
            </div>
          </nav>
        </div>
        <div className="sidebar__bottom">
          <p className="sidebar__user-name">{username || "—"}</p>
          <p className="sidebar__logout" onClick={logOut}>
            Abmelden
          </p>
        </div>
      </aside>
    </>
  );
};

export default AdminOwnerPageNavColumn;
