package com.erpagendamentos.app.features.clients

import com.erpagendamentos.app.core.network.BackendApiClient
import com.erpagendamentos.app.core.session.SessionRepository
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class ClientsRepository(
    apiClient: BackendApiClient,
    private val sessionRepository: SessionRepository
) {
    private val api = apiClient.protectedService()

    suspend fun listClients(query: String): List<ClientRecord> {
        return withContext(Dispatchers.IO) {
            sessionRepository.ensureValidSession()
            api.listClients(
                tenant = sessionRepository.currentTenantSlug(),
                query = query.takeIf { it.isNotBlank() }
            ).items
        }
    }

    suspend fun getClient(clientId: String): ClientRecord {
        return withContext(Dispatchers.IO) {
            sessionRepository.ensureValidSession()
            api.getClient(
                id = clientId,
                tenant = sessionRepository.currentTenantSlug()
            )
        }
    }

    suspend fun getClientProfile(clientId: String): ClientProfileSnapshot {
        return withContext(Dispatchers.IO) {
            sessionRepository.ensureValidSession()
            api.getClientProfile(
                id = clientId,
                tenant = sessionRepository.currentTenantSlug()
            )
        }
    }

    suspend fun createClient(request: ClientCreateRequest): ClientRecord {
        return withContext(Dispatchers.IO) {
            sessionRepository.ensureValidSession()
            api.createClient(request.copy(tenantSlug = sessionRepository.currentTenantSlug()))
        }
    }

    suspend fun createClient(
        fullName: String,
        preferredName: String?,
        phone: String?,
        whatsapp: String?,
        email: String?,
        notes: String?
    ): ClientRecord {
        return createClient(
            ClientCreateRequest(
                tenantSlug = sessionRepository.currentTenantSlug(),
                fullName = fullName,
                preferredName = preferredName,
                phone = phone,
                whatsapp = whatsapp,
                email = email,
                notes = notes,
                phones = listOfNotNull(
                    phone
                        ?.takeIf { it.isNotBlank() }
                        ?.let {
                            ClientPhoneRequest(
                                label = "Principal",
                                numberRaw = it,
                                isPrimary = true,
                                isWhatsapp = whatsapp.isNullOrBlank() || whatsapp == it
                            )
                        },
                    whatsapp
                        ?.takeIf { it.isNotBlank() && it != phone }
                        ?.let {
                            ClientPhoneRequest(
                                label = "WhatsApp",
                                numberRaw = it,
                                isPrimary = false,
                                isWhatsapp = true
                            )
                        }
                ),
                emails = listOfNotNull(
                    email
                        ?.takeIf { it.isNotBlank() }
                        ?.let {
                            ClientEmailRequest(
                                label = "Principal",
                                email = it,
                                isPrimary = true
                            )
                        }
                )
            )
        )
    }

    suspend fun updateClient(clientId: String, request: ClientUpdateRequest): ClientRecord {
        return withContext(Dispatchers.IO) {
            sessionRepository.ensureValidSession()
            api.updateClient(
                id = clientId,
                tenant = sessionRepository.currentTenantSlug(),
                request = request
            )
        }
    }

    suspend fun deleteClient(clientId: String) {
        withContext(Dispatchers.IO) {
            sessionRepository.ensureValidSession()
            api.deleteClient(
                id = clientId,
                tenant = sessionRepository.currentTenantSlug()
            )
        }
    }
}
