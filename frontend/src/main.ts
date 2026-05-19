import "./style.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const app = document.querySelector<HTMLDivElement>("#app")!;

let deferredInstallPrompt: any = null;

function createInstallButton() {
  const btn = document.createElement("button");
  btn.id = "installBtn";
  btn.className = "install-btn hidden";
  btn.textContent = "Install Vanavil App";
  document.body.appendChild(btn);

  btn.addEventListener("click", async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    try {
      const choice = await deferredInstallPrompt.userChoice;
      if (choice && choice.outcome === "accepted") {
        console.log("User accepted the install prompt");
      } else {
        console.log("User dismissed the install prompt");
      }
    } catch (e) {
      console.warn('Install prompt error', e);
    }
    btn.classList.add("hidden");
    deferredInstallPrompt = null;
  });

  return btn;
}

const installBtn = createInstallButton();

window.addEventListener("beforeinstallprompt", (e: any) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  installBtn.classList.remove("hidden");
});

window.addEventListener("appinstalled", () => {
  installBtn.classList.add("hidden");
  deferredInstallPrompt = null;
});

function renderLoginSignupPage() {
  document.body.classList.add("login-background");
  app.innerHTML = `
    <div class="container">
      <div class="card">
        <div class="brand-header">
          <img src="/icons/logo.png" alt="Vanavil logo" class="brand-logo" />
          <h1>Vanavil</h1>
        </div>
        <p class="subtitle">Login or create your account</p>

        <div class="tabs">
          <button id="loginTab" class="active">Login</button>
          <button id="signupTab">Signup</button>
        </div>

        <form id="loginForm" class="form">
          <input type="email" id="loginEmail" placeholder="Email" required />
          <input type="password" id="loginPassword" placeholder="Password" required />
          <button type="submit">Login</button>
        </form>

        <form id="signupForm" class="form hidden">
          <input type="text" id="signupName" placeholder="Full Name" required />
          <input type="email" id="signupEmail" placeholder="Email" required />
          <select id="signupLevel" required>
            <option value="1">Level 1</option>
            <option value="2">Level 2</option>
          </select>
          <input type="password" id="signupPassword" placeholder="Password" required />
          <button type="submit">Signup</button>
        </form>

        <p id="message"></p>
      </div>
    </div>
  `;

  const loginTab = document.querySelector<HTMLButtonElement>("#loginTab")!;
  const signupTab = document.querySelector<HTMLButtonElement>("#signupTab")!;
  const loginForm = document.querySelector<HTMLFormElement>("#loginForm")!;
  const signupForm = document.querySelector<HTMLFormElement>("#signupForm")!;
  const message = document.querySelector<HTMLParagraphElement>("#message")!;

  function showLogin() {
    loginForm.classList.remove("hidden");
    signupForm.classList.add("hidden");
    loginTab.classList.add("active");
    signupTab.classList.remove("active");
    message.textContent = "";
  }

  function showSignup() {
    signupForm.classList.remove("hidden");
    loginForm.classList.add("hidden");
    signupTab.classList.add("active");
    loginTab.classList.remove("active");
    message.textContent = "";
  }

  loginTab.addEventListener("click", showLogin);
  signupTab.addEventListener("click", showSignup);

  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const level = Number(document.querySelector<HTMLSelectElement>("#signupLevel")!.value);
    const fullName = document.querySelector<HTMLInputElement>("#signupName")!.value;
    const email = document.querySelector<HTMLInputElement>("#signupEmail")!.value;
    const password = document.querySelector<HTMLInputElement>("#signupPassword")!.value;

    try {
      const response = await fetch(`${API_BASE_URL}/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          full_name: fullName,
          email,
          password,
          level,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        message.textContent = data.detail || "Signup failed";
        message.className = "error";
        return;
      }

      signupForm.reset();
      showLogin();

      message.textContent = "Signup successful. Please login.";
      message.className = "success";
    } catch (error) {
      message.textContent = "Backend not connected. Please check FastAPI is running.";
      message.className = "error";
    }
  });

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.querySelector<HTMLInputElement>("#loginEmail")!.value;
    const password = document.querySelector<HTMLInputElement>("#loginPassword")!.value;

    try {
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        message.textContent = data.detail || "Login failed";
        message.className = "error";
        return;
      }

      localStorage.setItem("user", JSON.stringify(data.user));
      renderDashboard(data.user);
    } catch (error) {
      message.textContent = "Backend not connected. Please check FastAPI is running.";
      message.className = "error";
    }
  });
}

type User = {
  id: number;
  full_name: string;
  email: string;
  level: number;
  is_admin: boolean;
  admin_key?: string;
};

function renderDashboard(user: User) {
  document.body.classList.remove("login-background");

  if (user.is_admin) {
    renderAdminDashboard(user);
  } else {
    renderUserDashboard(user);
  }
}

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

const ADMIN_TASKS_PAGE_SIZE = 10;
const TASKS_PAGE_SIZE = 10;

/* ================= ADMIN DASHBOARD ================= */

function renderAdminDashboard(user: User) {
  app.innerHTML = `
    <div class="dashboard-layout">
      <aside class="sidebar">
        <div class="sidebar-brand">
          <img src="/icons/logo.png" alt="Vanavil logo" class="sidebar-logo" />
          <div class="sidebar-brand-text">
            <h2>Vanavil</h2>
            <p>Admin Panel</p>
          </div>
        </div>

        <nav class="sidebar-menu">
          <button class="menu-item active" data-page="create-task">Create Task</button>
          <button class="menu-item" data-page="all-tasks">All Tasks</button>
          <button class="menu-item" data-page="pending-submissions">Pending Submissions</button>
          <button class="menu-item" data-page="reviewed-submissions">Reviewed Submissions</button>
          <button class="menu-item" data-page="scoreboard">Scoreboard</button>
        </nav>

        <button id="logoutBtn" class="logout-btn">Logout</button>
      </aside>

      <main class="dashboard-main">
        <header class="dashboard-header">
          <div>
            <h1 id="pageTitle">Create Task</h1>
            <p>Welcome, ${user.full_name}</p>
          </div>
        </header>

        <section id="pageContent" class="page-content"></section>
      </main>
    </div>
  `;

  const menuItems = document.querySelectorAll<HTMLButtonElement>(".menu-item");
  const pageTitle = document.querySelector<HTMLHeadingElement>("#pageTitle")!;
  const pageContent = document.querySelector<HTMLElement>("#pageContent")!;

  async function loadAdminTasksPage(page: number = 1) {
    await loadAdminTasks(user, page);
  }

  async function setAdminPage(page: string) {
    menuItems.forEach((item) => {
      item.classList.remove("active");
      if (item.dataset.page === page) item.classList.add("active");
    });

    if (page === "create-task") {
      pageTitle.textContent = "Create Task";
      pageContent.innerHTML = renderCreateTaskForm();
      attachCreateTaskForm(user);
    }

    if (page === "all-tasks") {
      pageTitle.textContent = "All Tasks";
      await loadAdminTasksPage(1);
    }

    if (page === "pending-submissions") {
      pageTitle.textContent = "Pending Submissions";
      await loadAdminSubmissions(user, "pending");
    }

    if (page === "reviewed-submissions") {
      pageTitle.textContent = "Reviewed Submissions";
      await loadAdminSubmissions(user, "reviewed");
    }

    if (page === "scoreboard") {
      pageTitle.textContent = "Scoreboard";
      await loadScoreboard();
    }
  }

  menuItems.forEach((item) => {
    item.addEventListener("click", () => {
      const page = item.dataset.page;
      if (page) setAdminPage(page);
    });
  });

  document.querySelector<HTMLButtonElement>("#logoutBtn")!.addEventListener("click", () => {
    localStorage.removeItem("user");
    window.location.reload();
  });

  setAdminPage("create-task");
}

function renderCreateTaskForm() {
  return `
    <div class="content-card">
      <h2>Create New Task</h2>

      <form id="createTaskForm" class="form dashboard-form">
        <input type="text" id="taskName" placeholder="Task name" required />

        <textarea id="taskDescription" placeholder="Task description" required></textarea>

        <select id="taskType" required>
          <option value="one_time">One Time</option>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
        </select>

        <label>Start Date</label>
        <input type="date" id="startDate" required />

        <label>End Date / Last Date</label>
        <input type="date" id="endDate" required />

        <input type="number" id="maxStars" placeholder="Max stars" min="1" max="10" required />

        <div class="level-box">
          <p>Assign Levels</p>
          <label><input type="checkbox" name="levels" value="1" /> Level 1</label>
          <label><input type="checkbox" name="levels" value="2" /> Level 2</label>
        </div>

        <button type="submit">Create Task</button>
        <p id="adminMessage"></p>
      </form>
    </div>
  `;
}

function attachCreateTaskForm(user: User) {
  const form = document.querySelector<HTMLFormElement>("#createTaskForm")!;
  const message = document.querySelector<HTMLParagraphElement>("#adminMessage")!;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const levels = Array.from(
      document.querySelectorAll<HTMLInputElement>('input[name="levels"]:checked')
    ).map((item) => Number(item.value));

    if (levels.length === 0) {
      message.textContent = "Please select at least one level.";
      message.className = "error";
      return;
    }

    const response = await fetch(`${API_BASE_URL}/admin/tasks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-key": user.admin_key || "",
      },
      body: JSON.stringify({
        task_name: document.querySelector<HTMLInputElement>("#taskName")!.value,
        task_description: document.querySelector<HTMLTextAreaElement>("#taskDescription")!.value,
        task_type: document.querySelector<HTMLSelectElement>("#taskType")!.value,
        start_date: document.querySelector<HTMLInputElement>("#startDate")!.value,
        end_date: document.querySelector<HTMLInputElement>("#endDate")!.value,
        max_stars: Number(document.querySelector<HTMLInputElement>("#maxStars")!.value),
        levels,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      message.textContent = data.detail || "Task creation failed";
      message.className = "error";
      return;
    }

    message.textContent = "Task created successfully.";
    message.className = "success";
    form.reset();
  });
}

