"""client firebase auth and coach invite codes

Revision ID: x9y0_client_auth_coach_invite
Revises: w8x0_coach_client_chat
Create Date: 2026-05-23

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "x9y0_client_auth_coach_invite"
down_revision: Union[str, None] = "w8x0_coach_client_chat"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("coaches", sa.Column("invite_code", sa.String(length=32), nullable=True))
    op.create_index(op.f("ix_coaches_invite_code"), "coaches", ["invite_code"], unique=True)
    op.add_column("clients", sa.Column("firebase_uid", sa.String(length=128), nullable=True))
    op.create_index(op.f("ix_clients_firebase_uid"), "clients", ["firebase_uid"], unique=True)


def downgrade() -> None:
    op.drop_index(op.f("ix_clients_firebase_uid"), table_name="clients")
    op.drop_column("clients", "firebase_uid")
    op.drop_index(op.f("ix_coaches_invite_code"), table_name="coaches")
    op.drop_column("coaches", "invite_code")
