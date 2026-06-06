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
        
        // get the url of the active tab
        let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        chrome.storage.local.get(['zcoder_token'], async (result) => {
            try {
                const res = await fetch('http://localhost:5000/api/bookmarks', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${result.zcoder_token}`
                    },
                    body: JSON.stringify({ url: tab.url })
                });

                if (res.ok) {
                    const btn = document.getElementById('sync-btn');
                    btn.innerText = "Problem Synced ✓";
                    btn.classList.add('success');
                    statusText.innerText = "Check your React dashboard!";
                    setTimeout(() => {
                        btn.innerText = "Save Current Page";
                        btn.classList.remove('success');
                        statusText.innerText = "";
                    }, 3000);
                } else {
                    statusText.innerText = "Failed to sync. Token expired?";
                }
            } catch (err) {
                statusText.innerText = "Error syncing problem.";
            }
        });
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