use anyhow::Result;
use argon2::{
    password_hash::{rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};
use axum::{
    extract::FromRequestParts,
    http::{header::SET_COOKIE, HeaderMap},
    http::{request::Parts, StatusCode},
    response::IntoResponse,
    Json, RequestPartsExt,
};
use axum::{extract::State, response::Response};
use axum_extra::{
    headers::{authorization::Bearer, Authorization},
    TypedHeader,
};
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use serde_json::json;
use sqlx::postgres::PgPool;
use std::fmt::Display;
use std::sync::LazyLock;
use std::time::Instant;
use time::Duration;
use tower_cookies::Cookie;

static KEYS: LazyLock<Keys> = LazyLock::new(|| {
    let secret = std::env::var("JWT_SECRET").expect("JWT_SECRET must be set");
    Keys::new(secret.as_bytes())
});

#[derive(serde::Serialize)]
pub struct AuthResponse {
    status: String,
    message: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    sub: String,
    exp: usize,
}

#[derive(Debug, Serialize)]
pub struct AuthBody {
    access_token: String,
    token_type: String,
}

#[derive(Debug, Deserialize)]
struct AuthPayload {
    client_id: String,
    client_secret: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct User {
    email: String,
    password: String,
}

#[derive(Debug, Serialize)]
pub struct RegisterResponse {
    message: String,
}

#[derive(Clone)]
pub struct DbAuth {
    pool: PgPool,
}

pub async fn check(claims: Claims) -> Result<String, AuthError> {
    Ok(format!(
        "Welcome to the protected area :)\nYour data:\n{claims}",
    ))
}

pub async fn authorize(
    State(db_auth): State<DbAuth>,
    Json(payload): Json<User>,
) -> Result<(HeaderMap, Json<AuthResponse>), AuthError> {
    // Validate credentials
    if payload.email.is_empty() || payload.password.is_empty() {
        return Err(AuthError::MissingCredentials);
    }

    // Authenticate user and generate claims
    let claims = db_auth.authenticate_user(payload).await?;

    // Generate JWT token
    let token = encode(&Header::default(), &claims, &KEYS.encoding)
        .map_err(|_| AuthError::TokenCreation)?;

    // Create cookie
    let cookie = Cookie::build(("auth_token", token.clone()))
        .path("/")
        .secure(true)
        .http_only(true)
        // If your frontend and backend are on different domains, you'll need to set this
        .same_site(tower_cookies::cookie::SameSite::Lax)
        // Set cookie expiration to match your JWT expiration
        .max_age(Duration::hours(24));

    // Create response headers
    let mut headers = HeaderMap::new();
    headers.insert(SET_COOKIE, cookie.to_string().parse().unwrap());

    // Return success response with cookie
    Ok((
        headers,
        Json(AuthResponse {
            status: "success".to_string(),
            message: "Authentication successful".to_string(),
        }),
    ))
}

pub async fn register(
    State(db_auth): State<DbAuth>,
    Json(payload): Json<User>,
) -> Result<Json<RegisterResponse>, AuthError> {
    if payload.email.is_empty() || payload.password.is_empty() {
        return Err(AuthError::MissingCredentials);
    }

    let response = db_auth.register_user(payload).await?;

    Ok(Json(response))
}

impl Display for Claims {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "Email: {}", self.sub)
    }
}

impl AuthBody {
    fn new(access_token: String) -> Self {
        Self {
            access_token,
            token_type: "Bearer".to_string(),
        }
    }
}

impl<S> FromRequestParts<S> for Claims
where
    S: Send + Sync,
{
    type Rejection = AuthError;

    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        // extract the token from the authorization header
        let TypedHeader(Authorization(bearer)) = parts
            .extract::<TypedHeader<Authorization<Bearer>>>()
            .await
            .map_err(|_| AuthError::InvalidToken)?;
        // decode the user data
        let token_data = decode::<Claims>(bearer.token(), &KEYS.decoding, &Validation::default())
            .map_err(|_| AuthError::InvalidToken)?;

        Ok(token_data.claims)
    }
}

struct Keys {
    encoding: EncodingKey,
    decoding: DecodingKey,
}

impl Keys {
    fn new(secret: &[u8]) -> Self {
        Self {
            encoding: EncodingKey::from_secret(secret),
            decoding: DecodingKey::from_secret(secret),
        }
    }
}

