from fastapi import APIRouter, Depends, HTTPException, status, Query, BackgroundTasks
import sqlalchemy as sa
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app import models, schemas
from app.database import get_db
from app.services import auth
from app.services.rbac import requires_permission, Perm, check_permission
from app.utils.logger import log_event
from app.services.cached_queries import (
    get_apiary_members_cached,
    invalidate_apiary_cache,
)
import secrets

router = APIRouter()


def _ensure_owner(db: Session, apiary_id: int, user: models.User) -> models.Apiary:
    apiary = db.query(models.Apiary).filter(models.Apiary.id == apiary_id).first()
    if not apiary:
        raise HTTPException(status_code=404, detail="Apiary not found")
    if apiary.owner_id != user.id:
        raise HTTPException(status_code=403, detail="Only owner can manage this apiary")
    return apiary


@router.post("/", response_model=schemas.ApiaryRead)
def create_apiary(
    payload: schemas.ApiaryCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(requires_permission(Perm.APIARIES_CREATE)),
):
    apiary = models.Apiary(
        name=payload.name,
        location=payload.location,
        description=payload.description,
        owner_id=current_user.id,
    )
    db.add(apiary)
    db.flush()
    membership = models.ApiaryMember(
        apiary_id=apiary.id, user_id=current_user.id, role=models.ApiaryRole.owner
    )
    db.add(membership)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Could not create apiary")
    db.refresh(apiary)
    apiary.owner_username = current_user.username
    log_event(f"Apiary created: {apiary.name} by {current_user.username}")
    return apiary