async function loadAdminTasks(user: User, page: number = 1) {
  const pageContent = document.querySelector<HTMLElement>("#pageContent")!;

  const response = await fetch(`${API_BASE_URL}/admin/tasks`, {
    headers: {
      "x-admin-key": user.admin_key || "",
    },
  });

  const tasks: any[] = await response.json();
  const totalPages = Math.max(1, Math.ceil(tasks.length / ADMIN_TASKS_PAGE_SIZE));
  const currentPage = Math.min(Math.max(page, 1), totalPages);
  const startIndex = (currentPage - 1) * ADMIN_TASKS_PAGE_SIZE;
  const pageTasks = tasks.slice(startIndex, startIndex + ADMIN_TASKS_PAGE_SIZE);

  pageContent.innerHTML = `
    <div class="content-card">
      <h2>All Tasks</h2>

      ${
        tasks.length === 0
          ? `<p>No tasks created yet.</p>`
          : `
            <div id="taskEditSection"></div>
            <div class="table-container">
              <table class="admin-task-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Dates</th>
                    <th>Stars</th>
                    <th>Levels</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  ${pageTasks
                    .map(
                      (task) => `
                        <tr>
                          <td>${task.id}</td>
                          <td>${task.task_name}</td>
                          <td>${task.task_type}</td>
                          <td>${task.start_date} → ${task.end_date}</td>
                          <td>${task.max_stars}</td>
                          <td>${task.levels.join(", ")}</td>
                          <td>
                            <button class="small-btn edit-task-btn" data-id="${task.id}">Edit</button>
                            <button class="small-btn delete-task-btn" data-id="${task.id}">Delete</button>
                          </td>
                        </tr>
                      `
                    )
                    .join("")}
                </tbody>
              </table>
            </div>
            ${
              totalPages > 1
                ? `<div class="pagination">${Array.from({ length: totalPages }, (_, index) => index + 1)
                    .map(
                      (pageNumber) => `
                        <button class="page-btn ${pageNumber === currentPage ? "active" : ""}" data-page="${pageNumber}">${pageNumber}</button>
                      `
                    )
                    .join("")}</div>`
                : `
                    <div class="pagination"></div>
                  `
            }
          `
      }
    </div>
  `;

  attachAdminTaskActionHandlers(user, tasks, currentPage);
}

