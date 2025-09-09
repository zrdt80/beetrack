"""link hives to apiaries and adjust uniqueness

Revision ID: 20250829_02_link_h_apiary
Revises: 20250829_01_add_apiaries
Create Date: 2025-08-29
"""
from alembic import op
import sqlalchemy as sa

revision = '20250829_02_link_h_apiary'
down_revision = '20250829_01_add_apiaries'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('hives', sa.Column('apiary_id', sa.Integer(), nullable=True))
    op.create_index('ix_hives_apiary_id', 'hives', ['apiary_id'], unique=False)
    op.create_foreign_key('fk_hives_apiary_id_apiaries', 'hives', 'apiaries', ['apiary_id'], ['id'], ondelete=None)

    op.execute("ALTER TABLE hives DROP CONSTRAINT IF EXISTS hives_name_key;")
    op.execute("ALTER TABLE hives DROP CONSTRAINT IF EXISTS uq_hives_name;")
    op.execute("DROP INDEX IF EXISTS hives_name_key;")
    op.execute("DROP INDEX IF EXISTS uq_hives_name;")
    op.execute("DROP INDEX IF EXISTS uq_hives_apiary_name;")

    op.create_index('uq_hives_apiary_name', 'hives', ['apiary_id', 'name'], unique=True)


def downgrade() -> None:
    try:
        op.drop_index('uq_hives_apiary_name', table_name='hives')
    except Exception:
        pass

    try:
        op.create_unique_constraint('uq_hives_name', 'hives', ['name'])
    except Exception:
        pass

    try:
        op.drop_constraint('fk_hives_apiary_id_apiaries', 'hives', type_='foreignkey')
    except Exception:
        pass
    try:
        op.drop_index('ix_hives_apiary_id', table_name='hives')
    except Exception:
        pass
    try:
        op.drop_column('hives', 'apiary_id')
    except Exception:
        pass
