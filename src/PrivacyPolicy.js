// src/PrivacyPolicy.js

import React from 'react';
import './PrivacyPolicy.css'; // Create this CSS file for styling
import logo from './logo.svg'; // Optional: Include your logo

const PrivacyPolicy = () => {
    return (
        <div class="privacy-policy-wrapper">
            <div className="privacy-policy-container">
                <header className="privacy-header">
                    <img src={logo} alt="MetroMap Logo" className="privacy-logo" />
                    <h1>Privacy Policy</h1>
                </header>
                <main className="privacy-content">
                    <p><strong>Effective Date:</strong> November 26, 2024</p>

                    <h2>1. Overview</h2>
                    <p>
                        MetroMap does not store, process, or collect personal data on its servers. The only interaction between your device and our servers occurs during the initial connection when we serve the application’s webpage. All subsequent interactions, including data storage and communication, occur directly between your device and Google Drive via Google’s APIs.
                    </p>

                    <h2>2. Use of Google APIs</h2>
                    <p>
                        MetroMap uses Google APIs to enable users to connect to their Google Drive accounts. By signing in with Google, you grant MetroMap permission to interact with your Google Drive files as necessary for the app’s functionality. This includes reading and saving data directly to your Google Drive account.
                    </p>
                    <p>
                        MetroMap itself does not access or retain your personal data. For more information on how Google handles your data, please refer to <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">Google’s Privacy Policy</a>.
                    </p>

                    <h2>3. Cookies</h2>
                    <p>
                        MetroMap uses cookies provided by Google APIs to manage authentication and facilitate connections to Google Drive. These cookies are:
                    </p>
                    <ul>
                        <li><strong>Essential:</strong> Required for the core functionality of the app, such as logging in and maintaining a secure session.</li>
                        <li><strong>Non-Tracking:</strong> Not used for tracking, analytics, or marketing purposes.</li>
                    </ul>
                    <p>
                        If you wish to manage or delete cookies, you can do so through your browser’s settings. For more details, consult your browser’s help documentation.
                    </p>

                    <h2>4. Data Security</h2>
                    <p>
                        MetroMap does not store any of your data. All interactions with Google Drive are handled securely through Google’s APIs. Please review <a href="https://support.google.com/accounts/answer/3466521" target="_blank" rel="noopener noreferrer">Google’s security measures</a> for additional information.
                    </p>

                    <h2>5. User Consent</h2>
                    <p>
                        By using MetroMap, you consent to the use of Google APIs for authentication and data interaction. This includes the use of cookies necessary for these processes.
                    </p>

                    <h2>6. Third-Party Services</h2>
                    <p>
                        MetroMap relies on Google APIs to provide its core functionality. These services are governed by Google’s terms and policies, which we encourage you to review:
                    </p>
                    <ul>
                        <li><a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">Google Privacy Policy</a></li>
                        <li><a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer">Google Terms of Service</a></li>
                    </ul>

                    <h2>7. Changes to This Privacy Policy</h2>
                    <p>
                        We may update this Privacy Policy from time to time to reflect changes in legal requirements or our services. Any updates will be posted on this page with an updated effective date.
                    </p>

                    <h2>8. Contact Us</h2>
                    <p>
                        If you have any questions or concerns about this Privacy Policy, you can contact us at:
                    </p>
                    <p><strong>Email:</strong> <a href="mailto:lukaspansardi@gmail.com">lukaspansardi@gmail.com</a></p>
                </main>
            </div>
        </div>
    );
};

export default PrivacyPolicy;
