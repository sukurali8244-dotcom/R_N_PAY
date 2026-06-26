const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors'); // CORS को इम्पोर्ट किया ताकि लाइव होने पर कनेक्टिविटी न रुके
const app = express();

app.use(express.json());
app.use(cors()); // CORS को एक्टिवेट किया
app.use(express.static(__dirname));

// तुम्हारा MongoDB कनेक्शन
const dbURI = 'mongodb+srv://sukurali8244_db_user:OSkpvbFmqVLmSvGP@cluster0.dkje2pn.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

mongoose.connect(dbURI)
    .then(() => console.log("Database connected successfully!"))
    .catch(err => console.log("Connection error:", err));

// सुधरा हुआ यूज़र स्कीमा (बैलेंस और डिफ़ॉल्ट रोल के साथ)
const User = mongoose.model('User', new mongoose.Schema({
    userId: Number,
    mobile: { type: String, unique: true },
    password: { type: String },
    role: { type: String, default: 'Member' }, // डिफ़ॉल्ट रोल Member
    balance: { type: Number, default: 0.00 },   // प्रोफाइल पेज के बैलेंस के लिए
    totalTeam: { type: Number, default: 0 },   // टीम सेंटर के लिए
    todayNew: { type: Number, default: 0 },    // टीम सेंटर के लिए
    totalComm: { type: Number, default: 0 }    // टीम सेंटर के लिए
}));

// 1. रजिस्ट्रेशन रूट
app.post('/register', async (req, res) => {
    const { mobile, password } = req.body;
    const MASTER_MOBILE = "7628950634";
    const MASTER_PASS = "plmokn90";

    try {
        let newId;
        let role = 'Member';

        // मास्टर आईडी के लिए लॉजिक
        if (mobile === MASTER_MOBILE && password === MASTER_PASS) {
            newId = 1;
            role = 'Master';
        } else {
            const lastUser = await User.findOne().sort({ userId: -1 });
            newId = (lastUser && lastUser.userId >= 1) ? lastUser.userId + 1 : 2;
        }

        await User.create({ userId: newId, mobile, password, role });
        res.json({ success: true, userId: newId });
    } catch (err) {
        res.json({ success: false, message: "Error: User might already exist!" });
    }
});

// 2. 🟢 प्रोफाइल रूट (यह प्रोफाइल पेज पर आईडी और बैलेंस लोड करेगा)
app.get('/profile/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        // डेटाबेस में ढूँढें (userId नंबर के रूप में सेव है, इसलिए Number() लगाया)
        const user = await User.findOne({ userId: Number(userId) });
        
        if (user) {
            res.json({ 
                success: true, 
                userId: user.userId, 
                balance: user.balance 
            });
        } else {
            res.json({ success: false, message: "User not found!" });
        }
    } catch (err) {
        res.json({ success: false, message: "Server error in profile route" });
    }
});

// 3. 🟢 टीम स्टैट्स रूट (यह टीम सेंटर में डेटा और TL रेफरल कोड भेजेगा)
app.get('/team-stats/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await User.findOne({ userId: Number(userId) });

        if (user) {
            res.json({
                success: true,
                role: user.role,         // यहाँ से TL या Master रोल फ्रंटएंड को जाएगा
                mobile: user.mobile,     // रेफरल कोड के रूप में मोबाइल नंबर जाएगा
                totalTeam: user.totalTeam,
                todayNew: user.todayNew,
                totalComm: user.totalComm
            });
        } else {
            res.json({ success: false, message: "User not found!" });
        }
    } catch (err) {
        res.json({ success: false, message: "Server error in team route" });
    }
});

// सर्वर पोर्ट सेटअप
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));