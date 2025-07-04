 # Important Modules & Functions

 This document highlights key source files and their primary functions or classes.

 ## includes/

 - **auth.php**
   - `getCurrentUser()`: Retrieve the logged-in user's data.
   - `loginUser($userId)`: Establish a user session.
   - `logoutUser()`: Destroy the current user session.
   - `registerUser($username, $email)`: Create a new user record with passphrase fallback.

 - **webauthn.php**
   - `generateRegistrationOptions(int $userId, string $username)`: Create WebAuthn registration challenge.
   - `verifyRegistrationResponse(array $data, int $userId)`: Verify WebAuthn registration response.
   - `generateLoginOptions()`: Create WebAuthn login challenge.
   - `verifyLoginResponse(array $data, array $credentialSources)`: Verify WebAuthn login response.
   - Credential storage functions: `findOneByCredentialId()`, `findAllForUserEntity()`, `saveCredentialSource()`.

 - **utils.php**
   - `getDB()`: Initialize and return a PDO database connection.
   - `h($str)`: HTML escape helper.
   - `generateCSRFToken() / verifyCSRFToken($token)`: CSRF protection.
   - `redirect($url, $code)`: HTTP redirection helper.
   - `jsonResponse($data, $code)`: Send JSON API responses.
   - `getUserUploadDir($userId)`: Compute the filesystem path for user uploads.
   - `formatFileSize($bytes)`, `timeAgo($datetime)`, `generateSlug($str)`: General utility functions.
   - `isAdmin()`: Check if current user is an administrator.

 - **coin.php**
   - Displays the credit icon (`<img src=".../credit.gif">`).

 ## api/

 Each subdirectory (e.g., `api/media/`, `api/comments/`) contains endpoint handlers for CRUD operations on corresponding resources. The main router is `api/index.php`.

 ## pages/frag/

 Reusable PHP fragments for site-wide components:

 - `header.php`, `footer.php`, `menu.php`, etc.

 ## pages/js/

 - **router.js**: SPA-style navigation with `pushState`, dynamic HTML loading, and script initialization/cleanup.
 - **core.js**: Global page utilities (theme toggling, menu handling).

 ## bootstrap.php

 Application bootstrap logic: load environment, register autoloader, initialize session, establish DB.

 ## index.php

 The single entry point that loads `bootstrap.php`, includes page fragments, and delegates routing for all non-API web requests via the SPA router.