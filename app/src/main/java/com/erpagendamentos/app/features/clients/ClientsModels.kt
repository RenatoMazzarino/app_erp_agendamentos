package com.erpagendamentos.app.features.clients

data class ClientListEnvelope(
    val items: List<ClientRecord>
)

data class ClientRecord(
    val id: String,
    val tenantSlug: String,
    val fullName: String,
    val preferredName: String? = null,
    val publicFirstName: String? = null,
    val publicLastName: String? = null,
    val internalReference: String? = null,
    val phone: String? = null,
    val whatsapp: String? = null,
    val email: String? = null,
    val birthDate: String? = null,
    val cpf: String? = null,
    val avatarUrl: String? = null,
    val isVip: Boolean = false,
    val needsAttention: Boolean = false,
    val marketingOptIn: Boolean = false,
    val isMinor: Boolean = false,
    val guardianName: String? = null,
    val guardianPhone: String? = null,
    val guardianCpf: String? = null,
    val preferencesNotes: String? = null,
    val contraindications: String? = null,
    val clinicalHistory: String? = null,
    val anamneseUrl: String? = null,
    val observacoesGerais: String? = null,
    val profissao: String? = null,
    val comoConheceu: String? = null,
    val healthTags: List<String> = emptyList(),
    val notes: String? = null,
    val createdAt: String,
    val updatedAt: String,
    val primaryPhoneRaw: String? = null,
    val whatsappPhoneRaw: String? = null,
    val primaryEmail: String? = null
)

data class ClientPhoneRecord(
    val id: String,
    val tenantSlug: String,
    val clientId: String,
    val label: String? = null,
    val numberRaw: String,
    val numberE164: String? = null,
    val isPrimary: Boolean,
    val isWhatsapp: Boolean,
    val createdAt: String,
    val updatedAt: String
)

data class ClientEmailRecord(
    val id: String,
    val tenantSlug: String,
    val clientId: String,
    val label: String? = null,
    val email: String,
    val isPrimary: Boolean,
    val createdAt: String,
    val updatedAt: String
)

data class ClientAddressRecord(
    val id: String,
    val tenantSlug: String,
    val clientId: String,
    val label: String,
    val isPrimary: Boolean,
    val addressCep: String? = null,
    val addressLogradouro: String? = null,
    val addressNumero: String? = null,
    val addressComplemento: String? = null,
    val addressBairro: String? = null,
    val addressCidade: String? = null,
    val addressEstado: String? = null,
    val referencia: String? = null,
    val createdAt: String,
    val updatedAt: String
)

data class ClientHealthItemRecord(
    val id: String,
    val tenantSlug: String,
    val clientId: String,
    val type: String,
    val label: String,
    val createdAt: String,
    val updatedAt: String
)

data class ClientHistoryRecord(
    val appointmentId: String,
    val startTime: String,
    val serviceName: String,
    val status: String? = null,
    val isHomeVisit: Boolean = false,
    val internalNotes: String? = null,
    val priceCents: Int = 0
)

data class ClientPaymentMethodSummary(
    val key: String,
    val label: String,
    val amountCents: Int,
    val percentage: Int
)

data class ClientFinanceSummary(
    val totalSpentLifetimeCents: Int,
    val averageTicketCents: Int,
    val packagesAcquired: Int,
    val discountsGrantedCents: Int,
    val estimatedLtv12MonthsCents: Int,
    val averageIntervalDays: Int? = null,
    val daysSinceLastVisit: Int? = null,
    val fidelityStars: Int,
    val referralsCount: Int,
    val paymentMethods: List<ClientPaymentMethodSummary>,
    val completedSessionsCount: Int
)

data class ClientProntuarioEntry(
    val appointmentId: String,
    val startTime: String,
    val serviceName: String,
    val status: String? = null,
    val isHomeVisit: Boolean = false,
    val internalNotes: String? = null,
    val evolutionText: String? = null,
    val evolutionCreatedAt: String? = null
)

