"""restart identity sequences for apiary tables

Revision ID: 20250830_02_fix_identity_restart
Revises: 20250830_01_fix_apiary_identity
Create Date: 2025-08-30
"""
from alembic import op

revision = '20250830_02_fix_identity_restart'
down_revision = '20250830_01_fix_apiary_identity'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        DO $$
        DECLARE v bigint;
        BEGIN
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='apiary_members' AND column_name='id') THEN
                SELECT COALESCE(MAX(id), 0) + 1 INTO v FROM apiary_members;
                EXECUTE format('ALTER TABLE apiary_members ALTER COLUMN id RESTART WITH %s', v);
            END IF;
        END$$;
        """
    )
    op.execute(
        """
        DO $$
        DECLARE v bigint;
        BEGIN
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='apiary_invitations' AND column_name='id') THEN
                SELECT COALESCE(MAX(id), 0) + 1 INTO v FROM apiary_invitations;
                EXECUTE format('ALTER TABLE apiary_invitations ALTER COLUMN id RESTART WITH %s', v);
            END IF;
        END$$;
        """
    )


def downgrade() -> None:
    pass
