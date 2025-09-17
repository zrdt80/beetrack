"""Add composite indexes and unique constraints

Revision ID: 20250911_01_idx_and_cnstrnt
Revises: 20250903_01_hives_cleanup
Create Date: 2025-09-11
"""
from alembic import op
import sqlalchemy as sa

revision = '20250911_01_idx_and_cnstrnt'
down_revision = '20250903_01'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_index('ix_user_sessions_user_valid', 'user_sessions', ['user_id', 'is_valid'])
    op.create_index('ix_inspections_hive_date', 'inspections', ['hive_id', 'date'])
    op.create_index('ix_order_items_order_id', 'order_items', ['order_id'])

    with op.batch_alter_table('apiary_members') as batch_op:
        batch_op.create_unique_constraint('uq_apiary_members_apiary_user', ['apiary_id', 'user_id'])


def downgrade() -> None:
    with op.batch_alter_table('apiary_members') as batch_op:
        batch_op.drop_constraint('uq_apiary_members_apiary_user', type_='unique')

    op.drop_index('ix_order_items_order_id', table_name='order_items')
    op.drop_index('ix_inspections_hive_date', table_name='inspections')
    op.drop_index('ix_user_sessions_user_valid', table_name='user_sessions')
