package com.erpagendamentos.app.features.operations

data class ServiceListEnvelope(
    val items: List<ServiceRecord>
)

data class ServiceRecord(
    val id: String,
    val tenantSlug: String,
    val name: String,
    val durationMinutes: Int,
    val priceCents: Int,
    val locationType: String,
    val isActive: Boolean,
    val createdAt: String,
    val updatedAt: String
)

data class ServiceCreateRequest(
    val tenantSlug: String,
    val name: String,
    val durationMinutes: Int,
    val priceCents: Int,
    val locationType: String = "studio",
    val isActive: Boolean = true
)

data class ServiceUpdateRequest(
    val name: String? = null,
    val durationMinutes: Int? = null,
    val priceCents: Int? = null,
    val locationType: String? = null,
    val isActive: Boolean? = null
)

data class AppointmentListEnvelope(
    val items: List<AppointmentRecord>
)

data class AppointmentRecord(
    val id: String,
    val tenantSlug: String,
    val clientId: String,
    val clientName: String? = null,
    val serviceId: String? = null,
    val serviceName: String? = null,
    val scheduledAt: String,
    val durationMinutes: Int,
    val status: String,
    val source: String,
    val notes: String? = null,
    val priceCents: Int,
    val createdAt: String,
    val updatedAt: String
)

data class AppointmentCreateRequest(
    val tenantSlug: String,
    val clientId: String,
    val serviceId: String? = null,
    val scheduledAt: String,
    val durationMinutes: Int,
    val status: String = "scheduled",
    val source: String = "internal",
    val notes: String? = null,
    val priceCents: Int = 0
)

data class AppointmentUpdateRequest(
    val clientId: String? = null,
    val serviceId: String? = null,
    val scheduledAt: String? = null,
    val durationMinutes: Int? = null,
    val status: String? = null,
    val source: String? = null,
    val notes: String? = null,
    val priceCents: Int? = null
)

data class AppointmentStatusUpdateRequest(
    val status: String
)

data class AttendanceListEnvelope(
    val items: List<AttendanceEvolutionRecord>
)

data class AttendanceEvolutionRecord(
    val id: String,
    val tenantSlug: String,
    val appointmentId: String? = null,
    val clientId: String,
    val evolutionText: String,
    val painPoints: List<String>,
    val createdAt: String,
    val updatedAt: String
)

data class AttendanceCreateRequest(
    val tenantSlug: String,
    val appointmentId: String? = null,
    val clientId: String,
    val evolutionText: String,
    val painPoints: List<String> = emptyList()
)

data class AttendanceUpdateRequest(
    val appointmentId: String? = null,
    val clientId: String? = null,
    val evolutionText: String? = null,
    val painPoints: List<String>? = null
)

data class MessageListEnvelope(
    val items: List<MessageRecord>
)

data class MessageRecord(
    val id: String,
    val tenantSlug: String,
    val clientId: String? = null,
    val clientName: String? = null,
    val appointmentId: String? = null,
    val channel: String,
    val direction: String,
    val body: String,
    val status: String,
    val createdAt: String
)

data class MessageCreateRequest(
    val tenantSlug: String,
    val clientId: String? = null,
    val appointmentId: String? = null,
    val channel: String = "internal",
    val direction: String = "outbound",
    val body: String,
    val status: String = "queued"
)

data class MessageStatusUpdateRequest(
    val status: String
)

data class PaymentListEnvelope(
    val items: List<PaymentRecord>
)

data class PaymentRecord(
    val id: String,
    val tenantSlug: String,
    val appointmentId: String? = null,
    val clientId: String? = null,
    val clientName: String? = null,
    val amountCents: Int,
    val method: String,
    val status: String,
    val paidAt: String? = null,
    val createdAt: String
)

data class PaymentCreateRequest(
    val tenantSlug: String,
    val appointmentId: String? = null,
    val clientId: String? = null,
    val amountCents: Int,
    val method: String = "pix",
    val status: String = "paid",
    val paidAt: String? = null
)

data class PaymentStatusUpdateRequest(
    val status: String,
    val paidAt: String? = null
)

data class FinanceSummaryResponse(
    val summary: FinanceSummary,
    val methods: List<FinanceMethodSummary>
)

data class FinanceSummary(
    val totalPayments: Int,
    val paidAmountCents: Int,
    val pendingAmountCents: Int
)

data class FinanceMethodSummary(
    val method: String,
    val count: Int,
    val amountCents: Int
)

data class DashboardSummaryResponse(
    val clients: DashboardClientsSummary,
    val appointmentsToday: DashboardAppointmentsSummary,
    val financeToday: DashboardFinanceSummary,
    val inbox: DashboardInboxSummary
)

data class DashboardClientsSummary(
    val total: Int
)

data class DashboardAppointmentsSummary(
    val scheduled: Int,
    val confirmed: Int,
    val completed: Int,
    val cancelled: Int
)

data class DashboardFinanceSummary(
    val paidTodayCents: Int
)

data class DashboardInboxSummary(
    val unreadInbound: Int
)

data class TenantSettings(
    val tenantSlug: String,
    val businessName: String,
    val primaryColor: String,
    val accentColor: String,
    val pushEnabled: Boolean,
    val whatsappEnabled: Boolean,
    val signalPercentage: Int,
    val updatedAt: String
)

data class SettingsUpdateRequest(
    val businessName: String? = null,
    val primaryColor: String? = null,
    val accentColor: String? = null,
    val pushEnabled: Boolean? = null,
    val whatsappEnabled: Boolean? = null,
    val signalPercentage: Int? = null
)

data class ScheduleBlockListEnvelope(
    val items: List<ScheduleBlockRecord>
)

data class ScheduleBlockRecord(
    val id: String,
    val tenantSlug: String,
    val startsAt: String,
    val endsAt: String,
    val reason: String,
    val createdBy: String? = null,
    val createdAt: String,
    val updatedAt: String
)

data class ScheduleBlockCreateRequest(
    val tenantSlug: String,
    val startsAt: String,
    val endsAt: String,
    val reason: String,
    val createdBy: String? = null
)

data class ScheduleBlockUpdateRequest(
    val startsAt: String? = null,
    val endsAt: String? = null,
    val reason: String? = null,
    val createdBy: String? = null
)

data class AdminMemberListEnvelope(
    val items: List<AdminMemberRecord>
)

data class AdminMemberRecord(
    val id: String,
    val tenantSlug: String,
    val userSubject: String,
    val email: String,
    val fullName: String,
    val role: String,
    val isActive: Boolean,
    val createdAt: String,
    val updatedAt: String
)

data class AdminMemberCreateRequest(
    val tenantSlug: String,
    val userSubject: String,
    val email: String,
    val fullName: String,
    val role: String,
    val isActive: Boolean = true
)

data class AdminMemberUpdateRequest(
    val fullName: String? = null,
    val role: String? = null,
    val isActive: Boolean? = null
)

data class AdminAuditEventListEnvelope(
    val items: List<AdminAuditEventRecord>
)

data class AdminAuditEventRecord(
    val id: String,
    val tenantSlug: String,
    val actorSubject: String? = null,
    val action: String,
    val entityType: String,
    val entityId: String? = null,
    val payload: Map<String, Any?> = emptyMap(),
    val createdAt: String
)

data class MenuActionEnvelope(
    val items: List<MenuActionRecord>
)

data class MenuActionRecord(
    val key: String,
    val label: String,
    val enabled: Boolean,
    val badge: Int
)
