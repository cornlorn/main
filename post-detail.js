// API base URL - Ajusta esto según tu entorno
const API_BASE_URL = "https://cloxious.cloxious.workers.dev";

// Variables de estado
let currentPostId = null;
let currentCommentPage = 1;
let totalCommentPages = 1;
let isLoadingComments = false;

// DOM Elements
const postDetailContainer = document.getElementById("post-detail-container");
const commentModal = document.getElementById("comment-modal");
const commentForm = document.getElementById("comment-form");
const closeBtns = document.querySelectorAll(".close-btn");
const themeToggle = document.getElementById("theme-toggle");
const commentContent = document.getElementById("comment-content");
const commentCharCount = document.getElementById("comment-char-count");

// Initialize the app
async function init() {
  // Apply saved theme
  applyTheme();

  // Get post ID from URL
  const urlParams = new URLSearchParams(window.location.search);
  currentPostId = Number.parseInt(urlParams.get("id"));

  if (!currentPostId) {
    window.location.href = "index.html";
    return;
  }

  // Load post detail first, then fetch comments
  await fetchPostDetail();
  await fetchComments();

  setupEventListeners();

  // Add infinite scroll for comments
  window.addEventListener("scroll", handleScroll);
}

// Handle infinite scroll for comments
function handleScroll() {
  if (isLoadingComments || currentCommentPage >= totalCommentPages) return;

  const scrollY = window.scrollY;
  const windowHeight = window.innerHeight;
  const documentHeight = document.documentElement.scrollHeight;

  // Load more comments when user scrolls near the bottom
  if (scrollY + windowHeight >= documentHeight - 300) {
    currentCommentPage++;
    fetchComments();
  }
}

// Set up event listeners
function setupEventListeners() {
  // Close buttons for modals
  closeBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      commentModal.style.display = "none";
    });
  });

  // Close modals when clicking outside
  window.addEventListener("click", (e) => {
    if (e.target === commentModal) {
      commentModal.style.display = "none";
    }
  });

  // Comment form submission
  commentForm.addEventListener("submit", handleCommentSubmit);

  // Theme toggle
  themeToggle.addEventListener("click", toggleTheme);

  // Character counter
  if (commentContent) {
    commentContent.addEventListener("input", updateCharCount);
  }
}

