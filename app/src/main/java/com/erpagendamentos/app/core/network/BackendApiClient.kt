package com.erpagendamentos.app.core.network

import android.util.Log
import com.erpagendamentos.app.core.session.SessionRepository
import com.erpagendamentos.app.features.auth.LoginRequest
import com.erpagendamentos.app.features.auth.RefreshRequest
import com.erpagendamentos.app.features.auth.SessionEnvelope
import com.erpagendamentos.app.features.clients.ClientCreateRequest
import com.erpagendamentos.app.features.clients.ClientProfileSnapshot
import com.erpagendamentos.app.features.clients.ClientUpdateRequest
import com.erpagendamentos.app.features.clients.ClientListEnvelope
import com.erpagendamentos.app.features.clients.ClientRecord
import com.erpagendamentos.app.features.operations.AppointmentCreateRequest
import com.erpagendamentos.app.features.operations.AppointmentListEnvelope
import com.erpagendamentos.app.features.operations.AppointmentRecord
import com.erpagendamentos.app.features.operations.AppointmentStatusUpdateRequest
import com.erpagendamentos.app.features.operations.AppointmentUpdateRequest
import com.erpagendamentos.app.features.operations.AttendanceEvolutionRecord
import com.erpagendamentos.app.features.operations.AttendanceCreateRequest
import com.erpagendamentos.app.features.operations.AttendanceListEnvelope
import com.erpagendamentos.app.features.operations.AttendanceUpdateRequest
import com.erpagendamentos.app.features.operations.AdminAuditEventListEnvelope
import com.erpagendamentos.app.features.operations.AdminMemberCreateRequest
import com.erpagendamentos.app.features.operations.AdminMemberListEnvelope
import com.erpagendamentos.app.features.operations.AdminMemberRecord
import com.erpagendamentos.app.features.operations.AdminMemberUpdateRequest
import com.erpagendamentos.app.features.operations.DashboardSummaryResponse
import com.erpagendamentos.app.features.operations.FinanceSummaryResponse
import com.erpagendamentos.app.features.operations.MenuActionEnvelope
import com.erpagendamentos.app.features.operations.MessageCreateRequest
import com.erpagendamentos.app.features.operations.MessageListEnvelope
import com.erpagendamentos.app.features.operations.MessageRecord
import com.erpagendamentos.app.features.operations.MessageStatusUpdateRequest
import com.erpagendamentos.app.features.operations.PaymentListEnvelope
import com.erpagendamentos.app.features.operations.PaymentCreateRequest
import com.erpagendamentos.app.features.operations.PaymentRecord
import com.erpagendamentos.app.features.operations.PaymentStatusUpdateRequest
import com.erpagendamentos.app.features.operations.ScheduleBlockCreateRequest
import com.erpagendamentos.app.features.operations.ScheduleBlockListEnvelope
import com.erpagendamentos.app.features.operations.ScheduleBlockRecord
import com.erpagendamentos.app.features.operations.ScheduleBlockUpdateRequest
import com.erpagendamentos.app.features.operations.ServiceCreateRequest
import com.erpagendamentos.app.features.operations.ServiceListEnvelope
import com.erpagendamentos.app.features.operations.ServiceRecord
import com.erpagendamentos.app.features.operations.ServiceUpdateRequest
import com.erpagendamentos.app.features.operations.SettingsUpdateRequest
import com.erpagendamentos.app.features.operations.TenantSettings
import java.util.UUID
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import retrofit2.Call
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.Path
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.PUT
import retrofit2.http.Query

interface BackendApiService {
    @POST("auth/login")
    suspend fun login(@Body request: LoginRequest): SessionEnvelope

    @POST("auth/refresh")
    fun refresh(@Body request: RefreshRequest): Call<SessionEnvelope>

    @POST("auth/logout")
    suspend fun logout()

    @GET("clients")
    suspend fun listClients(
        @Query("tenant") tenant: String,
        @Query("q") query: String? = null
    ): ClientListEnvelope

    @POST("clients")
    suspend fun createClient(@Body request: ClientCreateRequest): ClientRecord

    @GET("clients/{id}")
    suspend fun getClient(
        @Path("id") id: String,
        @Query("tenant") tenant: String
    ): ClientRecord

    @GET("clients/{id}/profile")
    suspend fun getClientProfile(
        @Path("id") id: String,
        @Query("tenant") tenant: String
    ): ClientProfileSnapshot

