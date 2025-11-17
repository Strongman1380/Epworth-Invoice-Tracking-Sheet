# Coaching with Michelle - Custom Checkout Page

A beautiful, production-ready checkout page for coaching programs with multiple payment options and Stripe integration.

## Features

- ✨ Elegant design matching your brand aesthetic
- 🎨 Gold and black luxury color scheme
- 📱 Fully responsive (mobile, tablet, desktop)
- 💳 Multiple payment plan options per program
- 🔒 Ready for Stripe payment integration
- ⚡ Smooth animations and transitions
- 🎯 Clear visual feedback for selected options
- 📊 Built-in analytics tracking hooks

## File Structure

```
/
├── index.html          # Main HTML structure
├── styles.css          # All styling and responsive design
├── script.js           # Payment selection and Stripe integration logic
└── README.md           # This file
```

## Programs Included

1. **The Confident Reset** - $97
2. **Rebuild: The Confidence Foundation** - $397
3. **Thrive: Advanced Confidence Mastery** - $697
4. **Confidence Mastery + VIP Support** - $997
5. **The Empowered Identity Blueprint** - Multiple payment options
6. **The Complete Reinvention Intensive** - Multiple payment options
7. **The Pinnacle: Complete Life Mastery** - Multiple payment options

## How to Integrate Stripe

### Step 1: Create Stripe Payment Links

1. Log into your [Stripe Dashboard](https://dashboard.stripe.com/)
2. Go to **Products** → **Payment Links**
3. Create a payment link for each payment option:
   - Set the product name
   - Set the price
   - Configure recurring billing if it's a payment plan
   - Copy the generated payment link

### Step 2: Update the JavaScript File

Open `script.js` and find the `stripeLinks` object (around line 23):

```javascript
const stripeLinks = {
    // Replace these placeholders with your actual Stripe links
    'reset-full': 'https://buy.stripe.com/YOUR_LINK_HERE',
    'rebuild-full': 'https://buy.stripe.com/YOUR_LINK_HERE',
    // ... etc
};
```

### Step 3: Map Your Stripe Links

Replace each placeholder with the corresponding Stripe payment link:

| Payment ID | Program | Amount | Replace With |
|------------|---------|--------|--------------|
| `reset-full` | The Confident Reset | $97 | Your Stripe link |
| `rebuild-full` | Rebuild Foundation | $397 | Your Stripe link |
| `thrive-full` | Thrive Mastery | $697 | Your Stripe link |
| `vip-full` | VIP Support | $997 | Your Stripe link |
| `blueprint-early` | Blueprint Early PIF | $5,000 | Your Stripe link |
| `blueprint-full` | Blueprint PIF | $5,500 | Your Stripe link |
| `blueprint-3` | Blueprint 3 payments | $1,897/mo | Your Stripe link |
| `blueprint-4` | Blueprint 4 payments | $1,496/mo | Your Stripe link |
| `blueprint-6` | Blueprint 6 payments | $997/mo | Your Stripe link |
| `blueprint-6-discount` | Blueprint 6 payments | $897/mo | Your Stripe link |
| `reinvention-early` | Reinvention Early PIF | $7,000 | Your Stripe link |
| `reinvention-full` | Reinvention PIF | $7,500 | Your Stripe link |
| `reinvention-2` | Reinvention 2 payments | $3,897/mo | Your Stripe link |
| `reinvention-4` | Reinvention 4 payments | $1,997/mo | Your Stripe link |
| `pinnacle-full` | Pinnacle PIF | $14,000 | Your Stripe link |
| `pinnacle-2` | Pinnacle 2 payments | $7,687.50/mo | Your Stripe link |
| `pinnacle-4` | Pinnacle 4 payments | $3,937.50/mo | Your Stripe link |
| `pinnacle-12` | Pinnacle 12 payments | $1,437.50/mo | Your Stripe link |

### Example:

```javascript
const stripeLinks = {
    'reset-full': 'https://buy.stripe.com/test_abc123def456',
    'rebuild-full': 'https://buy.stripe.com/test_ghi789jkl012',
    // ... continue for all payment options
};
```

## Testing Before Going Live

1. **Use Stripe Test Mode**
   - Create test payment links first
   - Test the full checkout flow
   - Verify each payment option redirects correctly

2. **Check Console**
   - Open browser DevTools (F12)
   - Look for any errors in the Console tab
   - Verify checkout events are being logged

3. **Mobile Testing**
   - Test on actual mobile devices
   - Check that all buttons are clickable
   - Verify responsive layout works correctly

## Customization

### Colors
Edit the CSS variables in `styles.css` (lines 6-14):

```css
:root {
    --gold-primary: #D4AF37;
    --gold-light: #E8C879;
    --black: #0A0A0A;
    /* ... etc */
}
```

### Fonts
The page uses:
- **Cinzel** for headings (elegant serif)
- **Montserrat** for body text (modern sans-serif)

To change fonts, update the Google Fonts import in `index.html` and the CSS variables.

### Button Text
To change checkout button text, edit the button elements in `index.html`:

```html
<button class="checkout-btn" data-stripe-link="...">
    Your Custom Button Text
</button>
```

### Program Cards
To add, remove, or modify programs, edit the `.program-card` sections in `index.html`.

## Analytics Integration

The code includes placeholder functions for analytics tracking. Uncomment and configure in `script.js`:

### Google Analytics
```javascript
gtag('event', 'begin_checkout', {
    'event_category': 'Checkout',
    'event_label': programName,
    'value': selectedRadio.value
});
```

### Facebook Pixel
```javascript
fbq('track', 'InitiateCheckout', {
    content_name: programName,
    value: selectedRadio.value,
    currency: 'USD'
});
```

## Browser Support

- ✅ Chrome (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Edge (latest)
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

## Deployment

### Option 1: Simple Hosting
1. Upload all files to your web host
2. Ensure all files are in the same directory
3. Navigate to `index.html` in your browser

### Option 2: With Your Existing Website
1. Upload files to a `/checkout` subdirectory
2. Link to it from your main website
3. Update header links if needed

### Option 3: Vercel/Netlify
1. Push files to a GitHub repository
2. Connect to Vercel or Netlify
3. Deploy with one click

## Security Notes

- ✅ No sensitive data is stored locally
- ✅ All payment processing happens on Stripe's secure servers
- ✅ HTTPS is required for production use
- ✅ No credit card data ever touches your server

## Support & Troubleshooting

### Payment buttons not working?
- Check browser console for errors
- Verify Stripe links are correctly formatted
- Ensure JavaScript is enabled

### Styling looks off?
- Clear browser cache
- Check that `styles.css` is loading
- Verify no CSS conflicts with existing styles

### Mobile layout issues?
- Test in responsive design mode (DevTools)
- Check viewport meta tag is present
- Verify CSS media queries are working

## Future Enhancements

Consider adding:
- [ ] Discount code input
- [ ] Email capture before checkout
- [ ] Comparison table between programs
- [ ] Video previews for each program
- [ ] Testimonials section
- [ ] FAQ accordion
- [ ] Live chat integration

## License

This checkout page was custom-built for Coaching with Michelle. All rights reserved.

---

**Built with ❤️ for empowering women**

For questions or modifications, contact your developer.