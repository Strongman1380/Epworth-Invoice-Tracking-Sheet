# Logo Setup Instructions

## Quick Steps to Add Your Logo

Your checkout page is configured to display the Jocelyn Michelle Lemke logo in the header.

### Option 1: Save the Logo File (Recommended)

1. Save your logo image as `logo.png` in the same directory as `index.html`
2. The recommended image should be:
   - **Format:** PNG (with transparent background preferred)
   - **Dimensions:** Approximately 200-300px wide
   - **Aspect Ratio:** The circular logo you have is perfect

### Option 2: Use a Different Filename

If you want to use a different filename (e.g., `jocelyn-logo.png`):

1. Save your logo image to the checkout directory
2. Open `index.html`
3. Find line 18: `<img src="logo.png" ...`
4. Change `logo.png` to your filename

### Logo Sizing

The logo is set to display at:
- **Desktop:** 80px height
- **Tablet:** 60px height
- **Mobile:** 50px height

To adjust these sizes, edit the following in `styles.css`:

```css
/* Line 68-70 - Desktop size */
.logo-image {
    height: 80px;  /* Change this value */
}

/* Line 451-453 - Tablet size */
@media (max-width: 768px) {
    .logo-image {
        height: 60px;  /* Change this value */
    }
}

/* Line 486-488 - Mobile size */
@media (max-width: 480px) {
    .logo-image {
        height: 50px;  /* Change this value */
    }
}
```

## Current Logo Location

The HTML references: `src="logo.png"`

This means the file should be at:
```
/Users/brandonhinrichs/Local Repositories/Websites/Coaching with Michelle Custom Checkout/logo.png
```

## Testing

After adding the logo file:
1. Open `index.html` in your browser
2. The logo should appear in the top-left corner
3. Hover over it to see a subtle zoom effect
4. Check on mobile to ensure it scales properly

---

**Note:** The logo from your brand (the circular gold-bordered "Jocelyn Lemke Women's Success Coach" design) will look perfect with the black and gold color scheme!