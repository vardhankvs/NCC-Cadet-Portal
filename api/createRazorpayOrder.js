// api/createRazorpayOrder.js
import axios from 'axios';

export default async function handler(req, res) {
    // Handle CORS preflight
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { amount, currency = 'INR', cadetId, cadetName, enrollmentId, receipt } = req.body;

        const keyId = process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID;
        const keySecret = process.env.RAZORPAY_KEY_SECRET;

        if (!keyId || !keySecret) {
            return res.status(400).json({ 
                error: 'Razorpay keys not configured on server.',
                fallbackToClient: true 
            });
        }

        const numericAmount = Math.round(Number(amount) * 100); // convert rupees to paise
        if (isNaN(numericAmount) || numericAmount <= 0) {
            return res.status(400).json({ error: 'Invalid amount.' });
        }

        const authHeader = 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64');

        const orderData = {
            amount: numericAmount,
            currency: currency,
            receipt: receipt || `rcpt_${enrollmentId || cadetId}_${Date.now()}`,
            notes: {
                cadetId: cadetId || '',
                cadetName: cadetName || '',
                enrollmentId: enrollmentId || ''
            }
        };

        const response = await axios.post('https://api.razorpay.com/v1/orders', orderData, {
            headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/json'
            }
        });

        return res.status(200).json({
            success: true,
            orderId: response.data.id,
            amount: response.data.amount,
            currency: response.data.currency,
            keyId: keyId
        });
    } catch (error) {
        console.error('Razorpay Order Creation Error:', error.response?.data || error.message);
        return res.status(500).json({ 
            error: 'Failed to create Razorpay Order', 
            details: error.response?.data || error.message 
        });
    }
}
