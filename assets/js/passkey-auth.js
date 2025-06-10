// assets/js/passkey-auth.js
// Utilities to register and login with WebAuthn passkeys

// Helpers to convert base64url strings <-> ArrayBuffers
function base64ToBuffer(base64) {
    base64 = base64.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) base64 += '=';
    const str = atob(base64);
    const buf = new ArrayBuffer(str.length);
    const view = new Uint8Array(buf);
    for (let i = 0; i < str.length; i++) view[i] = str.charCodeAt(i);
    return buf;
}

function bufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (const b of bytes) binary += String.fromCharCode(b);
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Register a new user account.
 * This function ONLY creates the user record and logs them in.
 */
export async function registerUser(username, email) {
    const resp = await fetch('/api/auth/register.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email }),
    });
    const result = await resp.json();
    if (!resp.ok || !result.success) {
        throw new Error(result.error || 'User registration failed');
    }
    return result;
}

/**
 * Register a new passkey for the CURRENTLY LOGGED IN user.
 * This should be called immediately after a successful registerUser call,
 * or on a profile page.
 */
export async function registerPasskey() {
    const resp = await fetch('/api/auth/register_passkey.php', { method: 'GET' });
    if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.error || 'Failed to get registration options');
    }
    const options = await resp.json();

    options.challenge = base64ToBuffer(options.challenge);
    options.user.id = base64ToBuffer(options.user.id);
    if (options.excludeCredentials) {
        options.excludeCredentials = options.excludeCredentials.map(c => ({
            ...c,
            id: base64ToBuffer(c.id),
        }));
    }

    const credential = await navigator.credentials.create({ publicKey: options });

    const attestationResponse = {
        id: credential.id,
        rawId: bufferToBase64(credential.rawId),
        type: credential.type,
        response: {
            clientDataJSON: bufferToBase64(credential.response.clientDataJSON),
            attestationObject: bufferToBase64(credential.response.attestationObject),
        },
    };

    const verifyResp = await fetch('/api/auth/register_passkey.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(attestationResponse),
    });

    const verifyJson = await verifyResp.json();
    if (!verifyJson.success) throw new Error(verifyJson.error || 'Passkey registration failed');
    return verifyJson;
}

/**
 * Login using a discoverable passkey (username-less flow).
 */
export async function loginPasskey() {
    const resp = await fetch('/api/auth/login_passkey.php');
    if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.error || 'Failed to get login options');
    }
    const options = await resp.json();

    options.challenge = base64ToBuffer(options.challenge);

    if (options.allowCredentials && options.allowCredentials.length > 0) {
        options.allowCredentials = options.allowCredentials.map(c => ({
            ...c,
            id: base64ToBuffer(c.id),
        }));
    }

    const assertion = await navigator.credentials.get({ publicKey: options });

    const assertionResponse = {
        id: assertion.id,
        rawId: bufferToBase64(assertion.rawId),
        type: assertion.type,
        response: {
            clientDataJSON: bufferToBase64(assertion.response.clientDataJSON),
            authenticatorData: bufferToBase64(assertion.response.authenticatorData),
            signature: bufferToBase64(assertion.response.signature),
            userHandle: assertion.response.userHandle ? bufferToBase64(assertion.response.userHandle) : null,
        },
    };

    const verifyResp = await fetch('/api/auth/login_passkey.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assertionResponse),
    });

    const verifyJson = await verifyResp.json();
    if (!verifyJson.success) throw new Error(verifyJson.error || 'Passkey login failed');
    return verifyJson;
}

/**
 * Logout the current user
 */
export async function logout() {
    await fetch('/api/auth/logout.php');
    window.location.href = '/?page=home';
}