data class ClientAnamnesisSnapshot(
    val clinicalHistory: String? = null,
    val contraindications: String? = null,
    val preferencesNotes: String? = null,
    val observations: String? = null,
    val legacyNotes: String? = null,
    val anamneseUrl: String? = null,
    val healthTags: List<String> = emptyList(),
    val healthItems: List<ClientHealthItemRecord> = emptyList()
)

data class ClientProfileSnapshot(
    val client: ClientRecord,
    val phones: List<ClientPhoneRecord>,
    val emails: List<ClientEmailRecord>,
    val addresses: List<ClientAddressRecord>,
    val healthItems: List<ClientHealthItemRecord>,
    val history: List<ClientHistoryRecord>,
    val finance: ClientFinanceSummary,
    val prontuarioEntries: List<ClientProntuarioEntry>,
    val anamnesis: ClientAnamnesisSnapshot
)

data class ClientPhoneRequest(
    val label: String? = null,
    val numberRaw: String,
    val numberE164: String? = null,
    val isPrimary: Boolean = false,
    val isWhatsapp: Boolean = false
)

data class ClientEmailRequest(
    val label: String? = null,
    val email: String,
    val isPrimary: Boolean = false
)

data class ClientAddressRequest(
    val label: String? = "Principal",
    val isPrimary: Boolean = false,
    val addressCep: String? = null,
    val addressLogradouro: String? = null,
    val addressNumero: String? = null,
    val addressComplemento: String? = null,
    val addressBairro: String? = null,
    val addressCidade: String? = null,
    val addressEstado: String? = null,
    val referencia: String? = null
)

data class ClientHealthItemRequest(
    val type: String,
    val label: String
)

data class ClientCreateRequest(
    val tenantSlug: String,
    val fullName: String,
    val preferredName: String? = null,
    val publicFirstName: String? = null,
    val publicLastName: String? = null,
    val internalReference: String? = null,
    val phone: String? = null,
    val whatsapp: String? = null,
    val email: String? = null,
    val birthDate: String? = null,
    val cpf: String? = null,
    val avatarUrl: String? = null,
    val isVip: Boolean = false,
    val needsAttention: Boolean = false,
    val marketingOptIn: Boolean = false,
    val isMinor: Boolean = false,
    val guardianName: String? = null,
    val guardianPhone: String? = null,
    val guardianCpf: String? = null,
    val preferencesNotes: String? = null,
    val contraindications: String? = null,
    val clinicalHistory: String? = null,
    val anamneseUrl: String? = null,
    val observacoesGerais: String? = null,
    val profissao: String? = null,
    val comoConheceu: String? = null,
    val healthTags: List<String> = emptyList(),
    val notes: String? = null,
    val phones: List<ClientPhoneRequest> = emptyList(),
    val emails: List<ClientEmailRequest> = emptyList(),
    val addresses: List<ClientAddressRequest> = emptyList(),
    val healthItems: List<ClientHealthItemRequest> = emptyList()
)

data class ClientUpdateRequest(
    val fullName: String? = null,
    val preferredName: String? = null,
    val publicFirstName: String? = null,
    val publicLastName: String? = null,
    val internalReference: String? = null,
    val phone: String? = null,
    val whatsapp: String? = null,
    val email: String? = null,
    val birthDate: String? = null,
    val cpf: String? = null,
    val avatarUrl: String? = null,
    val isVip: Boolean? = null,
    val needsAttention: Boolean? = null,
    val marketingOptIn: Boolean? = null,
    val isMinor: Boolean? = null,
    val guardianName: String? = null,
    val guardianPhone: String? = null,
    val guardianCpf: String? = null,
    val preferencesNotes: String? = null,
    val contraindications: String? = null,
    val clinicalHistory: String? = null,
    val anamneseUrl: String? = null,
    val observacoesGerais: String? = null,
    val profissao: String? = null,
    val comoConheceu: String? = null,
    val healthTags: List<String>? = null,
    val notes: String? = null,
    val phones: List<ClientPhoneRequest>? = null,
    val emails: List<ClientEmailRequest>? = null,
    val addresses: List<ClientAddressRequest>? = null,
    val healthItems: List<ClientHealthItemRequest>? = null
)
