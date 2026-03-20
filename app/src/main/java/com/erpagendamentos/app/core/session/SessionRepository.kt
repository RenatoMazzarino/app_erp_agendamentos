package com.erpagendamentos.app.core.session

import android.util.Log
import com.erpagendamentos.app.core.network.BackendApiClient
import com.erpagendamentos.app.features.auth.LoginRequest
import com.erpagendamentos.app.features.auth.RefreshRequest
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext

data class SessionUiState(
    val isAuthenticated: Boolean,
    val tenantSlug: String
)

data class SessionSnapshot(
    val accessToken: String,
    val refreshToken: String,
    val idToken: String,
    val tokenType: String,
    val expiresAtEpochSeconds: Long
)

class SessionRepository(
    private val sessionStore: SecureSessionStore,
    baseUrl: String,
    defaultTenantSlug: String,
    networkLoggingEnabled: Boolean
) {
    private val refreshMutex = Mutex()
    private val apiClient = BackendApiClient(baseUrl, this, networkLoggingEnabled)
    private val authApi = apiClient.authService()
    private val protectedApi = apiClient.protectedService()

    @Volatile
    private var cachedSession: SessionSnapshot? = sessionStore.readSession()?.toSnapshot()

    @Volatile
    private var tenantSlug: String = sessionStore.readTenantSlug(defaultTenantSlug)

    private val _sessionState = MutableStateFlow(
        SessionUiState(
            isAuthenticated = cachedSession != null,
            tenantSlug = tenantSlug
        )
    )
    val sessionState: StateFlow<SessionUiState> = _sessionState.asStateFlow()

    suspend fun login(email: String, password: String) {
        val response = withContext(Dispatchers.IO) {
            authApi.login(LoginRequest(email = email, password = password))
        }
        val now = System.currentTimeMillis() / 1000
        val session = PersistedSession(
            accessToken = response.session.accessToken,
            idToken = response.session.idToken,
            refreshToken = response.session.refreshToken
                ?: error("Login sem refresh token; revisar configuracao Cognito"),
            tokenType = response.session.tokenType,
            expiresAtEpochSeconds = now + response.session.expiresIn
        )
        persistSession(session)
    }

    suspend fun logout() {
        runCatching {
            withContext(Dispatchers.IO) { protectedApi.logout() }
        }.onFailure {
            Log.w("SessionRepository", "logout remoto falhou: ${it.message}")
        }
        clearSession()
    }

    suspend fun ensureValidSession(): SessionSnapshot {
        return refreshMutex.withLock {
            val session = cachedSession ?: error("Sessao nao autenticada")
            val now = System.currentTimeMillis() / 1000
            val shouldRefresh = now >= (session.expiresAtEpochSeconds - 30)
            if (!shouldRefresh) {
                return@withLock session
            }

            val refreshed = withContext(Dispatchers.IO) {
                authApi.refresh(RefreshRequest(refreshToken = session.refreshToken)).execute()
            }
            if (!refreshed.isSuccessful) {
                clearSession()
                error("Falha ao renovar sessao: HTTP ${refreshed.code()}")
            }
            val body = refreshed.body() ?: run {
                clearSession()
                error("Falha ao renovar sessao: resposta vazia")
            }

            val refreshedSession = PersistedSession(
                accessToken = body.session.accessToken,
                idToken = body.session.idToken,
                refreshToken = session.refreshToken,
                tokenType = body.session.tokenType,
                expiresAtEpochSeconds = (System.currentTimeMillis() / 1000) + body.session.expiresIn
            )
            persistSession(refreshedSession)
            return@withLock cachedSession ?: error("Falha ao persistir sessao renovada")
        }
    }

    suspend fun updateTenantSlug(value: String) {
        val normalized = value.trim()
        if (normalized.isEmpty()) return
        tenantSlug = normalized
        sessionStore.writeTenantSlug(normalized)
        _sessionState.value = _sessionState.value.copy(tenantSlug = normalized)
    }

    fun currentTenantSlug(): String = tenantSlug

    fun currentSessionSnapshot(): SessionSnapshot? = cachedSession

    private fun persistSession(session: PersistedSession) {
        sessionStore.writeSession(session)
        cachedSession = session.toSnapshot()
        _sessionState.value = SessionUiState(
            isAuthenticated = true,
            tenantSlug = tenantSlug
        )
    }

    private fun clearSession() {
        sessionStore.clearSession()
        cachedSession = null
        _sessionState.value = SessionUiState(
            isAuthenticated = false,
            tenantSlug = tenantSlug
        )
    }
}

private fun PersistedSession.toSnapshot(): SessionSnapshot {
    return SessionSnapshot(
        accessToken = accessToken,
        refreshToken = refreshToken,
        idToken = idToken,
        tokenType = tokenType,
        expiresAtEpochSeconds = expiresAtEpochSeconds
    )
}
