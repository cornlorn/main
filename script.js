// API base URL - Ajusta esto según tu entorno
const API_BASE_URL = "https://cloxious.cloxious.workers.dev";

// Variables de estado
let currentPage = 1;
let totalPages = 1;
let sortBy = localStorage.getItem("sortBy") || "recent";
let isLoading = false;

// DOM Elements
const postsContainer = document.getElementById("posts-container");
const newPostBtn = document.getElementById("new-post-btn");
const newPostModal = document.getElementById("new-post-modal");
const postForm = document.getElementById("post-form");
const closeBtns = document.querySelectorAll(".close-btn");
const themeToggle = document.getElementById("theme-toggle");
const sortRecentBtn = document.getElementById("sort-recent");
const sortPopularBtn = document.getElementById("sort-popular");
const postContent = document.getElementById("post-content");
const charCount = document.getElementById("char-count");

// Initialize the app
async function init() {
  // Apply saved theme
  applyTheme();

  // Apply saved sort preference
  applySortPreference();

  // Load initial posts
  await fetchPosts();

  setupEventListeners();

  // Add infinite scroll
  window.addEventListener("scroll", handleScroll);
}

// Set up event listeners
function setupEventListeners() {
  // New post button
  newPostBtn.addEventListener("click", () => {
    newPostModal.style.display = "block";
  });

  // Close buttons for modals
  closeBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      newPostModal.style.display = "none";
    });
  });

  // Close modals when clicking outside
  window.addEventListener("click", (e) => {
    if (e.target === newPostModal) {
      newPostModal.style.display = "none";
    }
  });

  // Post form submission
  postForm.addEventListener("submit", handlePostSubmit);

  // Theme toggle
  themeToggle.addEventListener("click", toggleTheme);

  // Sort buttons
  sortRecentBtn.addEventListener("click", async () => {
    if (sortBy !== "recent") {
      sortBy = "recent";
      localStorage.setItem("sortBy", sortBy);
      applySortPreference();
      currentPage = 1;
      postsContainer.innerHTML = "";
      await fetchPosts();
    }
  });

  sortPopularBtn.addEventListener("click", async () => {
    if (sortBy !== "popular") {
      sortBy = "popular";
      localStorage.setItem("sortBy", sortBy);
      applySortPreference();
      currentPage = 1;
      postsContainer.innerHTML = "";
      await fetchPosts();
    }
  });

  // Character counter
  if (postContent) {
    postContent.addEventListener("input", updateCharCount);
  }
}

// Handle infinite scroll
function handleScroll() {
  if (isLoading || currentPage >= totalPages) return;

  const scrollY = window.scrollY;
  const windowHeight = window.innerHeight;
  const documentHeight = document.documentElement.scrollHeight;

  // Load more posts when user scrolls near the bottom
  if (scrollY + windowHeight >= documentHeight - 300) {
    currentPage++;
    fetchPosts();
  }
}

// Update character count
function updateCharCount() {
  const count = postContent.value.length;
  charCount.textContent = count;

  // Change color when approaching limit
  if (count > 240) {
    charCount.style.color = "var(--danger-color)";
  } else {
    charCount.style.color = "var(--text-secondary)";
  }
}

// Apply sort preference
function applySortPreference() {
  if (sortRecentBtn && sortPopularBtn) {
    if (sortBy === "recent") {
      sortRecentBtn.classList.add("active");
      sortPopularBtn.classList.remove("active");
    } else {
      sortPopularBtn.classList.add("active");
      sortRecentBtn.classList.remove("active");
    }
  }
}

// Toggle theme
function toggleTheme() {
  const currentTheme = document.body.getAttribute("data-theme") || "light";
  const newTheme = currentTheme === "light" ? "dark" : "light";

  document.body.setAttribute("data-theme", newTheme);
  localStorage.setItem("theme", newTheme);

  // Update icon
  const icon = themeToggle.querySelector("i");
  if (newTheme === "dark") {
    icon.className = "fa-solid fa-sun";
  } else {
    icon.className = "fa-solid fa-moon";
  }
}

// Apply saved theme
function applyTheme() {
  const savedTheme = localStorage.getItem("theme") || "light";
  document.body.setAttribute("data-theme", savedTheme);

  // Update icon
  const icon = themeToggle.querySelector("i");
  if (savedTheme === "dark") {
    icon.className = "fa-solid fa-sun";
  } else {
    icon.className = "fa-solid fa-moon";
  }
}

