const themeToggle = document.getElementById('themeToggle');
const themeIcon = themeToggle ? themeToggle.querySelector('i') : null;
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const navLinks = document.querySelector('.nav-links');
const menuIcon = mobileMenuBtn ? mobileMenuBtn.querySelector('i') : null;
const navbar = document.querySelector('.navbar');
const backToTop = document.getElementById('backToTop');
const contactForm = document.getElementById('contactForm');
const formStatus = document.getElementById('formStatus');
const githubRepos = document.getElementById('githubRepos');
const githubStatus = document.getElementById('githubStatus');
const githubRepoCount = document.getElementById('githubRepoCount');
const githubFollowers = document.getElementById('githubFollowers');
const githubFollowing = document.getElementById('githubFollowing');

const savedTheme = localStorage.getItem('theme') || 'light';
document.documentElement.setAttribute('data-theme', savedTheme);
updateThemeIcon(savedTheme);

function updateThemeIcon(theme) {
  if (!themeIcon) return;
  themeIcon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
}

if (themeToggle) {
  themeToggle.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
  });
}

if (mobileMenuBtn && menuIcon) {
  mobileMenuBtn.addEventListener('click', () => {
    navLinks?.classList.toggle('active');
    menuIcon.className = navLinks?.classList.contains('active') ? 'fas fa-times' : 'fas fa-bars';
  });
}

document.querySelectorAll('.nav-links a').forEach((link) => {
  link.addEventListener('click', () => {
    navLinks?.classList.remove('active');
    if (menuIcon) menuIcon.className = 'fas fa-bars';
  });
});

document.querySelectorAll('.project-toggle').forEach((button) => {
  button.addEventListener('click', () => {
    const description = button.previousElementSibling;
    if (!description) return;

    const isExpanded = button.getAttribute('aria-expanded') === 'true';
    button.setAttribute('aria-expanded', String(!isExpanded));
    description.classList.toggle('expanded', !isExpanded);
    button.textContent = !isExpanded ? 'Show less' : 'Read more';
  });
});

window.addEventListener('scroll', () => {
  if (window.scrollY > 500) {
    backToTop?.classList.add('visible');
  } else {
    backToTop?.classList.remove('visible');
  }

  if (navbar) {
    navbar.style.boxShadow = window.scrollY > 20 ? '0 10px 25px rgba(15, 23, 42, 0.08)' : 'none';
  }
});

backToTop?.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

const filterBtns = document.querySelectorAll('.filter-btn');
const projectCards = document.querySelectorAll('.project-card');

filterBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    filterBtns.forEach((item) => item.classList.remove('active'));
    btn.classList.add('active');

    const filter = btn.dataset.filter;
    projectCards.forEach((card) => {
      if (filter === 'all' || card.dataset.category === filter) {
        card.classList.remove('hidden');
      } else {
        card.classList.add('hidden');
      }
    });
  });
});

const validators = {
  name: {
    validate: (value) => value.trim().length >= 2,
    message: 'Nama minimal 2 karakter',
  },
  email: {
    validate: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    message: 'Masukkan email yang valid',
  },
  subject: {
    validate: (value) => value.trim().length >= 5,
    message: 'Subjek minimal 5 karakter',
  },
  message: {
    validate: (value) => value.trim().length >= 10,
    message: 'Pesan minimal 10 karakter',
  },
};

Object.keys(validators).forEach((field) => {
  const input = document.getElementById(field);
  const errorSpan = document.getElementById(`${field}Error`);

  if (!input || !errorSpan) return;

  input.addEventListener('blur', () => validateField(input, errorSpan, validators[field]));
  input.addEventListener('input', () => {
    if (errorSpan.textContent) {
      validateField(input, errorSpan, validators[field]);
    }
  });
});

function validateField(input, errorSpan, validator) {
  const isValid = validator.validate(input.value);
  if (!isValid) {
    errorSpan.textContent = validator.message;
    input.style.borderColor = '#dc2626';
  } else {
    errorSpan.textContent = '';
    input.style.borderColor = '#10b981';
  }
  return isValid;
}

