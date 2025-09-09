"""set ON DELETE CASCADE for inspections.hive_id

Revision ID: 20250831_03_insp_fk_cascade
Revises: 20250831_02_apiary_fk_cascade
Create Date: 2025-08-31
"""
from alembic import op

revision = '20250831_03_insp_fk_cascade'
down_revision = '20250831_02_apiary_fk_cascade'
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
            WHERE t.relname = 'inspections'
              AND c.contype = 'f'
              AND pg_get_constraintdef(c.oid) ILIKE '%REFERENCES hives%';
            IF cname IS NOT NULL THEN
                EXECUTE format('ALTER TABLE inspections DROP CONSTRAINT %I', cname);
            END IF;
            EXECUTE 'ALTER TABLE inspections ADD CONSTRAINT fk_inspections_hive_id_hives FOREIGN KEY (hive_id) REFERENCES hives(id) ON DELETE CASCADE';
        END$$;
        """
    )


def downgrade() -> None:
    op.execute("ALTER TABLE inspections DROP CONSTRAINT IF EXISTS fk_inspections_hive_id_hives;")
    op.execute("ALTER TABLE inspections ADD CONSTRAINT fk_inspections_hive_id_hives FOREIGN KEY (hive_id) REFERENCES hives(id);")
