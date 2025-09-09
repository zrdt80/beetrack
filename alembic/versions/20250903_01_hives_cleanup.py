"""
Remove Hive.location, require apiary_id, add unique constraint per apiary

Revision ID: 20250903_01
Revises: 20250901_01_uq_pending_invt
Create Date: 2025-09-03
"""

from alembic import op
import sqlalchemy as sa


revision = '20250903_01'
down_revision = '20250901_01_uq_pending_invt'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('hives') as batch_op:
        try:
            batch_op.drop_column('location')
        except Exception:
            pass

    op.alter_column('hives', 'apiary_id', existing_type=sa.Integer(), nullable=False)

    op.execute(
        sa.text(
            """
            DO $$
            DECLARE rel_exists boolean;
            BEGIN
                SELECT EXISTS(
                    SELECT 1 FROM pg_class WHERE relname = 'uq_hives_apiary_name'
                ) INTO rel_exists;
                IF NOT rel_exists THEN
                    BEGIN
                        ALTER TABLE hives ADD CONSTRAINT uq_hives_apiary_name UNIQUE (apiary_id, name);
                    EXCEPTION WHEN duplicate_object THEN
                        -- already exists (constraint or index)
                        NULL;
                    END;
                END IF;
            END $$;
            """
        )
    )


def downgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    try:
        existing_uqs = inspector.get_unique_constraints('hives')
        existing_names = {uq.get('name') for uq in existing_uqs if uq.get('name')}
    except Exception:
        existing_names = set()
    if 'uq_hives_apiary_name' in existing_names:
        try:
            op.drop_constraint('uq_hives_apiary_name', 'hives', type_='unique')
        except Exception:
            pass

    op.alter_column('hives', 'apiary_id', existing_type=sa.Integer(), nullable=True)

    with op.batch_alter_table('hives') as batch_op:
        batch_op.add_column(sa.Column('location', sa.String(length=200), nullable=True))