if (contactForm) {
  contactForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    let isFormValid = true;
    const formData = {};

    Object.keys(validators).forEach((field) => {
      const input = document.getElementById(field);
      const errorSpan = document.getElementById(`${field}Error`);
      const validator = validators[field];

      if (!input || !errorSpan) return;

      if (!validateField(input, errorSpan, validator)) {
        isFormValid = false;
      } else {
        formData[field] = input.value.trim();
      }
    });

    if (!isFormValid) {
      if (formStatus) {
        formStatus.textContent = 'Mohon perbaiki kesalahan di atas.';
        formStatus.className = 'form-status error';
      }
      return;
    }

    if (formStatus) {
      formStatus.textContent = 'Mengirim pesan...';
      formStatus.className = 'form-status';
    }

    const submitButton = contactForm.querySelector('button[type="submit"]');
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.innerHTML = '<span>Mengirim...</span>';
    }

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Gagal mengirim pesan.');
      }

      if (formStatus) {
        formStatus.textContent = result.message || 'Pesan berhasil dikirim.';
        formStatus.className = 'form-status success';
      }
      contactForm.reset();
      document.querySelectorAll('.form-group input, .form-group textarea').forEach((input) => {
        input.style.borderColor = '';
      });
    } catch (error) {
      if (formStatus) {
        formStatus.textContent = error.message || 'Terjadi kesalahan.';
        formStatus.className = 'form-status error';
      }
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.innerHTML = '<span>Kirim Pesan</span><i class="fas fa-paper-plane"></i>';
      }
    }
  });
}

async function loadGithub() {
  if (!githubRepos) return;

  try {
    const response = await fetch('/api/github');
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Tidak bisa memuat repositori GitHub.');
    }

    const profile = data.profile || {};
    if (githubRepoCount) githubRepoCount.textContent = profile.public_repos ?? '--';
    if (githubFollowers) githubFollowers.textContent = profile.followers ?? '--';
    if (githubFollowing) githubFollowing.textContent = profile.following ?? '--';

    if (githubStatus) {
      githubStatus.textContent = `Menampilkan ${Array.isArray(data.repos) ? data.repos.length : 0} repositori terbaru dari ${profile.login || 'GitHub'}.`;
    }

    const repos = Array.isArray(data.repos) ? data.repos.slice(0, 3) : [];
    githubRepos.innerHTML = repos.map((repo) => `
      <article class="repo-card">
        <div class="repo-meta">
          <strong>${repo.name || 'Repository'}</strong>
          <span>${repo.language || 'Web'}</span>
        </div>
        <p>${repo.description || 'Tidak ada deskripsi.'}</p>
        <div class="project-tech">
          <span>${repo.stargazers_count ?? 0} ★</span>
          <span>${repo.forks_count ?? 0} fork</span>
          <span>${repo.private ? 'Private' : 'Public'}</span>
        </div>
        <a href="${repo.html_url || '#'}" target="_blank" rel="noreferrer">Lihat repository</a>
      </article>
    `).join('');
  } catch (error) {
    if (githubStatus) {
      githubStatus.textContent = error.message || 'Tidak bisa memuat repositori GitHub.';
    }
    githubRepos.innerHTML = '<p>GitHub sedang tidak tersedia. Coba lagi nanti.</p>';
  }
}

loadGithub();

document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener('click', (event) => {
    const targetId = anchor.getAttribute('href');
    if (!targetId || targetId === '#') return;
    const target = document.querySelector(targetId);
    if (!target) return;

    event.preventDefault();
    const offset = 84;
    const top = target.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: 'smooth' });
  });
});

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll('.skill-card, .project-card, .repo-card, .about-image-card, .contact-card').forEach((element) => {
  element.style.opacity = '0';
  element.style.transform = 'translateY(18px)';
  element.style.transition = 'opacity 400ms ease, transform 400ms ease';
  observer.observe(element);
});

const style = document.createElement('style');
style.textContent = `
  .skill-card.visible, .project-card.visible, .repo-card.visible, .about-image-card.visible, .contact-card.visible {
    opacity: 1 !important;
    transform: translateY(0) !important;
  }
`;
document.head.appendChild(style);

console.log('%c✅ Portofolio siap!', 'color: #2563eb; font-weight: 700;');
