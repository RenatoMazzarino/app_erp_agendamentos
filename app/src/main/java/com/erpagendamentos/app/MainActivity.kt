package com.erpagendamentos.app

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.BottomAppBar
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import com.erpagendamentos.app.core.network.BackendApiClient
import com.erpagendamentos.app.core.session.SecureSessionStore
import com.erpagendamentos.app.core.session.SessionRepository
import com.erpagendamentos.app.features.clients.ClientCreateRequest
import com.erpagendamentos.app.features.clients.ClientEmailRequest
import com.erpagendamentos.app.features.clients.ClientPhoneRequest
import com.erpagendamentos.app.features.clients.ClientProfileSnapshot
import com.erpagendamentos.app.features.clients.ClientRecord
import com.erpagendamentos.app.features.clients.ClientUpdateRequest
import com.erpagendamentos.app.features.clients.ClientsRepository
import com.erpagendamentos.app.features.operations.OperationsRepository
import com.erpagendamentos.app.features.operations.SettingsUpdateRequest
import kotlinx.coroutines.launch
import java.time.Instant
import java.time.temporal.ChronoUnit

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val sessionRepository = SessionRepository(
            sessionStore = SecureSessionStore(applicationContext),
            baseUrl = BuildConfig.API_BASE_URL,
            defaultTenantSlug = BuildConfig.DEFAULT_TENANT_SLUG,
            networkLoggingEnabled = BuildConfig.NETWORK_LOGGING_ENABLED
        )
        val apiClient = BackendApiClient(
            baseUrl = BuildConfig.API_BASE_URL,
            sessionRepository = sessionRepository,
            networkLoggingEnabled = BuildConfig.NETWORK_LOGGING_ENABLED
        )
        val clientsRepository = ClientsRepository(
            apiClient = apiClient,
            sessionRepository = sessionRepository
        )
        val operationsRepository = OperationsRepository(
            apiClient = apiClient,
            sessionRepository = sessionRepository
        )

        setContent {
            MaterialTheme {
                AppRoot(
                    sessionRepository = sessionRepository,
                    clientsRepository = clientsRepository,
                    operationsRepository = operationsRepository
                )
            }
        }
    }
}

private enum class StudioTab(val label: String) {
    DASHBOARD("Dashboard"),
    AGENDA("Agenda"),
    ATENDIMENTO("Atendimento"),
    CLIENTES("Clientes"),
    MENSAGENS("Mensagens"),
    CAIXA("Caixa"),
    BLOQUEIOS("Bloqueios"),
    ADMIN("Admin"),
    MENU("Menu"),
    CONFIG("Config")
}

private enum class ClientMode {
    LIST,
    DETAIL,
    CREATE,
    EDIT
}

