import os
from datetime import datetime
from typing import List, Optional
from sqlalchemy import create_engine, Column, String, Integer, Boolean, Text, ForeignKey, DateTime
from sqlalchemy.orm import declarative_base, sessionmaker, relationship

from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "lexassist.db"
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{DB_PATH.as_posix()}")

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class DocumentDB(Base):
    __tablename__ = "documents"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    type = Column(String, nullable=False)
    pages = Column(Integer, default=1)
    size_kb = Column(Integer, default=0)
    uploaded_at = Column(String, nullable=False)
    status = Column(String, default="analyzed")
    risk_score = Column(Integer, default=0)
    summary = Column(Text, default="")
    source_file = Column(String, nullable=True)

    parties = relationship("DocumentPartyDB", back_populates="document", cascade="all, delete-orphan")
    clauses = relationship("ClauseFindingDB", back_populates="document", cascade="all, delete-orphan")
    risks = relationship("RiskFindingDB", back_populates="document", cascade="all, delete-orphan")


class DocumentPartyDB(Base):
    __tablename__ = "document_parties"

    id = Column(Integer, primary_key=True, autoincrement=True)
    document_id = Column(String, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)

    document = relationship("DocumentDB", back_populates="parties")


class ClauseFindingDB(Base):
    __tablename__ = "clause_findings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    document_id = Column(String, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    label = Column(String, nullable=False)
    present = Column(Boolean, default=True)
    excerpt = Column(Text, nullable=True)

    document = relationship("DocumentDB", back_populates="clauses")


class RiskFindingDB(Base):
    __tablename__ = "risk_findings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    document_id = Column(String, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, nullable=False)
    severity = Column(String, nullable=False)  # high, medium, low
    detail = Column(Text, nullable=False)
    suggestion = Column(Text, nullable=False)

    document = relationship("DocumentDB", back_populates="risks")


