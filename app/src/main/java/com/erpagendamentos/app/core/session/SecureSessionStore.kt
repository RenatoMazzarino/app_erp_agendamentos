package com.erpagendamentos.app.core.session

import android.content.Context
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

data class PersistedSession(
    val accessToken: String,
    val idToken: String,
    val refreshToken: String,
    val tokenType: String,
    val expiresAtEpochSeconds: Long
)

class SecureSessionStore(context: Context) {
    private val sharedPreferences by lazy {
        val masterKey = MasterKey.Builder(context)
            .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
            .build()

        EncryptedSharedPreferences.create(
            context,
            "estudio_platform_secure_session",
            masterKey,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
        )
    }

    fun readSession(): PersistedSession? {
        val accessToken = sharedPreferences.getString(KEY_ACCESS_TOKEN, null) ?: return null
        val idToken = sharedPreferences.getString(KEY_ID_TOKEN, null) ?: return null
        val refreshToken = sharedPreferences.getString(KEY_REFRESH_TOKEN, null) ?: return null
        val tokenType = sharedPreferences.getString(KEY_TOKEN_TYPE, null) ?: return null
        val expiresAt = sharedPreferences.getLong(KEY_EXPIRES_AT, 0L)
        if (expiresAt <= 0L) return null
        return PersistedSession(
            accessToken = accessToken,
            idToken = idToken,
            refreshToken = refreshToken,
            tokenType = tokenType,
            expiresAtEpochSeconds = expiresAt
        )
    }

    fun writeSession(session: PersistedSession) {
        sharedPreferences.edit()
            .putString(KEY_ACCESS_TOKEN, session.accessToken)
            .putString(KEY_ID_TOKEN, session.idToken)
            .putString(KEY_REFRESH_TOKEN, session.refreshToken)
            .putString(KEY_TOKEN_TYPE, session.tokenType)
            .putLong(KEY_EXPIRES_AT, session.expiresAtEpochSeconds)
            .apply()
    }

    fun clearSession() {
        sharedPreferences.edit()
            .remove(KEY_ACCESS_TOKEN)
            .remove(KEY_ID_TOKEN)
            .remove(KEY_REFRESH_TOKEN)
            .remove(KEY_TOKEN_TYPE)
            .remove(KEY_EXPIRES_AT)
            .apply()
    }

    fun readTenantSlug(defaultTenantSlug: String): String {
        return sharedPreferences.getString(KEY_TENANT_SLUG, defaultTenantSlug) ?: defaultTenantSlug
    }

    fun writeTenantSlug(value: String) {
        sharedPreferences.edit().putString(KEY_TENANT_SLUG, value).apply()
    }

    private companion object {
        private const val KEY_ACCESS_TOKEN = "access_token"
        private const val KEY_ID_TOKEN = "id_token"
        private const val KEY_REFRESH_TOKEN = "refresh_token"
        private const val KEY_TOKEN_TYPE = "token_type"
        private const val KEY_EXPIRES_AT = "expires_at_epoch_seconds"
        private const val KEY_TENANT_SLUG = "tenant_slug"
    }
}
