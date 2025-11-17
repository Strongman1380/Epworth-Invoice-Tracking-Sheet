/**
 * ========================================
 * COACHING WITH MICHELLE - CHECKOUT PAGE
 * ========================================
 *
 * This script handles:
 * - Payment option selection highlighting
 * - Dynamic Stripe link assignment based on selected payment plan
 * - Checkout button click handling
 *
 * TO INTEGRATE STRIPE:
 * 1. Update the stripeLinks object below with your actual Stripe payment links
 * 2. Each payment option needs its own unique Stripe link
 * 3. The script will automatically update the checkout button's link when a payment option is selected
 */

// ========================================
// STRIPE PAYMENT LINKS CONFIGURATION
// ========================================
// Actual Stripe payment links from your Stripe account
const stripeLinks = {
    // Program 1: The Confident Reset
    'reset-full': 'https://book.stripe.com/test_bJecN72pu7LxaFgbmm3oA00',

    // Program 2: Rebuild: The Confidence Foundation
    'rebuild-full': 'https://book.stripe.com/test_4gMcN74xC1n900C8aa3oA06',

    // Program 3: Thrive: Advanced Confidence Mastery
    'thrive-full': 'https://book.stripe.com/test_00w00ld48c1NeVwcqq3oA05',

    // Program 4: Confidence Mastery + VIP Support
    'vip-full': 'https://book.stripe.com/test_dRmcN7e8cfdZdRsbmm3oA04',

    // Program 5: The Empowered Identity Blueprint
    'blueprint-early': 'https://buy.stripe.com/test_dRm00l4xCc1NdRs3TU3oA0f', // Early PIF $5000
    'blueprint-full': 'https://buy.stripe.com/test_28E7sN0hme9V9Bc6223oA03', // PIF $5500
    'blueprint-3': 'https://buy.stripe.com/test_fZu6oJc048PB28K4XY3oA08', // 3 Payments
    'blueprint-4': 'https://buy.stripe.com/test_bJe28te8ce9V3cO1LM3oA0j', // 4 Payments
    'blueprint-6': 'https://buy.stripe.com/test_fZu4gBfcg1n9aFg2PQ3oA0i', // 6 Payments
    'blueprint-6-discount': 'https://buy.stripe.com/test_fZu4gBfcg1n9aFg2PQ3oA0i', // 6 Payments (using same as above - update if different)

    // Program 6: The Complete Reinvention Intensive
    'reinvention-early': 'https://book.stripe.com/test_bJe7sN2puc1N7t4aii3oA02', // Early PIF $7000
    'reinvention-full': 'https://buy.stripe.com/test_00wbJ3e8cd5RbJkcqq3oA0e', // PIF $7500 (using 4 payments link - update if you have a different one)
    'reinvention-2': 'https://buy.stripe.com/test_7sYeVf7JO4zl5kW8aa3oA0g', // 2 Payments
    'reinvention-4': 'https://buy.stripe.com/test_8x2cN70hm6HteVw0HI3oA0h', // 4 Payments

    // Program 7: The Pinnacle: Complete Life Mastery
    'pinnacle-full': 'https://buy.stripe.com/test_eVq8wR6FK7Lx4gSduu3oA0d', // Early PIF $14000
    'pinnacle-2': 'https://buy.stripe.com/test_eVq9AVaW0aXJfZAbmm3oA0c', // 2 Payments
    'pinnacle-4': 'https://buy.stripe.com/test_9B614pd488PBaFg4XY3oA0b', // 4 Payments
    'pinnacle-12': 'https://buy.stripe.com/test_3cIeVf6FK5DpaFg4XY3oA0a' // 12 Payments
};

// ========================================
// PAYMENT OPTION SELECTION HANDLER
// ========================================
function initializePaymentOptions() {
    // Get all payment option radio buttons
    const radioButtons = document.querySelectorAll('.payment-option input[type="radio"]');

    radioButtons.forEach(radio => {
        radio.addEventListener('change', function() {
            // Get the program card this radio button belongs to
            const programCard = this.closest('.program-card');
            const checkoutButton = programCard.querySelector('.checkout-btn');
            const paymentId = this.id;

            // Update the checkout button's Stripe link
            if (stripeLinks[paymentId]) {
                checkoutButton.setAttribute('data-stripe-link', stripeLinks[paymentId]);
            }

            // Optional: Update button text based on selection
            updateButtonText(checkoutButton, this);
        });
    });
}

