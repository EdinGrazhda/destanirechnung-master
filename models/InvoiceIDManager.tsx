import mongoose from 'mongoose';

const InvoiceIDManagerSchema = new mongoose.Schema({
  idNumber: {type: Number, required: false}
});

export default mongoose.models.InvoiceIDManager || mongoose.model('InvoiceIDManager', InvoiceIDManagerSchema);
