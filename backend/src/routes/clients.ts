import type { FastifyInstance, preHandlerHookHandler } from "fastify";
import { z } from "zod";

import type { DbPool } from "../db/pool.js";
import { enforceTenantAccess, getTenantFromQuery } from "./route-tenant-utils.js";

const clientPhoneSchema = z.object({
  label: z.string().trim().max(40).optional(),
  numberRaw: z.string().trim().min(3),
  numberE164: z.string().trim().optional(),
  isPrimary: z.boolean().optional(),
  isWhatsapp: z.boolean().optional()
});

const clientEmailSchema = z.object({
  label: z.string().trim().max(40).optional(),
  email: z.string().trim().email(),
  isPrimary: z.boolean().optional()
});

const clientAddressSchema = z.object({
  label: z.string().trim().max(50).optional(),
  isPrimary: z.boolean().optional(),
  addressCep: z.string().trim().optional(),
  addressLogradouro: z.string().trim().optional(),
  addressNumero: z.string().trim().optional(),
  addressComplemento: z.string().trim().optional(),
  addressBairro: z.string().trim().optional(),
  addressCidade: z.string().trim().optional(),
  addressEstado: z.string().trim().optional(),
  referencia: z.string().trim().optional()
});

const clientHealthItemSchema = z.object({
  type: z.enum(["allergy", "condition", "tag"]),
  label: z.string().trim().min(1).max(120)
});

const createClientSchema = z.object({
  tenantSlug: z.string().min(1),
  fullName: z.string().trim().min(2),
  preferredName: z.string().trim().optional(),
  publicFirstName: z.string().trim().optional(),
  publicLastName: z.string().trim().optional(),
  internalReference: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  whatsapp: z.string().trim().optional(),
  email: z.string().trim().email().optional(),
  birthDate: z.string().trim().optional(),
  cpf: z.string().trim().optional(),
  avatarUrl: z.string().trim().url().optional(),
  isVip: z.boolean().default(false),
  needsAttention: z.boolean().default(false),
  marketingOptIn: z.boolean().default(false),
  isMinor: z.boolean().default(false),
  guardianName: z.string().trim().optional(),
  guardianPhone: z.string().trim().optional(),
  guardianCpf: z.string().trim().optional(),
  preferencesNotes: z.string().trim().optional(),
  contraindications: z.string().trim().optional(),
  clinicalHistory: z.string().trim().optional(),
  anamneseUrl: z.string().trim().url().optional(),
  observacoesGerais: z.string().trim().optional(),
  profissao: z.string().trim().optional(),
  comoConheceu: z.string().trim().optional(),
  healthTags: z.array(z.string().trim().min(1)).default([]),
  notes: z.string().trim().optional(),
  phones: z.array(clientPhoneSchema).default([]),
  emails: z.array(clientEmailSchema).default([]),
  addresses: z.array(clientAddressSchema).default([]),
  healthItems: z.array(clientHealthItemSchema).default([])
});

const updateClientSchema = z.object({
  fullName: z.string().trim().min(2).optional(),
  preferredName: z.string().trim().nullable().optional(),
  publicFirstName: z.string().trim().nullable().optional(),
  publicLastName: z.string().trim().nullable().optional(),
  internalReference: z.string().trim().nullable().optional(),
  phone: z.string().trim().nullable().optional(),
  whatsapp: z.string().trim().nullable().optional(),
  email: z.string().trim().email().nullable().optional(),
  birthDate: z.string().trim().nullable().optional(),
  cpf: z.string().trim().nullable().optional(),
  avatarUrl: z.string().trim().url().nullable().optional(),
  isVip: z.boolean().optional(),
  needsAttention: z.boolean().optional(),
  marketingOptIn: z.boolean().optional(),
  isMinor: z.boolean().optional(),
  guardianName: z.string().trim().nullable().optional(),
  guardianPhone: z.string().trim().nullable().optional(),
  guardianCpf: z.string().trim().nullable().optional(),
  preferencesNotes: z.string().trim().nullable().optional(),
  contraindications: z.string().trim().nullable().optional(),
  clinicalHistory: z.string().trim().nullable().optional(),
  anamneseUrl: z.string().trim().url().nullable().optional(),
  observacoesGerais: z.string().trim().nullable().optional(),
  profissao: z.string().trim().nullable().optional(),
  comoConheceu: z.string().trim().nullable().optional(),
  healthTags: z.array(z.string().trim().min(1)).optional(),
  notes: z.string().trim().nullable().optional(),
  phones: z.array(clientPhoneSchema).optional(),
  emails: z.array(clientEmailSchema).optional(),
  addresses: z.array(clientAddressSchema).optional(),
  healthItems: z.array(clientHealthItemSchema).optional()
});

const listQuerySchema = z.object({
  tenant: z.string().min(1),
  q: z.string().trim().optional()
});

const clientIdSchema = z.object({ id: z.string().uuid() });

type NormalizedClientPhone = {
  label: string | null;
  numberRaw: string;
  numberE164: string | null;
  isPrimary: boolean;
  isWhatsapp: boolean;
};

type NormalizedClientEmail = {
  label: string | null;
  email: string;
  isPrimary: boolean;
};

type NormalizedClientAddress = {
  label: string;
  isPrimary: boolean;
  addressCep: string | null;
  addressLogradouro: string | null;
  addressNumero: string | null;
  addressComplemento: string | null;
  addressBairro: string | null;
  addressCidade: string | null;
  addressEstado: string | null;
  referencia: string | null;
};

