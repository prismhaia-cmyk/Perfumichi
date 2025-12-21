const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { items } = req.body;

        if (!items || items.length === 0) {
            return res.status(400).json({ error: 'No items provided' });
        }

        // Calculate total for shipping logic
        const subtotal = items.reduce((sum, item) => sum + (item.price * 100), 0); // in cents
        const freeShippingThreshold = 8000; // 80€ in cents
        const shippingCost = subtotal >= freeShippingThreshold ? 0 : 599; // 5.99€ in cents

        // Build line items for Stripe
        const lineItems = items.map(item => {
            const lineItem = {
                price_data: {
                    currency: 'eur',
                    product_data: {
                        name: item.title,
                        description: item.description || `Decant ${item.size} - Perfume de alta calidad`,
                    },
                    unit_amount: Math.round(item.price * 100), // Convert to cents
                },
                quantity: 1,
            };

            // Add image if available (must be absolute URL)
            if (item.imageUrl && item.imageUrl.startsWith('http')) {
                lineItem.price_data.product_data.images = [item.imageUrl];
            }

            return lineItem;
        });

        // Add shipping as a line item if not free
        if (shippingCost > 0) {
            lineItems.push({
                price_data: {
                    currency: 'eur',
                    product_data: {
                        name: 'Envío estándar',
                        description: 'Entrega en 24-48h (Gratis a partir de 80€)',
                    },
                    unit_amount: shippingCost,
                },
                quantity: 1,
            });
        }

        // Get the origin for return URLs
        const origin = req.headers.origin || 'https://perfumichi.com';

        // Create Stripe Checkout Session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: lineItems,
            mode: 'payment',
            success_url: `${origin}/success.html?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${origin}/cancel.html`,
            locale: 'es',
            billing_address_collection: 'required',
            shipping_address_collection: {
                allowed_countries: ['ES', 'PT', 'FR', 'IT', 'DE', 'BE', 'NL', 'AT'],
            },
        });

        res.status(200).json({ url: session.url });
    } catch (error) {
        console.error('Stripe error:', error);
        res.status(500).json({ error: error.message });
    }
}
