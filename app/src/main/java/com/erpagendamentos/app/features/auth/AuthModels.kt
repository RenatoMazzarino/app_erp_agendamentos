package com.erpagendamentos.app.features.auth

data class LoginRequest(
    val email: String,
    val password: String
)

data class RefreshRequest(
    val refreshToken: String
)

data class SessionEnvelope(
    val session: SessionPayload
)

data class SessionPayload(
    val accessToken: String,
    val idToken: String,
    val refreshToken: String? = null,
    val expiresIn: Long,
    val tokenType: String
)
