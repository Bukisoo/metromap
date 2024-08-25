import React, { useEffect } from 'react';
import { gapi } from 'gapi-script';

const CLIENT_ID = 'YOUR_CLIENT_ID.apps.googleusercontent.com';
const API_KEY = 'YOUR_API_KEY';
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
  }, []);

  const updateSigninStatus = (isSignedIn) => {
    if (isSignedIn) {
      onLoginSuccess();
    }
  };

  const handleLogin = () => {
    gapi.auth2.getAuthInstance().signIn();
  };

  return (
    <div>
      <h1>Welcome to MetroMap</h1>
      <button onClick={handleLogin}>Sign in with Google Drive</button>
    </div>
  );
};

export default LandingPage;
