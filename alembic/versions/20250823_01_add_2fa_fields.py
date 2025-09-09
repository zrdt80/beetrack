"""add 2FA fields to users and replaced_by to sessions

Revision ID: add_2fa_fields_20250823
Revises: rcr_20250818_02
Create Date: 2025-08-23
"""

from alembic import op
import sqlalchemy as sa

revision = 'add_2fa_fields_20250823'
down_revision = 'rcr_20250818_02'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('users', sa.Column('two_factor_enabled', sa.Boolean(), nullable=False, server_default=sa.text('false')))
    op.add_column('users', sa.Column('two_factor_secret', sa.String(length=64), nullable=True))
    op.add_column('users', sa.Column('two_factor_confirmed_at', sa.DateTime(), nullable=True))
    op.add_column('users', sa.Column('two_factor_recovery_codes', sa.Text(), nullable=True))
    op.alter_column('users', 'two_factor_enabled', server_default=None)

    op.add_column('user_sessions', sa.Column('replaced_by', sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column('user_sessions', 'replaced_by')
    op.drop_column('users', 'two_factor_recovery_codes')
    op.drop_column('users', 'two_factor_confirmed_at')
    op.drop_column('users', 'two_factor_secret')
    op.drop_column('users', 'two_factor_enabled')
