import mongoose from "mongoose";

const InvoiceSchema = new mongoose.Schema({
  fileName: { type: String, required: false },
  textId: { type: String, required: false },
  company: { type: String, required: false },
  price: { type: Number, required: false },
  status: { type: String, required: false },
  createdOn: { type: String, required: false },
});

// Indexes to prevent full-collection scans on every query
InvoiceSchema.index({ status: 1 });
InvoiceSchema.index({ textId: 1 });
InvoiceSchema.index({ fileName: 1 });
InvoiceSchema.index({ createdOn: -1 });

export default mongoose.models.Invoice ||
  mongoose.model("Invoice", InvoiceSchema);