def init_db():
    Base.metadata.create_all(bind=engine)
    seed_if_empty()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def seed_if_empty():
    db = SessionLocal()
    try:
        count = db.query(DocumentDB).count()
        if count > 0:
            return

        now_str = datetime.utcnow().strftime("%Y-%m-%d")

        # Seed 1
        doc1 = DocumentDB(
            id="doc-001",
            name="Master Services Agreement — Northwind Ltd.",
            type="Service Agreement",
            pages=24,
            size_kb=486,
            uploaded_at=now_str,
            status="analyzed",
            risk_score=68,
            summary="A master services agreement governing consulting services provided by Acme Corporation to Northwind Ltd. The initial term runs 24 months with automatic 12-month renewals. Payment is net-45 with a 1.5% monthly late fee. Confidentiality survives 3 years post-termination. Liability is capped at fees paid in the preceding 12 months, but carve-outs for IP infringement are uncapped.",
            source_file="A1869-04.pdf"
        )
        doc1.parties = [DocumentPartyDB(name="Acme Corporation"), DocumentPartyDB(name="Northwind Ltd.")]
        doc1.clauses = [
            ClauseFindingDB(label="Confidentiality", present=True, excerpt="Each party shall protect Confidential Information for a period of three (3) years..."),
            ClauseFindingDB(label="Payment Terms", present=True, excerpt="Invoices are due within forty-five (45) days of receipt..."),
            ClauseFindingDB(label="Termination", present=True, excerpt="Either party may terminate for material breach upon 30 days written notice..."),
            ClauseFindingDB(label="Indemnification", present=True, excerpt="The Provider shall indemnify Client against third-party IP claims..."),
            ClauseFindingDB(label="Limitation of Liability", present=True, excerpt="Aggregate liability shall not exceed fees paid in the prior twelve months..."),
            ClauseFindingDB(label="Governing Law", present=True, excerpt="This Agreement is governed by the laws of the State of Delaware..."),
            ClauseFindingDB(label="Force Majeure", present=False, excerpt=None),
            ClauseFindingDB(label="Dispute Resolution", present=True, excerpt="Disputes shall be resolved by binding arbitration in New York..."),
        ]
        doc1.risks = [
            RiskFindingDB(title="Uncapped indemnification for IP claims", severity="high", detail="The liability cap excludes IP infringement claims, exposing the Provider to unlimited financial risk.", suggestion="Negotiate a super-cap (e.g., 2x annual fees) for IP indemnification instead of leaving it uncapped."),
            RiskFindingDB(title="Missing force majeure clause", severity="medium", detail="No provision excuses performance during events beyond a party's control.", suggestion="Add a standard force majeure clause covering natural disasters, war, and government action."),
            RiskFindingDB(title="Automatic renewal without reminder", severity="low", detail="The contract auto-renews for 12 months with a 60-day opt-out window and no notice obligation.", suggestion="Require the counterparty to send a renewal reminder 90 days before each term ends."),
        ]

        # Seed 2
        doc2 = DocumentDB(
            id="doc-002",
            name="Mutual Non-Disclosure Agreement",
            type="NDA",
            pages=6,
            size_kb=142,
            uploaded_at=now_str,
            status="analyzed",
            risk_score=34,
            summary="A mutual NDA between Acme Corporation and Vertex Ventures for evaluating a potential investment. Confidential Information is broadly defined and protected for 5 years. The agreement includes standard exclusions and a return-of-materials obligation.",
            source_file="universal_declaration_of_human_rights.pdf"
        )
        doc2.parties = [DocumentPartyDB(name="Acme Corporation"), DocumentPartyDB(name="Vertex Ventures")]
        doc2.clauses = [
            ClauseFindingDB(label="Confidentiality", present=True, excerpt="Recipient shall hold Confidential Information in strict confidence..."),
            ClauseFindingDB(label="Term & Duration", present=True, excerpt="Obligations survive for five (5) years from disclosure..."),
            ClauseFindingDB(label="Return of Materials", present=True, excerpt="Upon request, Recipient shall return or destroy all materials..."),
            ClauseFindingDB(label="Governing Law", present=True, excerpt="Governed by the laws of California..."),
            ClauseFindingDB(label="Non-Solicitation", present=False, excerpt=None),
        ]
        doc2.risks = [
            RiskFindingDB(title="Broad definition of Confidential Information", severity="medium", detail="The definition may capture publicly available information without clear carve-outs.", suggestion="Add explicit exclusions for information that is public or independently developed."),
            RiskFindingDB(title="No non-solicitation provision", severity="low", detail="Nothing prevents either party from soliciting the other's employees during evaluation.", suggestion="Consider a 12-month mutual non-solicitation clause."),
        ]

        # Seed 3
        doc3 = DocumentDB(
            id="doc-003",
            name="Commercial Lease — Suite 400",
            type="Rental Agreement",
            pages=31,
            size_kb=612,
            uploaded_at=now_str,
            status="analyzed",
            risk_score=81,
            summary="A five-year commercial lease for 4,200 sq ft of office space. Base rent escalates 4% annually. The tenant is responsible for a triple-net structure covering taxes, insurance, and CAM. Early termination triggers a substantial penalty equal to six months of rent.",
            source_file=None
        )
        doc3.parties = [DocumentPartyDB(name="Acme Corporation"), DocumentPartyDB(name="Harbor Point Realty")]
        doc3.clauses = [
            ClauseFindingDB(label="Rent & Escalation", present=True, excerpt="Base rent increases four percent (4%) on each anniversary..."),
            ClauseFindingDB(label="Maintenance (NNN)", present=True, excerpt="Tenant bears all taxes, insurance, and common area maintenance..."),
            ClauseFindingDB(label="Termination", present=True, excerpt="Early termination requires payment equal to six (6) months rent..."),
            ClauseFindingDB(label="Governing Law", present=True, excerpt="Governed by the laws of the State of Texas..."),
            ClauseFindingDB(label="Sublease Rights", present=False, excerpt=None),
            ClauseFindingDB(label="Dispute Resolution", present=False, excerpt=None),
        ]
        doc3.risks = [
            RiskFindingDB(title="Steep early-termination penalty", severity="high", detail="Six months of rent is due on early exit with no proration or mitigation clause.", suggestion="Negotiate a declining penalty and a landlord duty to mitigate by re-letting."),
            RiskFindingDB(title="Uncapped CAM pass-throughs", severity="high", detail="Common area maintenance charges have no annual cap, creating budget uncertainty.", suggestion="Add a 5% annual cap on controllable CAM expenses."),
            RiskFindingDB(title="No sublease or assignment rights", severity="medium", detail="The tenant cannot sublease, reducing flexibility if space needs change.", suggestion="Request a right to sublease with landlord consent not unreasonably withheld."),
        ]

        db.add_all([doc1, doc2, doc3])
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
    finally:
        db.close()
