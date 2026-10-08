const SESSION_KEY = 'adSessionId';

// A random ID saved in the browser, so anonymous visitors can be recognised
export function getSessionId() {
    try {
        let id = localStorage.getItem(SESSION_KEY);
        if (!id) {
            id = (window.crypto && crypto.randomUUID)
                ? crypto.randomUUID()
                : Date.now() + '-' + Math.random().toString(36).slice(2);
            localStorage.setItem(SESSION_KEY, id);
        }
        return id;
    } catch (err) {
        return 'anonymous';
    }
}

// Fire and forget: tracking must never break or slow down the page
export function trackEvent(type, data = {}) {
    try {
        fetch('/api/v1/events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            keepalive: true,
            body: JSON.stringify({ sessionId: getSessionId(), type, ...data }),
        }).catch(() => { });
    } catch (err) { }
}