from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    JSON,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


def utc_now():
    return datetime.now(timezone.utc)


class Municipality(Base):
    __tablename__ = "municipalities"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    code: Mapped[str] = mapped_column(String(32), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(180), nullable=False)
    boundary_geojson: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    boundary_source: Mapped[str] = mapped_column(String(500), default="")
    boundary_updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    # Relationships
    ward_boundaries: Mapped[list["WardBoundary"]] = relationship(
        "WardBoundary", back_populates="municipality", cascade="all, delete-orphan"
    )
    users: Mapped[list["User"]] = relationship("User", back_populates="municipality")


class WardBoundary(Base):
    __tablename__ = "ward_boundaries"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    municipality_id: Mapped[str] = mapped_column(
        ForeignKey("municipalities.id", ondelete="CASCADE"), nullable=False, index=True
    )
    ward_id: Mapped[str | None] = mapped_column(String(80), nullable=True, index=True)
    zone_id: Mapped[str | None] = mapped_column(String(80), nullable=True, index=True)
    geometry: Mapped[dict] = mapped_column(JSON, nullable=False)
    source: Mapped[str] = mapped_column(String(500), default="")

    # Relationships
    municipality: Mapped["Municipality"] = relationship("Municipality", back_populates="ward_boundaries")


class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint(
            "role IN ('citizen', 'municipal_admin', 'super_admin')",
            name="chk_user_role",
        ),
    )

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    email: Mapped[str] = mapped_column(String(254), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(256), nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(40), nullable=True)
    role: Mapped[str] = mapped_column(String(32), nullable=False, default="citizen", index=True)
    municipality_id: Mapped[str | None] = mapped_column(
        ForeignKey("municipalities.id", ondelete="SET NULL"), nullable=True, index=True
    )
    authorized_ward_ids: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)
    authorized_zone_ids: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)
    permissions: Mapped[list[str]] = mapped_column(JSON, default=list)
    active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    # Relationships
    municipality: Mapped[Municipality | None] = relationship("Municipality", back_populates="users")
    sessions: Mapped[list["AuthSession"]] = relationship("AuthSession", back_populates="user", cascade="all, delete-orphan")


class AuthSession(Base):
    __tablename__ = "auth_sessions"

    token_hash: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    user: Mapped["User"] = relationship("User", back_populates="sessions")


class Report(Base):
    __tablename__ = "reports"
    __table_args__ = (
        CheckConstraint("latitude BETWEEN -90.0 AND 90.0", name="chk_report_latitude"),
        CheckConstraint("longitude BETWEEN -180.0 AND 180.0", name="chk_report_longitude"),
        CheckConstraint("estimated_kg > 0 AND estimated_kg <= 10000", name="chk_report_estimated_kg"),
        Index("ix_reports_status", "status"),
        Index("ix_reports_reported_at", "reported_at"),
        Index("ix_reports_coordinates", "latitude", "longitude"),
        Index("ix_reports_municipality_ward", "municipality_id", "ward_id"),
        Index("ix_reports_jurisdiction_status", "jurisdiction_status"),
        Index("ix_reports_archived", "is_archived"),
    )

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    title: Mapped[str] = mapped_column(String(160), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="")
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    address: Mapped[str] = mapped_column(String(300), default="")
    category: Mapped[str] = mapped_column(String(32), default="mixed", index=True)
    severity: Mapped[str] = mapped_column(String(16), default="medium", index=True)
    status: Mapped[str] = mapped_column(String(24), default="pending")
    jurisdiction_status: Mapped[str] = mapped_column(String(24), default="pending")
    municipality_id: Mapped[str | None] = mapped_column(
        ForeignKey("municipalities.id", ondelete="SET NULL"), nullable=True, index=True
    )
    ward_id: Mapped[str | None] = mapped_column(String(80), nullable=True)
    zone_id: Mapped[str | None] = mapped_column(String(80), nullable=True)
    jurisdiction_assignment_source: Mapped[str] = mapped_column(String(40), default="unresolved")
    jurisdiction_assignment_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    citizen_user_id: Mapped[str | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    reporter_id: Mapped[str] = mapped_column(String(80), default="usr_current")
    reporter_name: Mapped[str] = mapped_column(String(120), default="Community Reporter")
    estimated_kg: Mapped[float] = mapped_column(Float, default=1)
    image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    detection_note: Mapped[str] = mapped_column(Text, default="")
    detections: Mapped[list] = mapped_column(JSON, default=list)
    internal_notes: Mapped[str] = mapped_column(Text, default="")
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    reported_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    # Cleanup relationship with preserved history
    cleanup: Mapped["Cleanup | None"] = relationship("Cleanup", back_populates="report", uselist=False)


class Cleanup(Base):
    __tablename__ = "cleanups"
    __table_args__ = (
        CheckConstraint(
            "status IN ('pending', 'in_progress', 'completed')",
            name="chk_cleanup_status",
        ),
        Index("ix_cleanups_status", "status"),
        Index("ix_cleanups_created_at", "created_at"),
    )

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    # Using ondelete="SET NULL" ensures report deletion/archival never destroys cleanup work history
    report_id: Mapped[str | None] = mapped_column(
        ForeignKey("reports.id", ondelete="SET NULL"), unique=True, nullable=True, index=True
    )
    task_name: Mapped[str] = mapped_column(String(180), nullable=False)
    location: Mapped[str] = mapped_column(String(300), default="")
    assigned_team: Mapped[str] = mapped_column(String(160), default="")
    contact_lead: Mapped[str] = mapped_column(String(160), default="Operations Dispatch")
    scheduled_date: Mapped[str | None] = mapped_column(String(40), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="pending")
    priority: Mapped[str] = mapped_column(String(16), default="medium")
    estimated_hours: Mapped[float] = mapped_column(Float, default=1.5)
    waste_volume_estimate: Mapped[str] = mapped_column(String(80), default="")
    before_image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    after_image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    after_image_uploaded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    after_image_uploaded_by: Mapped[str | None] = mapped_column(String(80), nullable=True)
    completion_notes: Mapped[str] = mapped_column(Text, default="")
    verification_status: Mapped[str] = mapped_column(String(32), default="pending")
    verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    verified_by: Mapped[str | None] = mapped_column(String(80), nullable=True)
    verification_notes: Mapped[str] = mapped_column(Text, default="")
    notes: Mapped[str] = mapped_column(Text, default="")
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    report: Mapped[Report | None] = relationship("Report", back_populates="cleanup")


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    municipality_id: Mapped[str | None] = mapped_column(
        ForeignKey("municipalities.id", ondelete="SET NULL"), nullable=True, index=True
    )
    report_id: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    message: Mapped[str] = mapped_column(String(300), nullable=False)
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    actor_user_id: Mapped[str | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    municipality_id: Mapped[str | None] = mapped_column(
        ForeignKey("municipalities.id", ondelete="SET NULL"), nullable=True, index=True
    )
    report_id: Mapped[str | None] = mapped_column(String(32), nullable=True, index=True)
    action: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    details: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, index=True)