impl DbAuth {
    pub async fn new(database_url: &str) -> Result<Self> {
        let pool = PgPool::connect(database_url).await?;

        // Create users table if it doesn't exist
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
            "#,
        )
        .execute(&pool)
        .await?;

        Ok(Self { pool })
    }

    pub async fn register_user(&self, user: User) -> Result<RegisterResponse, AuthError> {
        // Check if user already exists
        let start1 = Instant::now();

        let exists = sqlx::query!(
            "SELECT EXISTS(SELECT 1 FROM users WHERE email = $1) as exists",
            user.email
        )
        .fetch_one(&self.pool)
        .await?
        .exists
        .unwrap_or(false);

        if exists {
            return Err(AuthError::UserAlreadyExists);
        }

        let duration1 = start1.elapsed();
        tracing::info!("check if user exists processed in: {:?}", duration1);

        let start2 = Instant::now();

        let salt = SaltString::generate(&mut OsRng);

        // i configured Argon2 with parameters that reduces security for faster hashing
        let argon2 = Argon2::new(
            argon2::Algorithm::Argon2id,
            argon2::Version::V0x13,
            argon2::Params::new(256, 2, 1, Some(16)).map_err(|_| AuthError::PasswordHashError)?,
        );
        // in prod if server has good hardware you can probably set params back to default TODO

        let password_hash = argon2
            .hash_password(user.password.as_bytes(), &salt)
            .map_err(|_| AuthError::PasswordHashError)?
            .to_string();

        let duration2 = start2.elapsed();
        tracing::info!("hashing processed in: {:?}", duration2);
        let start3 = Instant::now();

        sqlx::query!(
            "INSERT INTO users (email, password_hash) VALUES ($1, $2)",
            user.email,
            password_hash,
        )
        .execute(&self.pool)
        .await?;

        let duration3 = start3.elapsed();
        tracing::info!("db insert processed in: {:?}", duration3);

        Ok(RegisterResponse {
            message: "User registered successfully".to_string(),
        })
    }

    pub async fn authenticate_user(&self, user: User) -> Result<Claims, AuthError> {
        let db_user = sqlx::query!(
            "SELECT password_hash FROM users WHERE email = $1",
            user.email
        )
        .fetch_optional(&self.pool)
        .await?;

        let db_user = db_user.ok_or(AuthError::WrongCredentials)?;

        // Verify password
        let parsed_hash =
            PasswordHash::new(&db_user.password_hash).map_err(|_| AuthError::PasswordHashError)?;

        Argon2::default()
            .verify_password(user.password.as_bytes(), &parsed_hash)
            .map_err(|_| AuthError::WrongCredentials)?; // Create JWT claims

        Ok(Claims {
            sub: user.email,
            exp: 2000000000, // May 2033
        })
    }
}

#[derive(Debug, thiserror::Error)]
pub enum AuthError {
    #[error("Wrong credentials")]
    WrongCredentials,
    #[error("Missing credentials")]
    MissingCredentials,
    #[error("Invalid token")]
    InvalidToken,
    #[error("Token creation error")]
    TokenCreation,
    #[error("User already exists")]
    UserAlreadyExists,
    #[error("Database error")]
    DatabaseError(#[from] sqlx::Error),
    #[error("Password hashing error")]
    PasswordHashError,
}

impl IntoResponse for AuthError {
    fn into_response(self) -> axum::response::Response {
        let (status, error_message) = match self {
            AuthError::WrongCredentials => (StatusCode::UNAUTHORIZED, "Wrong credentials"),
            AuthError::UserAlreadyExists => (StatusCode::CONFLICT, "User already exists"),
            AuthError::DatabaseError(_) => (StatusCode::INTERNAL_SERVER_ERROR, "Database error"),
            AuthError::PasswordHashError => (
                StatusCode::INTERNAL_SERVER_ERROR,
                "Password processing error",
            ),
            AuthError::MissingCredentials => (StatusCode::BAD_REQUEST, "Missing credentials"),
            AuthError::InvalidToken => (StatusCode::UNAUTHORIZED, "Invalid token"),
            AuthError::TokenCreation => (StatusCode::INTERNAL_SERVER_ERROR, "Token creation error"),
        };
        let body = Json(json!({
            "error": error_message,
        }));
        (status, body).into_response()
    }
}