    @PUT("clients/{id}")
    suspend fun updateClient(
        @Path("id") id: String,
        @Query("tenant") tenant: String,
        @Body request: ClientUpdateRequest
    ): ClientRecord

    @DELETE("clients/{id}")
    suspend fun deleteClient(
        @Path("id") id: String,
        @Query("tenant") tenant: String
    )

    @GET("services")
    suspend fun listServices(
        @Query("tenant") tenant: String
    ): ServiceListEnvelope

    @POST("services")
    suspend fun createService(@Body request: ServiceCreateRequest): ServiceRecord

    @GET("services/{id}")
    suspend fun getService(
        @Path("id") id: String,
        @Query("tenant") tenant: String
    ): ServiceRecord

    @PUT("services/{id}")
    suspend fun updateService(
        @Path("id") id: String,
        @Query("tenant") tenant: String,
        @Body request: ServiceUpdateRequest
    ): ServiceRecord

    @DELETE("services/{id}")
    suspend fun deleteService(
        @Path("id") id: String,
        @Query("tenant") tenant: String
    )

    @GET("appointments")
    suspend fun listAppointments(
        @Query("tenant") tenant: String
    ): AppointmentListEnvelope

    @POST("appointments")
    suspend fun createAppointment(@Body request: AppointmentCreateRequest): AppointmentRecord

    @GET("appointments/{id}")
    suspend fun getAppointment(
        @Path("id") id: String,
        @Query("tenant") tenant: String
    ): AppointmentRecord

    @PUT("appointments/{id}")
    suspend fun updateAppointment(
        @Path("id") id: String,
        @Query("tenant") tenant: String,
        @Body request: AppointmentUpdateRequest
    ): AppointmentRecord

    @PATCH("appointments/{id}/status")
    suspend fun updateAppointmentStatus(
        @Path("id") id: String,
        @Query("tenant") tenant: String,
        @Body request: AppointmentStatusUpdateRequest
    ): AppointmentRecord

    @DELETE("appointments/{id}")
    suspend fun deleteAppointment(
        @Path("id") id: String,
        @Query("tenant") tenant: String
    )

    @GET("attendance/evolutions")
    suspend fun listEvolutions(
        @Query("tenant") tenant: String,
        @Query("clientId") clientId: String? = null
    ): AttendanceListEnvelope

    @POST("attendance/evolutions")
    suspend fun createEvolution(@Body request: AttendanceCreateRequest): AttendanceEvolutionRecord

    @GET("attendance/evolutions/{id}")
    suspend fun getEvolution(
        @Path("id") id: String,
        @Query("tenant") tenant: String
    ): AttendanceEvolutionRecord

    @PUT("attendance/evolutions/{id}")
    suspend fun updateEvolution(
        @Path("id") id: String,
        @Query("tenant") tenant: String,
        @Body request: AttendanceUpdateRequest
    ): AttendanceEvolutionRecord

    @DELETE("attendance/evolutions/{id}")
    suspend fun deleteEvolution(
        @Path("id") id: String,
        @Query("tenant") tenant: String
    )

    @GET("messages")
    suspend fun listMessages(
        @Query("tenant") tenant: String
    ): MessageListEnvelope

    @POST("messages")
    suspend fun createMessage(@Body request: MessageCreateRequest): MessageRecord

    @GET("messages/{id}")
    suspend fun getMessage(
        @Path("id") id: String,
        @Query("tenant") tenant: String
    ): MessageRecord

    @PATCH("messages/{id}/status")
    suspend fun updateMessageStatus(
        @Path("id") id: String,
        @Query("tenant") tenant: String,
        @Body request: MessageStatusUpdateRequest
    ): MessageRecord

    @POST("finance/payments")
    suspend fun createPayment(@Body request: PaymentCreateRequest): PaymentRecord

    @GET("finance/payments")
    suspend fun listPayments(
        @Query("tenant") tenant: String,
        @Query("status") status: String? = null,
        @Query("clientId") clientId: String? = null,
        @Query("limit") limit: Int? = null
    ): PaymentListEnvelope

    @PATCH("finance/payments/{id}/status")
    suspend fun updatePaymentStatus(
        @Path("id") id: String,
        @Query("tenant") tenant: String,
        @Body request: PaymentStatusUpdateRequest
    ): PaymentRecord

    @GET("finance/summary")
    suspend fun getFinanceSummary(
        @Query("tenant") tenant: String
    ): FinanceSummaryResponse

