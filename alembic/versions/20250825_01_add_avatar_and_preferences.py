"""add avatar and preferences fields

Revision ID: 20250825_01_avatar_and_pref
Revises: add_2fa_fields_20250823
Create Date: 2025-08-25
"""
from alembic import op
import sqlalchemy as sa

revision = '20250825_01_avatar_and_pref'
down_revision = 'add_2fa_fields_20250823'
branch_labels = None
depends_on = None

def upgrade() -> None:
    with op.batch_alter_table('users') as batch_op:
        batch_op.add_column(sa.Column('avatar_url', sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column('theme', sa.String(length=20), nullable=False, server_default='system'))
        batch_op.add_column(sa.Column('timezone', sa.String(length=64), nullable=False, server_default='UTC'))
        batch_op.add_column(sa.Column('locale', sa.String(length=10), nullable=False, server_default='en'))


def downgrade() -> None:
    with op.batch_alter_table('users') as batch_op:
        batch_op.drop_column('locale')
        batch_op.drop_column('timezone')
        batch_op.drop_column('theme')
        batch_op.drop_column('avatar_url')