// Update character count
function updateCharCount() {
  const count = commentContent.value.length;
  commentCharCount.textContent = count;

  // Change color when approaching limit
  if (count > 120) {
    commentCharCount.style.color = "var(--danger-color)";
  } else {
    commentCharCount.style.color = "var(--text-secondary)";
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

// Handle comment submission
async function handleCommentSubmit(e) {
  e.preventDefault();

  const commenterName = document.getElementById("commenter-name").value;
  const commentText = document.getElementById("comment-content").value;

  if (!commenterName || !commentText) return;

  try {
    const response = await fetch(`${API_BASE_URL}/posts/${currentPostId}/comments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        author: commenterName,
        content: commentText
      })
    });

    if (!response.ok) {
      throw new Error("Failed to create comment");
    }

    // Reset form and close modal
    commentForm.reset();
    commentCharCount.textContent = "0";
    commentModal.style.display = "none";

    // Refresh comments
    const commentsContainer = document.querySelector(".comments-list");
    if (commentsContainer) {
      commentsContainer.innerHTML = "";
    }
    currentCommentPage = 1;
    await fetchComments();

    // Update comment count in UI
    const commentCount = document.querySelector(".comment-count");
    if (commentCount) {
      commentCount.textContent = Number.parseInt(commentCount.textContent) + 1;
    }
  } catch (error) {
    console.error("Error creating comment:", error);
    alert("Failed to create comment. Please try again.");
  }
}

// Fetch post detail
async function fetchPostDetail() {
  try {
    // Show loading indicator
    postDetailContainer.innerHTML = `
            <div class="loading-indicator">
                <i class="fa-solid fa-spinner fa-spin"></i>
                <span>Loading post...</span>
            </div>
        `;

    const response = await fetch(`${API_BASE_URL}/posts/${currentPostId}`);

    if (!response.ok) {
      throw new Error("Failed to fetch post");
    }

    const data = await response.json();

    if (!data.success || !data.post) {
      throw new Error("Post not found");
    }

    // Render post detail
    postDetailContainer.innerHTML = "";
    const postElement = createPostDetailElement(data.post);
    postDetailContainer.appendChild(postElement);
  } catch (error) {
    console.error("Error fetching post:", error);

    postDetailContainer.innerHTML = `
            <div class="error-state">
                <p>Failed to load post. Please try again.</p>
                <a href="index.html" class="secondary-btn">Back to Home</a>
                <button id="retry-post-btn" class="primary-btn">Retry</button>
            </div>
        `;

    // Add retry button event listener
    document.getElementById("retry-post-btn").addEventListener("click", fetchPostDetail);
  }
}

// Fetch comments
async function fetchComments() {
  if (isLoadingComments) return;

  isLoadingComments = true;

  try {
    // Get or create comments container
    let commentsContainer = document.querySelector(".comments-list");
    const commentsSection = document.querySelector(".comments-section");

    if (!commentsSection) {
      return; // Post detail not loaded yet
    }

    if (!commentsContainer) {
      commentsContainer = document.createElement("div");
      commentsContainer.className = "comments-list";
      commentsSection.appendChild(commentsContainer);
    }

    // Show loading indicator for comments
    if (currentCommentPage === 1) {
      commentsContainer.innerHTML = `
                <div class="loading-indicator">
                    <i class="fa-solid fa-spinner fa-spin"></i>
                    <span>Loading comments...</span>
                </div>
            `;
    } else {
      const loadingIndicator = document.createElement("div");
      loadingIndicator.className = "loading-indicator";
      loadingIndicator.innerHTML = `
                <i class="fa-solid fa-spinner fa-spin"></i>
                <span>Loading more comments...</span>
            `;
      commentsContainer.appendChild(loadingIndicator);
    }

    const response = await fetch(`${API_BASE_URL}/posts/${currentPostId}/comments?page=${currentCommentPage}`);

    if (!response.ok) {
      throw new Error("Failed to fetch comments");
    }

    const data = await response.json();

    // Remove loading indicator
    if (currentCommentPage === 1) {
      commentsContainer.innerHTML = "";
    } else {
      const loadingIndicator = document.querySelector(".loading-indicator");
      if (loadingIndicator) {
        loadingIndicator.remove();
      }
    }

    // Update total pages
    totalCommentPages = data.totalPages;

    // Check if there are comments
    if (data.results.length === 0 && currentCommentPage === 1) {
      commentsContainer.innerHTML = `
                <div class="empty-state">
                    <p>No comments yet. Be the first to comment!</p>
                </div>
            `;
      return;
    }

    // Render comments
    data.results.forEach((comment) => {
      const commentElement = createCommentElement(comment);
      commentsContainer.appendChild(commentElement);
    });
  } catch (error) {
    console.error("Error fetching comments:", error);

    const commentsContainer = document.querySelector(".comments-list");
    if (commentsContainer) {
      if (currentCommentPage === 1) {
        commentsContainer.innerHTML = `
                    <div class="error-state">
                        <p>Failed to load comments. Please try again.</p>
                        <button id="retry-comments-btn" class="secondary-btn">Retry</button>
                    </div>
                `;

        // Add retry button event listener
        document.getElementById("retry-comments-btn").addEventListener("click", () => {
          currentCommentPage = 1;
          fetchComments();
        });
      } else {
        const loadingIndicator = document.querySelector(".loading-indicator");
        if (loadingIndicator) {
          loadingIndicator.innerHTML = `
                        <p>Failed to load more comments.</p>
                        <button class="retry-more-btn secondary-btn">Retry</button>
                    `;

          // Add retry button event listener
          document.querySelector(".retry-more-btn").addEventListener("click", () => {
            loadingIndicator.remove();
            fetchComments();
          });
        }
      }
    }
  } finally {
    isLoadingComments = false;
  }
}

// Create a post detail element
function createPostDetailElement(post) {
  const postElement = document.createElement("div");
  postElement.className = "post-detail";

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

  // Add comments section
  const commentsSection = document.createElement("div");
  commentsSection.className = "comments-section";

  const commentsHeader = document.createElement("div");
  commentsHeader.className = "comments-header";
  commentsHeader.innerHTML = `
        <div class="comments-title">Comments</div>
        <button class="primary-btn" id="add-comment-btn">
            <i class="fa-solid fa-plus"></i> Add Comment
        </button>
    `;
  commentsSection.appendChild(commentsHeader);

  postElement.appendChild(commentsSection);

  // Add event listeners for post actions
  const likeBtn = postElement.querySelector(".like-btn");
  likeBtn.addEventListener("click", () => {
    likePost(post.id);
  });

  const commentBtn = postElement.querySelector(".comment-btn");
  commentBtn.addEventListener("click", () => {
    openCommentModal();
  });

  const addCommentBtn = postElement.querySelector("#add-comment-btn");
  addCommentBtn.addEventListener("click", () => {
    openCommentModal();
  });

  return postElement;
}

// Create a comment element
function createCommentElement(comment) {
  const commentElement = document.createElement("div");
  commentElement.className = "comment";

  const formattedDate = formatDate(new Date(comment.created_at));

  commentElement.innerHTML = `
        <div class="comment-header">
            <div class="comment-author">${escapeHTML(comment.author)}</div>
            <div class="comment-time">${formattedDate}</div>
        </div>
        <div class="comment-content">${escapeHTML(comment.content)}</div>
    `;

  return commentElement;
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
    const likeCount = document.querySelector(".like-count");
    if (likeCount) {
      likeCount.textContent = Number.parseInt(likeCount.textContent) + 1;
    }
  } catch (error) {
    console.error("Error liking post:", error);
  }
}

// Open comment modal
function openCommentModal() {
  document.getElementById("post-id-for-comment").value = currentPostId;
  commentModal.style.display = "block";
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
