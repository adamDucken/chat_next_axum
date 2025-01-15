mod auth;
mod chat;
mod cors;
use auth::{authorize, check, register, DbAuth};
use axum::{
    routing::{get, post},
    Router,
};
use cors::create_cors_layer;
use dotenvy::dotenv;
use std::env;
use std::{
    collections::HashSet,
    sync::{Arc, Mutex},
};
use tokio::sync::broadcast;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

// Our shared state
struct AppState {
    // We require unique usernames. This tracks which usernames have been taken.
    user_set: Mutex<HashSet<String>>,
    // Channel used to send messages to all connected clients.
    tx: broadcast::Sender<String>,
}

#[tokio::main]
async fn main() {
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| format!("{}=trace", env!("CARGO_CRATE_NAME")).into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    // Set up application state for use with with_state().
    let user_set = Mutex::new(HashSet::new());
    let (tx, _rx) = broadcast::channel(100);

    // probably can replace this with lazy lock TODO
    dotenv().ok();
    let database_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");

    let app_state = Arc::new(AppState { user_set, tx });

    let db_auth = DbAuth::new(&database_url)
        .await
        .expect("Failed to connect to database");

    let app = Router::new()
        .route("/check", get(check))
        .route("/authorize", post(authorize))
        .route("/register", post(register))
        .with_state(db_auth)
        .route("/websocket", get(chat::websocket_handler))
        .layer(create_cors_layer())
        .with_state(app_state);

    let listener = tokio::net::TcpListener::bind("127.0.0.1:3001")
        .await
        .unwrap();
    tracing::debug!("listening on {}", listener.local_addr().unwrap());
    axum::serve(listener, app).await.unwrap();
}
