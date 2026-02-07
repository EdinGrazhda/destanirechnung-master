"use client"
import React from 'react'

const AdminOwnerPageNavColumn = () => {

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
  }

  return (
    <div className="admin-owner_page-nav_column" style={{
      backgroundColor: "white"
    }}>
        <img className='admin-owner_page-nav_column-logo' src="/destanilogostandard.svg" alt="" />

        <div className="admin-owner_page-nav_column-nav_button" onClick={() => window.location.href = "/admin"}>
          <p className="small">Dashboard</p>
        </div>

        <div className="admin-owner_page-nav_column-nav_button red" onClick={() => window.location.href = "/admin/pendingapproval"}>
          <p className="small">Rechnungen zur Prüfung</p>
        </div>

        <div className="admin-owner_page-nav_column-nav_button green" onClick={() => window.location.href = "/admin/approved"}>
          <p className="small">Genehmigte Rechnungen</p>
        </div>

        <div className="admin-owner_page-nav_column-nav_button gray" onClick={() => window.location.href = "/admin/paidinvoices"}>
          <p className="small">Bezahlte Rechnungen</p>
        </div>

        <div className="admin-owner_page-nav_column-logout_button" onClick={logOut}>
          <p className="small">Abmelden</p>
        </div>
    </div>
  )
}

export default AdminOwnerPageNavColumn