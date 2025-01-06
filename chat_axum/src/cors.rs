use http::header::{ACCESS_CONTROL_ALLOW_CREDENTIALS, AUTHORIZATION, CONTENT_TYPE};
use http::HeaderValue;
use http::Method;
use tower_http::cors::CorsLayer;

pub fn create_cors_layer() -> CorsLayer {
    let origin = HeaderValue::from_static("http://localhost:3000");

    CorsLayer::new()
        .allow_origin(origin)
        .allow_methods([Method::GET, Method::POST, Method::PUT, Method::DELETE])
        .allow_credentials(true)
        .allow_headers([
            CONTENT_TYPE,
            AUTHORIZATION,
            ACCESS_CONTROL_ALLOW_CREDENTIALS,
        ])
}