    @GET("dashboard/summary")
    suspend fun getDashboardSummary(
        @Query("tenant") tenant: String
    ): DashboardSummaryResponse

    @GET("settings")
    suspend fun getSettings(
        @Query("tenant") tenant: String
    ): TenantSettings

    @PUT("settings")
    suspend fun updateSettings(
        @Query("tenant") tenant: String,
        @Body request: SettingsUpdateRequest
    ): TenantSettings

    @GET("schedule-blocks")
    suspend fun listScheduleBlocks(
        @Query("tenant") tenant: String,
        @Query("dateFrom") dateFrom: String? = null,
        @Query("dateTo") dateTo: String? = null
    ): ScheduleBlockListEnvelope

    @POST("schedule-blocks")
    suspend fun createScheduleBlock(@Body request: ScheduleBlockCreateRequest): ScheduleBlockRecord

    @PUT("schedule-blocks/{id}")
    suspend fun updateScheduleBlock(
        @Path("id") id: String,
        @Query("tenant") tenant: String,
        @Body request: ScheduleBlockUpdateRequest
    ): ScheduleBlockRecord

    @DELETE("schedule-blocks/{id}")
    suspend fun deleteScheduleBlock(
        @Path("id") id: String,
        @Query("tenant") tenant: String
    )

    @GET("admin/members")
    suspend fun listAdminMembers(
        @Query("tenant") tenant: String
    ): AdminMemberListEnvelope

    @POST("admin/members")
    suspend fun createAdminMember(@Body request: AdminMemberCreateRequest): AdminMemberRecord

    @PUT("admin/members/{id}")
    suspend fun updateAdminMember(
        @Path("id") id: String,
        @Query("tenant") tenant: String,
        @Body request: AdminMemberUpdateRequest
    ): AdminMemberRecord

    @GET("admin/audit-events")
    suspend fun listAdminAuditEvents(
        @Query("tenant") tenant: String,
        @Query("limit") limit: Int? = null
    ): AdminAuditEventListEnvelope

    @GET("menu/actions")
    suspend fun listMenuActions(
        @Query("tenant") tenant: String
    ): MenuActionEnvelope
}

class BackendApiClient(
    baseUrl: String,
    private val sessionRepository: SessionRepository,
    networkLoggingEnabled: Boolean
) {
    private val unauthenticatedRetrofit = Retrofit.Builder()
        .baseUrl(baseUrl)
        .addConverterFactory(GsonConverterFactory.create())
        .build()

    private val authService = unauthenticatedRetrofit.create(BackendApiService::class.java)

    private val authenticatedRetrofit = Retrofit.Builder()
        .baseUrl(baseUrl)
        .client(
            OkHttpClient.Builder()
                .addInterceptor(correlationIdInterceptor())
                .addInterceptor(observabilityInterceptor(networkLoggingEnabled))
                .addInterceptor(authHeaderInterceptor())
                .build()
        )
        .addConverterFactory(GsonConverterFactory.create())
        .build()

    private val protectedService = authenticatedRetrofit.create(BackendApiService::class.java)

    fun authService(): BackendApiService = authService

    fun protectedService(): BackendApiService = protectedService

    private fun authHeaderInterceptor(): Interceptor = Interceptor { chain ->
        val session = sessionRepository.currentSessionSnapshot()
        val original = chain.request()
        if (session == null) {
            chain.proceed(original)
        } else {
            val withAuth = original.newBuilder()
                .header("Authorization", "Bearer ${session.accessToken}")
                .build()
            chain.proceed(withAuth)
        }
    }

    private fun correlationIdInterceptor(): Interceptor = Interceptor { chain ->
        val correlationId = UUID.randomUUID().toString()
        val request = chain.request()
            .newBuilder()
            .header("x-correlation-id", correlationId)
            .build()
        chain.proceed(request)
    }

    private fun observabilityInterceptor(enabled: Boolean): Interceptor = Interceptor { chain ->
        if (!enabled) {
            return@Interceptor chain.proceed(chain.request())
        }

        val startTime = System.currentTimeMillis()
        val request = chain.request()
        val response = chain.proceed(request)
        val durationMs = System.currentTimeMillis() - startTime
        Log.i(
            "EstudioNetwork",
            "${request.method} ${request.url.encodedPath} -> ${response.code} (${durationMs}ms)"
        )
        response
    }
}
