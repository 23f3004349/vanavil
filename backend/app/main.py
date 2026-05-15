import os
import shutil
import uuid
from datetime import date, datetime

from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.auth import hash_password, verify_password
from app.database import Base, engine, get_db
from app.models import Task, TaskLevel, TaskSubmission, User
from app.schemas import LoginRequest, ReviewSubmissionRequest, SignupRequest, TaskCreateRequest

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Vanavil API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

ADMIN_EMAIL = "admin@vanavil.com"
ADMIN_PASSWORD = "admin123"
ADMIN_KEY = "vanavil-admin-key"


def check_admin(x_admin_key: str = Header(default="")):
    if x_admin_key != ADMIN_KEY:
        raise HTTPException(status_code=403, detail="Admin access required")


@app.get("/")
def home():
    return {"message": "Vanavil backend running"}


@app.post("/signup")
def signup(data: SignupRequest, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.email == data.email).first()

    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    new_user = User(
        full_name=data.full_name,
        email=data.email,
        password=hash_password(data.password),
        level=data.level,
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {
        "message": "Signup successful",
        "user": {
            "id": new_user.id,
            "full_name": new_user.full_name,
            "email": new_user.email,
            "level": new_user.level,
            "is_admin": False,
        },
    }


@app.post("/login")
def login(data: LoginRequest, db: Session = Depends(get_db)):
    # Hardcoded admin login
    if data.email == ADMIN_EMAIL and data.password == ADMIN_PASSWORD:
        return {
            "message": "Admin login successful",
            "user": {
                "id": 0,
                "full_name": "Admin",
                "email": ADMIN_EMAIL,
                "level": 0,
                "is_admin": True,
                "admin_key": ADMIN_KEY,
            },
        }

    user = db.query(User).filter(User.email == data.email).first()

    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not verify_password(data.password, user.password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    return {
        "message": "Login successful",
        "user": {
            "id": user.id,
            "full_name": user.full_name,
            "email": user.email,
            "level": user.level,
            "is_admin": False,
        },
    }


@app.post("/admin/tasks")
def create_task(
    data: TaskCreateRequest,
    db: Session = Depends(get_db),
    _: None = Depends(check_admin),
):
    if not data.levels:
        raise HTTPException(status_code=400, detail="Please select at least one level")

    new_task = Task(
        task_name=data.task_name,
        task_description=data.task_description,
        task_type=data.task_type,
        start_date=data.start_date,
        end_date=data.end_date,
        max_stars=data.max_stars,
    )

    db.add(new_task)
    db.commit()
    db.refresh(new_task)

    for level in data.levels:
        db.add(TaskLevel(task_id=new_task.id, level=level))

    db.commit()

    return {
        "message": "Task created successfully",
        "task_id": new_task.id,
    }


@app.get("/admin/tasks")
def get_all_tasks(
    db: Session = Depends(get_db),
    _: None = Depends(check_admin),
):
    tasks = db.query(Task).order_by(Task.id.desc()).all()

    result = []

    for task in tasks:
        result.append(
            {
                "id": task.id,
                "task_name": task.task_name,
                "task_description": task.task_description,
                "task_type": task.task_type,
                "start_date": task.start_date,
                "end_date": task.end_date,
                "max_stars": task.max_stars,
                "levels": [item.level for item in task.levels],
            }
        )

    return result


@app.get("/users/{user_id}/tasks")
def get_user_tasks(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    today = date.today()

    tasks = (
        db.query(Task)
        .join(TaskLevel, Task.id == TaskLevel.task_id)
        .filter(TaskLevel.level == user.level)
        .filter(Task.end_date >= today)
        .order_by(Task.id.desc())
        .all()
    )

    result = []

    for task in tasks:
        result.append(
            {
                "id": task.id,
                "task_name": task.task_name,
                "task_description": task.task_description,
                "task_type": task.task_type,
                "start_date": task.start_date,
                "end_date": task.end_date,
                "max_stars": task.max_stars,
            }
        )

    return result


@app.post("/tasks/{task_id}/submit")
def submit_task(
    task_id: int,
    user_id: int = Form(...),
    occurrence_date: date = Form(...),
    text_answer: str = Form(default=""),
    file: UploadFile | None = File(default=None),
    db: Session = Depends(get_db),
):
    task = db.query(Task).filter(Task.id == task_id).first()

    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    assigned = (
        db.query(TaskLevel)
        .filter(TaskLevel.task_id == task_id)
        .filter(TaskLevel.level == user.level)
        .first()
    )

    if not assigned:
        raise HTTPException(status_code=403, detail="This task is not assigned to your level")

    file_path = None
    file_type = None

    if file:
        file_extension = os.path.splitext(file.filename or "")[1]
        safe_filename = f"{uuid.uuid4()}{file_extension}"
        file_path = os.path.join(UPLOAD_DIR, safe_filename)

        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        file_type = file.content_type

    submission = TaskSubmission(
        task_id=task_id,
        user_id=user_id,
        occurrence_date=occurrence_date,
        text_answer=text_answer,
        file_path=file_path,
        file_type=file_type,
        status="submitted",
    )

    db.add(submission)
    db.commit()
    db.refresh(submission)

    return {
        "message": "Task submitted successfully",
        "submission_id": submission.id,
    }


@app.get("/admin/submissions")
def get_all_submissions(
    db: Session = Depends(get_db),
    _: None = Depends(check_admin),
):
    submissions = db.query(TaskSubmission).order_by(TaskSubmission.id.desc()).all()

    result = []

    for item in submissions:
        result.append(
            {
                "id": item.id,
                "task_id": item.task_id,
                "task_name": item.task.task_name,
                "user_id": item.user_id,
                "user_name": item.user.full_name,
                "user_level": item.user.level,
                "occurrence_date": item.occurrence_date,
                "text_answer": item.text_answer,
                "file_path": item.file_path,
                "file_url": f"http://127.0.0.1:8000/{item.file_path}" if item.file_path else None,
                "file_type": item.file_type,
                "status": item.status,
                "stars_given": item.stars_given,
                "admin_review": item.admin_review,
                "submitted_at": item.submitted_at,
            }
        )

    return result


@app.post("/admin/submissions/{submission_id}/review")
def review_submission(
    submission_id: int,
    data: ReviewSubmissionRequest,
    db: Session = Depends(get_db),
    _: None = Depends(check_admin),
):
    submission = db.query(TaskSubmission).filter(TaskSubmission.id == submission_id).first()

    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")

    if data.stars_given > submission.task.max_stars:
        raise HTTPException(
            status_code=400,
            detail=f"Stars cannot be more than max stars {submission.task.max_stars}",
        )

    submission.stars_given = data.stars_given
    submission.admin_review = data.admin_review
    submission.status = "reviewed"
    submission.reviewed_at = datetime.now()

    db.commit()
    db.refresh(submission)

    return {"message": "Review submitted successfully"}


@app.get("/users/{user_id}/reviews")
def get_user_reviews(user_id: int, db: Session = Depends(get_db)):
    submissions = (
        db.query(TaskSubmission)
        .filter(TaskSubmission.user_id == user_id)
        .filter(TaskSubmission.status == "reviewed")
        .order_by(TaskSubmission.id.desc())
        .all()
    )

    result = []

    for item in submissions:
        result.append(
            {
                "id": item.id,
                "task_name": item.task.task_name,
                "stars_given": item.stars_given,
                "max_stars": item.task.max_stars,
                "admin_review": item.admin_review,
                "reviewed_at": item.reviewed_at,
            }
        )

    return result


@app.get("/scoreboard")
def get_scoreboard(db: Session = Depends(get_db)):
    rows = (
        db.query(
            User.id,
            User.full_name,
            User.level,
            func.count(TaskSubmission.id).label("completed_tasks"),
            func.coalesce(func.sum(TaskSubmission.stars_given), 0).label("total_stars"),
        )
        .outerjoin(TaskSubmission, User.id == TaskSubmission.user_id)
        .filter((TaskSubmission.status == "reviewed") | (TaskSubmission.status.is_(None)))
        .group_by(User.id)
        .order_by(func.coalesce(func.sum(TaskSubmission.stars_given), 0).desc())
        .all()
    )

    result = []

    rank = 1

    for row in rows:
        result.append(
            {
                "rank": rank,
                "user_id": row.id,
                "full_name": row.full_name,
                "level": row.level,
                "completed_tasks": row.completed_tasks,
                "total_stars": row.total_stars,
            }
        )

        rank += 1

    return result