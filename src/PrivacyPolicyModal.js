// src/PrivacyPolicyModal.js

import React, { useEffect, useRef } from 'react';
import './PrivacyPolicyModal.css';

const PrivacyPolicyModal = ({ onClose }) => {
    const modalRef = useRef(null);
    const closeButtonRef = useRef(null);

    useEffect(() => {
        // Disable scrolling on the body
        document.body.style.overflow = 'hidden';

        // Focus on the close button when the modal opens
        if (closeButtonRef.current) {
            closeButtonRef.current.focus();
        }

        // Trap focus within the modal
        const handleTab = (e) => {
            const focusableElements = modalRef.current.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];

            if (e.key === 'Tab') {
                if (e.shiftKey) { // Shift + Tab
                    if (document.activeElement === firstElement) {
                        e.preventDefault();
                        lastElement.focus();
                    }
                } else { // Tab
                    if (document.activeElement === lastElement) {
                        e.preventDefault();
                        firstElement.focus();
                    }
                }
            }
        };

        window.addEventListener('keydown', handleTab);

        return () => {
            // Re-enable scrolling when the modal closes
            document.body.style.overflow = 'auto';
            window.removeEventListener('keydown', handleTab);
        };
    }, [onClose]);

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div
                className="modal-content"
                onClick={(e) => e.stopPropagation()}
                ref={modalRef}
                aria-modal="true"
                role="dialog"
                aria-labelledby="privacy-policy-title"
            >
                <button
                    className="modal-close-button"
                    onClick={onClose}
                    aria-label="Close Privacy Policy"
                    ref={closeButtonRef}
                >
                    &times;
                </button>
                <h2 id="privacy-policy-title">Privacy Policy</h2>
                <div className="modal-body">
                    <p>
                        Welcome to MetroMap! Your privacy is important to us. This application does not store any personal data on our servers. The only interaction between you and our servers occurs when you connect, serving the application page. All subsequent communications are directly between your device and Google Drive via Google's APIs. The only cookies used are those necessary for Google authentication.
                    </p>
                    <p>
                        We use cookies provided by Google APIs to manage authentication and connection to Google Drive. These cookies are essential for the functioning of the app and are not used for tracking or marketing purposes.
                    </p>
                    <p>
                        For more detailed information, please refer to Google's [Privacy Policy](https://policies.google.com/privacy).
                    </p>
                </div>
            </div>
        </div>
    );
};

export default PrivacyPolicyModal;
