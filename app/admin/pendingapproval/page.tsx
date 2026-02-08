"use client";
import { AdminOwnerPageNavColumn, SingleRechnungRow } from "@/components";
import React, { useEffect, useState } from "react";

const page = () => {
  const [pendingInvoices, setPendingInvoices] = useState<Array<any>>([]);

  const [invoiceUploadCompanyName, setInvoiceUploadCompanyName] = useState("");
  const [invoiceUploadCustomID, setInvoiceUploadCustomID] = useState("");
  const [invoiceUploadCompanyPrice, setInvoiceUploadCompanyPrice] =
    useState("");

  const uploadInvoice = async () => {
    // alert("upload invoice")
    // console.log(invoiceUploadCompanyName);
    // console.log(invoiceUploadCompanyAddress);
    // console.log(invoiceUploadCompanyEmail);
    // console.log(invoiceUploadCompanyPrice);

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

      console.log(response.status);

      if (response.ok) {
        // Request successfull - clear input forms;
        setInvoiceUploadCompanyName("");
        setInvoiceUploadCustomID("");
        setInvoiceUploadCompanyPrice("");
        // Clear file input;
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
        console.log(json_res);
        setPendingInvoices(json_res.foundInvoices);
      } else {
        alert(json_res.message);
      }
    } catch (err) {
      console.log(err);
      alert("Network Connectivity Issues.");
    }
  };

  useEffect(() => {
    loadPendingInvoices();
  }, []);

  return (
    <div className="mainpage">
      <div
        className="admin-owner_page"
        style={{
          backgroundColor: "#f6f7fb",
        }}
      >
        <AdminOwnerPageNavColumn />

        <div
          className="admin-owner_page-files_area-columns_seperator-left_side"
          style={{
            width: "80%",
            marginLeft: "auto",
            marginRight: "auto",
            marginTop: "96px",
          }}
        >
          <div className="admin-owner_page-file_upload_form-container">
            <div className="admin-owner_page-file_upload_form-container-input_form_area">
              <div className="admin-owner_page-file_upload_form-container-input_form_area-rechnungsinformationen_title">
                <p className="medium blue">Rechnungsinformationen</p>
              </div>

              <div className="admin-owner_page-file_upload_form-container-input_form_area-inputs_row"></div>
              <input
                type="text"
                placeholder="Rechnungs-ID"
                className="admin-owner_page-file_upload_form-container-input_form_area-singe_input"
                value={invoiceUploadCustomID}
                onChange={(e) => setInvoiceUploadCustomID(e.target.value)}
                style={{ marginBottom: "2rem" }}
              />

              <div className="admin-owner_page-file_upload_form-container-input_form_area-inputs_row">
                <input
                  value={invoiceUploadCompanyName}
                  onChange={(e) => setInvoiceUploadCompanyName(e.target.value)}
                  type="text"
                  placeholder="Firma"
                />
                <input
                  value={invoiceUploadCompanyPrice}
                  onChange={(e) => setInvoiceUploadCompanyPrice(e.target.value)}
                  type="number"
                  placeholder="Summe"
                  inputMode="decimal"
                />
              </div>
            </div>

            <div className="admin-owner_page-file_upload_form-container-vertical_spacer"></div>

            <div className="admin-owner_page-file_upload_form-container-file_upload_area">
              <label
                className="admin-owner_page-file_upload_form-container-file_upload_area-upload_button"
                htmlFor="invoiceupload"
              >
                <p className="white">Hochladen</p>
              </label>
              <input
                type="file"
                name=""
                id="invoiceupload"
                className="admin-owner_page-file_upload_form-container-file_upload_area-file_input"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    uploadInvoice();
                  }
                }}
              />
            </div>
          </div>

          <div className="admin-owner_page-files_area-columns_seperator-left_side-welcome_banner-overview_table">
            <p
              className="medium bold"
              style={{
                marginTop: "1rem",
                marginLeft: "1rem",
                marginBottom: "1rem",
              }}
            >
              Übersicht
            </p>

            <div className="admin-owner_page-files_area-columns_seperator-left_side-welcome_banner-overview_table-title_row">
              <div className="admin-owner_page-files_area-columns_seperator-left_side-welcome_banner-overview_table-title_row-column">
                <div className="vertical_text_center">
                  <p className="small gray">ID</p>
                </div>
              </div>

              <div className="admin-owner_page-files_area-columns_seperator-left_side-welcome_banner-overview_table-title_row-column">
                <div className="vertical_text_center">
                  <p className="small gray">Firma</p>
                </div>
              </div>

              <div className="admin-owner_page-files_area-columns_seperator-left_side-welcome_banner-overview_table-title_row-column">
                <div className="vertical_text_center">
                  <p className="small gray">Preis</p>
                </div>
              </div>

              <div className="admin-owner_page-files_area-columns_seperator-left_side-welcome_banner-overview_table-title_row-column">
                <div className="vertical_text_center">
                  <p className="small gray">Status</p>
                </div>
              </div>
            </div>

            {/* Invoices scroller */}
            {pendingInvoices.map((singlePendingInvoice: any) => (
              <SingleRechnungRow
                invoiceId={singlePendingInvoice._id}
                textId={singlePendingInvoice.textId}
                invoiceCompany={singlePendingInvoice.company}
                price={singlePendingInvoice.price}
                status={singlePendingInvoice.status}
                pageId="pendingapproval"
                invoiceFile={singlePendingInvoice.fileName}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default page;
