"use client"
import { AdminOwnerPageNavColumn, SingleRechnungRow } from '@/components'
import React, { useEffect, useState } from 'react'

const page = () => {

  const [dashboardInvoices, setDashboardInvoices] = useState<Array<any>>([]);

  const [allInvoicesCount, setAllInvoicesCount] = useState<string>("");
  const [approvedInvoicesCount, setApprovedInvoicesCount] = useState<string>("");
  const [pendingInvoicesCount, setPendingInvoicesCount] = useState<string>("");


  let [invoicesPageState, setInvoicesPageState] = useState<number>(2);

  const loadDashboardInvoices = async () => {
      try {
      const response = await fetch(`/api/admin/invoice?invoiceStatus=dashboard&invoicesPage=1`);
      const json_res = await response.json();

      if (response.ok) {
          console.log(json_res);
          setDashboardInvoices(json_res.foundInvoices);
      } else {
          alert(json_res.message);
      }
      } catch (err) {
        console.log(err);
        alert("Network Connectivity Issues.");
      }
  }

    const loadExtraDashboardInvoices = async () => {
      // alert(invoicesPageState);
      try {
                // alert(invoicesPageState);

        const response = await fetch(`/api/admin/invoice?invoiceStatus=dashboard&invoicesPage=${invoicesPageState}`);
        const json_res = await response.json();

      if (response.ok) {
          console.log(json_res);
          setDashboardInvoices(prev => [...prev, ...json_res.foundInvoices]);
      } else {
          alert(json_res.message);
      }
      } catch (err) {
        console.log(err);
        alert("Network Connectivity Issues.");
      }
    }


  const loadDashboardInvoicesCounts = async () => {
    try {
      const response = await fetch("/api/admin/invoicecounter");
      const json_res = await response.json();

      if (response.ok) {
        setAllInvoicesCount(json_res.allInvoicesCount);
        setApprovedInvoicesCount(json_res.approvedInvoicesCount);
        setPendingInvoicesCount(json_res.pendingInvoicesCount);
      } else {
        alert(json_res.message);
      }
    } catch (err) {
      console.log(err);
      alert("Network Connectivity Issues.");
    }
  }


  useEffect(() => {
    loadDashboardInvoices();
    loadDashboardInvoicesCounts();
  }, []);

  return (
    <div className='mainpage'>
      <div className="admin-owner_page">

        <AdminOwnerPageNavColumn />

        <div className="admin-owner_page-files_area">

          <div className="admin-owner_page-files_area-columns_seperator">

            <div className="admin-owner_page-files_area-columns_seperator-left_side">
              <div className="admin-owner_page-files_area-columns_seperator-left_side-welcome_banner">
                <p className="large bold" style={{
                  marginTop: "2rem",
                  marginLeft: "2rem",
                  color: "#004b50"
                }}>Herzlioch willkommen</p>
                <p className="medium" style={{
                  marginTop: "2rem",
                  marginLeft: "2rem",
                  color: "#2c6d6f"
                }}>
                  Klicken Sie auf die Schaltfläche unten,<br/>
                  um Rechnungen hochzuladen.
                </p>
              </div>

              <div className="admin-owner_page-files_area-columns_seperator-left_side-welcome_banner-overview_table">
                <p className="medium bold" style={{
                  marginTop: "1rem",
                  marginLeft: "1rem",
                  marginBottom: "1rem"
                }}>Übersicht</p>

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
                {dashboardInvoices.map((singleDashboardInvoice: any) => (
                  <SingleRechnungRow
                      invoiceId={singleDashboardInvoice._id}
                      textId={singleDashboardInvoice.textId}
                      invoiceCompany={singleDashboardInvoice.company}
                      price={singleDashboardInvoice.price}
                      status={singleDashboardInvoice.status}
                      pageId='dashboard'
                      invoiceFile={singleDashboardInvoice.fileName}
                  />
                ))}

                <div style={{
                  width: "100%",
                  height: "64px",
                  display: 'flex',
                  flexDirection: "column",
                  justifyContent: "center",
                  textAlign: "left"
                }} onClick={() => {
                  setInvoicesPageState(invoicesPageState+1);
                  loadExtraDashboardInvoices();
                  }}>
                  <p style={{
                    marginLeft: "1rem",
                    cursor: "pointer"
                  }} className="small bold">Alle Anzeigen</p>
                </div>

              </div>

              
            </div>

            <div className="admin-owner_page-files_area-columns_seperator-right_side">


              <div className="admin-owner_page-files_area-columns_seperator-right_side-genehmigte_card">
                <p className="medium white bold" style={{
                  marginLeft: "2rem",
                  marginBottom: "0.5rem"
                }}>{approvedInvoicesCount}</p>
                <p className="small white" style={{
                  marginLeft: "2rem"
                }}>Genehmigte</p>
              </div>

              <div className="admin-owner_page-files_area-columns_seperator-right_side-zurprufung_card">
                <p className="medium white bold" style={{
                  marginLeft: "2rem",
                  marginBottom: "0.5rem"
                }}>{pendingInvoicesCount}</p>
                <p className="small white" style={{
                  marginLeft: "2rem"
                }}>Zur Prüfung</p>
              </div>

              <div className="admin-owner_page-files_area-columns_seperator-right_side-documents_card" onClick={() => window.location.href = "/admin/documents"}>
                <p className="medium bold" style={{
                  marginLeft: "2rem",
                  marginBottom: "0.5rem"
                }}>Documents</p>
                <p className="small gray" style={{
                  marginLeft: "2rem"
                }}>{allInvoicesCount} Files</p>
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  )
}

export default page