function attachAdminTaskActionHandlers(user: User, tasks: any[], currentPage: number) {
  const pageContent = document.querySelector<HTMLElement>("#pageContent")!;

  pageContent.querySelectorAll<HTMLButtonElement>(".edit-task-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const taskId = Number(button.dataset.id);
      const task = tasks.find((item) => item.id === taskId);
      if (task) {
        renderAdminTaskEditForm(task, user, currentPage);
      }
    });
  });

  pageContent.querySelectorAll<HTMLButtonElement>(".delete-task-btn").forEach((button) => {
    button.addEventListener("click", async () => {
      const taskId = Number(button.dataset.id);
      if (!confirm("Delete this task and all associated submissions?")) {
        return;
      }

      const response = await fetch(`${API_BASE_URL}/admin/tasks/${taskId}`, {
        method: "DELETE",
        headers: {
          "x-admin-key": user.admin_key || "",
        },
      });

      if (!response.ok) {
        const data = await response.json();
        alert(data.detail || "Task deletion failed");
        return;
      }

      alert("Task deleted successfully");
      await loadAdminTasks(user, currentPage);
    });
  });

  pageContent.querySelectorAll<HTMLButtonElement>(".page-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const pageNumber = Number(button.dataset.page);
      if (pageNumber && pageNumber !== currentPage) {
        loadAdminTasks(user, pageNumber);
      }
    });
  });
}

