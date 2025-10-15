
import React, { useEffect } from 'react';

const ChatBot = () => {
  useEffect(() => {
    // Remove any existing scripts first
    const existingScript = document.querySelector('script[data-bot-id="52188"]');
    if (existingScript) {
      existingScript.remove();
    }

    // Create script element exactly as provided
    const script = document.createElement('script');
    script.src = 'https://app.aminos.ai/js/chat_plugin.js';
    script.setAttribute('data-bot-id', '52188');
    script.async = true;

    // Add load event listener for debugging
    script.onload = () => {
      console.log('Aminos AI chatbot script loaded successfully');
    };

    script.onerror = (error) => {
      console.error('Failed to load Aminos AI chatbot script:', error);
    };

    // Append to document head
    document.head.appendChild(script);

    // Cleanup function to remove script when component unmounts
    return () => {
      const scriptToRemove = document.querySelector('script[data-bot-id="52188"]');
      if (scriptToRemove && document.head.contains(scriptToRemove)) {
        document.head.removeChild(scriptToRemove);
      }
    };
  }, []);

  // Return null since the chatbot will inject itself into the page
  return null;
};

export default ChatBot;
