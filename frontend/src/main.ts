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

function renderDashboard(user: { id: number; full_name: string; email: string }) {
  app.innerHTML = `
    <div class="container">
      <div class="card">
        <h1>Dashboard</h1>
        <p class="subtitle">Welcome, ${user.full_name}</p>
        <p class="user-info">Email: ${user.email}</p>
        <button id="logoutBtn">Logout</button>
      </div>
    </div>
  `;

  document.querySelector<HTMLButtonElement>("#logoutBtn")!.addEventListener("click", () => {
    localStorage.removeItem("user");
    window.location.reload();
  });
}

const savedUser = localStorage.getItem("user");

if (savedUser) {
  renderDashboard(JSON.parse(savedUser));
} else {
  renderLoginSignupPage();
}