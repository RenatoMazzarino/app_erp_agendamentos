import type { DbPool } from "./pool.js";

const BASELINE_VERSION = "0004_operational_modules_full";

export async function runBootstrapMigrations(db: DbPool): Promise<void> {
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    await client.query("CREATE EXTENSION IF NOT EXISTS pgcrypto");
    await client.query("CREATE SCHEMA IF NOT EXISTS platform_core");
    await client.query(`
      CREATE TABLE IF NOT EXISTS platform_core.schema_migrations (
        version TEXT PRIMARY KEY,
        description TEXT NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS platform_core.tenants (
        slug TEXT PRIMARY KEY,
        display_name TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS platform_core.clients (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_slug TEXT NOT NULL,
        full_name TEXT NOT NULL,
        preferred_name TEXT,
        public_first_name TEXT,
        public_last_name TEXT,
        internal_reference TEXT,
        phone TEXT,
        whatsapp TEXT,
        email TEXT,
        birth_date DATE,
        cpf TEXT,
        avatar_url TEXT,
        is_vip BOOLEAN NOT NULL DEFAULT FALSE,
        needs_attention BOOLEAN NOT NULL DEFAULT FALSE,
        marketing_opt_in BOOLEAN NOT NULL DEFAULT FALSE,
        is_minor BOOLEAN NOT NULL DEFAULT FALSE,
        guardian_name TEXT,
        guardian_phone TEXT,
        guardian_cpf TEXT,
        preferences_notes TEXT,
        contraindications TEXT,
        clinical_history TEXT,
        anamnese_url TEXT,
        observacoes_gerais TEXT,
        profissao TEXT,
        como_conheceu TEXT,
        health_tags_json JSONB NOT NULL DEFAULT '[]'::jsonb,
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await client.query(`
      ALTER TABLE platform_core.clients
      ADD COLUMN IF NOT EXISTS public_first_name TEXT,
      ADD COLUMN IF NOT EXISTS public_last_name TEXT,
      ADD COLUMN IF NOT EXISTS internal_reference TEXT,
      ADD COLUMN IF NOT EXISTS cpf TEXT,
      ADD COLUMN IF NOT EXISTS avatar_url TEXT,
      ADD COLUMN IF NOT EXISTS is_vip BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS needs_attention BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS marketing_opt_in BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS is_minor BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS guardian_name TEXT,
      ADD COLUMN IF NOT EXISTS guardian_phone TEXT,
      ADD COLUMN IF NOT EXISTS guardian_cpf TEXT,
      ADD COLUMN IF NOT EXISTS preferences_notes TEXT,
      ADD COLUMN IF NOT EXISTS contraindications TEXT,
      ADD COLUMN IF NOT EXISTS clinical_history TEXT,
      ADD COLUMN IF NOT EXISTS anamnese_url TEXT,
      ADD COLUMN IF NOT EXISTS observacoes_gerais TEXT,
      ADD COLUMN IF NOT EXISTS profissao TEXT,
      ADD COLUMN IF NOT EXISTS como_conheceu TEXT,
      ADD COLUMN IF NOT EXISTS health_tags_json JSONB NOT NULL DEFAULT '[]'::jsonb
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_clients_tenant_name
      ON platform_core.clients (tenant_slug, full_name)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_clients_tenant_reference
      ON platform_core.clients (tenant_slug, internal_reference)
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS platform_core.client_phones (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_slug TEXT NOT NULL REFERENCES platform_core.tenants(slug) ON DELETE CASCADE,
        client_id UUID NOT NULL REFERENCES platform_core.clients(id) ON DELETE CASCADE,
        label TEXT,
        number_raw TEXT NOT NULL,
        number_e164 TEXT,
        is_primary BOOLEAN NOT NULL DEFAULT FALSE,
        is_whatsapp BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_client_phones_one_primary_per_client
      ON platform_core.client_phones (client_id)
      WHERE is_primary
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_client_phones_tenant_client
      ON platform_core.client_phones (tenant_slug, client_id)
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS platform_core.client_emails (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_slug TEXT NOT NULL REFERENCES platform_core.tenants(slug) ON DELETE CASCADE,
        client_id UUID NOT NULL REFERENCES platform_core.clients(id) ON DELETE CASCADE,
        label TEXT,
        email TEXT NOT NULL,
        is_primary BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_client_emails_one_primary_per_client
      ON platform_core.client_emails (client_id)
      WHERE is_primary
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_client_emails_tenant_client
      ON platform_core.client_emails (tenant_slug, client_id)
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS platform_core.client_addresses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_slug TEXT NOT NULL REFERENCES platform_core.tenants(slug) ON DELETE CASCADE,
        client_id UUID NOT NULL REFERENCES platform_core.clients(id) ON DELETE CASCADE,
        label TEXT NOT NULL DEFAULT 'Principal',
        is_primary BOOLEAN NOT NULL DEFAULT FALSE,
        address_cep TEXT,
        address_logradouro TEXT,
        address_numero TEXT,
        address_complemento TEXT,
        address_bairro TEXT,
        address_cidade TEXT,
        address_estado TEXT,
        referencia TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_client_addresses_one_primary_per_client
      ON platform_core.client_addresses (client_id)
      WHERE is_primary
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_client_addresses_tenant_client
      ON platform_core.client_addresses (tenant_slug, client_id)
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS platform_core.client_health_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_slug TEXT NOT NULL REFERENCES platform_core.tenants(slug) ON DELETE CASCADE,
        client_id UUID NOT NULL REFERENCES platform_core.clients(id) ON DELETE CASCADE,
        type TEXT NOT NULL CHECK (type IN ('allergy', 'condition', 'tag')),
        label TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (tenant_slug, client_id, type, label)
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_client_health_items_tenant_client
      ON platform_core.client_health_items (tenant_slug, client_id, type)
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS platform_core.services (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_slug TEXT NOT NULL REFERENCES platform_core.tenants(slug) ON DELETE CASCADE,
        name TEXT NOT NULL,
        duration_minutes INTEGER NOT NULL,
        price_cents INTEGER NOT NULL,
        location_type TEXT NOT NULL DEFAULT 'studio',
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_services_tenant_name
      ON platform_core.services (tenant_slug, name)
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS platform_core.appointments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_slug TEXT NOT NULL REFERENCES platform_core.tenants(slug) ON DELETE CASCADE,
        client_id UUID NOT NULL REFERENCES platform_core.clients(id) ON DELETE RESTRICT,
        service_id UUID REFERENCES platform_core.services(id) ON DELETE SET NULL,
        scheduled_at TIMESTAMPTZ NOT NULL,
        duration_minutes INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'scheduled',
        source TEXT NOT NULL DEFAULT 'internal',
        notes TEXT,
        price_cents INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_appointments_tenant_schedule
      ON platform_core.appointments (tenant_slug, scheduled_at DESC)
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS platform_core.attendance_evolutions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_slug TEXT NOT NULL REFERENCES platform_core.tenants(slug) ON DELETE CASCADE,
        appointment_id UUID REFERENCES platform_core.appointments(id) ON DELETE CASCADE,
        client_id UUID NOT NULL REFERENCES platform_core.clients(id) ON DELETE CASCADE,
        evolution_text TEXT NOT NULL,
        pain_points_json JSONB NOT NULL DEFAULT '[]'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_attendance_evolutions_tenant_client
      ON platform_core.attendance_evolutions (tenant_slug, client_id, created_at DESC)
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS platform_core.messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_slug TEXT NOT NULL REFERENCES platform_core.tenants(slug) ON DELETE CASCADE,
        client_id UUID REFERENCES platform_core.clients(id) ON DELETE SET NULL,
        appointment_id UUID REFERENCES platform_core.appointments(id) ON DELETE SET NULL,
        channel TEXT NOT NULL,
        direction TEXT NOT NULL DEFAULT 'outbound',
        body TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'queued',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_messages_tenant_created
      ON platform_core.messages (tenant_slug, created_at DESC)
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS platform_core.payments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_slug TEXT NOT NULL REFERENCES platform_core.tenants(slug) ON DELETE CASCADE,
        appointment_id UUID REFERENCES platform_core.appointments(id) ON DELETE SET NULL,
        client_id UUID REFERENCES platform_core.clients(id) ON DELETE SET NULL,
        amount_cents INTEGER NOT NULL,
        method TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        paid_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_payments_tenant_created
      ON platform_core.payments (tenant_slug, created_at DESC)
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS platform_core.tenant_settings (
        tenant_slug TEXT PRIMARY KEY REFERENCES platform_core.tenants(slug) ON DELETE CASCADE,
        business_name TEXT NOT NULL,
        primary_color TEXT NOT NULL DEFAULT '#5f7a61',
        accent_color TEXT NOT NULL DEFAULT '#e9dccb',
        push_enabled BOOLEAN NOT NULL DEFAULT TRUE,
        whatsapp_enabled BOOLEAN NOT NULL DEFAULT TRUE,
        signal_percentage INTEGER NOT NULL DEFAULT 10,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS platform_core.schedule_blocks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_slug TEXT NOT NULL REFERENCES platform_core.tenants(slug) ON DELETE CASCADE,
        starts_at TIMESTAMPTZ NOT NULL,
        ends_at TIMESTAMPTZ NOT NULL,
        reason TEXT NOT NULL,
        created_by TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CHECK (ends_at > starts_at)
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_schedule_blocks_tenant_range
      ON platform_core.schedule_blocks (tenant_slug, starts_at, ends_at)
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS platform_core.tenant_memberships (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_slug TEXT NOT NULL REFERENCES platform_core.tenants(slug) ON DELETE CASCADE,
        user_subject TEXT NOT NULL,
        email TEXT NOT NULL,
        full_name TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'staff', 'viewer')),
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (tenant_slug, user_subject)
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_tenant_memberships_tenant_role
      ON platform_core.tenant_memberships (tenant_slug, role, is_active)
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS platform_core.audit_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_slug TEXT NOT NULL REFERENCES platform_core.tenants(slug) ON DELETE CASCADE,
        actor_subject TEXT,
        action TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT,
        payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_events_tenant_created
      ON platform_core.audit_events (tenant_slug, created_at DESC)
    `);

    await client.query(
      `
      INSERT INTO platform_core.tenants (slug, display_name)
      VALUES ('tenant-dev', 'Tenant Dev')
      ON CONFLICT (slug) DO NOTHING
      `
    );
    await client.query(
      `
      INSERT INTO platform_core.tenant_settings (
        tenant_slug,
        business_name,
        primary_color,
        accent_color,
        push_enabled,
        whatsapp_enabled,
        signal_percentage
      )
      VALUES ('tenant-dev', 'Tenant Dev', '#5f7a61', '#e9dccb', true, true, 10)
      ON CONFLICT (tenant_slug) DO NOTHING
      `
    );
    await client.query(
      `
      INSERT INTO platform_core.tenant_memberships (
        tenant_slug,
        user_subject,
        email,
        full_name,
        role,
        is_active
      )
      VALUES (
        'tenant-dev',
        'seed-owner-tenant-dev',
        'owner@tenant-dev.local',
        'Owner Tenant Dev',
        'owner',
        TRUE
      )
      ON CONFLICT (tenant_slug, user_subject) DO NOTHING
      `
    );
    await client.query(
      `
      INSERT INTO platform_core.schema_migrations (version, description)
      VALUES ($1, $2)
      ON CONFLICT (version) DO NOTHING
      `,
      [
        BASELINE_VERSION,
        "Expande schema core com clientes, agenda, atendimento, mensagens, financeiro, bloqueios e governanca admin"
      ]
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export function getBootstrapVersion() {
  return BASELINE_VERSION;
}
