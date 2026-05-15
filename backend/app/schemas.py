from datetime import date
from typing import Literal

from pydantic import BaseModel, EmailStr, Field


class SignupRequest(BaseModel):
    full_name: str
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=72)
    level: int = 1


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=72)


class TaskCreateRequest(BaseModel):
    task_name: str
    task_description: str
    task_type: Literal["one_time", "daily", "weekly", "monthly"]
    start_date: date
    end_date: date
    max_stars: int
    levels: list[int]


class ReviewSubmissionRequest(BaseModel):
    stars_given: int
    admin_review: str