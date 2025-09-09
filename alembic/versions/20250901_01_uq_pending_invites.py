"""add partial unique index for pending invitations

Revision ID: 20250901_01_uq_pending_invt
Revises: 20250831_03_insp_fk_cascade
Create Date: 2025-09-01
"""
from alembic import op

revision = '20250901_01_uq_pending_invt'
down_revision = '20250831_03_insp_fk_cascade'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'uq_apiary_pending_invite'
            ) THEN
                CREATE UNIQUE INDEX uq_apiary_pending_invite
                    ON apiary_invitations (apiary_id, lower(invitee_email))
                    WHERE status = 'pending';
            END IF;
        END$$;
        """
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS uq_apiary_pending_invite;")
