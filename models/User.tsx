import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  username: {type: String, required: false},
  email: {type: String, required: false},
  password: {type: String, required: false},
  role: {type: String, required: false}
});

export default mongoose.models.User || mongoose.model('User', UserSchema);