// ========================================
// UPDATE BUTTON TEXT (OPTIONAL)
// ========================================
function updateButtonText(button, selectedRadio) {
    const label = selectedRadio.nextElementSibling;
    const optionLabel = label.querySelector('.option-label').textContent;
    const optionPrice = label.querySelector('.option-price').textContent;

    // You can customize the button text based on the selected payment option
    // For now, we'll keep the original button text
    // Uncomment below if you want dynamic button text:
    /*
    if (optionLabel.includes('Pay in Full')) {
        button.textContent = `Checkout - ${optionPrice}`;
    } else {
        button.textContent = `Start Payment Plan - ${optionPrice}`;
    }
    */
}

// ========================================
// CHECKOUT BUTTON HANDLER
// ========================================
function initializeCheckoutButtons() {
    const checkoutButtons = document.querySelectorAll('.checkout-btn');

    checkoutButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();

            const stripeLink = this.getAttribute('data-stripe-link');

            // Check if Stripe link is configured
            if (stripeLink.includes('[INSERT STRIPE LINK')) {
                // Show alert if Stripe link is not yet configured
                alert('⚠️ Stripe payment link not yet configured.\n\nPlease update the stripeLinks object in script.js with your Stripe payment link for this option.');
                console.error('Stripe link not configured:', stripeLink);
                return;
            }

            // Redirect to Stripe checkout
            window.location.href = stripeLink;

            // Optional: Track analytics
            trackCheckout(this);
        });
    });
}

// ========================================
// ANALYTICS TRACKING (OPTIONAL)
// ========================================
function trackCheckout(button) {
    const programCard = button.closest('.program-card');
    const programName = programCard.querySelector('.program-title').textContent;
    const selectedRadio = programCard.querySelector('input[type="radio"]:checked');
    const selectedOption = selectedRadio ? selectedRadio.nextElementSibling.querySelector('.option-label').textContent : 'Unknown';

    // Log to console (replace with your analytics service)
    console.log('Checkout initiated:', {
        program: programName,
        paymentOption: selectedOption,
        timestamp: new Date().toISOString()
    });

    // Example: Google Analytics (uncomment and configure if using GA)
    /*
    if (typeof gtag !== 'undefined') {
        gtag('event', 'begin_checkout', {
            'event_category': 'Checkout',
            'event_label': programName,
            'value': selectedRadio.value
        });
    }
    */

    // Example: Facebook Pixel (uncomment and configure if using FB Pixel)
    /*
    if (typeof fbq !== 'undefined') {
        fbq('track', 'InitiateCheckout', {
            content_name: programName,
            value: selectedRadio.value,
            currency: 'USD'
        });
    }
    */
}

// ========================================
// SMOOTH SCROLL TO PROGRAM (OPTIONAL)
// ========================================
function initializeSmoothScroll() {
    // If you add anchor links to specific programs, this enables smooth scrolling
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

// ========================================
// SCROLL ANIMATIONS (OPTIONAL)
// ========================================
function initializeScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -100px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    // Observe program cards for scroll animations
    document.querySelectorAll('.program-card').forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';
        card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(card);
    });
}

// ========================================
// INITIALIZE ON PAGE LOAD
// ========================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎯 Checkout page initialized');

    // Initialize all functionality
    initializePaymentOptions();
    initializeCheckoutButtons();
    initializeSmoothScroll();
    initializeScrollAnimations();

    // Set initial Stripe links for default selected options
    document.querySelectorAll('.program-card').forEach(card => {
        const selectedRadio = card.querySelector('input[type="radio"]:checked');
        const checkoutButton = card.querySelector('.checkout-btn');

        if (selectedRadio && checkoutButton) {
            const paymentId = selectedRadio.id;
            if (stripeLinks[paymentId]) {
                checkoutButton.setAttribute('data-stripe-link', stripeLinks[paymentId]);
            }
        }
    });

    console.log('✅ All systems ready');
});

// ========================================
// HELPER FUNCTIONS
// ========================================

/**
 * Format currency for display
 */
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    }).format(amount);
}

/**
 * Validate Stripe link format
 */
function isValidStripeLink(link) {
    return link.startsWith('https://buy.stripe.com/') ||
           link.startsWith('https://checkout.stripe.com/');
}

/**
 * Show loading state on button
 */
function showButtonLoading(button) {
    button.disabled = true;
    button.textContent = 'Processing...';
    button.style.opacity = '0.7';
}

/**
 * Reset button state
 */
function resetButtonState(button, originalText) {
    button.disabled = false;
    button.textContent = originalText;
    button.style.opacity = '1';
}

// ========================================
// EXPORT FOR TESTING (if needed)
// ========================================
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        stripeLinks,
        formatCurrency,
        isValidStripeLink
    };
}