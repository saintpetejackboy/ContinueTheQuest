<?php
// includes/webauthn.php

require_once __DIR__ . '/../vendor/autoload.php';

use Webauthn\PublicKeyCredentialCreationOptions;
use Webauthn\PublicKeyCredentialRequestOptions;
use Webauthn\PublicKeyCredentialSource;
use Webauthn\PublicKeyCredentialUserEntity;
use Webauthn\PublicKeyCredentialParameters;
use Webauthn\PublicKeyCredentialDescriptor;
use Webauthn\AuthenticatorSelectionCriteria;

// For verification
use Webauthn\AuthenticatorAttestationResponseValidator;
use Webauthn\AuthenticatorAssertionResponseValidator;
use Webauthn\PublicKeyCredentialRpEntity;
use Webauthn\AttestationStatement\AttestationStatementSupportManager;
use Webauthn\AttestationStatement\NoneAttestationStatementSupport;
use Webauthn\AttestationStatement\AttestationObjectLoader;
use Webauthn\PublicKeyCredentialLoader;
use Webauthn\AuthenticatorAttestationResponse;
use Webauthn\AuthenticatorAssertionResponse;
use Webauthn\TrustPath\EmptyTrustPath;
use Symfony\Component\Uid\Uuid;

// For PSR-7 HTTP message handling
use Nyholm\Psr7\Factory\Psr17Factory;
use Nyholm\Psr7Server\ServerRequestCreator;
use Psr\Http\Message\ServerRequestInterface;

class InmemoryPublicKeyCredentialSourceRepository implements \Webauthn\PublicKeyCredentialSourceRepository
{
    private $sources = [];

    public function findOneByCredentialId(string $publicKeyCredentialId): ?PublicKeyCredentialSource
    {
        return $this->sources[$publicKeyCredentialId] ?? null;
    }

    public function findAllForUserEntity(PublicKeyCredentialUserEntity $publicKeyCredentialUserEntity): array
    {
        return array_values(array_filter($this->sources, fn($source) => $source->getUserHandle() === $publicKeyCredentialUserEntity->getId()));
    }

    public function saveCredentialSource(PublicKeyCredentialSource $publicKeyCredentialSource): void
    {
        $this->sources[$publicKeyCredentialSource->getPublicKeyCredentialId()] = $publicKeyCredentialSource;
    }
}

/**
 * Get PSR-7 compatible request object from global variables.
 */
function getPsr7Request(): ServerRequestInterface
{
    $psr17Factory = new Psr17Factory();
    $creator = new ServerRequestCreator($psr17Factory, $psr17Factory, $psr17Factory, $psr17Factory);
    return $creator->fromGlobals();
}



/**
 * Base64Url encoding helper.
 */
