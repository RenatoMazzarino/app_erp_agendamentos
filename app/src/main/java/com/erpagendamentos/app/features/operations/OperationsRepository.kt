package com.erpagendamentos.app.features.operations

import com.erpagendamentos.app.core.network.BackendApiClient
import com.erpagendamentos.app.core.session.SessionRepository
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class OperationsRepository(
    apiClient: BackendApiClient,
    private val sessionRepository: SessionRepository
) {
    private val api = apiClient.protectedService()

    suspend fun getDashboardSummary(): DashboardSummaryResponse {
        return withContext(Dispatchers.IO) {
            sessionRepository.ensureValidSession()
            api.getDashboardSummary(sessionRepository.currentTenantSlug())
        }
    }

    suspend fun listMenuActions(): List<MenuActionRecord> {
        return withContext(Dispatchers.IO) {
            sessionRepository.ensureValidSession()
            api.listMenuActions(sessionRepository.currentTenantSlug()).items
        }
    }

    suspend fun listServices(): List<ServiceRecord> {
        return withContext(Dispatchers.IO) {
            sessionRepository.ensureValidSession()
            api.listServices(sessionRepository.currentTenantSlug()).items
        }
    }

    suspend fun createService(name: String, durationMinutes: Int, priceCents: Int): ServiceRecord {
        return withContext(Dispatchers.IO) {
            sessionRepository.ensureValidSession()
            api.createService(
                ServiceCreateRequest(
                    tenantSlug = sessionRepository.currentTenantSlug(),
                    name = name,
                    durationMinutes = durationMinutes,
                    priceCents = priceCents
                )
            )
        }
    }

    suspend fun updateService(
        serviceId: String,
        name: String? = null,
        durationMinutes: Int? = null,
        priceCents: Int? = null,
        locationType: String? = null,
        isActive: Boolean? = null
    ): ServiceRecord {
        return withContext(Dispatchers.IO) {
            sessionRepository.ensureValidSession()
            api.updateService(
                id = serviceId,
                tenant = sessionRepository.currentTenantSlug(),
                request = ServiceUpdateRequest(
                    name = name,
                    durationMinutes = durationMinutes,
                    priceCents = priceCents,
                    locationType = locationType,
                    isActive = isActive
                )
            )
        }
    }

    suspend fun deleteService(serviceId: String) {
        withContext(Dispatchers.IO) {
            sessionRepository.ensureValidSession()
            api.deleteService(serviceId, sessionRepository.currentTenantSlug())
        }
    }

    suspend fun listAppointments(): List<AppointmentRecord> {
        return withContext(Dispatchers.IO) {
            sessionRepository.ensureValidSession()
            api.listAppointments(sessionRepository.currentTenantSlug()).items
        }
    }

    suspend fun createAppointment(
        clientId: String,
        serviceId: String?,
        scheduledAtIsoUtc: String,
        durationMinutes: Int,
        priceCents: Int
    ): AppointmentRecord {
        return withContext(Dispatchers.IO) {
            sessionRepository.ensureValidSession()
            api.createAppointment(
                AppointmentCreateRequest(
                    tenantSlug = sessionRepository.currentTenantSlug(),
                    clientId = clientId,
                    serviceId = serviceId,
                    scheduledAt = scheduledAtIsoUtc,
                    durationMinutes = durationMinutes,
                    priceCents = priceCents
                )
            )
        }
    }

    suspend fun updateAppointmentStatus(appointmentId: String, status: String): AppointmentRecord {
        return withContext(Dispatchers.IO) {
            sessionRepository.ensureValidSession()
            api.updateAppointmentStatus(
                id = appointmentId,
                tenant = sessionRepository.currentTenantSlug(),
                request = AppointmentStatusUpdateRequest(status = status)
            )
        }
    }

    suspend fun updateAppointment(
        appointmentId: String,
        request: AppointmentUpdateRequest
    ): AppointmentRecord {
        return withContext(Dispatchers.IO) {
            sessionRepository.ensureValidSession()
            api.updateAppointment(
                id = appointmentId,
                tenant = sessionRepository.currentTenantSlug(),
                request = request
            )
        }
    }

    suspend fun deleteAppointment(appointmentId: String) {
        withContext(Dispatchers.IO) {
            sessionRepository.ensureValidSession()
            api.deleteAppointment(appointmentId, sessionRepository.currentTenantSlug())
        }
    }

    suspend fun listEvolutions(clientId: String?): List<AttendanceEvolutionRecord> {
        return withContext(Dispatchers.IO) {
            sessionRepository.ensureValidSession()
            api.listEvolutions(sessionRepository.currentTenantSlug(), clientId).items
        }
    }

    suspend fun createEvolution(
        clientId: String,
        appointmentId: String?,
        text: String,
        painPoints: List<String>
    ): AttendanceEvolutionRecord {
        return withContext(Dispatchers.IO) {
            sessionRepository.ensureValidSession()
            api.createEvolution(
                AttendanceCreateRequest(
                    tenantSlug = sessionRepository.currentTenantSlug(),
                    appointmentId = appointmentId,
                    clientId = clientId,
                    evolutionText = text,
                    painPoints = painPoints
                )
            )
        }
    }

    suspend fun updateEvolution(
        evolutionId: String,
        text: String? = null,
        painPoints: List<String>? = null
    ): AttendanceEvolutionRecord {
        return withContext(Dispatchers.IO) {
            sessionRepository.ensureValidSession()
            api.updateEvolution(
                id = evolutionId,
                tenant = sessionRepository.currentTenantSlug(),
                request = AttendanceUpdateRequest(
                    evolutionText = text,
                    painPoints = painPoints
                )
            )
        }
    }

    suspend fun deleteEvolution(evolutionId: String) {
        withContext(Dispatchers.IO) {
            sessionRepository.ensureValidSession()
            api.deleteEvolution(evolutionId, sessionRepository.currentTenantSlug())
        }
    }

    suspend fun listMessages(): List<MessageRecord> {
        return withContext(Dispatchers.IO) {
            sessionRepository.ensureValidSession()
            api.listMessages(sessionRepository.currentTenantSlug()).items
        }
    }

    suspend fun createMessage(
        clientId: String?,
        appointmentId: String?,
        body: String
    ): MessageRecord {
        return withContext(Dispatchers.IO) {
            sessionRepository.ensureValidSession()
            api.createMessage(
                MessageCreateRequest(
                    tenantSlug = sessionRepository.currentTenantSlug(),
                    clientId = clientId,
                    appointmentId = appointmentId,
                    channel = "whatsapp",
                    direction = "outbound",
                    body = body,
                    status = "sent"
                )
            )
        }
    }

    suspend fun updateMessageStatus(messageId: String, status: String): MessageRecord {
        return withContext(Dispatchers.IO) {
            sessionRepository.ensureValidSession()
            api.updateMessageStatus(
                id = messageId,
                tenant = sessionRepository.currentTenantSlug(),
                request = MessageStatusUpdateRequest(status = status)
            )
        }
    }

    suspend fun createPayment(
        clientId: String?,
        appointmentId: String?,
        amountCents: Int,
        method: String
    ): PaymentRecord {
        return withContext(Dispatchers.IO) {
            sessionRepository.ensureValidSession()
            api.createPayment(
                PaymentCreateRequest(
                    tenantSlug = sessionRepository.currentTenantSlug(),
                    appointmentId = appointmentId,
                    clientId = clientId,
                    amountCents = amountCents,
                    method = method,
                    status = "paid"
                )
            )
        }
    }

    suspend fun listPayments(
        status: String? = null,
        clientId: String? = null,
        limit: Int = 100
    ): List<PaymentRecord> {
        return withContext(Dispatchers.IO) {
            sessionRepository.ensureValidSession()
            api.listPayments(
                tenant = sessionRepository.currentTenantSlug(),
                status = status,
                clientId = clientId,
                limit = limit
            ).items
        }
    }

    suspend fun updatePaymentStatus(paymentId: String, status: String): PaymentRecord {
        return withContext(Dispatchers.IO) {
            sessionRepository.ensureValidSession()
            api.updatePaymentStatus(
                id = paymentId,
                tenant = sessionRepository.currentTenantSlug(),
                request = PaymentStatusUpdateRequest(status = status)
            )
        }
    }

    suspend fun getFinanceSummary(): FinanceSummaryResponse {
        return withContext(Dispatchers.IO) {
            sessionRepository.ensureValidSession()
            api.getFinanceSummary(sessionRepository.currentTenantSlug())
        }
    }

    suspend fun listScheduleBlocks(
        dateFromIsoUtc: String? = null,
        dateToIsoUtc: String? = null
    ): List<ScheduleBlockRecord> {
        return withContext(Dispatchers.IO) {
            sessionRepository.ensureValidSession()
            api.listScheduleBlocks(
                tenant = sessionRepository.currentTenantSlug(),
                dateFrom = dateFromIsoUtc,
                dateTo = dateToIsoUtc
            ).items
        }
    }

    suspend fun createScheduleBlock(
        startsAtIsoUtc: String,
        endsAtIsoUtc: String,
        reason: String,
        createdBy: String? = null
    ): ScheduleBlockRecord {
        return withContext(Dispatchers.IO) {
            sessionRepository.ensureValidSession()
            api.createScheduleBlock(
                ScheduleBlockCreateRequest(
                    tenantSlug = sessionRepository.currentTenantSlug(),
                    startsAt = startsAtIsoUtc,
                    endsAt = endsAtIsoUtc,
                    reason = reason,
                    createdBy = createdBy
                )
            )
        }
    }

    suspend fun deleteScheduleBlock(blockId: String) {
        withContext(Dispatchers.IO) {
            sessionRepository.ensureValidSession()
            api.deleteScheduleBlock(blockId, sessionRepository.currentTenantSlug())
        }
    }

    suspend fun listAdminMembers(): List<AdminMemberRecord> {
        return withContext(Dispatchers.IO) {
            sessionRepository.ensureValidSession()
            api.listAdminMembers(sessionRepository.currentTenantSlug()).items
        }
    }

    suspend fun createAdminMember(
        userSubject: String,
        email: String,
        fullName: String,
        role: String,
        isActive: Boolean
    ): AdminMemberRecord {
        return withContext(Dispatchers.IO) {
            sessionRepository.ensureValidSession()
            api.createAdminMember(
                AdminMemberCreateRequest(
                    tenantSlug = sessionRepository.currentTenantSlug(),
                    userSubject = userSubject,
                    email = email,
                    fullName = fullName,
                    role = role,
                    isActive = isActive
                )
            )
        }
    }

    suspend fun updateAdminMember(
        memberId: String,
        fullName: String? = null,
        role: String? = null,
        isActive: Boolean? = null
    ): AdminMemberRecord {
        return withContext(Dispatchers.IO) {
            sessionRepository.ensureValidSession()
            api.updateAdminMember(
                id = memberId,
                tenant = sessionRepository.currentTenantSlug(),
                request = AdminMemberUpdateRequest(
                    fullName = fullName,
                    role = role,
                    isActive = isActive
                )
            )
        }
    }

    suspend fun listAdminAuditEvents(limit: Int = 100): List<AdminAuditEventRecord> {
        return withContext(Dispatchers.IO) {
            sessionRepository.ensureValidSession()
            api.listAdminAuditEvents(
                tenant = sessionRepository.currentTenantSlug(),
                limit = limit
            ).items
        }
    }

    suspend fun getSettings(): TenantSettings {
        return withContext(Dispatchers.IO) {
            sessionRepository.ensureValidSession()
            api.getSettings(sessionRepository.currentTenantSlug())
        }
    }

    suspend fun updateSettings(request: SettingsUpdateRequest): TenantSettings {
        return withContext(Dispatchers.IO) {
            sessionRepository.ensureValidSession()
            api.updateSettings(sessionRepository.currentTenantSlug(), request)
        }
    }
}
