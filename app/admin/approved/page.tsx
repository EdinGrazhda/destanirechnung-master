"use client"
import { AdminOwnerPageNavColumn, SingleRechnungRow } from '@/components'
import React, { useEffect, useState } from 'react'

const page = () => {

    
    const [approvedInvoices, setApprovedInvoices] = useState<Array<any>>([]);


    const loadApprovedInvoices = async () => {
        try {
        const response = await fetch(`/api/admin/invoice?invoiceStatus=approved`);
        const json_res = await response.json();

        if (response.ok) {
            console.log(json_res);
            setApprovedInvoices(json_res.foundInvoices);
        } else {
            alert(json_res.message);
        }
        } catch (err) {
        console.log(err);
        alert("Network Connectivity Issues.");
        }
    }

    const uploadedEditedFile = async () => {
        let editedFileUploadFormData = new FormData();

        const editedInvoiceFile = (document.getElementById("editedinvoiceupload") as HTMLInputElement)!.files![0];
        editedFileUploadFormData.append("files", editedInvoiceFile);

        try {
            let request_options = { method: "POST", body: editedFileUploadFormData };
            const response = await fetch("/api/admin/uploadeditedfile", request_options);
            const json_res = await response.json();

            if (response.ok) {
                window.location.reload();
            } else {
                alert(json_res.message);
            }
        } catch (err) {
            console.log(err);
            alert("Network Connectivity Issues.");
        };

    }


    useEffect(() => {
        loadApprovedInvoices();
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


        
            {/* <div className="admin-owner_page-files_area-columns_seperator-left_side-time_filtering_card">
              <p className="small" style={{
                marginLeft: "2rem"
              }}>Referenze Monat</p>
              <select name="" id="" className='admin-owner_page-files_area-columns_seperator-left_side-time_filtering_card-month_select'>
                <option value="all">All Time</option>
                <option value="05-2025">05-2025</option>
                <option value="04-2025">04-2025</option>
                <option value="03-2025">03-2025</option>
                <option value="02-2025">02-2025</option>
                <option value="01-2025">01-2025</option>
              </select>
            </div> */}


            <div className="admin-owner_page-files_area-columns_seperator-left_side-approved_file_upload-container">

                <div className="admin-owner_page-file_upload_form-container-file_upload_area" style={{
                    width: "100%"
                }}>
                    <label className="admin-owner_page-file_upload_form-container-file_upload_area-upload_button" htmlFor='editedinvoiceupload' style={{
                        width: "240px",
                        marginLeft: "2rem"
                    }}>
                        <p className="white">Hochladen</p>
                    </label>
                    <input type="file" 
                        style={{
                            width: "calc(100% - 4rem)",
                            marginLeft: "2rem",
                            borderRadius: "0.5rem"
                        }}
                    name="" id="editedinvoiceupload" className='admin-owner_page-file_upload_form-container-file_upload_area-file_input'/>
                </div>

            </div>
            
            <div className="admin-owner_page-file_upload_form-container-bottom_right_send_button-container">
                <div
                    className="admin-owner_page-file_upload_form-container-bottom_right_send_button-container-button"
                    onClick={uploadedEditedFile}
                >
                    <p className="medium bold blue">Speichern</p>
                </div>
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
            {approvedInvoices.map((singlePendingInvoice: any) => (
              <SingleRechnungRow
                  invoiceId={singlePendingInvoice._id}
                  textId={singlePendingInvoice.textId}
                  invoiceCompany={singlePendingInvoice.company}
                  price={singlePendingInvoice.price}
                  status={singlePendingInvoice.status}
                  pageId='approved'
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