function renderAdminTaskEditForm(task: any, user: User, currentPage: number) {
  const editSection = document.querySelector<HTMLElement>('#taskEditSection')!;
  editSection.innerHTML = `
    <div class="content-card">
      <h3>Edit Task #${task.id}</h3>
      <form id="editTaskForm" class="form dashboard-form">
        <input type="text" id="editTaskName" placeholder="Task name" value="${task.task_name}" required />
        <textarea id="editTaskDescription" placeholder="Task description" required>${task.task_description}</textarea>
        <select id="editTaskType" required>
          <option value="one_time" ${task.task_type === "one_time" ? "selected" : ""}>One Time</option>
          <option value="daily" ${task.task_type === "daily" ? "selected" : ""}>Daily</option>
          <option value="weekly" ${task.task_type === "weekly" ? "selected" : ""}>Weekly</option>
          <option value="monthly" ${task.task_type === "monthly" ? "selected" : ""}>Monthly</option>
        </select>
        <label>Start Date</label>
        <input type="date" id="editStartDate" value="${task.start_date}" required />
        <label>End Date / Last Date</label>
        <input type="date" id="editEndDate" value="${task.end_date}" required />
        <input type="number" id="editMaxStars" placeholder="Max stars" min="1" max="10" value="${task.max_stars}" required />
        <div class="level-box">
          <p>Assign Levels</p>
          <label><input type="checkbox" name="edit-levels" value="1" ${task.levels.includes(1) ? "checked" : ""} /> Level 1</label>
          <label><input type="checkbox" name="edit-levels" value="2" ${task.levels.includes(2) ? "checked" : ""} /> Level 2</label>
        </div>
        <div class="form-actions">
          <button type="submit">Save Task</button>
          <button type="button" id="cancelEditTask">Cancel</button>
        </div>
        <p id="editTaskMessage"></p>
      </form>
    </div>
  `;

  const form = document.querySelector<HTMLFormElement>("#editTaskForm")!;
  const message = document.querySelector<HTMLParagraphElement>("#editTaskMessage")!;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const levels = Array.from(
      document.querySelectorAll<HTMLInputElement>('input[name="edit-levels"]:checked')
    ).map((item) => Number(item.value));

    if (levels.length === 0) {
      message.textContent = "Please select at least one level.";
      message.className = "error";
      return;
    }

    const response = await fetch(`${API_BASE_URL}/admin/tasks/${task.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "x-admin-key": user.admin_key || "",
      },
      body: JSON.stringify({
        task_name: document.querySelector<HTMLInputElement>("#editTaskName")!.value,
        task_description: document.querySelector<HTMLTextAreaElement>("#editTaskDescription")!.value,
        task_type: document.querySelector<HTMLSelectElement>("#editTaskType")!.value,
        start_date: document.querySelector<HTMLInputElement>("#editStartDate")!.value,
        end_date: document.querySelector<HTMLInputElement>("#editEndDate")!.value,
        max_stars: Number(document.querySelector<HTMLInputElement>("#editMaxStars")!.value),
        levels,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      message.textContent = data.detail || "Task update failed";
      message.className = "error";
      return;
    }

    message.textContent = "Task updated successfully.";
    message.className = "success";
    await loadAdminTasks(user, currentPage);
  });

  document.querySelector<HTMLButtonElement>("#cancelEditTask")!.addEventListener("click", () => {
    editSection.innerHTML = "";
  });
}

async function loadAdminSubmissions(user: User, filter: "pending" | "reviewed") {
  const pageContent = document.querySelector<HTMLElement>("#pageContent")!;

  const response = await fetch(`${API_BASE_URL}/admin/submissions`, {
    headers: {
      "x-admin-key": user.admin_key || "",
    },
  });

  const submissions: any[] = await response.json();
  const filtered = submissions.filter((item) => {
    if (filter === "pending") {
      return item.status !== "reviewed";
    }
    return item.status === "reviewed";
  });

  pageContent.innerHTML = `
    <div class="content-card">
      <h2>${filter === "pending" ? "Pending Submissions" : "Reviewed Submissions"}</h2>

      ${
        filtered.length === 0
          ? `<p>${filter === "pending" ? "No pending submissions." : "No reviewed submissions."}</p>`
          : filtered
              .map(
                (item) => `
                  <div class="review-item">
                    <h3>${item.task_name}</h3>
                    <p>User: ${item.user_name} | Level: ${item.user_level}</p>
                    <p>Date: ${item.occurrence_date}</p>
                    <p>Answer: ${item.text_answer || "-"}</p>
                    ${
                      item.file_url
                        ? `<p><a href="${item.file_url}" target="_blank">View uploaded file</a></p>`
                        : ""
                    }
                    <p>Status: ${item.status}</p>
                    ${
                      filter === "pending"
                        ? `<form class="review-form" data-id="${item.id}">
                            <input type="number" name="stars" placeholder="Stars" min="0" value="${item.stars_given ?? ""}" required />
                            <textarea name="review" placeholder="Admin review" required>${item.admin_review ?? ""}</textarea>
                            <div class="form-actions">
                              <button type="submit">Save Review</button>
                              <button type="button" class="delete-review-btn" data-id="${item.id}">Delete Review</button>
                            </div>
                          </form>`
                        : `<div class="review-summary">
                            <p><strong>Stars:</strong> ${item.stars_given ?? "N/A"}</p>
                            <p><strong>Review:</strong> ${item.admin_review ?? "N/A"}</p>
                            <p><strong>Reviewed at:</strong> ${item.reviewed_at ?? "-"}</p>
                            <button type="button" class="delete-review-btn" data-id="${item.id}">Reopen Review</button>
                          </div>`
                    }
                  </div>
                `
              )
              .join("")
      }
    </div>
  `;

  if (filter === "pending") {
    attachReviewForms(user);
  } else {
    attachReopenButtons(user);
  }
}

function attachReopenButtons(user: User) {
  const pageContent = document.querySelector<HTMLElement>("#pageContent")!;
  pageContent.querySelectorAll<HTMLButtonElement>(".delete-review-btn").forEach((button) => {
    button.addEventListener("click", async () => {
      const submissionId = button.dataset.id;
      if (!submissionId || !confirm("Reopen this reviewed submission for review?")) {
        return;
      }

      const response = await fetch(`${API_BASE_URL}/admin/submissions/${submissionId}`, {
        method: "DELETE",
        headers: {
          "x-admin-key": user.admin_key || "",
        },
      });

      if (response.ok) {
        alert("Submission reopened for review");
        await loadAdminSubmissions(user, "reviewed");
      } else {
        const data = await response.json();
        alert(data.detail || "Reopen failed");
      }
    });
  });
}

function attachReviewForms(user: User) {
  const pageContent = document.querySelector<HTMLElement>("#pageContent")!;
  const forms = pageContent.querySelectorAll<HTMLFormElement>(".review-form");

  forms.forEach((form) => {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      const submissionId = form.dataset.id;
      const stars = form.querySelector<HTMLInputElement>('input[name="stars"]')!.value;
      const review = form.querySelector<HTMLTextAreaElement>('textarea[name="review"]')!.value;

      const response = await fetch(`${API_BASE_URL}/admin/submissions/${submissionId}/review`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": user.admin_key || "",
        },
        body: JSON.stringify({
          stars_given: Number(stars),
          admin_review: review,
        }),
      });

      if (response.ok) {
        alert("Review submitted");
        await loadAdminSubmissions(user, "pending");
      } else {
        const data = await response.json();
        alert(data.detail || "Review failed");
      }
    });
  });

  pageContent.querySelectorAll<HTMLButtonElement>(".delete-review-btn").forEach((button) => {
    button.addEventListener("click", async () => {
      const submissionId = button.dataset.id;
      if (!submissionId || !confirm("Delete this review and reopen the task for review?")) {
        return;
      }

      const response = await fetch(`${API_BASE_URL}/admin/submissions/${submissionId}`, {
        method: "DELETE",
        headers: {
          "x-admin-key": user.admin_key || "",
        },
      });

      if (response.ok) {
        alert("Review deleted");
        await loadAdminSubmissions(user, "pending");
      } else {
        const data = await response.json();
        alert(data.detail || "Delete review failed");
      }
    });
  });
}

/* ================= USER DASHBOARD ================= */

function renderUserDashboard(user: User) {
  app.innerHTML = `
    <div class="dashboard-layout">
      <aside class="sidebar">
        <div class="sidebar-brand">
          <img src="/icons/logo.png" alt="Vanavil logo" class="sidebar-logo" />
          <div class="sidebar-brand-text">
            <h2>Vanavil</h2>
            <p>${user.full_name} - Level ${user.level}</p>
          </div>
        </div>

        <nav class="sidebar-menu">
          <button class="menu-item active" data-page="announcements">Announcements</button>
          <button class="menu-item" data-page="tasks">My Tasks</button>
          <button class="menu-item" data-page="scoreboard">Scoreboard</button>
          <button class="menu-item" data-page="reviews">Admin Reviews</button>
        </nav>

        <button id="logoutBtn" class="logout-btn">Logout</button>
      </aside>

      <main class="dashboard-main">
        <header class="dashboard-header">
          <div>
            <h1 id="pageTitle">Announcements</h1>
            <p>Welcome back, ${user.full_name}</p>
          </div>
        </header>

        <section id="pageContent" class="page-content"></section>
      </main>
    </div>
  `;

  const menuItems = document.querySelectorAll<HTMLButtonElement>(".menu-item");
  const pageTitle = document.querySelector<HTMLHeadingElement>("#pageTitle")!;

  async function setUserPage(page: string) {
    menuItems.forEach((item) => {
      item.classList.remove("active");
      if (item.dataset.page === page) item.classList.add("active");
    });

    if (page === "announcements") {
      pageTitle.textContent = "Announcements";
      await loadUserAnnouncements(user);
    }

    if (page === "tasks") {
      pageTitle.textContent = "My Tasks";
      await loadUserTasks(user, 1);
    }

    if (page === "scoreboard") {
      pageTitle.textContent = "Scoreboard";
      await loadScoreboard();
    }

    if (page === "reviews") {
      pageTitle.textContent = "Admin Reviews";
      await loadUserReviews(user);
    }
  }

  menuItems.forEach((item) => {
    item.addEventListener("click", () => {
      const page = item.dataset.page;
      if (page) setUserPage(page);
    });
  });

  document.querySelector<HTMLButtonElement>("#logoutBtn")!.addEventListener("click", () => {
    localStorage.removeItem("user");
    window.location.reload();
  });

  setUserPage("announcements");
}

async function loadUserAnnouncements(user: User) {
  const pageContent = document.querySelector<HTMLElement>("#pageContent")!;

  const response = await fetch(`${API_BASE_URL}/users/${user.id}/announcements`);
  const data = await response.json();

  const dueTasks: any[] = data.due_tasks || [];
  const reviews: any[] = data.recent_reviews || [];
  const userRank: number | null = data.scoreboard_rank ?? null;
  const isTopRanked: boolean = data.is_top_ranked === true;

  pageContent.innerHTML = `
    <div class="content-card">
      <h2>Announcements</h2>

      <div class="announcement-block">
        <h3>Tasks due today</h3>
        ${
          dueTasks.length === 0
            ? `<p>Great job! There are no tasks due today.</p>`
            : `<ul>${dueTasks
                .map(
                  (task) => `
                    <li>
                      <strong>${task.task_name}</strong> — ${task.task_description}
                      <div>Due: ${task.end_date}</div>
                    </li>
                  `
                )
                .join("")}</ul>`
        }
      </div>

      <div class="announcement-block">
        <h3>Reviewed tasks</h3>
        ${
          reviews.length === 0
            ? `<p>No reviews yet. Keep completing tasks and ask your teacher to review them.</p>`
            : `<ul>${reviews
                .map(
                  (review) => `
                    <li>
                      <strong>${review.task_name}</strong> — ${review.stars_given} / ${review.max_stars} stars
                      ${review.admin_review ? `<div>${review.admin_review}</div>` : ``}
                    </li>
                  `
                )
                .join("")}</ul>`
        }
      </div>

      <div class="announcement-block">
        <h3>Scoreboard update</h3>
        ${userRank
          ? `<p>You are currently ranked <strong>${userRank}</strong> on the scoreboard.</p>
             ${isTopRanked ? `<p>🎉 You are top of the scoreboard!</p>` : ``}`
          : `<p>Your score is not available yet. Complete tasks to appear on the scoreboard.</p>`}
      </div>
    </div>
  `;
}

async function loadUserTasks(user: User, page: number = 1) {
  const pageContent = document.querySelector<HTMLElement>('#pageContent')!;

  const response = await fetch(`${API_BASE_URL}/users/${user.id}/tasks`);
  const tasks: any[] = await response.json();

  const today = todayString();
  const todayTasks = tasks.filter((task) => task.end_date === today);
  const otherTasks = tasks.filter((task) => task.end_date !== today);
  const sortedTasks = [...todayTasks, ...otherTasks];

  const totalPages = Math.max(1, Math.ceil(sortedTasks.length / TASKS_PAGE_SIZE));
  const currentPage = Math.min(Math.max(page, 1), totalPages);
  const pageTasks = sortedTasks.slice((currentPage - 1) * TASKS_PAGE_SIZE, currentPage * TASKS_PAGE_SIZE);

  pageContent.innerHTML = `
    <div class="content-card">
      <h2>My Tasks</h2>
      ${
        tasks.length === 0
          ? `<p>No tasks assigned for your level now.</p>`
          : `
              <p class="small-note">Today's tasks are shown first.</p>
              <div class="table-container">
                <table class="admin-task-table user-task-table">
                  <thead>
                    <tr>
                      <th>Task</th>
                      <th>Type</th>
                      <th>Start</th>
                      <th>End</th>
                      <th>Status</th>
                      <th>Stars</th>
                      <th>Submit</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${pageTasks
                      .map(
                        (task) => {
                          const safeDescription = String(task.task_description)
                            .replace(/&/g, '&amp;')
                            .replace(/</g, '&lt;')
                            .replace(/>/g, '&gt;')
                            .replace(/"/g, '&quot;')
                            .replace(/'/g, '&#39;');
                          return `
                            <tr>
                              <td class="task-name-cell" data-description="${safeDescription}">${task.task_name}</td>
                              <td>${task.task_type}</td>
                              <td>${task.start_date}</td>
                              <td>${task.end_date}</td>
                              <td><span class="status-badge status-${task.submission_status.toLowerCase()}">${task.submission_status}</span></td>
                              <td>${task.max_stars}</td>
                              <td>
                                <button type="button" class="open-submit-modal-btn" data-task-id="${task.id}" data-task-name="${task.task_name}" data-description="${safeDescription}" ${task.can_submit ? "" : "disabled"}>
                                  ${task.can_submit ? "Submit" : task.submission_status}
                                </button>
                              </td>
                            </tr>
                          `;
                        }
                      )
                      .join('')}
                  </tbody>
                </table>
              </div>
              <div class="pagination">
                ${Array.from({ length: totalPages }, (_, index) => index + 1)
                  .map(
                    (pageNumber) => `
                      <button class="page-btn ${pageNumber === currentPage ? 'active' : ''}" data-page="${pageNumber}">${pageNumber}</button>
                    `
                  )
                  .join('')}
              </div>
            `
      }
    </div>
  `;

  attachTaskDescriptionHandlers(pageContent);
  attachTaskSubmitButtons(user, pageContent);

  pageContent.querySelectorAll<HTMLButtonElement>('.page-btn').forEach((button) => {
    button.addEventListener('click', () => {
      const pageNumber = Number(button.dataset.page);
      if (pageNumber && pageNumber !== currentPage) {
        loadUserTasks(user, pageNumber);
      }
    });
  });
}

function attachTaskDescriptionHandlers(pageContent: HTMLElement) {
  pageContent.querySelectorAll<HTMLTableCellElement>('.task-name-cell').forEach((cell) => {
    cell.addEventListener('click', () => {
      const description = cell.dataset.description || 'No description available.';
      showTaskDescriptionModal(description);
    });
  });
}

function showTaskDescriptionModal(description: string) {
  const existingModal = document.querySelector<HTMLElement>('#taskDescriptionModal');
  if (existingModal) {
    existingModal.remove();
  }

  const modal = document.createElement('div');
  modal.id = 'taskDescriptionModal';
  modal.className = 'task-modal';
  modal.innerHTML = `
    <div class="task-modal-content">
      <button class="task-modal-close">×</button>
      <h3>Task Description</h3>
      <p>${description}</p>
    </div>
  `;

  modal.querySelector<HTMLButtonElement>('.task-modal-close')?.addEventListener('click', () => {
    modal.remove();
  });

  modal.addEventListener('click', (event) => {
    if (event.target === modal) {
      modal.remove();
    }
  });

  document.body.appendChild(modal);
}

function attachTaskSubmitButtons(user: User, pageContent: HTMLElement) {
  pageContent.querySelectorAll<HTMLButtonElement>('.open-submit-modal-btn').forEach((button) => {
    button.addEventListener('click', () => {
      const taskId = Number(button.dataset.taskId);
      const taskName = button.dataset.taskName || 'Task';
      const taskDescription = button.dataset.description || 'No description available.';
      openSubmitTaskModal(taskId, taskName, taskDescription, user);
    });
  });
}

function openSubmitTaskModal(taskId: number, taskName: string, taskDescription: string, user: User) {
  const existingModal = document.querySelector<HTMLElement>('#taskSubmitModal');
  if (existingModal) {
    existingModal.remove();
  }

  const modal = document.createElement('div');
  modal.id = 'taskSubmitModal';
  modal.className = 'task-modal';
  modal.innerHTML = `
    <div class="task-modal-content yellow-modal">
      <button class="task-modal-close">×</button>
      <h3>Submit Task</h3>
      <p><strong>${taskName}</strong></p>
      <p>${taskDescription}</p>
      <form id="submitTaskModalForm" class="task-submit-modal-form">
        <textarea name="text_answer" placeholder="Write about the task (optional)"></textarea>
        <label class="file-upload-button">
          Choose file
          <input type="file" name="file" accept="image/*,audio/*,.pdf,.doc,.docx" />
        </label>
        <span class="selected-file-name"></span>
        <button type="submit" class="orange-submit-btn">Submit</button>
      </form>
    </div>
  `;

  const closeButton = modal.querySelector<HTMLButtonElement>('.task-modal-close')!;
  closeButton.addEventListener('click', () => {
    modal.remove();
  });

  modal.addEventListener('click', (event) => {
    if (event.target === modal) {
      modal.remove();
    }
  });

  const fileInput = modal.querySelector<HTMLInputElement>('input[type="file"]')!;
  const fileNameSpan = modal.querySelector<HTMLSpanElement>('.selected-file-name')!;

  fileInput.addEventListener('change', () => {
    if (fileInput.files && fileInput.files.length > 0) {
      fileNameSpan.textContent = fileInput.files[0].name;
    } else {
      fileNameSpan.textContent = '';
    }
  });

  const form = modal.querySelector<HTMLFormElement>('#submitTaskModalForm')!;
  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const textAnswer = form.querySelector<HTMLTextAreaElement>('textarea[name="text_answer"]')!.value;
    const file = fileInput.files && fileInput.files.length > 0 ? fileInput.files[0] : null;

    const formData = new FormData();
    formData.append('user_id', String(user.id));
    formData.append('occurrence_date', todayString());
    formData.append('text_answer', textAnswer);
    if (file) {
      formData.append('file', file);
    }

    const response = await fetch(`${API_BASE_URL}/tasks/${taskId}/submit`, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (response.ok) {
      alert('Task submitted successfully');
      modal.remove();
    } else {
      alert(data.detail || 'Task submission failed');
    }
  });

  document.body.appendChild(modal);
}

async function loadUserReviews(user: User) {
  const pageContent = document.querySelector<HTMLElement>("#pageContent")!;

  const response = await fetch(`${API_BASE_URL}/users/${user.id}/reviews`);
  const reviews: any[] = await response.json();

  pageContent.innerHTML = `
    <div class="content-card">
      <h2>Admin Reviews</h2>

      ${
        reviews.length === 0
          ? `<p>No reviews yet.</p>`
          : `
              <div class="table-container">
                <table class="review-table">
                  <thead>
                    <tr>
                      <th>Task</th>
                      <th>Stars</th>
                      <th>Review</th>
                      <th>Reviewed At</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${reviews
                      .map(
                        (review) => `
                          <tr>
                            <td>${review.task_name}</td>
                            <td>${review.stars_given} / ${review.max_stars}</td>
                            <td>${review.admin_review || "-"}</td>
                            <td>${review.reviewed_at || "-"}</td>
                          </tr>
                        `
                      )
                      .join("")}
                  </tbody>
                </table>
              </div>
            `
      }
    </div>
  `;
}

/* ================= COMMON ================= */

async function loadScoreboard() {
  const pageContent = document.querySelector<HTMLElement>("#pageContent")!;

  const response = await fetch(`${API_BASE_URL}/scoreboard`);
  const users: any[] = await response.json();

  pageContent.innerHTML = `
    <div class="content-card">
      <h2>Scoreboard</h2>

      <table class="score-table">
        <thead>
          <tr>
            <th>Rank</th>
            <th>User</th>
            <th>Level</th>
            <th>Completed Tasks</th>
            <th>Total Stars</th>
          </tr>
        </thead>

        <tbody>
          ${
            users.length === 0
              ? `<tr><td colspan="5">No scores yet.</td></tr>`
              : users
                  .map(
                    (item) => `
                      <tr>
                        <td>${item.rank}</td>
                        <td>${item.full_name}</td>
                        <td>${item.level}</td>
                        <td>${item.completed_tasks}</td>
                        <td>${item.total_stars}</td>
                      </tr>
                    `
                  )
                  .join("")
          }
        </tbody>
      </table>
    </div>
  `;
}

const savedUser = localStorage.getItem("user");

if (savedUser) {
  renderDashboard(JSON.parse(savedUser));
} else {
  renderLoginSignupPage();
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/service-worker.js")
      .then(() => {
        console.log("Vanavil service worker registered");
      })
      .catch((error) => {
        console.error("Service worker registration failed:", error);
      });
  });
}