@router.get("/", response_model=schemas.ApiaryPage)
def list_my_apiaries(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    q: str | None = Query(None, description="Search by name/location"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(requires_permission(Perm.APIARIES_VIEW)),
):
    from app.services.rbac import check_permission

    if check_permission(current_user, Perm.ADMIN_VIEW_OVERVIEW, db):
        query = db.query(
            models.Apiary, models.User.username.label("owner_username")
        ).join(models.User, models.Apiary.owner_id == models.User.id)
    else:
        owned_q = (
            db.query(models.Apiary, models.User.username.label("owner_username"))
            .join(models.User, models.Apiary.owner_id == models.User.id)
            .filter(models.Apiary.owner_id == current_user.id)
        )
        member_ids = db.query(models.ApiaryMember.apiary_id).filter(
            models.ApiaryMember.user_id == current_user.id,
            models.ApiaryMember.is_active == True,
        )
        member_q = (
            db.query(models.Apiary, models.User.username.label("owner_username"))
            .join(models.User, models.Apiary.owner_id == models.User.id)
            .filter(models.Apiary.id.in_(member_ids))
        )
        query = owned_q.union(member_q)
    if q:
        like = f"%{q}%"
        query = query.filter(
            (models.Apiary.name.ilike(like)) | (models.Apiary.location.ilike(like))
        )
    query = query.order_by(models.Apiary.id)
    total = query.order_by(None).count()
    results = query.limit(size).offset((page - 1) * size).all()
    items = []
    for apiary, owner_username in results:
        apiary.owner_username = owner_username
        items.append(apiary)
    pages = (total + size - 1) // size if size else 0
    log_event(f"Apiaries list requested page={page} size={size} q={q!r} total={total}")
    return {
        "meta": {
            "page": page,
            "size": size,
            "total": total,
            "pages": pages,
            "has_next": page < pages,
            "has_prev": page > 1,
        },
        "items": items,
    }


@router.post("/{apiary_id}/hives", response_model=schemas.HiveRead)
def create_apiary_hive(
    apiary_id: int,
    payload: schemas.ApiaryHiveCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    apiary = db.query(models.Apiary).filter(models.Apiary.id == apiary_id).first()
    if not apiary:
        raise HTTPException(status_code=404, detail="Apiary not found")

    has_manage_permission = check_permission(current_user, Perm.APIARIES_MANAGE, db)
    if not has_manage_permission:
        member = (
            db.query(models.ApiaryMember)
            .filter(
                models.ApiaryMember.apiary_id == apiary_id,
                models.ApiaryMember.user_id == current_user.id,
                models.ApiaryMember.is_active == True,
            )
            .first()
        )
        if apiary.owner_id != current_user.id and not (
            member
            and member.role in [models.ApiaryRole.owner, models.ApiaryRole.manager]
        ):
            raise HTTPException(
                status_code=403, detail="Only owner or manager can add hives"
            )

    exists = (
        db.query(models.Hive)
        .filter(models.Hive.apiary_id == apiary_id, models.Hive.name == payload.name)
        .first()
    )
    if exists:
        raise HTTPException(
            status_code=400, detail="Hive with this name already exists in this apiary"
        )

    hive = models.Hive(
        name=payload.name, status=payload.status or "active", apiary_id=apiary_id
    )
    db.add(hive)
    db.commit()
    db.refresh(hive)
    log_event(
        f"Hive created in apiary: apiary={apiary_id} name={hive.name} by user={current_user.id}"
    )
    return hive


@router.get("/{apiary_id}", response_model=schemas.ApiaryRead)
def get_apiary(
    apiary_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    apiary = (
        db.query(models.Apiary, models.User.username.label("owner_username"))
        .join(models.User, models.Apiary.owner_id == models.User.id)
        .filter(models.Apiary.id == apiary_id)
        .first()
    )
    if not apiary:
        raise HTTPException(status_code=404, detail="Apiary not found")
    apiary_obj, owner_username = apiary
    apiary_obj.owner_username = owner_username
    if current_user.role == models.UserRole.admin:
        return apiary_obj
    is_member = (
        db.query(models.ApiaryMember)
        .filter(
            models.ApiaryMember.apiary_id == apiary_id,
            models.ApiaryMember.user_id == current_user.id,
            models.ApiaryMember.is_active == True,
        )
        .first()
    )
    if apiary_obj.owner_id != current_user.id and not is_member:
        raise HTTPException(status_code=403, detail="Not allowed")
    return apiary_obj


@router.put("/{apiary_id}", response_model=schemas.ApiaryRead)
def update_apiary(
    apiary_id: int,
    payload: schemas.ApiaryCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    if current_user.role == models.UserRole.admin:
        apiary = db.query(models.Apiary).filter(models.Apiary.id == apiary_id).first()
        if not apiary:
            raise HTTPException(status_code=404, detail="Apiary not found")
    else:
        apiary = _ensure_owner(db, apiary_id, current_user)
    apiary.name = payload.name
    apiary.location = payload.location
    apiary.description = payload.description
    db.commit()
    db.refresh(apiary)
    owner = db.query(models.User).filter(models.User.id == apiary.owner_id).first()
    apiary.owner_username = owner.username if owner else None
    log_event(f"Apiary updated: {apiary.name} by {current_user.username}")
    return apiary


@router.delete("/{apiary_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_apiary(
    apiary_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    if current_user.role == models.UserRole.admin:
        apiary = db.query(models.Apiary).filter(models.Apiary.id == apiary_id).first()
        if not apiary:
            raise HTTPException(status_code=404, detail="Apiary not found")
    else:
        apiary = _ensure_owner(db, apiary_id, current_user)
    db.delete(apiary)
    db.commit()
    log_event(f"Apiary deleted: {apiary_id} by {current_user.username}")
    return


@router.get("/{apiary_id}/members", response_model=schemas.ApiaryMemberPage)
async def list_members(
    apiary_id: int,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    q: str | None = Query(None, description="Search by username/email"),
    include_inactive: bool = Query(False, description="Include inactive members"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    apiary = db.query(models.Apiary).filter(models.Apiary.id == apiary_id).first()
    if not apiary:
        raise HTTPException(status_code=404, detail="Apiary not found")
    if current_user.role == models.UserRole.admin:
        pass
    else:
        mem = (
            db.query(models.ApiaryMember)
            .filter(
                models.ApiaryMember.apiary_id == apiary_id,
                models.ApiaryMember.user_id == current_user.id,
                models.ApiaryMember.is_active == True,
            )
            .first()
        )
        if apiary.owner_id != current_user.id and not mem:
            raise HTTPException(status_code=403, detail="Not allowed")
    items = []
    if not q and not include_inactive and page == 1:
        cached = await get_apiary_members_cached(db, apiary_id)
        items = [
            {
                "id": m["id"],
                "apiary_id": apiary_id,
                "user_id": m["user_id"],
                "username": m.get("username"),
                "role": m.get("role"),
                "joined_at": m.get("joined_at"),
                "is_active": True,
            }
            for m in cached
        ]
        total = len(items)
        results = items
    else:
        mq = (
            db.query(models.ApiaryMember, models.User.username.label("username"))
            .join(models.User, models.User.id == models.ApiaryMember.user_id)
            .filter(models.ApiaryMember.apiary_id == apiary_id)
        )
        if not include_inactive:
            mq = mq.filter(models.ApiaryMember.is_active == True)
        if q:
            like = f"%{q}%"
            mq = mq.filter(
                (models.User.username.ilike(like)) | (models.User.email.ilike(like))
            )
        mq = mq.order_by(models.ApiaryMember.id)
        total = mq.order_by(None).count()
        results = mq.limit(size).offset((page - 1) * size).all()
        items = []
        for member, username in results:
            member.username = username
            items.append(member)
    pages = (total + size - 1) // size if size else 0
    log_event(
        f"Apiary members list apiary={apiary_id} page={page} size={size} q={q!r} total={total}"
    )
    return {
        "meta": {
            "page": page,
            "size": size,
            "total": total,
            "pages": pages,
            "has_next": page < pages,
            "has_prev": page > 1,
        },
        "items": items,
    }


@router.patch("/{apiary_id}/members/{user_id}", response_model=schemas.ApiaryMemberRead)
def update_member_role(
    background_tasks: BackgroundTasks,
    apiary_id: int,
    user_id: int,
    payload: schemas.ApiaryMemberUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    if current_user.role != models.UserRole.admin:
        member_check = (
            db.query(models.ApiaryMember)
            .filter(
                models.ApiaryMember.apiary_id == apiary_id,
                models.ApiaryMember.user_id == current_user.id,
                models.ApiaryMember.is_active == True,
            )
            .first()
        )
        if not member_check or member_check.role != models.ApiaryRole.owner:
            raise HTTPException(status_code=403, detail="Only owner can update roles")
    member = (
        db.query(models.ApiaryMember)
        .filter(
            models.ApiaryMember.apiary_id == apiary_id,
            models.ApiaryMember.user_id == user_id,
            models.ApiaryMember.is_active == True,
        )
        .first()
    )
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    if member.user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Owner role cannot be changed")
    member.role = models.ApiaryRole(payload.role)
    db.commit()
    db.refresh(member)
    user = db.query(models.User).filter(models.User.id == member.user_id).first()
    member.username = user.username if user else None
    log_event(
        f"Apiary member role updated: apiary={apiary_id} user={user_id} role={member.role}"
    )
    background_tasks.add_task(invalidate_apiary_cache, apiary_id)
    return member


@router.delete("/{apiary_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_member(
    background_tasks: BackgroundTasks,
    apiary_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    if current_user.role != models.UserRole.admin:
        member_check = (
            db.query(models.ApiaryMember)
            .filter(
                models.ApiaryMember.apiary_id == apiary_id,
                models.ApiaryMember.user_id == current_user.id,
                models.ApiaryMember.is_active == True,
            )
            .first()
        )
        if not member_check or member_check.role != models.ApiaryRole.owner:
            raise HTTPException(status_code=403, detail="Only owner can remove members")
    member = (
        db.query(models.ApiaryMember)
        .filter(
            models.ApiaryMember.apiary_id == apiary_id,
            models.ApiaryMember.user_id == user_id,
            models.ApiaryMember.is_active == True,
        )
        .first()
    )
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    if member.user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Owner cannot remove themselves")
    member.is_active = False
    db.commit()
    log_event(f"Apiary member removed: apiary={apiary_id} user={user_id}")
    background_tasks.add_task(invalidate_apiary_cache, apiary_id)
    return


@router.post("/{apiary_id}/invitations", response_model=schemas.ApiaryInvitationRead)
def invite_member(
    apiary_id: int,
    payload: schemas.ApiaryInviteCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    if current_user.role == models.UserRole.admin:
        apiary = db.query(models.Apiary).filter(models.Apiary.id == apiary_id).first()
        if not apiary:
            raise HTTPException(status_code=404, detail="Apiary not found")
    else:
        member = (
            db.query(models.ApiaryMember)
            .filter(
                models.ApiaryMember.apiary_id == apiary_id,
                models.ApiaryMember.user_id == current_user.id,
                models.ApiaryMember.is_active == True,
            )
            .first()
        )
        if not member or member.role not in [
            models.ApiaryRole.owner,
            models.ApiaryRole.manager,
        ]:
            raise HTTPException(
                status_code=403, detail="Only owner or manager can send invites"
            )
        if (
            member.role == models.ApiaryRole.manager
            and payload.role != models.ApiaryRole.worker
        ):
            raise HTTPException(
                status_code=403, detail="Managers can only invite with role 'worker'"
            )
        apiary = db.query(models.Apiary).filter(models.Apiary.id == apiary_id).first()
        if not apiary:
            raise HTTPException(status_code=404, detail="Apiary not found")
    email = (payload.email or "").strip().lower()
    invitee = (
        db.query(models.User)
        .filter(
            sa.func.lower(models.User.email) == email,
            models.User.is_active == True,
        )
        .first()
    )
    if not invitee:
        raise HTTPException(status_code=404, detail="User not found or inactive")

    if invitee.id == apiary.owner_id:
        raise HTTPException(status_code=400, detail="Cannot invite the owner")
    if invitee.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot invite yourself")

    member = (
        db.query(models.ApiaryMember)
        .filter(
            models.ApiaryMember.apiary_id == apiary.id,
            models.ApiaryMember.user_id == invitee.id,
            models.ApiaryMember.is_active == True,
        )
        .first()
    )
    if member:
        raise HTTPException(status_code=400, detail="User is already a member")

    pending = (
        db.query(models.ApiaryInvitation)
        .filter(
            models.ApiaryInvitation.apiary_id == apiary.id,
            sa.func.lower(models.ApiaryInvitation.invitee_email) == email,
            models.ApiaryInvitation.status == models.InvitationStatus.pending,
        )
        .first()
    )
    if pending:
        raise HTTPException(status_code=400, detail="Pending invitation already exists")

    token = secrets.token_urlsafe(24)
    inv = models.ApiaryInvitation(
        apiary_id=apiary.id,
        inviter_id=current_user.id,
        invitee_email=email,
        role=models.ApiaryRole(payload.role),
        token=token,
    )
    db.add(inv)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Could not create invitation")
    db.refresh(inv)
    log_event(f"Apiary invitation created: apiary={apiary.id} email={email}")
    return inv


@router.get("/{apiary_id}/invitations", response_model=schemas.ApiaryInvitationPage)
def list_invitations(
    apiary_id: int,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    q: str | None = Query(None, description="Search by invitee email/status"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    apiary = db.query(models.Apiary).filter(models.Apiary.id == apiary_id).first()
    if not apiary:
        raise HTTPException(status_code=404, detail="Apiary not found")
    if current_user.role != models.UserRole.admin:
        member = (
            db.query(models.ApiaryMember)
            .filter(
                models.ApiaryMember.apiary_id == apiary_id,
                models.ApiaryMember.user_id == current_user.id,
                models.ApiaryMember.is_active == True,
            )
            .first()
        )
        if not member or member.role not in [
            models.ApiaryRole.owner,
            models.ApiaryRole.manager,
        ]:
            _ensure_owner(db, apiary_id, current_user)
    iq = db.query(models.ApiaryInvitation).filter(
        models.ApiaryInvitation.apiary_id == apiary_id
    )
    if q:
        like = f"%{q}%"
        iq = iq.filter(
            (models.ApiaryInvitation.invitee_email.ilike(like))
            | (models.ApiaryInvitation.status.cast(sa.String).ilike(like))
        )
    iq = iq.order_by(models.ApiaryInvitation.id.desc())
    total = iq.order_by(None).count()
    items = iq.limit(size).offset((page - 1) * size).all()
    pages = (total + size - 1) // size if size else 0
    log_event(
        f"Apiary invitations list apiary={apiary_id} page={page} size={size} q={q!r} total={total}"
    )
    return {
        "meta": {
            "page": page,
            "size": size,
            "total": total,
            "pages": pages,
            "has_next": page < pages,
            "has_prev": page > 1,
        },
        "items": items,
    }


@router.post("/{apiary_id}/transfer-ownership", response_model=schemas.ApiaryRead)
def transfer_ownership(
    apiary_id: int,
    payload: schemas.ApiaryTransferOwnershipRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    if current_user.role != models.UserRole.admin:
        raise HTTPException(status_code=403, detail="Only admin can transfer ownership")
    apiary = db.query(models.Apiary).filter(models.Apiary.id == apiary_id).first()
    if not apiary:
        raise HTTPException(status_code=404, detail="Apiary not found")
    if payload.new_owner_user_id == apiary.owner_id:
        raise HTTPException(status_code=400, detail="New owner is already the owner")
    new_owner = (
        db.query(models.User)
        .filter(
            models.User.id == payload.new_owner_user_id, models.User.is_active == True
        )
        .first()
    )
    if not new_owner:
        raise HTTPException(status_code=404, detail="New owner user not found")
    new_owner_member = (
        db.query(models.ApiaryMember)
        .filter(
            models.ApiaryMember.apiary_id == apiary_id,
            models.ApiaryMember.user_id == payload.new_owner_user_id,
        )
        .first()
    )
    if not new_owner_member:
        new_owner_member = models.ApiaryMember(
            apiary_id=apiary_id,
            user_id=payload.new_owner_user_id,
            role=models.ApiaryRole.owner,
            is_active=True,
        )
        db.add(new_owner_member)
        db.flush()
    else:
        new_owner_member.role = models.ApiaryRole.owner
        new_owner_member.is_active = True
    old_owner_member = (
        db.query(models.ApiaryMember)
        .filter(
            models.ApiaryMember.apiary_id == apiary_id,
            models.ApiaryMember.user_id == apiary.owner_id,
        )
        .first()
    )
    if not old_owner_member:
        old_owner_member = models.ApiaryMember(
            apiary_id=apiary_id,
            user_id=apiary.owner_id,
            role=models.ApiaryRole.manager,
            is_active=True,
        )
        db.add(old_owner_member)
    else:
        old_owner_member.role = models.ApiaryRole.manager
        old_owner_member.is_active = True
    previous_owner_id = apiary.owner_id
    apiary.owner_id = payload.new_owner_user_id
    db.commit()
    db.refresh(apiary)
    owner = db.query(models.User).filter(models.User.id == apiary.owner_id).first()
    apiary.owner_username = owner.username if owner else None
    log_event(
        f"Apiary ownership transferred apiary={apiary_id} from={previous_owner_id} to={payload.new_owner_user_id} by={current_user.id}"
    )
    return apiary


@router.post("/invitations/accept/{token}", response_model=schemas.ApiaryMemberRead)
def accept_invitation(
    token: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    if current_user.role != models.UserRole.worker:
        raise HTTPException(status_code=403, detail="Only workers can join apiaries")
    if not current_user.is_active:
        raise HTTPException(
            status_code=403, detail="Inactive users cannot accept invitations"
        )
    inv = (
        db.query(models.ApiaryInvitation)
        .filter(
            models.ApiaryInvitation.token == token,
            models.ApiaryInvitation.status == models.InvitationStatus.pending,
        )
        .first()
    )
    if not inv:
        raise HTTPException(
            status_code=404, detail="Invitation not found or already handled"
        )
    if inv.invitee_email.lower() != current_user.email.lower():
        raise HTTPException(
            status_code=403, detail="Invitation is for a different email"
        )
    existing = (
        db.query(models.ApiaryMember)
        .filter(
            models.ApiaryMember.apiary_id == inv.apiary_id,
            models.ApiaryMember.user_id == current_user.id,
            models.ApiaryMember.is_active == True,
        )
        .first()
    )
    if existing:
        inv.status = models.InvitationStatus.accepted
        db.commit()
        existing.username = current_user.username
        return existing
    member = models.ApiaryMember(
        apiary_id=inv.apiary_id, user_id=current_user.id, role=inv.role, is_active=True
    )
    inv.status = models.InvitationStatus.accepted
    db.add(member)
    db.commit()
    db.refresh(member)
    member.username = current_user.username
    log_event(
        f"Invitation accepted: apiary={inv.apiary_id} user={current_user.username}"
    )
    return member


@router.post("/invitations/decline/{token}")
def decline_invitation(
    token: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    inv = (
        db.query(models.ApiaryInvitation)
        .filter(
            models.ApiaryInvitation.token == token,
            models.ApiaryInvitation.status == models.InvitationStatus.pending,
        )
        .first()
    )
    if not inv:
        raise HTTPException(
            status_code=404, detail="Invitation not found or already handled"
        )
    if inv.invitee_email.lower() != current_user.email.lower():
        raise HTTPException(
            status_code=403, detail="Invitation is for a different email"
        )
    inv.status = models.InvitationStatus.declined
    db.commit()
    log_event(f"Invitation declined: apiary={inv.api_id} email={current_user.email}")
    return {"message": "Invitation declined"}


@router.post("/{apiary_id}/invitations/{invitation_id}/cancel")
def cancel_invitation(
    apiary_id: int,
    invitation_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    if current_user.role != models.UserRole.admin:
        member = (
            db.query(models.ApiaryMember)
            .filter(
                models.ApiaryMember.apiary_id == apiary_id,
                models.ApiaryMember.user_id == current_user.id,
                models.ApiaryMember.is_active == True,
            )
            .first()
        )
        if not member or member.role not in [
            models.ApiaryRole.owner,
            models.ApiaryRole.manager,
        ]:
            raise HTTPException(
                status_code=403, detail="Only owner or manager can cancel invites"
            )
    inv = (
        db.query(models.ApiaryInvitation)
        .filter(
            models.ApiaryInvitation.id == invitation_id,
            models.ApiaryInvitation.apiary_id == apiary_id,
        )
        .first()
    )
    if not inv:
        raise HTTPException(status_code=404, detail="Invitation not found")
    if inv.status != models.InvitationStatus.pending:
        raise HTTPException(status_code=400, detail="Invitation already handled")
    inv.status = models.InvitationStatus.canceled
    db.commit()
    log_event(f"Invitation canceled: apiary={apiary_id} id={invitation_id}")
    return {"message": "Invitation canceled"}


@router.get("/{apiary_id}/hives", response_model=schemas.HivePage)
def list_apiary_hives(
    apiary_id: int,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    apiary = db.query(models.Apiary).filter(models.Apiary.id == apiary_id).first()
    if not apiary:
        raise HTTPException(status_code=404, detail="Apiary not found")
    if current_user.role != models.UserRole.admin:
        is_member = (
            db.query(models.ApiaryMember)
            .filter(
                models.ApiaryMember.apiary_id == apiary_id,
                models.ApiaryMember.user_id == current_user.id,
                models.ApiaryMember.is_active == True,
            )
            .first()
        )
        if apiary.owner_id != current_user.id and not is_member:
            raise HTTPException(status_code=403, detail="Not allowed")
    query = (
        db.query(models.Hive)
        .filter(models.Hive.apiary_id == apiary_id)
        .order_by(models.Hive.id)
    )
    total = query.order_by(None).count()
    items = query.limit(size).offset((page - 1) * size).all()
    pages = (total + size - 1) // size if size else 0
    return {
        "meta": {
            "page": page,
            "size": size,
            "total": total,
            "pages": pages,
            "has_next": page < pages,
            "has_prev": page > 1,
        },
        "items": items,
    }


@router.post("/{apiary_id}/hives", response_model=schemas.HiveRead)
def create_apiary_hive(
    apiary_id: int,
    payload: schemas.HiveCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    apiary = db.query(models.Apiary).filter(models.Apiary.id == apiary_id).first()
    if not apiary:
        raise HTTPException(status_code=404, detail="Apiary not found")
    if current_user.role != models.UserRole.admin:
        member = (
            db.query(models.ApiaryMember)
            .filter(
                models.ApiaryMember.apiary_id == apiary_id,
                models.ApiaryMember.user_id == current_user.id,
                models.ApiaryMember.is_active == True,
            )
            .first()
        )
        if apiary.owner_id != current_user.id and not (
            member
            and member.role in [models.ApiaryRole.owner, models.ApiaryRole.manager]
        ):
            raise HTTPException(
                status_code=403, detail="Only owner or manager can add hives"
            )
    existing = (
        db.query(models.Hive)
        .filter(
            models.Hive.apiary_id == apiary_id,
            models.Hive.name == payload.name,
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=400, detail="Hive with this name already exists in this apiary"
        )
    hive = models.Hive(
        name=payload.name, status=payload.status or "active", apiary_id=apiary_id
    )
    db.add(hive)
    db.commit()
    db.refresh(hive)
    log_event(f"Hive created in apiary: apiary={apiary_id} hive={hive.name}")
    return hive


@router.post("/{apiary_id}/members", response_model=schemas.ApiaryMemberRead)
def add_member_direct(
    apiary_id: int,
    payload: schemas.ApiaryMemberAdd,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    if current_user.role != models.UserRole.admin:
        raise HTTPException(
            status_code=403, detail="Only admin can add members directly"
        )

    apiary = db.query(models.Apiary).filter(models.Apiary.id == apiary_id).first()
    if not apiary:
        raise HTTPException(status_code=404, detail="Apiary not found")

    user = (
        db.query(models.User)
        .filter(models.User.id == payload.user_id, models.User.is_active == True)
        .first()
    )
    if not user:
        raise HTTPException(status_code=404, detail="User not found or inactive")

    if user.id == apiary.owner_id:
        raise HTTPException(
            status_code=400, detail="Owner is already part of the apiary"
        )

    member = (
        db.query(models.ApiaryMember)
        .filter(
            models.ApiaryMember.apiary_id == apiary_id,
            models.ApiaryMember.user_id == user.id,
        )
        .first()
    )

    if member:
        if member.is_active:
            raise HTTPException(status_code=400, detail="User is already a member")
        member.is_active = True
        member.role = models.ApiaryRole(payload.role)
    else:
        member = models.ApiaryMember(
            apiary_id=apiary_id,
            user_id=user.id,
            role=models.ApiaryRole(payload.role),
            is_active=True,
        )
        db.add(member)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Could not add member")

    db.refresh(member)
    member.username = user.username
    log_event(
        f"Member added directly by admin: apiary={apiary_id} user={user.id} role={member.role}"
    )
    return member