@Composable
private fun AppRoot(
    sessionRepository: SessionRepository,
    clientsRepository: ClientsRepository,
    operationsRepository: OperationsRepository
) {
    val sessionState by sessionRepository.sessionState.collectAsState()
    val scope = rememberCoroutineScope()

    if (!sessionState.isAuthenticated) {
        LoginScreen(
            tenantSlug = sessionState.tenantSlug,
            onTenantSlugChange = { value ->
                scope.launch { sessionRepository.updateTenantSlug(value) }
            },
            onLogin = { email, password ->
                runCatching { sessionRepository.login(email, password) }
            }
        )
        return
    }

    MobileShell(
        tenantSlug = sessionState.tenantSlug,
        onTenantSlugChange = { value ->
            scope.launch { sessionRepository.updateTenantSlug(value) }
        },
        onLogout = {
            scope.launch { sessionRepository.logout() }
        },
        clientsRepository = clientsRepository,
        operationsRepository = operationsRepository
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun LoginScreen(
    tenantSlug: String,
    onTenantSlugChange: (String) -> Unit,
    onLogin: suspend (String, String) -> Result<Unit>
) {
    var tenant by remember(tenantSlug) { mutableStateOf(tenantSlug) }
    var email by remember { mutableStateOf("dev.admin@estudio-platform.local") }
    var password by remember { mutableStateOf("Dev@2026!Platform#01") }
    var loading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    Scaffold(topBar = { TopAppBar(title = { Text("Estúdio - Login") }) }) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            OutlinedTextField(
                value = tenant,
                onValueChange = {
                    tenant = it
                    onTenantSlugChange(it.trim())
                },
                label = { Text("Tenant") },
                modifier = Modifier.fillMaxWidth()
            )
            OutlinedTextField(
                value = email,
                onValueChange = { email = it },
                label = { Text("E-mail") },
                modifier = Modifier.fillMaxWidth()
            )
            OutlinedTextField(
                value = password,
                onValueChange = { password = it },
                label = { Text("Senha") },
                visualTransformation = PasswordVisualTransformation(),
                modifier = Modifier.fillMaxWidth()
            )
            if (error != null) {
                Text(text = error ?: "", color = MaterialTheme.colorScheme.error)
            }
            Button(
                onClick = {
                    scope.launch {
                        loading = true
                        error = null
                        onLogin(email.trim(), password)
                            .onFailure { error = it.message ?: "Falha no login" }
                        loading = false
                    }
                },
                enabled = !loading && tenant.isNotBlank() && email.isNotBlank() && password.isNotBlank()
            ) {
                Text(if (loading) "Entrando..." else "Entrar")
            }
            Text("API: ${BuildConfig.API_BASE_URL}", style = MaterialTheme.typography.bodySmall)
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun MobileShell(
    tenantSlug: String,
    onTenantSlugChange: (String) -> Unit,
    onLogout: () -> Unit,
    clientsRepository: ClientsRepository,
    operationsRepository: OperationsRepository
) {
    var currentTab by remember { mutableStateOf(StudioTab.DASHBOARD) }
    var tenantText by remember(tenantSlug) { mutableStateOf(tenantSlug) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Estúdio Corpo & Alma") },
                actions = { TextButton(onClick = onLogout) { Text("Sair") } }
            )
        },
        bottomBar = {
            BottomAppBar {
                StudioTab.entries.forEach { tab ->
                    TextButton(onClick = { currentTab = tab }) {
                        Text(tab.label)
                    }
                }
            }
        }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .padding(12.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            OutlinedTextField(
                value = tenantText,
                onValueChange = {
                    tenantText = it
                    onTenantSlugChange(it.trim())
                },
                label = { Text("Tenant ativo") },
                modifier = Modifier.fillMaxWidth()
            )

            when (currentTab) {
                StudioTab.DASHBOARD -> DashboardTab(operationsRepository)
                StudioTab.AGENDA -> AgendaTab(clientsRepository, operationsRepository)
                StudioTab.ATENDIMENTO -> AtendimentoTab(clientsRepository, operationsRepository)
                StudioTab.CLIENTES -> ClientesTab(clientsRepository, operationsRepository)
                StudioTab.MENSAGENS -> MensagensTab(operationsRepository)
                StudioTab.CAIXA -> CaixaTab(operationsRepository)
                StudioTab.BLOQUEIOS -> BloqueiosTab(operationsRepository)
                StudioTab.ADMIN -> AdminTab(operationsRepository)
                StudioTab.MENU -> MenuTab(operationsRepository)
                StudioTab.CONFIG -> ConfigTab(operationsRepository)
            }
        }
    }
}

@Composable
private fun DashboardTab(operationsRepository: OperationsRepository) {
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    var text by remember { mutableStateOf("Carregando...") }
    val scope = rememberCoroutineScope()

    fun load() {
        scope.launch {
            loading = true
            error = null
            runCatching { operationsRepository.getDashboardSummary() }
                .onSuccess {
                    text =
                        "Clientes: ${it.clients.total} | Hoje: agendados ${it.appointmentsToday.scheduled}, confirmados ${it.appointmentsToday.confirmed}, concluidos ${it.appointmentsToday.completed} | Caixa hoje: R$ ${it.financeToday.paidTodayCents / 100.0}"
                }
                .onFailure { error = it.message }
            loading = false
        }
    }

    LaunchedEffect(Unit) { load() }

    ModuleContainer(title = "Resumo Operacional") {
        if (loading) CircularProgressIndicator()
        if (error != null) Text(error ?: "", color = MaterialTheme.colorScheme.error)
        Text(text)
        Button(onClick = { load() }) { Text("Atualizar") }
    }
}

@Composable
private fun AgendaTab(
    clientsRepository: ClientsRepository,
    operationsRepository: OperationsRepository
) {
    var appointments by remember {
        mutableStateOf(
            emptyList<com.erpagendamentos.app.features.operations.AppointmentRecord>()
        )
    }
    var clients by remember { mutableStateOf(emptyList<ClientRecord>()) }
    var services by remember {
        mutableStateOf(
            emptyList<com.erpagendamentos.app.features.operations.ServiceRecord>()
        )
    }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    fun refresh() {
        scope.launch {
            loading = true
            error = null
            runCatching {
                val appts = operationsRepository.listAppointments()
                val cls = clientsRepository.listClients("")
                val srv = operationsRepository.listServices()
                appointments = appts
                clients = cls
                services = srv
            }.onFailure { error = it.message }
            loading = false
        }
    }

    ModuleContainer(title = "Agenda") {
        if (loading) CircularProgressIndicator()
        if (error != null) Text(error ?: "", color = MaterialTheme.colorScheme.error)
        Button(onClick = { refresh() }) { Text("Carregar agenda") }
        Button(
            onClick = {
                scope.launch {
                    if (clients.isNotEmpty()) {
                        val service = runCatching { operationsRepository.listServices().firstOrNull() }.getOrNull()
                        operationsRepository.createAppointment(
                            clientId = clients.first().id,
                            serviceId = service?.id,
                            scheduledAtIsoUtc = Instant.now().plus(1, ChronoUnit.DAYS).toString(),
                            durationMinutes = service?.durationMinutes ?: 60,
                            priceCents = service?.priceCents ?: 12000
                        )
                        refresh()
                    }
                }
            },
            enabled = clients.isNotEmpty()
        ) { Text("Criar agendamento de teste") }
        Text("Servicos: ${services.joinToString(" | ") { "${it.name} (${it.durationMinutes} min)" }}")
        LazyColumn(verticalArrangement = Arrangement.spacedBy(6.dp)) {
            items(appointments, key = { it.id }) { appointment ->
                Card(modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Text(
                            "${appointment.scheduledAt} - ${appointment.clientName ?: appointment.clientId}",
                            style = MaterialTheme.typography.titleSmall
                        )
                        Text("Status: ${appointment.status} | R$ ${appointment.priceCents / 100.0}")
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Button(onClick = {
                                scope.launch {
                                    runCatching { operationsRepository.updateAppointmentStatus(appointment.id, "confirmed") }
                                    refresh()
                                }
                            }) { Text("Confirmar") }
                            Button(onClick = {
                                scope.launch {
                                    runCatching { operationsRepository.updateAppointmentStatus(appointment.id, "completed") }
                                    refresh()
                                }
                            }) { Text("Concluir") }
                            Button(onClick = {
                                scope.launch {
                                    runCatching { operationsRepository.updateAppointmentStatus(appointment.id, "cancelled") }
                                    refresh()
                                }
                            }) { Text("Cancelar") }
                            Button(onClick = {
                                scope.launch {
                                    runCatching { operationsRepository.deleteAppointment(appointment.id) }
                                    refresh()
                                }
                            }) { Text("Excluir") }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun AtendimentoTab(
    clientsRepository: ClientsRepository,
    operationsRepository: OperationsRepository
) {
    var evolutions by remember {
        mutableStateOf(
            emptyList<com.erpagendamentos.app.features.operations.AttendanceEvolutionRecord>()
        )
    }
    var loading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    fun refresh() {
        scope.launch {
            loading = true
            error = null
            runCatching {
                val client = clientsRepository.listClients("").firstOrNull()
                val list = operationsRepository.listEvolutions(client?.id)
                evolutions = list
            }.onFailure { error = it.message }
            loading = false
        }
    }

    ModuleContainer(title = "Atendimento / Evolucao") {
        if (loading) CircularProgressIndicator()
        if (error != null) Text(error ?: "", color = MaterialTheme.colorScheme.error)
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Button(onClick = { refresh() }) { Text("Carregar evolucoes") }
            Button(onClick = {
                scope.launch {
                    runCatching {
                        val client = clientsRepository.listClients("").firstOrNull() ?: return@runCatching
                        val appointment = operationsRepository.listAppointments().firstOrNull()
                        operationsRepository.createEvolution(
                            clientId = client.id,
                            appointmentId = appointment?.id,
                            text = "Evolucao registrada no app mobile",
                            painPoints = listOf("cervical")
                        )
                    }
                    refresh()
                }
            }) { Text("Nova evolucao") }
        }
        LazyColumn(verticalArrangement = Arrangement.spacedBy(6.dp)) {
            items(evolutions, key = { it.id }) { evolution ->
                Card(modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Text(evolution.createdAt, style = MaterialTheme.typography.titleSmall)
                        Text(evolution.evolutionText)
                        Text("Pontos: ${evolution.painPoints.joinToString(",")}")
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Button(onClick = {
                                scope.launch {
                                    runCatching {
                                        operationsRepository.updateEvolution(
                                            evolutionId = evolution.id,
                                            text = evolution.evolutionText + " (revisado)",
                                            painPoints = evolution.painPoints
                                        )
                                    }
                                    refresh()
                                }
                            }) { Text("Revisar") }
                            Button(onClick = {
                                scope.launch {
                                    runCatching { operationsRepository.deleteEvolution(evolution.id) }
                                    refresh()
                                }
                            }) { Text("Excluir") }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ClientesTab(
    clientsRepository: ClientsRepository,
    operationsRepository: OperationsRepository
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var mode by remember { mutableStateOf(ClientMode.LIST) }
    var selectedClientId by remember { mutableStateOf<String?>(null) }

    var loading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var clients by remember { mutableStateOf(emptyList<ClientRecord>()) }
    var query by remember { mutableStateOf("") }
    var profile by remember { mutableStateOf<ClientProfileSnapshot?>(null) }

    var formName by remember { mutableStateOf("") }
    var formPreferredName by remember { mutableStateOf("") }
    var formPhone by remember { mutableStateOf("") }
    var formWhatsapp by remember { mutableStateOf("") }
    var formEmail by remember { mutableStateOf("") }
    var formNotes by remember { mutableStateOf("") }

    fun resetForm() {
        formName = ""
        formPreferredName = ""
        formPhone = ""
        formWhatsapp = ""
        formEmail = ""
        formNotes = ""
    }

    fun openDial(phone: String?) {
        val normalized = phone?.trim().orEmpty()
        if (normalized.isBlank()) return
        val intent = Intent(Intent.ACTION_DIAL, Uri.parse("tel:$normalized"))
        context.startActivity(intent)
    }

    fun openWhatsApp(phone: String?) {
        val normalized = phone?.replace("[^0-9]".toRegex(), "").orEmpty()
        if (normalized.isBlank()) return
        val uri = Uri.parse("https://wa.me/$normalized")
        val intent = Intent(Intent.ACTION_VIEW, uri)
        context.startActivity(intent)
    }

    fun refreshList() {
        scope.launch {
            loading = true
            error = null
            runCatching { clientsRepository.listClients(query.trim()) }
                .onSuccess { clients = it }
                .onFailure { error = it.message ?: "Falha ao carregar clientes" }
            loading = false
        }
    }

    fun loadProfile(clientId: String) {
        scope.launch {
            loading = true
            error = null
            runCatching { clientsRepository.getClientProfile(clientId) }
                .onSuccess {
                    profile = it
                    selectedClientId = clientId
                    mode = ClientMode.DETAIL
                }
                .onFailure { error = it.message ?: "Falha ao carregar perfil" }
            loading = false
        }
    }

    fun submitCreate() {
        scope.launch {
            if (formName.isBlank()) return@launch
            loading = true
            error = null
            runCatching {
                clientsRepository.createClient(
                    ClientCreateRequest(
                        tenantSlug = "",
                        fullName = formName.trim(),
                        preferredName = formPreferredName.ifBlank { null },
                        phone = formPhone.ifBlank { null },
                        whatsapp = formWhatsapp.ifBlank { null },
                        email = formEmail.ifBlank { null },
                        notes = formNotes.ifBlank { null },
                        phones = listOfNotNull(
                            formPhone.takeIf { it.isNotBlank() }?.let {
                                ClientPhoneRequest(
                                    label = "Principal",
                                    numberRaw = it,
                                    isPrimary = true,
                                    isWhatsapp = formWhatsapp.isBlank() || formWhatsapp == it
                                )
                            },
                            formWhatsapp.takeIf { it.isNotBlank() && it != formPhone }?.let {
                                ClientPhoneRequest(
                                    label = "WhatsApp",
                                    numberRaw = it,
                                    isPrimary = false,
                                    isWhatsapp = true
                                )
                            }
                        ),
                        emails = listOfNotNull(
                            formEmail.takeIf { it.isNotBlank() }?.let {
                                ClientEmailRequest(
                                    label = "Principal",
                                    email = it,
                                    isPrimary = true
                                )
                            }
                        )
                    )
                )
            }.onSuccess {
                resetForm()
                mode = ClientMode.LIST
                refreshList()
            }.onFailure { error = it.message ?: "Falha ao criar cliente" }
            loading = false
        }
    }

    fun submitEdit() {
        val targetId = selectedClientId ?: return
        scope.launch {
            if (formName.isBlank()) return@launch
            loading = true
            error = null
            runCatching {
                clientsRepository.updateClient(
                    targetId,
                    ClientUpdateRequest(
                        fullName = formName.trim(),
                        preferredName = formPreferredName.ifBlank { null },
                        phone = formPhone.ifBlank { null },
                        whatsapp = formWhatsapp.ifBlank { null },
                        email = formEmail.ifBlank { null },
                        notes = formNotes.ifBlank { null },
                        phones = listOfNotNull(
                            formPhone.takeIf { it.isNotBlank() }?.let {
                                ClientPhoneRequest(
                                    label = "Principal",
                                    numberRaw = it,
                                    isPrimary = true,
                                    isWhatsapp = formWhatsapp.isBlank() || formWhatsapp == it
                                )
                            },
                            formWhatsapp.takeIf { it.isNotBlank() && it != formPhone }?.let {
                                ClientPhoneRequest(
                                    label = "WhatsApp",
                                    numberRaw = it,
                                    isPrimary = false,
                                    isWhatsapp = true
                                )
                            }
                        ),
                        emails = listOfNotNull(
                            formEmail.takeIf { it.isNotBlank() }?.let {
                                ClientEmailRequest(
                                    label = "Principal",
                                    email = it,
                                    isPrimary = true
                                )
                            }
                        )
                    )
                )
            }.onSuccess {
                loadProfile(targetId)
                mode = ClientMode.DETAIL
                refreshList()
            }.onFailure { error = it.message ?: "Falha ao atualizar cliente" }
            loading = false
        }
    }

    fun deleteCurrent() {
        val targetId = selectedClientId ?: return
        scope.launch {
            loading = true
            error = null
            runCatching { clientsRepository.deleteClient(targetId) }
                .onSuccess {
                    selectedClientId = null
                    profile = null
                    mode = ClientMode.LIST
                    refreshList()
                }
                .onFailure { error = it.message ?: "Falha ao excluir cliente" }
            loading = false
        }
    }

    fun quickSchedule(clientId: String) {
        scope.launch {
            loading = true
            error = null
            runCatching {
                val service = operationsRepository.listServices().firstOrNull()
                operationsRepository.createAppointment(
                    clientId = clientId,
                    serviceId = service?.id,
                    scheduledAtIsoUtc = Instant.now().plus(1, ChronoUnit.DAYS).toString(),
                    durationMinutes = service?.durationMinutes ?: 60,
                    priceCents = service?.priceCents ?: 12000
                )
            }.onFailure { error = it.message ?: "Falha ao agendar cliente" }
            loading = false
        }
    }

    LaunchedEffect(Unit) {
        refreshList()
    }

    ModuleContainer(title = "Clientes") {
        if (loading) CircularProgressIndicator()
        if (error != null) {
            Text(error ?: "", color = MaterialTheme.colorScheme.error)
        }

        when (mode) {
            ClientMode.LIST -> {
                OutlinedTextField(
                    value = query,
                    onValueChange = { query = it },
                    label = { Text("Buscar por nome/contato") },
                    modifier = Modifier.fillMaxWidth()
                )
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Button(onClick = { refreshList() }) { Text("Buscar") }
                    Button(onClick = {
                        resetForm()
                        mode = ClientMode.CREATE
                    }) { Text("Novo cliente") }
                }
                LazyColumn(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    items(clients, key = { it.id }) { client ->
                        Card(modifier = Modifier.fillMaxWidth()) {
                            Column(modifier = Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                Text(client.fullName, style = MaterialTheme.typography.titleMedium)
                                Text("WhatsApp: ${client.whatsapp ?: "-"}")
                                Text("Email: ${client.email ?: "-"}")
                                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    Button(onClick = { openDial(client.primaryPhoneRaw ?: client.phone) }) { Text("📞") }
                                    Button(onClick = { openWhatsApp(client.whatsappPhoneRaw ?: client.whatsapp ?: client.phone) }) { Text("💬") }
                                    Button(onClick = { quickSchedule(client.id) }) { Text("📅") }
                                    Button(onClick = { loadProfile(client.id) }) { Text("⋯") }
                                }
                            }
                        }
                    }
                }
            }

            ClientMode.DETAIL -> {
                val snapshot = profile
                if (snapshot == null) {
                    Text("Sem dados do cliente.")
                } else {
                    Text(snapshot.client.fullName, style = MaterialTheme.typography.titleLarge)
                    Text("Contato principal: ${snapshot.client.primaryPhoneRaw ?: snapshot.client.phone ?: "-"}")
                    Text("WhatsApp: ${snapshot.client.whatsappPhoneRaw ?: snapshot.client.whatsapp ?: "-"}")
                    Text("Email: ${snapshot.client.primaryEmail ?: snapshot.client.email ?: "-"}")
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Button(onClick = { openDial(snapshot.client.primaryPhoneRaw ?: snapshot.client.phone) }) { Text("📞") }
                        Button(onClick = { openWhatsApp(snapshot.client.whatsappPhoneRaw ?: snapshot.client.whatsapp ?: snapshot.client.phone) }) { Text("💬") }
                        Button(onClick = {
                            formName = snapshot.client.fullName
                            formPreferredName = snapshot.client.preferredName ?: ""
                            formPhone = snapshot.client.primaryPhoneRaw ?: snapshot.client.phone ?: ""
                            formWhatsapp = snapshot.client.whatsappPhoneRaw ?: snapshot.client.whatsapp ?: ""
                            formEmail = snapshot.client.primaryEmail ?: snapshot.client.email ?: ""
                            formNotes = snapshot.client.notes ?: ""
                            mode = ClientMode.EDIT
                        }) { Text("Editar") }
                        Button(onClick = { deleteCurrent() }) { Text("Excluir") }
                    }

                    Text(
                        "Financeiro: Total R$ ${snapshot.finance.totalSpentLifetimeCents / 100.0} | " +
                            "Ticket R$ ${snapshot.finance.averageTicketCents / 100.0} | " +
                            "LTV 12m R$ ${snapshot.finance.estimatedLtv12MonthsCents / 100.0}"
                    )
                    Text(
                        "Fidelidade: ${snapshot.finance.fidelityStars} estrelas | " +
                            "Intervalo médio: ${snapshot.finance.averageIntervalDays ?: "-"} dias"
                    )
                    Text("Prontuário (${snapshot.prontuarioEntries.size})")
                    LazyColumn(
                        modifier = Modifier.height(180.dp),
                        verticalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        items(snapshot.prontuarioEntries) { entry ->
                            Card(modifier = Modifier.fillMaxWidth()) {
                                Column(modifier = Modifier.padding(10.dp)) {
                                    Text(entry.serviceName, style = MaterialTheme.typography.titleSmall)
                                    Text("${entry.startTime} - ${entry.status ?: "registrado"}")
                                    Text(entry.evolutionText ?: entry.internalNotes ?: "Sem evolução registrada")
                                }
                            }
                        }
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Button(onClick = { mode = ClientMode.LIST }) { Text("Voltar") }
                        Button(onClick = { loadProfile(snapshot.client.id) }) { Text("Atualizar perfil") }
                    }
                }
            }

            ClientMode.CREATE,
            ClientMode.EDIT -> {
                Text(if (mode == ClientMode.CREATE) "Novo cliente" else "Editar cliente")
                OutlinedTextField(
                    value = formName,
                    onValueChange = { formName = it },
                    label = { Text("Nome completo") },
                    modifier = Modifier.fillMaxWidth()
                )
                OutlinedTextField(
                    value = formPreferredName,
                    onValueChange = { formPreferredName = it },
                    label = { Text("Nome de preferência") },
                    modifier = Modifier.fillMaxWidth()
                )
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(
                        value = formPhone,
                        onValueChange = { formPhone = it },
                        label = { Text("Telefone") },
                        modifier = Modifier.width(160.dp)
                    )
                    OutlinedTextField(
                        value = formWhatsapp,
                        onValueChange = { formWhatsapp = it },
                        label = { Text("WhatsApp") },
                        modifier = Modifier.width(160.dp)
                    )
                }
                OutlinedTextField(
                    value = formEmail,
                    onValueChange = { formEmail = it },
                    label = { Text("E-mail") },
                    modifier = Modifier.fillMaxWidth()
                )
                OutlinedTextField(
                    value = formNotes,
                    onValueChange = { formNotes = it },
                    label = { Text("Observações") },
                    modifier = Modifier.fillMaxWidth()
                )
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Button(onClick = { if (mode == ClientMode.CREATE) submitCreate() else submitEdit() }) {
                        Text(if (mode == ClientMode.CREATE) "Salvar cliente" else "Salvar alterações")
                    }
                    Button(onClick = {
                        mode = if (selectedClientId == null) ClientMode.LIST else ClientMode.DETAIL
                    }) {
                        Text("Cancelar")
                    }
                }
            }
        }
    }
}

@Composable
private fun MensagensTab(operationsRepository: OperationsRepository) {
    var messages by remember { mutableStateOf(emptyList<com.erpagendamentos.app.features.operations.MessageRecord>()) }
    var loading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var outboundMessage by remember { mutableStateOf("Mensagem enviada via app mobile") }
    val scope = rememberCoroutineScope()

    fun refresh() {
        scope.launch {
            loading = true
            error = null
            runCatching { operationsRepository.listMessages() }
                .onSuccess { messages = it }
                .onFailure { error = it.message }
            loading = false
        }
    }

    ModuleContainer(title = "Mensagens") {
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Button(onClick = { refresh() }) { Text("Carregar") }
            Button(onClick = {
                scope.launch {
                    runCatching {
                        operationsRepository.createMessage(
                            clientId = null,
                            appointmentId = null,
                            body = outboundMessage
                        )
                    }
                    refresh()
                }
            }) { Text("Nova mensagem") }
        }
        OutlinedTextField(
            value = outboundMessage,
            onValueChange = { outboundMessage = it },
            label = { Text("Texto da mensagem") },
            modifier = Modifier.fillMaxWidth()
        )
        if (loading) CircularProgressIndicator()
        if (error != null) Text(error ?: "", color = MaterialTheme.colorScheme.error)
        LazyColumn(verticalArrangement = Arrangement.spacedBy(6.dp)) {
            items(messages, key = { it.id }) { message ->
                Card {
                    Column(modifier = Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Text("${message.channel}/${message.direction} - ${message.status}")
                        Text(message.body)
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Button(onClick = {
                                scope.launch {
                                    runCatching { operationsRepository.updateMessageStatus(message.id, "delivered") }
                                    refresh()
                                }
                            }) { Text("Entregue") }
                            Button(onClick = {
                                scope.launch {
                                    runCatching { operationsRepository.updateMessageStatus(message.id, "failed") }
                                    refresh()
                                }
                            }) { Text("Falha") }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun CaixaTab(operationsRepository: OperationsRepository) {
    var text by remember { mutableStateOf("Sem dados") }
    var payments by remember {
        mutableStateOf(
            emptyList<com.erpagendamentos.app.features.operations.PaymentRecord>()
        )
    }
    var loading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var serviceName by remember { mutableStateOf("Novo servico") }
    var serviceDuration by remember { mutableStateOf("60") }
    var servicePrice by remember { mutableStateOf("15000") }
    var paymentAmount by remember { mutableStateOf("12000") }
    var paymentMethod by remember { mutableStateOf("pix") }
    val scope = rememberCoroutineScope()

    fun refresh() {
        scope.launch {
            loading = true
            error = null
            runCatching {
                val finance = operationsRepository.getFinanceSummary()
                val services = operationsRepository.listServices()
                payments = operationsRepository.listPayments(limit = 50)
                text =
                    "Recebido: R$ ${finance.summary.paidAmountCents / 100.0} | Pendente: R$ ${finance.summary.pendingAmountCents / 100.0}\n" +
                        "Servicos: ${services.joinToString(" | ") { "${it.name} R$ ${it.priceCents / 100.0}" }}"
            }.onFailure { error = it.message }
            loading = false
        }
    }

    ModuleContainer(title = "Caixa / Catalogo") {
        if (loading) CircularProgressIndicator()
        if (error != null) Text(error ?: "", color = MaterialTheme.colorScheme.error)
        Text(text)
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            OutlinedTextField(value = serviceName, onValueChange = { serviceName = it }, label = { Text("Servico") })
            OutlinedTextField(
                value = serviceDuration,
                onValueChange = { serviceDuration = it },
                label = { Text("Min") }
            )
            OutlinedTextField(value = servicePrice, onValueChange = { servicePrice = it }, label = { Text("Centavos") })
        }
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Button(onClick = { refresh() }) { Text("Atualizar") }
            Button(onClick = {
                scope.launch {
                    runCatching {
                        operationsRepository.createService(
                            name = serviceName,
                            durationMinutes = serviceDuration.toIntOrNull() ?: 60,
                            priceCents = servicePrice.toIntOrNull() ?: 12000
                        )
                    }
                    refresh()
                }
            }) { Text("Criar servico") }
        }
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            OutlinedTextField(
                value = paymentAmount,
                onValueChange = { paymentAmount = it },
                label = { Text("Pagamento (centavos)") }
            )
            OutlinedTextField(
                value = paymentMethod,
                onValueChange = { paymentMethod = it },
                label = { Text("Metodo") }
            )
        }
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Button(onClick = {
                scope.launch {
                    runCatching {
                        operationsRepository.createPayment(
                            clientId = null,
                            appointmentId = null,
                            amountCents = paymentAmount.toIntOrNull() ?: 0,
                            method = paymentMethod.ifBlank { "pix" }
                        )
                    }
                    refresh()
                }
            }) { Text("Registrar pagamento") }
            Button(onClick = { refresh() }) { Text("Atualizar caixa") }
        }
        LazyColumn(verticalArrangement = Arrangement.spacedBy(6.dp)) {
            items(payments, key = { it.id }) { payment ->
                Card(modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Text("${payment.method} - R$ ${payment.amountCents / 100.0}")
                        Text("Status: ${payment.status}")
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Button(onClick = {
                                scope.launch {
                                    runCatching { operationsRepository.updatePaymentStatus(payment.id, "paid") }
                                    refresh()
                                }
                            }) { Text("Pago") }
                            Button(onClick = {
                                scope.launch {
                                    runCatching { operationsRepository.updatePaymentStatus(payment.id, "pending") }
                                    refresh()
                                }
                            }) { Text("Pendente") }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun BloqueiosTab(operationsRepository: OperationsRepository) {
    val scope = rememberCoroutineScope()
    var blocks by remember {
        mutableStateOf(
            emptyList<com.erpagendamentos.app.features.operations.ScheduleBlockRecord>()
        )
    }
    var loading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var reason by remember { mutableStateOf("Bloqueio operacional") }
    var startsAt by remember { mutableStateOf(Instant.now().plus(2, ChronoUnit.HOURS).toString()) }
    var endsAt by remember { mutableStateOf(Instant.now().plus(3, ChronoUnit.HOURS).toString()) }

    fun refresh() {
        scope.launch {
            loading = true
            error = null
            runCatching { operationsRepository.listScheduleBlocks() }
                .onSuccess { blocks = it }
                .onFailure { error = it.message ?: "Falha ao carregar bloqueios" }
            loading = false
        }
    }

    LaunchedEffect(Unit) { refresh() }

    ModuleContainer(title = "Bloqueios de Agenda") {
        if (loading) CircularProgressIndicator()
        if (error != null) Text(error ?: "", color = MaterialTheme.colorScheme.error)
        OutlinedTextField(
            value = reason,
            onValueChange = { reason = it },
            label = { Text("Motivo") },
            modifier = Modifier.fillMaxWidth()
        )
        OutlinedTextField(
            value = startsAt,
            onValueChange = { startsAt = it },
            label = { Text("Inicio (ISO UTC)") },
            modifier = Modifier.fillMaxWidth()
        )
        OutlinedTextField(
            value = endsAt,
            onValueChange = { endsAt = it },
            label = { Text("Fim (ISO UTC)") },
            modifier = Modifier.fillMaxWidth()
        )
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Button(onClick = {
                scope.launch {
                    loading = true
                    error = null
                    runCatching {
                        operationsRepository.createScheduleBlock(
                            startsAtIsoUtc = startsAt,
                            endsAtIsoUtc = endsAt,
                            reason = reason
                        )
                    }.onFailure { error = it.message ?: "Falha ao criar bloqueio" }
                    loading = false
                    refresh()
                }
            }) { Text("Criar bloqueio") }
            Button(onClick = { refresh() }) { Text("Atualizar") }
        }
        LazyColumn(verticalArrangement = Arrangement.spacedBy(6.dp)) {
            items(blocks, key = { it.id }) { block ->
                Card(modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Text(block.reason, style = MaterialTheme.typography.titleSmall)
                        Text("${block.startsAt} -> ${block.endsAt}")
                        Button(onClick = {
                            scope.launch {
                                loading = true
                                runCatching { operationsRepository.deleteScheduleBlock(block.id) }
                                loading = false
                                refresh()
                            }
                        }) { Text("Excluir") }
                    }
                }
            }
        }
    }
}

@Composable
private fun AdminTab(operationsRepository: OperationsRepository) {
    val scope = rememberCoroutineScope()
    var members by remember {
        mutableStateOf(
            emptyList<com.erpagendamentos.app.features.operations.AdminMemberRecord>()
        )
    }
    var auditEvents by remember {
        mutableStateOf(
            emptyList<com.erpagendamentos.app.features.operations.AdminAuditEventRecord>()
        )
    }
    var loading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var email by remember { mutableStateOf("staff.novo@tenant-dev.local") }
    var fullName by remember { mutableStateOf("Novo Staff") }
    var role by remember { mutableStateOf("staff") }
    var userSubject by remember { mutableStateOf("staff-novo-subject") }

    fun refresh() {
        scope.launch {
            loading = true
            error = null
            runCatching {
                val m = operationsRepository.listAdminMembers()
                val e = operationsRepository.listAdminAuditEvents(40)
                members = m
                auditEvents = e
            }.onFailure { error = it.message ?: "Falha ao carregar admin" }
            loading = false
        }
    }

    LaunchedEffect(Unit) { refresh() }

    ModuleContainer(title = "Admin") {
        if (loading) CircularProgressIndicator()
        if (error != null) Text(error ?: "", color = MaterialTheme.colorScheme.error)
        OutlinedTextField(
            value = email,
            onValueChange = { email = it },
            label = { Text("Email") },
            modifier = Modifier.fillMaxWidth()
        )
        OutlinedTextField(
            value = fullName,
            onValueChange = { fullName = it },
            label = { Text("Nome") },
            modifier = Modifier.fillMaxWidth()
        )
        OutlinedTextField(
            value = userSubject,
            onValueChange = { userSubject = it },
            label = { Text("User subject") },
            modifier = Modifier.fillMaxWidth()
        )
        OutlinedTextField(
            value = role,
            onValueChange = { role = it },
            label = { Text("Role (owner/admin/staff/viewer)") },
            modifier = Modifier.fillMaxWidth()
        )
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Button(onClick = {
                scope.launch {
                    loading = true
                    error = null
                    runCatching {
                        operationsRepository.createAdminMember(
                            userSubject = userSubject,
                            email = email,
                            fullName = fullName,
                            role = role,
                            isActive = true
                        )
                    }.onFailure { error = it.message ?: "Falha ao criar membro" }
                    loading = false
                    refresh()
                }
            }) { Text("Criar/Atualizar membro") }
            Button(onClick = { refresh() }) { Text("Atualizar") }
        }
        Text("Membros")
        LazyColumn(modifier = Modifier.height(160.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            items(members, key = { it.id }) { member ->
                Card(modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Text("${member.fullName} (${member.role})")
                        Text(member.email)
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Button(onClick = {
                                scope.launch {
                                    runCatching {
                                        operationsRepository.updateAdminMember(
                                            memberId = member.id,
                                            isActive = !member.isActive
                                        )
                                    }
                                    refresh()
                                }
                            }) { Text(if (member.isActive) "Desativar" else "Ativar") }
                        }
                    }
                }
            }
        }
        Text("Auditoria")
        LazyColumn(modifier = Modifier.height(160.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            items(auditEvents, key = { it.id }) { event ->
                Card(modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text(event.action, style = MaterialTheme.typography.titleSmall)
                        Text("${event.entityType} / ${event.entityId ?: "-"}")
                        Text(event.createdAt)
                    }
                }
            }
        }
    }
}

@Composable
private fun MenuTab(operationsRepository: OperationsRepository) {
    val scope = rememberCoroutineScope()
    var actions by remember {
        mutableStateOf(
            emptyList<com.erpagendamentos.app.features.operations.MenuActionRecord>()
        )
    }
    var loading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }

    fun refresh() {
        scope.launch {
            loading = true
            error = null
            runCatching { operationsRepository.listMenuActions() }
                .onSuccess { actions = it }
                .onFailure { error = it.message ?: "Falha ao carregar menu" }
            loading = false
        }
    }

    LaunchedEffect(Unit) { refresh() }

    ModuleContainer(title = "Menu Operacional") {
        if (loading) CircularProgressIndicator()
        if (error != null) Text(error ?: "", color = MaterialTheme.colorScheme.error)
        Button(onClick = { refresh() }) { Text("Atualizar menu") }
        LazyColumn(verticalArrangement = Arrangement.spacedBy(6.dp)) {
            items(actions, key = { it.key }) { item ->
                Card(modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text(item.label, style = MaterialTheme.typography.titleSmall)
                        Text("Habilitado: ${item.enabled} | Badge: ${item.badge}")
                    }
                }
            }
        }
    }
}

@Composable
private fun ConfigTab(operationsRepository: OperationsRepository) {
    var settingsText by remember { mutableStateOf("Carregando...") }
    var pushEnabled by remember { mutableStateOf(true) }
    var whatsappEnabled by remember { mutableStateOf(true) }
    var signal by remember { mutableStateOf("10") }
    var loading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    fun refresh() {
        scope.launch {
            loading = true
            error = null
            runCatching { operationsRepository.getSettings() }
                .onSuccess {
                    pushEnabled = it.pushEnabled
                    whatsappEnabled = it.whatsappEnabled
                    signal = it.signalPercentage.toString()
                    settingsText = "${it.businessName} | primária ${it.primaryColor} | acento ${it.accentColor}"
                }
                .onFailure { error = it.message }
            loading = false
        }
    }

    ModuleContainer(title = "Configurações") {
        if (loading) CircularProgressIndicator()
        if (error != null) Text(error ?: "", color = MaterialTheme.colorScheme.error)
        Text(settingsText)
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text("Push")
            Switch(checked = pushEnabled, onCheckedChange = { pushEnabled = it })
            Text("WhatsApp")
            Switch(checked = whatsappEnabled, onCheckedChange = { whatsappEnabled = it })
        }
        OutlinedTextField(value = signal, onValueChange = { signal = it }, label = { Text("Percentual sinal") })
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Button(onClick = { refresh() }) { Text("Recarregar") }
            Button(onClick = {
                scope.launch {
                    runCatching {
                        operationsRepository.updateSettings(
                            SettingsUpdateRequest(
                                pushEnabled = pushEnabled,
                                whatsappEnabled = whatsappEnabled,
                                signalPercentage = signal.toIntOrNull() ?: 10
                            )
                        )
                    }
                    refresh()
                }
            }) { Text("Salvar") }
        }
    }
}

@Composable
private fun ModuleContainer(
    title: String,
    content: @Composable ColumnScope.() -> Unit
) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
            content = {
                Text(title, style = MaterialTheme.typography.titleMedium)
                content()
            }
        )
    }
}
