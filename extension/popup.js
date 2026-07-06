document.addEventListener('DOMContentLoaded', async () => {
    const loginView = document.getElementById('login-view');
    const syncView = document.getElementById('sync-view');
    const statusText = document.getElementById('status');

    // check if we already have a jwt token saved in the browser extension storage
    chrome.storage.local.get(['zcoder_token'], (result) => {
        if (result.zcoder_token) {
            loginView.classList.add('hidden');
            syncView.classList.remove('hidden');
        }
    });

    // handle login
    document.getElementById('login-btn').addEventListener('click', async () => {
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        statusText.innerText = "Authenticating...";

        try {
            const res = await fetch('http://localhost:5000/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();

            if (res.ok) {
                chrome.storage.local.set({ zcoder_token: data.token }, () => {
                    loginView.classList.add('hidden');
                    syncView.classList.remove('hidden');
                    statusText.innerText = "Linked to Z-Coder!";
                });
            } else {
                statusText.innerText = data.error || "Login failed.";
            }
        } catch (err) {
            statusText.innerText = "Backend offline. Check Node server.";
        }
    });

    // handle capturing the current url and syncing it
    document.getElementById('sync-btn').addEventListener('click', async () => {
        statusText.innerText = "Capturing...";
        
        try {
            // get the url of the active tab
            let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (!tab || !tab.url) {
                statusText.innerText = "Error: Could not read page URL.";
                return;
            }
            
            chrome.storage.local.get(['zcoder_token'], async (result) => {
                if (!result.zcoder_token) {
                    statusText.innerText = "Error: Not logged in.";
                    return;
                }

                try {
                    const response = await fetch('http://localhost:5000/api/bookmarks', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${result.zcoder_token}` 
                        },
                        body: JSON.stringify({ url: tab.url }) 
                    });

                    // Check if the backend sent an error (like our duplicate 400 error)
                    if (!response.ok) {
                        const errorData = await response.json();
                        // FIX 3: Use the statusText variable defined at the top of the file
                        statusText.innerText = errorData.error || "Failed to sync. Token expired?";
                        return; 
                    }

                    // If successful:
                    statusText.innerText = "Problem Synced Successfully!";
                    
                } catch (error) {
                    // This catches actual server crashes or offline servers
                    statusText.innerText = "Server offline or connection failed.";
                }
            });
        } catch (err) {
            statusText.innerText = "Extension error capturing tab.";
        }
    });

    // handle logout
    document.getElementById('logout-btn').addEventListener('click', () => {
        chrome.storage.local.remove('zcoder_token', () => {
            syncView.classList.add('hidden');
            loginView.classList.remove('hidden');
            statusText.innerText = "Disconnected.";
        });
    });
});