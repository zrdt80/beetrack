"""add ON DELETE CASCADE to apiary FKs

Revision ID: 20250831_02_apiary_fk_cascade
Revises: 20250831_01_fix_identity_restart
Create Date: 2025-08-31
"""
from alembic import op

revision = '20250831_02_apiary_fk_cascade'
down_revision = '20250831_01_fix_identity_restart'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        DO $$
        DECLARE cname text;
        BEGIN
            SELECT conname INTO cname
            FROM pg_constraint c
            JOIN pg_class t ON t.oid = c.conrelid
            JOIN pg_namespace n ON n.oid = t.relnamespace
            WHERE t.relname = 'apiary_members'
              AND c.contype = 'f'
              AND pg_get_constraintdef(c.oid) ILIKE '%REFERENCES apiaries%';
            IF cname IS NOT NULL THEN
                EXECUTE format('ALTER TABLE apiary_members DROP CONSTRAINT %I', cname);
            END IF;
            EXECUTE 'ALTER TABLE apiary_members ADD CONSTRAINT fk_apiary_members_apiary_id_apiaries FOREIGN KEY (apiary_id) REFERENCES apiaries(id) ON DELETE CASCADE';
        END$$;
        """
    )

    op.execute(
        """
        DO $$
        DECLARE cname text;
        BEGIN
            SELECT conname INTO cname
            FROM pg_constraint c
            JOIN pg_class t ON t.oid = c.conrelid
            JOIN pg_namespace n ON n.oid = t.relnamespace
            WHERE t.relname = 'apiary_invitations'
              AND c.contype = 'f'
              AND pg_get_constraintdef(c.oid) ILIKE '%REFERENCES apiaries%';
            IF cname IS NOT NULL THEN
                EXECUTE format('ALTER TABLE apiary_invitations DROP CONSTRAINT %I', cname);
            END IF;
            EXECUTE 'ALTER TABLE apiary_invitations ADD CONSTRAINT fk_apiary_invitations_apiary_id_apiaries FOREIGN KEY (apiary_id) REFERENCES apiaries(id) ON DELETE CASCADE';
        END$$;
        """
    )

    op.execute("ALTER TABLE hives DROP CONSTRAINT IF EXISTS fk_hives_apiary_id_apiaries;")
    op.execute(
        "ALTER TABLE hives ADD CONSTRAINT fk_hives_apiary_id_apiaries FOREIGN KEY (apiary_id) REFERENCES apiaries(id) ON DELETE CASCADE;"
    )


def downgrade() -> None:
    op.execute("ALTER TABLE apiary_members DROP CONSTRAINT IF EXISTS fk_apiary_members_apiary_id_apiaries;")
    op.execute("ALTER TABLE apiary_invitations DROP CONSTRAINT IF EXISTS fk_apiary_invitations_apiary_id_apiaries;")
    op.execute("ALTER TABLE hives DROP CONSTRAINT IF EXISTS fk_hives_apiary_id_apiaries;")
    op.execute(
        "ALTER TABLE hives ADD CONSTRAINT fk_hives_apiary_id_apiaries FOREIGN KEY (apiary_id) REFERENCES apiaries(id);"
    )