type NormalizedClientHealthItem = {
  type: "allergy" | "condition" | "tag";
  label: string;
};

type PaymentMethodKey = "pix" | "card" | "cash" | "package" | "waiver" | "other";
type DbQueryClient = Pick<DbPool, "query">;

function assertDb(db: DbPool | null): asserts db is DbPool {
  if (!db) {
    throw new Error("Database pool nao configurado");
  }
}

function nullIfBlank(value: string | null | undefined): string | null {
  const normalized = value?.trim() ?? "";
  return normalized.length > 0 ? normalized : null;
}

function sanitizeIlikeTerm(value: string | null | undefined): string {
  return (value ?? "").replace(/[\\%_]/g, "").trim();
}

function normalizePhones(phones: z.infer<typeof clientPhoneSchema>[]): NormalizedClientPhone[] {
  const normalized = phones
    .map((phone, index) => ({
      label: nullIfBlank(phone.label) ?? (index === 0 ? "Principal" : null),
      numberRaw: phone.numberRaw.trim(),
      numberE164: nullIfBlank(phone.numberE164),
      isPrimary: phone.isPrimary ?? index === 0,
      isWhatsapp: phone.isWhatsapp ?? false
    }))
    .filter((phone) => phone.numberRaw.length > 0);

  if (normalized.length > 0 && !normalized.some((phone) => phone.isPrimary)) {
    normalized[0]!.isPrimary = true;
  }
  if (normalized.length > 0 && !normalized.some((phone) => phone.isWhatsapp)) {
    normalized[0]!.isWhatsapp = true;
  }
  return normalized;
}

function normalizeEmails(emails: z.infer<typeof clientEmailSchema>[]): NormalizedClientEmail[] {
  const normalized = emails
    .map((email, index) => ({
      label: nullIfBlank(email.label) ?? (index === 0 ? "Principal" : null),
      email: email.email.trim().toLowerCase(),
      isPrimary: email.isPrimary ?? index === 0
    }))
    .filter((email) => email.email.length > 0);

  if (normalized.length > 0 && !normalized.some((email) => email.isPrimary)) {
    normalized[0]!.isPrimary = true;
  }
  return normalized;
}

function normalizeAddresses(addresses: z.infer<typeof clientAddressSchema>[]): NormalizedClientAddress[] {
  const normalized = addresses
    .map((address, index) => ({
      label: nullIfBlank(address.label) ?? "Principal",
      isPrimary: address.isPrimary ?? index === 0,
      addressCep: nullIfBlank(address.addressCep),
      addressLogradouro: nullIfBlank(address.addressLogradouro),
      addressNumero: nullIfBlank(address.addressNumero),
      addressComplemento: nullIfBlank(address.addressComplemento),
      addressBairro: nullIfBlank(address.addressBairro),
      addressCidade: nullIfBlank(address.addressCidade),
      addressEstado: nullIfBlank(address.addressEstado),
      referencia: nullIfBlank(address.referencia)
    }))
    .filter((address) => [
      address.addressCep,
      address.addressLogradouro,
      address.addressNumero,
      address.addressComplemento,
      address.addressBairro,
      address.addressCidade,
      address.addressEstado,
      address.referencia
    ].some((value) => (value ?? "").length > 0));

  if (normalized.length > 0 && !normalized.some((address) => address.isPrimary)) {
    normalized[0]!.isPrimary = true;
  }
  return normalized;
}

function normalizeHealthItems(healthItems: z.infer<typeof clientHealthItemSchema>[]): NormalizedClientHealthItem[] {
  const dedupe = new Set<string>();
  const normalized: NormalizedClientHealthItem[] = [];

  for (const item of healthItems) {
    const label = item.label.trim();
    if (!label) continue;
    const key = `${item.type}:${label.toLowerCase()}`;
    if (dedupe.has(key)) continue;
    dedupe.add(key);
    normalized.push({ type: item.type, label });
  }

  return normalized;
}

function normalizePaymentMethod(method: string | null | undefined): PaymentMethodKey {
  const normalized = (method ?? "").trim().toLowerCase();
  if (["pix", "pix_mp", "pix_key"].includes(normalized)) return "pix";
  if (["card", "credit", "debit"].includes(normalized)) return "card";
  if (["cash", "dinheiro"].includes(normalized)) return "cash";
  if (["package", "pacote"].includes(normalized)) return "package";
  if (["waiver", "waived", "isento"].includes(normalized)) return "waiver";
  return "other";
}

function paymentMethodLabel(key: PaymentMethodKey): string {
  switch (key) {
    case "pix":
      return "Pix";
    case "card":
      return "Cartão";
    case "cash":
      return "Dinheiro";
    case "package":
      return "Pacote";
    case "waiver":
      return "Isento";
    default:
      return "Outros";
  }
}

function computeDayDiff(laterDateIso: string, earlierDateIso: string): number {
  const later = new Date(laterDateIso).getTime();
  const earlier = new Date(earlierDateIso).getTime();
  if (Number.isNaN(later) || Number.isNaN(earlier)) return 0;
  return Math.max(0, Math.floor((later - earlier) / 86_400_000));
}

function buildFidelityStars(completedSessionsCount: number, averageIntervalDays: number | null, daysSinceLastVisit: number | null): number {
  let stars = 1;
  if (completedSessionsCount >= 3) stars += 1;
  if (completedSessionsCount >= 6) stars += 1;
  if (averageIntervalDays !== null && averageIntervalDays <= 30) stars += 1;
  if (daysSinceLastVisit !== null && daysSinceLastVisit <= 21) stars += 1;
  return Math.max(1, Math.min(5, stars));
}

