from sqlalchemy import Column, Integer, String, Date, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password = Column(String, nullable=False)
    level = Column(Integer, default=1, nullable=False)

    submissions = relationship("TaskSubmission", back_populates="user")


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    task_name = Column(String, nullable=False)
    task_description = Column(Text, nullable=False)
    task_type = Column(String, nullable=False)  # one_time / daily / weekly / monthly
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    max_stars = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    levels = relationship("TaskLevel", back_populates="task", cascade="all, delete")
    submissions = relationship("TaskSubmission", back_populates="task")


class TaskLevel(Base):
    __tablename__ = "task_levels"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=False)
    level = Column(Integer, nullable=False)

    task = relationship("Task", back_populates="levels")


class TaskSubmission(Base):
    __tablename__ = "task_submissions"

    id = Column(Integer, primary_key=True, index=True)

    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    occurrence_date = Column(Date, nullable=False)

    text_answer = Column(Text, nullable=True)
    file_path = Column(String, nullable=True)
    file_type = Column(String, nullable=True)

    status = Column(String, default="submitted")  # submitted / reviewed
    stars_given = Column(Integer, nullable=True)
    admin_review = Column(Text, nullable=True)

    submitted_at = Column(DateTime(timezone=True), server_default=func.now())
    reviewed_at = Column(DateTime(timezone=True), nullable=True)

    task = relationship("Task", back_populates="submissions")
    user = relationship("User", back_populates="submissions")