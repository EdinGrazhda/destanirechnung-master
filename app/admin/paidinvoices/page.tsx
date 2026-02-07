"use client"
import { AdminOwnerPageNavColumn, SingleRechnungRow } from '@/components'
import React, { useEffect, useState } from 'react'

const page = () => {

    const [paidInvoices, setPaidInvoices] = useState<Array<any>>([]);
    const [filteringMonthYearOptions, setFilteringMonthYearOptions] = useState<Array<any>>([]);


    const loadPaidInvoices = async (filteringMonthYearOptionParam:string="all") => {
        try {
        const response = await fetch(`/api/admin/invoice?invoiceStatus=paid&filteringMonthYearOptionParam=${filteringMonthYearOptionParam}`);
        const json_res = await response.json();

        if (response.ok) {
            console.log(json_res);
            setPaidInvoices(json_res.foundInvoices);
        } else {
            alert(json_res.message);
        }
        } catch (err) {
        console.log(err);
        alert("Network Connectivity Issues.");
        }
    }



    const loadInvoicesTimePeriods = async () => {
      try {
        const response = await fetch(`/api/admin/invoicetimeperiods?invoiceStatus=paid`);
        const json_res = await response.json();

        if (response.ok) {
            console.log(json_res);
            setFilteringMonthYearOptions(json_res.monthYearOptions)
        } else {
            alert(json_res.message);
          }
      } catch (err) {
        console.log(err);
        alert("Network Connectivity Issues.");
      }
    }


    useEffect(() => {
      loadPaidInvoices();
      loadInvoicesTimePeriods();
    }, []);

  return (
    <div className='mainpage'>
      <div className="admin-owner_page" style={{
        backgroundColor: "#f6f7fb"
      }}>

        <AdminOwnerPageNavColumn />

        <div className="admin-owner_page-files_area-columns_seperator-left_side"
        style={{
            width: "80%",
            marginLeft: "auto",
            marginRight: "auto",
            marginTop: "96px"
        }}>


        
            <div className="admin-owner_page-files_area-columns_seperator-left_side-time_filtering_card">
              <p className="small" style={{
                marginLeft: "2rem"
              }}>Referenze Monat</p>
              <select
                name="" id=""
                className='admin-owner_page-files_area-columns_seperator-left_side-time_filtering_card-month_select'
                onChange={(e) => loadPaidInvoices(e.target.value)}>
                <option value="all">All Time</option>
                {filteringMonthYearOptions.map(singleFilteringMonthYearOption => (
                  <option value={singleFilteringMonthYearOption}>{singleFilteringMonthYearOption}</option>
                ))}
              </select>
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
            {paidInvoices.map((singlePendingInvoice: any) => (
              <SingleRechnungRow
                  invoiceId={singlePendingInvoice._id}
                  textId={singlePendingInvoice.textId}
                  invoiceCompany={singlePendingInvoice.company}
                  price={singlePendingInvoice.price}
                  status={singlePendingInvoice.status}
                  pageId='paid'
                  invoiceFile={singlePendingInvoice.fileName}
              />
            ))}




            </div>

            
        </div>
      </div>
    </div>
  )
}

export default page