function buildEstimatedLtv12Months(totalSpentLifetimeCents: number, averageTicketCents: number, averageIntervalDays: number | null, completedSessionsCount: number): number {
  if (averageTicketCents <= 0) return totalSpentLifetimeCents;
  if (averageIntervalDays !== null && averageIntervalDays > 0) {
    const estimatedSessions = Math.max(1, Math.min(52, Math.round(365 / averageIntervalDays)));
    return Math.max(totalSpentLifetimeCents, averageTicketCents * estimatedSessions);
  }
  if (completedSessionsCount > 0) {
    return Math.max(totalSpentLifetimeCents, averageTicketCents * completedSessionsCount);
  }
  return totalSpentLifetimeCents;
}

async function replaceClientPhones(
  db: DbQueryClient,
  tenantSlug: string,
  clientId: string,
  phones: NormalizedClientPhone[]
) {
  await db.query(
    `
      DELETE FROM platform_core.client_phones
      WHERE tenant_slug = $1 AND client_id = $2
    `,
    [tenantSlug, clientId]
  );

  for (const phone of phones) {
    await db.query(
      `
        INSERT INTO platform_core.client_phones (
          tenant_slug, client_id, label, number_raw, number_e164, is_primary, is_whatsapp
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
      [tenantSlug, clientId, phone.label, phone.numberRaw, phone.numberE164, phone.isPrimary, phone.isWhatsapp]
    );
  }
}

async function replaceClientEmails(
  db: DbQueryClient,
  tenantSlug: string,
  clientId: string,
  emails: NormalizedClientEmail[]
) {
  await db.query(
    `
      DELETE FROM platform_core.client_emails
      WHERE tenant_slug = $1 AND client_id = $2
    `,
    [tenantSlug, clientId]
  );

  for (const email of emails) {
    await db.query(
      `
        INSERT INTO platform_core.client_emails (
          tenant_slug, client_id, label, email, is_primary
        ) VALUES ($1, $2, $3, $4, $5)
      `,
      [tenantSlug, clientId, email.label, email.email, email.isPrimary]
    );
  }
}

async function replaceClientAddresses(
  db: DbQueryClient,
  tenantSlug: string,
  clientId: string,
  addresses: NormalizedClientAddress[]
) {
  await db.query(
    `
      DELETE FROM platform_core.client_addresses
      WHERE tenant_slug = $1 AND client_id = $2
    `,
    [tenantSlug, clientId]
  );

  for (const address of addresses) {
    await db.query(
      `
        INSERT INTO platform_core.client_addresses (
          tenant_slug, client_id, label, is_primary, address_cep, address_logradouro,
          address_numero, address_complemento, address_bairro, address_cidade,
          address_estado, referencia
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `,
      [
        tenantSlug,
        clientId,
        address.label,
        address.isPrimary,
        address.addressCep,
        address.addressLogradouro,
        address.addressNumero,
        address.addressComplemento,
        address.addressBairro,
        address.addressCidade,
        address.addressEstado,
        address.referencia
      ]
    );
  }
}

async function replaceClientHealthItems(
  db: DbQueryClient,
  tenantSlug: string,
  clientId: string,
  healthItems: NormalizedClientHealthItem[]
) {
  await db.query(
    `
      DELETE FROM platform_core.client_health_items
      WHERE tenant_slug = $1 AND client_id = $2
    `,
    [tenantSlug, clientId]
  );

  for (const item of healthItems) {
    await db.query(
      `
        INSERT INTO platform_core.client_health_items (
          tenant_slug, client_id, type, label
        ) VALUES ($1, $2, $3, $4)
      `,
      [tenantSlug, clientId, item.type, item.label]
    );
  }
}

async function getClientById(db: DbPool, tenantSlug: string, clientId: string) {
  const result = await db.query(
    `
      SELECT
        c.id,
        c.tenant_slug AS "tenantSlug",
        c.full_name AS "fullName",
        c.preferred_name AS "preferredName",
        c.public_first_name AS "publicFirstName",
        c.public_last_name AS "publicLastName",
        c.internal_reference AS "internalReference",
        c.phone,
        c.whatsapp,
        c.email,
        c.birth_date AS "birthDate",
        c.cpf,
        c.avatar_url AS "avatarUrl",
        c.is_vip AS "isVip",
        c.needs_attention AS "needsAttention",
        c.marketing_opt_in AS "marketingOptIn",
        c.is_minor AS "isMinor",
        c.guardian_name AS "guardianName",
        c.guardian_phone AS "guardianPhone",
        c.guardian_cpf AS "guardianCpf",
        c.preferences_notes AS "preferencesNotes",
        c.contraindications,
        c.clinical_history AS "clinicalHistory",
        c.anamnese_url AS "anamneseUrl",
        c.observacoes_gerais AS "observacoesGerais",
        c.profissao,
        c.como_conheceu AS "comoConheceu",
        c.health_tags_json AS "healthTags",
        c.notes,
        c.created_at AS "createdAt",
        c.updated_at AS "updatedAt",
        p_main.number_raw AS "primaryPhoneRaw",
        p_wa.number_raw AS "whatsappPhoneRaw",
        e_main.email AS "primaryEmail"
      FROM platform_core.clients c
      LEFT JOIN LATERAL (
        SELECT number_raw
        FROM platform_core.client_phones p
        WHERE p.tenant_slug = c.tenant_slug AND p.client_id = c.id
        ORDER BY p.is_primary DESC, p.created_at ASC
        LIMIT 1
      ) p_main ON TRUE
      LEFT JOIN LATERAL (
        SELECT number_raw
        FROM platform_core.client_phones p
        WHERE p.tenant_slug = c.tenant_slug AND p.client_id = c.id
        ORDER BY p.is_whatsapp DESC, p.is_primary DESC, p.created_at ASC
        LIMIT 1
      ) p_wa ON TRUE
      LEFT JOIN LATERAL (
        SELECT email
        FROM platform_core.client_emails e
        WHERE e.tenant_slug = c.tenant_slug AND e.client_id = c.id
        ORDER BY e.is_primary DESC, e.created_at ASC
        LIMIT 1
      ) e_main ON TRUE
      WHERE c.id = $1 AND c.tenant_slug = $2
    `,
    [clientId, tenantSlug]
  );

  return result.rows[0] ?? null;
}

async function getClientProfileSnapshot(db: DbPool, tenantSlug: string, clientId: string) {
  const client = await getClientById(db, tenantSlug, clientId);
  if (!client) return null;

  const [phonesResult, emailsResult, addressesResult, healthItemsResult, historyResult] = await Promise.all([
    db.query(
      `
        SELECT
          id,
          tenant_slug AS "tenantSlug",
          client_id AS "clientId",
          label,
          number_raw AS "numberRaw",
          number_e164 AS "numberE164",
          is_primary AS "isPrimary",
          is_whatsapp AS "isWhatsapp",
          created_at AS "createdAt",
          updated_at AS "updatedAt"
        FROM platform_core.client_phones
        WHERE tenant_slug = $1 AND client_id = $2
        ORDER BY is_primary DESC, is_whatsapp DESC, created_at ASC
      `,
      [tenantSlug, clientId]
    ),
    db.query(
      `
        SELECT
          id,
          tenant_slug AS "tenantSlug",
          client_id AS "clientId",
          label,
          email,
          is_primary AS "isPrimary",
          created_at AS "createdAt",
          updated_at AS "updatedAt"
        FROM platform_core.client_emails
        WHERE tenant_slug = $1 AND client_id = $2
        ORDER BY is_primary DESC, created_at ASC
      `,
      [tenantSlug, clientId]
    ),
    db.query(
      `
        SELECT
          id,
          tenant_slug AS "tenantSlug",
          client_id AS "clientId",
          label,
          is_primary AS "isPrimary",
          address_cep AS "addressCep",
          address_logradouro AS "addressLogradouro",
          address_numero AS "addressNumero",
          address_complemento AS "addressComplemento",
          address_bairro AS "addressBairro",
          address_cidade AS "addressCidade",
          address_estado AS "addressEstado",
          referencia,
          created_at AS "createdAt",
          updated_at AS "updatedAt"
        FROM platform_core.client_addresses
        WHERE tenant_slug = $1 AND client_id = $2
        ORDER BY is_primary DESC, created_at ASC
      `,
      [tenantSlug, clientId]
    ),
    db.query(
      `
        SELECT
          id,
          tenant_slug AS "tenantSlug",
          client_id AS "clientId",
          type,
          label,
          created_at AS "createdAt",
          updated_at AS "updatedAt"
        FROM platform_core.client_health_items
        WHERE tenant_slug = $1 AND client_id = $2
        ORDER BY type ASC, label ASC
      `,
      [tenantSlug, clientId]
    ),
    db.query(
      `
        SELECT
          a.id AS "appointmentId",
          a.scheduled_at AS "startTime",
          COALESCE(s.name, 'Atendimento') AS "serviceName",
          a.status,
          CASE WHEN COALESCE(s.location_type, 'studio') = 'home' THEN TRUE ELSE FALSE END AS "isHomeVisit",
          a.notes AS "internalNotes",
          a.price_cents AS "priceCents"
        FROM platform_core.appointments a
        LEFT JOIN platform_core.services s ON s.id = a.service_id
        WHERE a.tenant_slug = $1 AND a.client_id = $2
        ORDER BY a.scheduled_at DESC
      `,
      [tenantSlug, clientId]
    )
  ]);

  const historyRows = historyResult.rows as Array<{
    appointmentId: string;
    startTime: string;
    serviceName: string;
    status: string | null;
    isHomeVisit: boolean;
    internalNotes: string | null;
    priceCents: number;
  }>;

  const appointmentIds = historyRows.map((item) => item.appointmentId);
  const [paymentsResult, evolutionsResult, referralsResult] = await Promise.all([
    appointmentIds.length > 0
      ? db.query(
          `
            SELECT
              id,
              appointment_id AS "appointmentId",
              amount_cents AS "amountCents",
              method,
              status,
              paid_at AS "paidAt",
              created_at AS "createdAt"
            FROM platform_core.payments
            WHERE tenant_slug = $1
              AND (client_id = $2 OR appointment_id = ANY($3::uuid[]))
          `,
          [tenantSlug, clientId, appointmentIds]
        )
      : db.query(
          `
            SELECT
              id,
              appointment_id AS "appointmentId",
              amount_cents AS "amountCents",
              method,
              status,
              paid_at AS "paidAt",
              created_at AS "createdAt"
            FROM platform_core.payments
            WHERE tenant_slug = $1 AND client_id = $2
          `,
          [tenantSlug, clientId]
        ),
    appointmentIds.length > 0
      ? db.query(
          `
            SELECT DISTINCT ON (appointment_id)
              appointment_id AS "appointmentId",
              evolution_text AS "evolutionText",
              created_at AS "createdAt"
            FROM platform_core.attendance_evolutions
            WHERE tenant_slug = $1
              AND appointment_id = ANY($2::uuid[])
            ORDER BY appointment_id, created_at DESC
          `,
          [tenantSlug, appointmentIds]
        )
      : db.query(
          `
            SELECT
              appointment_id AS "appointmentId",
              evolution_text AS "evolutionText",
              created_at AS "createdAt"
            FROM platform_core.attendance_evolutions
            WHERE false
          `
        ),
    db.query(
      `
        SELECT COUNT(*)::int AS total
        FROM platform_core.clients c
        WHERE c.tenant_slug = $1
          AND c.id <> $2
          AND (
            ($3::text IS NOT NULL AND c.como_conheceu ILIKE '%' || $3 || '%')
            OR ($4::text IS NOT NULL AND c.como_conheceu ILIKE '%' || $4 || '%')
          )
      `,
      [
        tenantSlug,
        clientId,
        sanitizeIlikeTerm(client.fullName),
        sanitizeIlikeTerm(client.internalReference)
      ]
    )
  ]);

  const evolutionByAppointment = new Map<string, { evolutionText: string; createdAt: string }>();
  for (const evolution of evolutionsResult.rows as Array<{ appointmentId: string | null; evolutionText: string; createdAt: string }>) {
    if (!evolution.appointmentId || evolutionByAppointment.has(evolution.appointmentId)) {
      continue;
    }
    evolutionByAppointment.set(evolution.appointmentId, {
      evolutionText: evolution.evolutionText,
      createdAt: evolution.createdAt
    });
  }

  const paidPayments = (paymentsResult.rows as Array<{ appointmentId: string | null; amountCents: number; method: string; status: string }>).filter(
    (payment) => payment.status === "paid"
  );

  const paidByAppointment = new Set(
    paidPayments.map((payment) => payment.appointmentId).filter((value): value is string => Boolean(value))
  );

  const totalPaidFromPayments = paidPayments.reduce((sum, payment) => sum + Number(payment.amountCents ?? 0), 0);

  const completedAppointments = historyRows.filter((row) => row.status === "completed");
  const completedSortedAsc = [...completedAppointments].sort((a, b) => a.startTime.localeCompare(b.startTime));
  const intervals: number[] = [];

  for (let index = 1; index < completedSortedAsc.length; index += 1) {
    const previous = completedSortedAsc[index - 1]!;
    const current = completedSortedAsc[index]!;
    intervals.push(computeDayDiff(current.startTime, previous.startTime));
  }

  const averageIntervalDays = intervals.length > 0
    ? Math.max(1, Math.round(intervals.reduce((sum, value) => sum + value, 0) / intervals.length))
    : null;

  const lastCompletedAppointment = completedAppointments[0] ?? null;
  const daysSinceLastVisit = lastCompletedAppointment
    ? computeDayDiff(new Date().toISOString(), lastCompletedAppointment.startTime)
    : null;

  const fallbackCompletedTotal = completedAppointments
    .filter((appointment) => !paidByAppointment.has(appointment.appointmentId))
    .reduce((sum, appointment) => sum + Number(appointment.priceCents ?? 0), 0);

  const totalSpentLifetimeCents = totalPaidFromPayments + fallbackCompletedTotal;
  const averageTicketCents = completedAppointments.length > 0
    ? Math.round(completedAppointments.reduce((sum, appointment) => sum + Number(appointment.priceCents ?? 0), 0) / completedAppointments.length)
    : 0;

  const paymentMethodTotals = new Map<PaymentMethodKey, number>();
  for (const payment of paidPayments) {
    const key = normalizePaymentMethod(payment.method);
    paymentMethodTotals.set(key, (paymentMethodTotals.get(key) ?? 0) + Number(payment.amountCents));
  }

  const paymentTotal = Array.from(paymentMethodTotals.values()).reduce((sum, value) => sum + value, 0);
  const paymentMethods = Array.from(paymentMethodTotals.entries())
    .sort((left, right) => right[1] - left[1])
    .map(([key, amount]) => ({
      key,
      label: paymentMethodLabel(key),
      amountCents: amount,
      percentage: paymentTotal > 0 ? Math.round((amount / paymentTotal) * 100) : 0
    }));

  const packagesAcquired = paidPayments.filter((payment) => normalizePaymentMethod(payment.method) === "package").length;
  const fidelityStars = buildFidelityStars(completedAppointments.length, averageIntervalDays, daysSinceLastVisit);
  const estimatedLtv12MonthsCents = buildEstimatedLtv12Months(
    totalSpentLifetimeCents,
    averageTicketCents,
    averageIntervalDays,
    completedAppointments.length
  );

  const prontuarioEntries = historyRows
    .filter((appointment) => new Date(appointment.startTime).getTime() <= Date.now())
    .map((appointment) => {
      const evolution = evolutionByAppointment.get(appointment.appointmentId) ?? null;
      return {
        appointmentId: appointment.appointmentId,
        startTime: appointment.startTime,
        serviceName: appointment.serviceName,
        status: appointment.status,
        isHomeVisit: appointment.isHomeVisit,
        internalNotes: appointment.internalNotes,
        evolutionText: evolution?.evolutionText ?? null,
        evolutionCreatedAt: evolution?.createdAt ?? null
      };
    });

  const normalizedHealthTags = Array.isArray(client.healthTags)
    ? client.healthTags
        .map((tag: unknown) => (typeof tag === "string" ? tag.trim() : ""))
        .filter((tag: string) => tag.length > 0)
    : [];

  return {
    client,
    phones: phonesResult.rows,
    emails: emailsResult.rows,
    addresses: addressesResult.rows,
    healthItems: healthItemsResult.rows,
    history: historyRows,
    finance: {
      totalSpentLifetimeCents,
      averageTicketCents,
      packagesAcquired,
      discountsGrantedCents: 0,
      estimatedLtv12MonthsCents,
      averageIntervalDays,
      daysSinceLastVisit,
      fidelityStars,
      referralsCount: Number(referralsResult.rows[0]?.total ?? 0),
      paymentMethods,
      completedSessionsCount: completedAppointments.length
    },
    prontuarioEntries,
    anamnesis: {
      clinicalHistory: client.clinicalHistory,
      contraindications: client.contraindications,
      preferencesNotes: client.preferencesNotes,
      observations: client.observacoesGerais,
      legacyNotes: client.notes,
      anamneseUrl: client.anamneseUrl,
      healthTags: normalizedHealthTags,
      healthItems: healthItemsResult.rows
    }
  };
}

export function registerClientRoutes(
  app: FastifyInstance,
  db: DbPool | null,
  deps: { requireAuth: preHandlerHookHandler }
) {
  app.get("/clients", { preHandler: deps.requireAuth }, async (request, reply) => {
    try {
      assertDb(db);
    } catch {
      return reply.code(503).send({ error: "database_unavailable" });
    }

    const tenant = getTenantFromQuery(request, reply);
    if (!tenant) return;
    if (!enforceTenantAccess(request, reply, tenant)) return;

    const parsed = listQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_query" });
    }

    const term = nullIfBlank(parsed.data.q);
    const ilike = term ? `%${sanitizeIlikeTerm(term)}%` : null;

    const result = await db.query(
      `
      SELECT
        c.id,
        c.tenant_slug AS "tenantSlug",
        c.full_name AS "fullName",
        c.preferred_name AS "preferredName",
        c.public_first_name AS "publicFirstName",
        c.public_last_name AS "publicLastName",
        c.internal_reference AS "internalReference",
        COALESCE(p_main.number_raw, c.phone) AS phone,
        COALESCE(p_wa.number_raw, c.whatsapp, p_main.number_raw, c.phone) AS whatsapp,
        COALESCE(e_main.email, c.email) AS email,
        c.birth_date AS "birthDate",
        c.cpf,
        c.is_vip AS "isVip",
        c.needs_attention AS "needsAttention",
        c.marketing_opt_in AS "marketingOptIn",
        c.created_at AS "createdAt",
        c.updated_at AS "updatedAt"
      FROM platform_core.clients c
      LEFT JOIN LATERAL (
        SELECT number_raw
        FROM platform_core.client_phones p
        WHERE p.tenant_slug = c.tenant_slug AND p.client_id = c.id
        ORDER BY p.is_primary DESC, p.created_at ASC
        LIMIT 1
      ) p_main ON TRUE
      LEFT JOIN LATERAL (
        SELECT number_raw
        FROM platform_core.client_phones p
        WHERE p.tenant_slug = c.tenant_slug AND p.client_id = c.id
        ORDER BY p.is_whatsapp DESC, p.is_primary DESC, p.created_at ASC
        LIMIT 1
      ) p_wa ON TRUE
      LEFT JOIN LATERAL (
        SELECT email
        FROM platform_core.client_emails e
        WHERE e.tenant_slug = c.tenant_slug AND e.client_id = c.id
        ORDER BY e.is_primary DESC, e.created_at ASC
        LIMIT 1
      ) e_main ON TRUE
      WHERE c.tenant_slug = $1
        AND (
          $2::text IS NULL
          OR c.full_name ILIKE $2
          OR COALESCE(c.preferred_name, '') ILIKE $2
          OR COALESCE(c.internal_reference, '') ILIKE $2
          OR COALESCE(c.phone, '') ILIKE $2
          OR COALESCE(p_main.number_raw, '') ILIKE $2
          OR COALESCE(e_main.email, '') ILIKE $2
        )
      ORDER BY c.full_name ASC
      `,
      [tenant, ilike]
    );

    return { items: result.rows };
  });

  app.get("/clients/:id", { preHandler: deps.requireAuth }, async (request, reply) => {
    try {
      assertDb(db);
    } catch {
      return reply.code(503).send({ error: "database_unavailable" });
    }

    const params = clientIdSchema.safeParse(request.params);
    const tenant = getTenantFromQuery(request, reply);
    if (!params.success) return reply.code(400).send({ error: "invalid_request" });
    if (!tenant) return;
    if (!enforceTenantAccess(request, reply, tenant)) return;

    const client = await getClientById(db, tenant, params.data.id);
    if (!client) return reply.code(404).send({ error: "client_not_found" });
    return client;
  });

  app.get("/clients/:id/profile", { preHandler: deps.requireAuth }, async (request, reply) => {
    try {
      assertDb(db);
    } catch {
      return reply.code(503).send({ error: "database_unavailable" });
    }

    const params = clientIdSchema.safeParse(request.params);
    const tenant = getTenantFromQuery(request, reply);
    if (!params.success) return reply.code(400).send({ error: "invalid_request" });
    if (!tenant) return;
    if (!enforceTenantAccess(request, reply, tenant)) return;

    const profile = await getClientProfileSnapshot(db, tenant, params.data.id);
    if (!profile) return reply.code(404).send({ error: "client_not_found" });
    return profile;
  });

  app.post("/clients", { preHandler: deps.requireAuth }, async (request, reply) => {
    try {
      assertDb(db);
    } catch {
      return reply.code(503).send({ error: "database_unavailable" });
    }

    const body = createClientSchema.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: "invalid_payload" });
    if (!enforceTenantAccess(request, reply, body.data.tenantSlug)) return;

    const tenantSlug = body.data.tenantSlug;
    const phones = normalizePhones(body.data.phones);
    const emails = normalizeEmails(body.data.emails);
    const addresses = normalizeAddresses(body.data.addresses);
    const healthItems = normalizeHealthItems(body.data.healthItems);

    const dbClient = await db.connect();
    try {
      await dbClient.query("BEGIN");
      const result = await dbClient.query(
        `
        INSERT INTO platform_core.clients (
          tenant_slug, full_name, preferred_name, public_first_name, public_last_name, internal_reference,
          phone, whatsapp, email, birth_date, cpf, avatar_url, is_vip, needs_attention, marketing_opt_in,
          is_minor, guardian_name, guardian_phone, guardian_cpf, preferences_notes, contraindications,
          clinical_history, anamnese_url, observacoes_gerais, profissao, como_conheceu, health_tags_json, notes
        ) VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9, $10::date, $11, $12, $13, $14, $15,
          $16, $17, $18, $19, $20, $21,
          $22, $23, $24, $25, $26, $27::jsonb, $28
        )
        RETURNING id
        `,
        [
          tenantSlug,
          body.data.fullName,
          nullIfBlank(body.data.preferredName),
          nullIfBlank(body.data.publicFirstName),
          nullIfBlank(body.data.publicLastName),
          nullIfBlank(body.data.internalReference),
          nullIfBlank(body.data.phone) ?? phones.find((phone) => phone.isPrimary)?.numberRaw ?? null,
          nullIfBlank(body.data.whatsapp) ?? phones.find((phone) => phone.isWhatsapp)?.numberRaw ?? null,
          nullIfBlank(body.data.email) ?? emails.find((email) => email.isPrimary)?.email ?? null,
          nullIfBlank(body.data.birthDate),
          nullIfBlank(body.data.cpf),
          nullIfBlank(body.data.avatarUrl),
          body.data.isVip,
          body.data.needsAttention,
          body.data.marketingOptIn,
          body.data.isMinor,
          nullIfBlank(body.data.guardianName),
          nullIfBlank(body.data.guardianPhone),
          nullIfBlank(body.data.guardianCpf),
          nullIfBlank(body.data.preferencesNotes),
          nullIfBlank(body.data.contraindications),
          nullIfBlank(body.data.clinicalHistory),
          nullIfBlank(body.data.anamneseUrl),
          nullIfBlank(body.data.observacoesGerais),
          nullIfBlank(body.data.profissao),
          nullIfBlank(body.data.comoConheceu),
          JSON.stringify(body.data.healthTags),
          nullIfBlank(body.data.notes)
        ]
      );

      const clientId = result.rows[0]?.id as string;
      await Promise.all([
        replaceClientPhones(dbClient, tenantSlug, clientId, phones),
        replaceClientEmails(dbClient, tenantSlug, clientId, emails),
        replaceClientAddresses(dbClient, tenantSlug, clientId, addresses),
        replaceClientHealthItems(dbClient, tenantSlug, clientId, healthItems)
      ]);
      await dbClient.query("COMMIT");

      const created = await getClientById(db, tenantSlug, clientId);
      return reply.code(201).send(created);
    } catch (error) {
      await dbClient.query("ROLLBACK");
      request.log.error({ error }, "falha ao criar cliente");
      return reply.code(500).send({ error: "client_create_failed" });
    } finally {
      dbClient.release();
    }
  });

  app.put("/clients/:id", { preHandler: deps.requireAuth }, async (request, reply) => {
    try {
      assertDb(db);
    } catch {
      return reply.code(503).send({ error: "database_unavailable" });
    }

    const params = clientIdSchema.safeParse(request.params);
    const tenant = getTenantFromQuery(request, reply);
    const body = updateClientSchema.safeParse(request.body);
    if (!params.success || !body.success) return reply.code(400).send({ error: "invalid_request" });
    if (!tenant) return;
    if (!enforceTenantAccess(request, reply, tenant)) return;

    const payload = body.data;
    const hasOwn = (key: keyof typeof payload) => Object.prototype.hasOwnProperty.call(payload, key);
    const assignments: string[] = [];
    const values: unknown[] = [params.data.id, tenant];
    let position = 3;

    const pushAssignment = (column: string, value: unknown) => {
      assignments.push(`${column} = $${position}`);
      values.push(value);
      position += 1;
    };

    if (hasOwn("fullName")) pushAssignment("full_name", nullIfBlank(payload.fullName));
    if (hasOwn("preferredName")) pushAssignment("preferred_name", nullIfBlank(payload.preferredName));
    if (hasOwn("publicFirstName")) pushAssignment("public_first_name", nullIfBlank(payload.publicFirstName));
    if (hasOwn("publicLastName")) pushAssignment("public_last_name", nullIfBlank(payload.publicLastName));
    if (hasOwn("internalReference")) pushAssignment("internal_reference", nullIfBlank(payload.internalReference));
    if (hasOwn("phone")) pushAssignment("phone", nullIfBlank(payload.phone));
    if (hasOwn("whatsapp")) pushAssignment("whatsapp", nullIfBlank(payload.whatsapp));
    if (hasOwn("email")) pushAssignment("email", nullIfBlank(payload.email));
    if (hasOwn("birthDate")) pushAssignment("birth_date", nullIfBlank(payload.birthDate));
    if (hasOwn("cpf")) pushAssignment("cpf", nullIfBlank(payload.cpf));
    if (hasOwn("avatarUrl")) pushAssignment("avatar_url", nullIfBlank(payload.avatarUrl));
    if (hasOwn("isVip")) pushAssignment("is_vip", payload.isVip ?? false);
    if (hasOwn("needsAttention")) pushAssignment("needs_attention", payload.needsAttention ?? false);
    if (hasOwn("marketingOptIn")) pushAssignment("marketing_opt_in", payload.marketingOptIn ?? false);
    if (hasOwn("isMinor")) pushAssignment("is_minor", payload.isMinor ?? false);
    if (hasOwn("guardianName")) pushAssignment("guardian_name", nullIfBlank(payload.guardianName));
    if (hasOwn("guardianPhone")) pushAssignment("guardian_phone", nullIfBlank(payload.guardianPhone));
    if (hasOwn("guardianCpf")) pushAssignment("guardian_cpf", nullIfBlank(payload.guardianCpf));
    if (hasOwn("preferencesNotes")) pushAssignment("preferences_notes", nullIfBlank(payload.preferencesNotes));
    if (hasOwn("contraindications")) pushAssignment("contraindications", nullIfBlank(payload.contraindications));
    if (hasOwn("clinicalHistory")) pushAssignment("clinical_history", nullIfBlank(payload.clinicalHistory));
    if (hasOwn("anamneseUrl")) pushAssignment("anamnese_url", nullIfBlank(payload.anamneseUrl));
    if (hasOwn("observacoesGerais")) pushAssignment("observacoes_gerais", nullIfBlank(payload.observacoesGerais));
    if (hasOwn("profissao")) pushAssignment("profissao", nullIfBlank(payload.profissao));
    if (hasOwn("comoConheceu")) pushAssignment("como_conheceu", nullIfBlank(payload.comoConheceu));
    if (hasOwn("healthTags")) pushAssignment("health_tags_json", JSON.stringify(payload.healthTags ?? []));
    if (hasOwn("notes")) pushAssignment("notes", nullIfBlank(payload.notes));

    const dbClient = await db.connect();
    try {
      await dbClient.query("BEGIN");

      if (assignments.length > 0) {
        const updateSql = `
          UPDATE platform_core.clients
          SET ${assignments.join(", ")}, updated_at = NOW()
          WHERE id = $1 AND tenant_slug = $2
          RETURNING id
        `;
        const updateResult = await dbClient.query(updateSql, values);
        if (updateResult.rowCount === 0) {
          await dbClient.query("ROLLBACK");
          return reply.code(404).send({ error: "client_not_found" });
        }
      } else {
        const existsResult = await dbClient.query(
          `
            SELECT id
            FROM platform_core.clients
            WHERE id = $1 AND tenant_slug = $2
          `,
          [params.data.id, tenant]
        );
        if (existsResult.rowCount === 0) {
          await dbClient.query("ROLLBACK");
          return reply.code(404).send({ error: "client_not_found" });
        }
      }

      if (hasOwn("phones")) {
        await replaceClientPhones(dbClient, tenant, params.data.id, normalizePhones(payload.phones ?? []));
      }
      if (hasOwn("emails")) {
        await replaceClientEmails(dbClient, tenant, params.data.id, normalizeEmails(payload.emails ?? []));
      }
      if (hasOwn("addresses")) {
        await replaceClientAddresses(dbClient, tenant, params.data.id, normalizeAddresses(payload.addresses ?? []));
      }
      if (hasOwn("healthItems")) {
        await replaceClientHealthItems(dbClient, tenant, params.data.id, normalizeHealthItems(payload.healthItems ?? []));
      }

      await dbClient.query("COMMIT");
      const updated = await getClientById(db, tenant, params.data.id);
      return updated;
    } catch (error) {
      await dbClient.query("ROLLBACK");
      request.log.error({ error }, "falha ao atualizar cliente");
      return reply.code(500).send({ error: "client_update_failed" });
    } finally {
      dbClient.release();
    }
  });

  app.delete("/clients/:id", { preHandler: deps.requireAuth }, async (request, reply) => {
    try {
      assertDb(db);
    } catch {
      return reply.code(503).send({ error: "database_unavailable" });
    }

    const params = clientIdSchema.safeParse(request.params);
    const tenant = getTenantFromQuery(request, reply);
    if (!params.success) return reply.code(400).send({ error: "invalid_request" });
    if (!tenant) return;
    if (!enforceTenantAccess(request, reply, tenant)) return;

    const result = await db.query(
      `
        DELETE FROM platform_core.clients
        WHERE id = $1 AND tenant_slug = $2
        RETURNING id
      `,
      [params.data.id, tenant]
    );

    if (result.rowCount === 0) return reply.code(404).send({ error: "client_not_found" });
    return reply.code(204).send();
  });
}
