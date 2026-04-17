"use client";
import Link from "next/link";
import React from "react";

interface Props {
  invoiceId: string;
  textId: string;
  invoiceCompany: string;
  price: string;
  status: string;
  pageId: string;
  invoiceFile: string;
}

const SingleRechnungRow = ({
  invoiceId,
  textId,
  invoiceCompany,
  price,
  status,
  pageId,
  invoiceFile,
}: Props) => {
  const deleteInvoice = async () => {
    const options = {
      method: "DELETE",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        invoiceId: invoiceId,
      }),
    };

    try {
      const response = await fetch("/api/admin/invoice", options);
      const json_res = await response.json();

      if (response.ok) {
        window.location.reload();
      } else {
        alert(json_res.message);
      }
    } catch (err) {
      console.log(err);
      alert("Network Connectivity Issues.");
    }
  };

  const approveInvoice = async () => {
    const options = {
      method: "PUT",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        invoiceId: invoiceId,
        newStatus: "approved",
      }),
    };

    try {
      const response = await fetch("/api/admin/invoice", options);
      const json_res = await response.json();

      if (response.ok) {
        window.location.reload();
      } else {
        alert(json_res.message);
      }
    } catch (err) {
      console.log(err);
      alert("Network Connectivity Issues.");
    }
  };

  const payInvoice = async () => {
    const options = {
      method: "PUT",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        invoiceId: invoiceId,
        newStatus: "paid",
      }),
    };

    try {
      const response = await fetch("/api/admin/invoice", options);
      const json_res = await response.json();

      if (response.ok) {
        window.location.reload();
      } else {
        alert(json_res.message);
      }
    } catch (err) {
      console.log(err);
      alert("Network Connectivity Issues.");
    }
  };

  return (
    <div className="admin-owner_page-files_area-columns_seperator-left_side-welcome_banner-overview_table-single_rechnung_row">
      <div className="admin-owner_page-files_area-columns_seperator-left_side-welcome_banner-overview_table-title_row-column">
        <Link
          className="vertical_text_center"
          style={{
            cursor: "pointer",
            textDecoration: "underline",
          }}
          href={`/admin/pdf-editor?file=${invoiceFile}&id=${invoiceId}`}
          target="_blank"
        >
          <p className="small" style={{ color: "black" }}>
            {textId}
          </p>
        </Link>
      </div>

      <div className="admin-owner_page-files_area-columns_seperator-left_side-welcome_banner-overview_table-title_row-column">
        <div className="vertical_text_center">
          <p className="small">{invoiceCompany}</p>
        </div>
      </div>

      <div className="admin-owner_page-files_area-columns_seperator-left_side-welcome_banner-overview_table-title_row-column">
        <div className="vertical_text_center">
          <p className="small">{price}€</p>
        </div>
      </div>

      <div
        className="admin-owner_page-files_area-columns_seperator-left_side-welcome_banner-overview_table-title_row-column"
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        {status === "pending" ? (
          <div className="genehmigte_status-container_div">
            <p className="small" style={{ color: "#b71d18" }}>
              Ausstehend
            </p>
          </div>
        ) : status === "approved" ? (
          <div className="prufung_status-container_div">
            <p className="small" style={{ color: "#118d57" }}>
              Genehmigte
            </p>
          </div>
        ) : status === "paid" ? (
          <div className="prufung_status-container_div">
            <p
              className="small"
              style={{ color: "#118d57", fontWeight: "bold" }}
            >
              Bezahlt
            </p>
          </div>
        ) : null}
      </div>

      {pageId === "pendingapproval" && (
        <div
          className="admin-owner_page-files_area-columns_seperator-left_side-welcome_banner-overview_table-title_row-column"
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          <div
            className="admin-owner_page-files_area-columns_seperator-left_side-welcome_banner-overview_table-title_row-column-confirm_invoice_button"
            onClick={approveInvoice}
          >
            <p className="small" style={{ color: "#118d57" }}>
              Senden
            </p>
          </div>
        </div>
      )}

      {pageId === "approved" && (
        <div
          className="admin-owner_page-files_area-columns_seperator-left_side-welcome_banner-overview_table-title_row-column"
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          <div
            className="admin-owner_page-files_area-columns_seperator-left_side-welcome_banner-overview_table-title_row-column-confirm_invoice_button"
            onClick={payInvoice}
          >
            <p className="small">Bezahle es</p>
          </div>
        </div>
      )}

      <div
        className="admin-owner_page-files_area-columns_seperator-left_side-welcome_banner-overview_table-title_row-column"
        style={{
          // backgroundColor: "green",
          display: "flex",
          flexDirection: "row",
          justifyContent: "end",
        }}
      >
        <div
          className="vertical_text_center"
          style={{
            // backgroundColor: "red",
            marginRight: "2rem",
          }}
        >
          <p
            className="medium"
            style={{
              cursor: "pointer",
            }}
            onClick={deleteInvoice}
            title="Rechnung entfernen"
          >
            <i className="fa-solid fa-trash"></i>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SingleRechnungRow;
