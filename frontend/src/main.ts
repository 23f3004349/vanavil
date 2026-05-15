import "./style.css";

const API_BASE_URL = "http://127.0.0.1:8000";

const app = document.querySelector<HTMLDivElement>("#app")!;

function renderLoginSignupPage() {
  app.innerHTML = `
    <div class="container">
      <div class="card">
        <h1>Vanavil</h1>
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
  if (user.is_admin) {
    renderAdminDashboard(user);
  } else {
    renderUserDashboard(user);
  }
}

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

/* ================= ADMIN DASHBOARD ================= */

function renderAdminDashboard(user: User) {
  app.innerHTML = `
    <div class="dashboard-layout">
      <aside class="sidebar">
        <div class="sidebar-brand">
          <h2>Vanavil</h2>
          <p>Admin Panel</p>
        </div>

        <nav class="sidebar-menu">
          <button class="menu-item active" data-page="create-task">Create Task</button>
          <button class="menu-item" data-page="all-tasks">All Tasks</button>
          <button class="menu-item" data-page="submissions">Submissions</button>
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
      await loadAdminTasks(user);
    }

    if (page === "submissions") {
      pageTitle.textContent = "User Submissions";
      await loadAdminSubmissions(user);
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

async function loadAdminTasks(user: User) {
  const pageContent = document.querySelector<HTMLElement>("#pageContent")!;

  const response = await fetch(`${API_BASE_URL}/admin/tasks`, {
    headers: {
      "x-admin-key": user.admin_key || "",
    },
  });

  const tasks: any[] = await response.json();

  pageContent.innerHTML = `
    <div class="content-card">
      <h2>All Tasks</h2>

      ${
        tasks.length === 0
          ? `<p>No tasks created yet.</p>`
          : tasks
              .map(
                (task) => `
                  <div class="task-item admin-task-item">
                    <div>
                      <h3>${task.task_name}</h3>
                      <p>${task.task_description}</p>
                      <p>Type: ${task.task_type}</p>
                      <p>Dates: ${task.start_date} to ${task.end_date}</p>
                      <p>Max Stars: ${task.max_stars}</p>
                      <p>Levels: ${task.levels.join(", ")}</p>
                    </div>
                  </div>
                `
              )
              .join("")
      }
    </div>
  `;
}

async function loadAdminSubmissions(user: User) {
  const pageContent = document.querySelector<HTMLElement>("#pageContent")!;

  const response = await fetch(`${API_BASE_URL}/admin/submissions`, {
    headers: {
      "x-admin-key": user.admin_key || "",
    },
  });

  const submissions: any[] = await response.json();

  pageContent.innerHTML = `
    <div class="content-card">
      <h2>User Submissions</h2>

      ${
        submissions.length === 0
          ? `<p>No submissions yet.</p>`
          : submissions
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

                    <form class="review-form" data-id="${item.id}">
                      <input type="number" name="stars" placeholder="Stars" min="0" required />
                      <textarea name="review" placeholder="Admin review" required></textarea>
                      <button type="submit">Submit Review</button>
                    </form>
                  </div>
                `
              )
              .join("")
      }
    </div>
  `;

  attachReviewForms(user);
}

function attachReviewForms(user: User) {
  const forms = document.querySelectorAll<HTMLFormElement>(".review-form");

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
        await loadAdminSubmissions(user);
      } else {
        const data = await response.json();
        alert(data.detail || "Review failed");
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
          <h2>Vanavil</h2>
          <p>${user.full_name} - Level ${user.level}</p>
        </div>

        <nav class="sidebar-menu">
          <button class="menu-item active" data-page="tasks">My Tasks</button>
          <button class="menu-item" data-page="scoreboard">Scoreboard</button>
          <button class="menu-item" data-page="reviews">Admin Reviews</button>
        </nav>

        <button id="logoutBtn" class="logout-btn">Logout</button>
      </aside>

      <main class="dashboard-main">
        <header class="dashboard-header">
          <div>
            <h1 id="pageTitle">My Tasks</h1>
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

    if (page === "tasks") {
      pageTitle.textContent = "My Tasks";
      await loadUserTasks(user);
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

  setUserPage("tasks");
}

async function loadUserTasks(user: User) {
  const pageContent = document.querySelector<HTMLElement>("#pageContent")!;

  const response = await fetch(`${API_BASE_URL}/users/${user.id}/tasks`);
  const tasks: any[] = await response.json();

  pageContent.innerHTML = `
    <div class="content-card">
      <h2>My Tasks</h2>

      ${
        tasks.length === 0
          ? `<p>No tasks assigned for your level now.</p>`
          : tasks
              .map(
                (task) => `
                  <div class="task-submit-card">
                    <h3>${task.task_name}</h3>
                    <p>${task.task_description}</p>
                    <p>Type: ${task.task_type}</p>
                    <p>Starts On: ${task.start_date}</p>
                    <p>Last Date: ${task.end_date}</p>
                    <p>Max Stars: ${task.max_stars}</p>

                    <form class="submit-task-form" data-task-id="${task.id}">
                      <textarea name="text_answer" placeholder="Write something about your task"></textarea>
                      <input type="file" name="file" accept="image/*,audio/*,.pdf,.doc,.docx" />
                      <button type="submit">Submit Task</button>
                    </form>
                  </div>
                `
              )
              .join("")
      }
    </div>
  `;

  attachSubmitTaskForms(user);
}

function attachSubmitTaskForms(user: User) {
  const forms = document.querySelectorAll<HTMLFormElement>(".submit-task-form");

  forms.forEach((form) => {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      const taskId = form.dataset.taskId!;
      const textAnswer = form.querySelector<HTMLTextAreaElement>('textarea[name="text_answer"]')!.value;
      const fileInput = form.querySelector<HTMLInputElement>('input[name="file"]')!;

      const formData = new FormData();
      formData.append("user_id", String(user.id));
      formData.append("occurrence_date", todayString());
      formData.append("text_answer", textAnswer);

      if (fileInput.files && fileInput.files.length > 0) {
        formData.append("file", fileInput.files[0]);
      }

      const response = await fetch(`${API_BASE_URL}/tasks/${taskId}/submit`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        alert("Task submitted successfully");
        form.reset();
      } else {
        alert(data.detail || "Task submission failed");
      }
    });
  });
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
          : reviews
              .map(
                (review) => `
                  <div class="review-item">
                    <h3>${review.task_name}</h3>
                    <p>Stars: ${review.stars_given} / ${review.max_stars}</p>
                    <p>${review.admin_review}</p>
                    <span>${review.reviewed_at || ""}</span>
                  </div>
                `
              )
              .join("")
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