function base64url_encode(string $data): string
{
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

/**
 * Generates options for a WebAuthn registration ceremony.
 */
function generateRegistrationOptions(int $userId, string $username): PublicKeyCredentialCreationOptions
{
    $rpEntity = new PublicKeyCredentialRpEntity(
        getenv('RP_NAME'),
        getenv('RP_ID'),
        null
    );

    $userEntity = new PublicKeyCredentialUserEntity(
        $username,
        (string) $userId,
        $username
    );

    $challenge = random_bytes(32);
    $_SESSION['challenge'] = $challenge;

    $credentialParametersList = [
        new PublicKeyCredentialParameters('public-key', -7),   // ES256
        new PublicKeyCredentialParameters('public-key', -257), // RS256
    ];

    $authenticatorSelection = new AuthenticatorSelectionCriteria(
        null,
        AuthenticatorSelectionCriteria::USER_VERIFICATION_REQUIREMENT_REQUIRED,
        AuthenticatorSelectionCriteria::RESIDENT_KEY_REQUIREMENT_REQUIRED,
        true
    );

    return new PublicKeyCredentialCreationOptions(
        $rpEntity,
        $userEntity,
        $challenge,
        $credentialParametersList,
        $authenticatorSelection,
        'direct',
        [],
        30000,
        null
    );
}

/**
 * Generates options for a WebAuthn "username-less" login ceremony.
 */
function generateLoginOptions(): PublicKeyCredentialRequestOptions
{
    $challenge = random_bytes(32);
    $_SESSION['challenge'] = $challenge;

    $allowedCredentials = [];

    return new PublicKeyCredentialRequestOptions(
        $challenge,
        getenv('RP_ID'),
        $allowedCredentials,
        'required',
        30000,
        null
    );
}

/**
 * Verifies a WebAuthn registration response.
 * 
 * @throws Exception If validation fails or challenge is missing.
 */
function verifyRegistrationResponse(array $data, int $userId): PublicKeyCredentialSource
{
    $publicKeyCredentialSourceRepository = new InmemoryPublicKeyCredentialSourceRepository();
    $rpEntity = new PublicKeyCredentialRpEntity(getenv('RP_NAME'), getenv('RP_ID'));

    $attestationStatementSupportManager = AttestationStatementSupportManager::create();
    $attestationStatementSupportManager->add(new NoneAttestationStatementSupport());

    $attestationObjectLoader = new AttestationObjectLoader($attestationStatementSupportManager);
    $publicKeyCredentialLoader = new PublicKeyCredentialLoader($attestationObjectLoader);

    $attestationResponseValidator = new AuthenticatorAttestationResponseValidator(
        $attestationStatementSupportManager,
        $publicKeyCredentialSourceRepository,
        null,
        null,
        null,
        null,
        $rpEntity
    );

    $challenge = $_SESSION['challenge'] ?? null;
    if ($challenge === null) {
        throw new Exception('Challenge not found in session. Registration options might not have been generated.');
    }
    unset($_SESSION['challenge']);

    $publicKeyCredentialCreationOptions = new PublicKeyCredentialCreationOptions(
        $rpEntity,
        new PublicKeyCredentialUserEntity('user', (string) $userId, 'user'),
        $challenge,
        [],
        null,
        'direct',
        [],
        30000,
        null
    );

    $publicKeyCredential = $publicKeyCredentialLoader->load(json_encode($data));

    if (!$publicKeyCredential->getResponse() instanceof AuthenticatorAttestationResponse) {
        throw new Exception('Invalid response type. Expected AuthenticatorAttestationResponse.');
    }

    $validatedPublicKeyCredentialSource = $attestationResponseValidator->check(
        $publicKeyCredential->getResponse(),
        $publicKeyCredentialCreationOptions,
        getPsr7Request()
    );

    return $validatedPublicKeyCredentialSource;
}

/**
 * Verifies a WebAuthn login (assertion) response.
 * 
 * @throws Exception If validation fails or challenge is missing.
 */
function verifyLoginResponse(array $data, array $credentialSources): PublicKeyCredentialSource
{
    $publicKeyCredentialSourceRepository = new InmemoryPublicKeyCredentialSourceRepository();
    
    foreach ($credentialSources as $source) {
        $aaguid = isset($source['aaguid']) ? Uuid::fromString($source['aaguid']) : Uuid::fromString('00000000-0000-0000-0000-000000000000');

        $publicKeyCredentialSourceRepository->saveCredentialSource(
            new PublicKeyCredentialSource(
                base64url_decode($source['credential_id']),
                'public-key',
                explode(',', $source['transports'] ?? ''),
                $source['attestation_type'] ?? 'none',
                new EmptyTrustPath(),
                $aaguid,
                base64url_decode($source['public_key']),
                (string) $source['user_id'],
                (int) $source['sign_count']
            )
        );
    }

    $rpEntity = new PublicKeyCredentialRpEntity(getenv('RP_NAME'), getenv('RP_ID'));

    $assertionResponseValidator = new AuthenticatorAssertionResponseValidator(
        $publicKeyCredentialSourceRepository,
        null,
        null,
        null,
        null,
        null,
        $rpEntity
    );

    $challenge = $_SESSION['challenge'] ?? null;
    if ($challenge === null) {
        throw new Exception('Challenge not found in session. Login options might not have been generated.');
    }
    unset($_SESSION['challenge']);

    $allowedCredentials = array_map(
        fn($source) => new PublicKeyCredentialDescriptor(
            'public-key',
            base64url_decode($source['credential_id'])
        ),
        $credentialSources
    );

    $publicKeyCredentialRequestOptions = new PublicKeyCredentialRequestOptions(
        $challenge,
        getenv('RP_ID'),
        $allowedCredentials,
        'required',
        30000,
        null
    );

    $attestationObjectLoader = new AttestationObjectLoader(AttestationStatementSupportManager::create());
    $publicKeyCredentialLoader = new PublicKeyCredentialLoader($attestationObjectLoader);
    $publicKeyCredential = $publicKeyCredentialLoader->load(json_encode($data));

    $response = $publicKeyCredential->getResponse();
    if (!$response instanceof AuthenticatorAssertionResponse) {
        throw new Exception('Invalid response type. Expected AuthenticatorAssertionResponse.');
    }

    $validatedPublicKeyCredentialSource = $assertionResponseValidator->check(
        $publicKeyCredential->getRawId(),
        $response,
        $publicKeyCredentialRequestOptions,
        getPsr7Request(),
        $response->getUserHandle()
    );

    return $validatedPublicKeyCredentialSource;
}