// Handle post submission
async function handlePostSubmit(e) {
  e.preventDefault();

  const authorName = document.getElementById("author-name").value;
  const content = document.getElementById("post-content").value;

  if (!authorName || !content) return;

  try {
    const response = await fetch(`${API_BASE_URL}/posts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        author: authorName,
        content: content
      })
    });

    if (!response.ok) {
      throw new Error("Failed to create post");
    }

    // Reset form and close modal
    postForm.reset();
    charCount.textContent = "0";
    newPostModal.style.display = "none";

    // Refresh posts
    currentPage = 1;
    postsContainer.innerHTML = "";
    await fetchPosts();
  } catch (error) {
    console.error("Error creating post:", error);
    alert("Failed to create post. Please try again.");
  }
}

// Fetch posts from API
async function fetchPosts() {
  if (isLoading) return;

  isLoading = true;

  // Show loading indicator
  if (currentPage === 1) {
    postsContainer.innerHTML = `
            <div class="loading-indicator">
                <i class="fa-solid fa-spinner fa-spin"></i>
                <span>Loading posts...</span>
            </div>
        `;
  } else {
    const loadingIndicator = document.createElement("div");
    loadingIndicator.className = "loading-indicator";
    loadingIndicator.innerHTML = `
            <i class="fa-solid fa-spinner fa-spin"></i>
            <span>Loading more posts...</span>
        `;
    postsContainer.appendChild(loadingIndicator);
  }

  try {
    const endpoint = sortBy === "recent" ? "posts/recent" : "posts/popular";
    const response = await fetch(`${API_BASE_URL}/${endpoint}?page=${currentPage}`);

    if (!response.ok) {
      throw new Error("Failed to fetch posts");
    }

    const data = await response.json();

    // Remove loading indicator
    if (currentPage === 1) {
      postsContainer.innerHTML = "";
    } else {
      const loadingIndicator = document.querySelector(".loading-indicator");
      if (loadingIndicator) {
        loadingIndicator.remove();
      }
    }

    // Update total pages
    totalPages = data.totalPages;

    // Check if there are posts
    if (data.results.length === 0 && currentPage === 1) {
      postsContainer.innerHTML = `
                <div class="empty-state">
                    <p>No thoughts yet. Be the first to share!</p>
                </div>
            `;
      return;
    }

    // Render posts
    data.results.forEach((post) => {
      const postElement = createPostElement(post);
      postsContainer.appendChild(postElement);
    });
  } catch (error) {
    console.error("Error fetching posts:", error);

    // Show error message
    if (currentPage === 1) {
      postsContainer.innerHTML = `
                <div class="error-state">
                    <p>Failed to load posts. Please try again.</p>
                    <button id="retry-btn" class="secondary-btn">Retry</button>
                </div>
            `;

      // Add retry button event listener
      document.getElementById("retry-btn").addEventListener("click", () => {
        currentPage = 1;
        fetchPosts();
      });
    } else {
      const loadingIndicator = document.querySelector(".loading-indicator");
      if (loadingIndicator) {
        loadingIndicator.innerHTML = `
                    <p>Failed to load more posts.</p>
                    <button class="retry-more-btn secondary-btn">Retry</button>
                `;

        // Add retry button event listener
        document.querySelector(".retry-more-btn").addEventListener("click", () => {
          loadingIndicator.remove();
          fetchPosts();
        });
      }
    }
  } finally {
    isLoading = false;
  }
}

// Create a post element
function createPostElement(post) {
  const postElement = document.createElement("div");
  postElement.className = "post";
  postElement.dataset.id = post.id;

  const formattedDate = formatDate(new Date(post.created_at));

  postElement.innerHTML = `
        <div class="post-header">
            <div class="post-author">${escapeHTML(post.author)}</div>
            <div class="post-time">${formattedDate}</div>
        </div>
        <div class="post-content">${escapeHTML(post.content)}</div>
        <div class="post-actions">
            <button class="icon-btn like-btn">
                <i class="fa-solid fa-heart"></i> <span class="like-count">${post.likes}</span>
            </button>
            <button class="icon-btn comment-btn">
                <i class="fa-solid fa-comment"></i> <span class="comment-count">${post.comments}</span>
            </button>
        </div>
    `;

  // Add event listeners for post actions
  const likeBtn = postElement.querySelector(".like-btn");
  likeBtn.addEventListener("click", async (e) => {
    e.stopPropagation(); // Prevent post click event
    await likePost(post.id);
  });

  // Make the post clickable to view details
  postElement.addEventListener("click", () => {
    window.location.href = `post-detail.html?id=${post.id}`;
  });

  return postElement;
}

// Like a post
async function likePost(postId) {
  try {
    const response = await fetch(`${API_BASE_URL}/posts/${postId}/like`, {
      method: "POST"
    });

    if (!response.ok) {
      throw new Error("Failed to like post");
    }

    // Update like count in UI
    const postElement = document.querySelector(`.post[data-id="${postId}"]`);
    if (postElement) {
      const likeCount = postElement.querySelector(".like-count");
      likeCount.textContent = Number.parseInt(likeCount.textContent) + 1;
    }
  } catch (error) {
    console.error("Error liking post:", error);
  }
}

// Format date
function formatDate(date) {
  const now = new Date();
  const diff = now - date;

  // Less than a minute
  if (diff < 60000) {
    return "Just now";
  }

  // Less than an hour
  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000);
    return `${minutes}m ago`;
  }

  // Less than a day
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    return `${hours}h ago`;
  }

  // Less than a week
  if (diff < 604800000) {
    const days = Math.floor(diff / 86400000);
    return `${days}d ago`;
  }

  // Format as date
  const options = { month: "short", day: "numeric" };
  if (date.getFullYear() !== now.getFullYear()) {
    options.year = "numeric";
  }
  return date.toLocaleDateString(undefined, options);
}

// Escape HTML to prevent XSS
function escapeHTML(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// Initialize the app when DOM is loaded
document.addEventListener("DOMContentLoaded", init);
