// LandingPage.js

import React, { useEffect } from 'react';
import { gapi } from 'gapi-script';
import './LandingPage.css';
// Import your logo and main visual images
import logo from './logo.svg'; // Replace with your actual logo path
import mainVisual from './illustration.jpg'; // Replace with your actual main visual path

const CLIENT_ID = process.env.REACT_APP_CLIENT_ID;
const API_KEY = process.env.REACT_API_KEY;
const SCOPES = 'https://www.googleapis.com/auth/drive.file';

const LandingPage = ({ onLoginSuccess }) => {
  useEffect(() => {
    const initClient = () => {
      gapi.client.init({
        apiKey: API_KEY,
        clientId: CLIENT_ID,
        scope: SCOPES,
        discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
      }).then(() => {
        gapi.auth2.getAuthInstance().isSignedIn.listen(updateSigninStatus);
        updateSigninStatus(gapi.auth2.getAuthInstance().isSignedIn.get());
      });
    };
    gapi.load('client:auth2', initClient);
  },);

  const updateSigninStatus = (isSignedIn) => {
    if (isSignedIn) {
      onLoginSuccess();
    }
  };

  const handleLogin = () => {
    const authInstance = gapi.auth2.getAuthInstance();
    authInstance.signIn().then(() => {
      // This triggers even if it's the first time and permissions are asked
      updateSigninStatus(authInstance.isSignedIn.get());
    }).catch((err) => {
      console.error('Sign-in error:', err);
    });
  };

  return (
    <div className="landing-page">
      {/* Logo */}
      <div className="landing-logo-section">
        <img src={logo} alt="MetroMap Logo" className="landing-logo" />
      </div>

      {/* Main Visual Image */}
      <div className="landing-main-visual">
        <img
          src={mainVisual}
          alt="MetroMap Main Visual"
          className="main-visual-image"
        />
      </div>

      {/* Text Section */}
      <div className="landing-text-section">
        <h1 className="landing-title">Every note is a station, every connection reveal a vision.</h1>
        <div className="landing-description">
          <p>
            Organize and connect your ideas with MetroMap, the tool that turns your thoughts into clear, visual maps. Every note is a station, every connection a new path, making it perfect for brainstorming, planning, and managing personal or professional projects.

            Add notes on the fly, style them with a rich text editor, and rearrange them effortlessly with drag and drop. MetroMap keeps everything within reach, helping you rediscover old ideas and weave them back into your workflow with ease.

            Whether you're tackling big plans or keeping track of life’s details, MetroMap combines simplicity, elegance, and flexibility to keep you organized and inspired. </p>
        </div>
        <button className="signin-button" onClick={handleLogin}>
          Sign in with Google Drive
        </button>
      </div>

      {/* Footer */}
      <footer className="landing-footer">
        <p>
          © {new Date().getFullYear()} MetroMap. All rights reserved.
          {' '}
          <a
            href="/#/privacy-policy"
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: '0.85em', color: 'gray',}}
          >
            Privacy Policy
          </a>
        </p>
      </footer>
    </div>
  );
};

export default LandingPage;
