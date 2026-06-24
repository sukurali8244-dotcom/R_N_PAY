const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// MongoDB Connection
const dbURI = "mongodb+srv://sukurali8244_db_user:OSkpvbFmqVLmSvGP@cluster0.dkje2pn.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

mongoose.connect(dbURI)
    .then(() => {
        console.log("MongoDB से जुड़ गए भाई!");
        createMaster(); 
    })
    .catch(err => console.error("Database Error:", err));

// User Schema (यहाँ पासवर्ड और लिमिट के फील्ड्स भी जोड़ दिए हैं)
const UserSchema = new mongoose.Schema({
    userId: { type: Number, unique: true },
    password: { type: String, default: "123456" }, 
    mobile: { type: String, unique: true },
    role: { type: String, default: 'Member' },
    status: { type: String, default: 'Enabled' },
    referralBy: Number,
    balance: { type: Number, default: 0 },
    limit: { type: Number, default: 10000 }, 
    bank: { holderName: String, bankName: String, accNumber: String, ifsc: String },
    rechargeHistory: { type: Array, default: [] },
    tokenHistory: { type: Array, default: [] }
});
const User = mongoose.model('User', UserSchema);

// Master ID Setup
async function createMaster() {
    const masterExists = await User.findOne({ userId: 1 });
    if (!masterExists) {
        await User.create({ userId: 1, mobile: "7628950634", role: 'Master', referralBy: 0 });
    }
}

// 1. Registration
app.post('/register', async (req, res) => {
    const { mobile, referralCode } = req.body;
    const MASTER_CODE = "7628950634";
    const lastUser = await User.findOne().sort({ userId: -1 });
    const newId = lastUser ? lastUser.userId + 1 : 2;
    let role = 'Member';
    let referredBy = 1;
    if (referralCode === MASTER_CODE) { role = 'TL'; referredBy = 1; }
    else {
        const tlUser = await User.findOne({ mobile: referralCode });
        if (tlUser) { referredBy = tlUser.userId; }
    }
    try {
        await User.create({ userId: newId, mobile, role, referralBy });
        res.json({ success: true, userId: newId });
    } catch (err) { res.json({ success: false, message: "Already registered!" }); }
});

// 2. एडमिन के लिए सारी डेटा API
app.get('/admin/all-data', async (req, res) => {
    const users = await User.find({});
    res.json({ users });
});

// 3. बैलेंस अपडेट
app.post('/admin/edit-balance', async (req, res) => {
    const { userId, newBalance } = req.body;
    await User.updateOne({ userId: userId }, { balance: newBalance });
    res.json({ success: true });
});

// 4. स्टेटस (Block/Unblock)
app.post('/admin/toggle-status', async (req, res) => {
    const user = await User.findOne({ userId: req.body.userId });
    const newStatus = user.status === 'Enabled' ? 'Disabled' : 'Enabled';
    await User.updateOne({ userId: req.body.userId }, { status: newStatus });
    res.json({ success: true });
});

// --- यहाँ से नए फीचर्स शुरू होते हैं (जो तूने माँगे थे) ---

// पासवर्ड रिसेट
app.post('/admin/reset-password', async (req, res) => {
    const { userId, newPassword } = req.body;
    await User.updateOne({ userId }, { password: newPassword });
    res.json({ success: true });
});

// आईडी लिमिट सेट
app.post('/admin/set-limit', async (req, res) => {
    const { userId, limit } = req.body;
    await User.updateOne({ userId }, { limit });
    res.json({ success: true });
});

// बैंक रिसेट
app.post('/admin/reset-bank', async (req, res) => {
    const { userId } = req.body;
    await User.updateOne({ userId }, { bank: {} });
    res.json({ success: true });
});

// टीम ब्लूप्रिंट (Recursive)
app.get('/admin/team-blueprint/:userId', async (req, res) => {
    const getTeam = async (id) => {
        const members = await User.find({ referralBy: id });
        let team = [];
        for (let m of members) {
            team.push({ userId: m.userId, mobile: m.mobile, children: await getTeam(m.userId) });
        }
        return team;
    };
    const teamData = await getTeam(parseInt(req.params.userId));
    res.json({ success: true, team: teamData });
});

// अन्य पुराने API 
app.get('/profile/:userId', async (req, res) => {
    const user = await User.findOne({ userId: req.params.userId });
    res.json({ success: true, userId: user.userId, balance: user.balance });
});

app.post('/deposit', async (req, res) => {
    const { userId, amount } = req.body;
    await User.updateOne({ userId: userId }, { $inc: { balance: amount } });
    res.json({ success: true });
});

app.post('/save-bank', async (req, res) => {
    await User.updateOne({ userId: req.body.userId }, { bank: req.body });
    res.json({ success: true });
});

app.listen(3000, () => console.log("Server port 3000 par chal raha hai"));