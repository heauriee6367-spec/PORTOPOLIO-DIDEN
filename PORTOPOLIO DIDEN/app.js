const themeToggle = document.getElementById('themeToggle');
const themeIcon = themeToggle?.querySelector('i');
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const navLinks = document.querySelector('.nav-links');
const menuIcon = mobileMenuBtn?.querySelector('i');
const backToTop = document.getElementById('backToTop');
const contactForm = document.getElementById('contactForm');
const formStatus = document.getElementById('formStatus');
const githubProfile = document.getElementById('githubProfile');
const githubRepos = document.getElementById('githubRepos');

const savedTheme = localStorage.getItem('theme') || 'light';
document.documentElement.setAttribute('data-theme', savedTheme);
if (themeIcon) {
  themeIcon.className = savedTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
}

if (themeToggle) {
  themeToggle.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', nextTheme);
    localStorage.setItem('theme', nextTheme);
    if (themeIcon) {
      themeIcon.className = nextTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }
  });
}

if (mobileMenuBtn) {
  mobileMenuBtn.addEventListener('click', () => {
    navLinks?.classList.toggle('active');
    if (menuIcon) {
      menuIcon.className = navLinks?.classList.contains('active') ? 'fas fa-times' : 'fas fa-bars';
    }
  });
}

document.querySelectorAll('.nav-links a').forEach((link) => {
  link.addEventListener('click', () => {
    navLinks?.classList.remove('active');
    if (menuIcon) {
      menuIcon.className = 'fas fa-bars';
    }
  });
});

document.querySelectorAll('.project-toggle').forEach((button) => {
  if (button.dataset.bound === 'true') return;
  button.dataset.bound = 'true';

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
  const visible = window.scrollY > 480;
  backToTop?.classList.toggle('visible', visible);
});

backToTop?.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

const reveals = document.querySelectorAll('.reveal');
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.14 });

reveals.forEach((item) => revealObserver.observe(item));

const validators = {
  name: { validate: (value) => value.trim().length >= 2, message: 'Nama minimal 2 karakter.' },
  email: { validate: (value) => /[^\s@]+@[^\s@]+\.[^\s@]+/.test(value), message: 'Format email tidak valid.' },
  subject: { validate: (value) => value.trim().length >= 5, message: 'Subjek minimal 5 karakter.' },
  message: { validate: (value) => value.trim().length >= 10, message: 'Pesan minimal 10 karakter.' }
};

function validateField(input, errorEl, validator) {
  const valid = validator.validate(input.value);
  errorEl.textContent = valid ? '' : validator.message;
  input.style.borderColor = valid ? '' : '#ef4444';
  return valid;
}

Object.entries(validators).forEach(([field, validator]) => {
  const input = document.getElementById(field);
  const errorEl = document.getElementById(`${field}Error`);

  input?.addEventListener('blur', () => validateField(input, errorEl, validator));
  input?.addEventListener('input', () => {
    if (errorEl.textContent) {
      validateField(input, errorEl, validator);
    }
  });
});

contactForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const payload = {};
  let valid = true;

  Object.entries(validators).forEach(([field, validator]) => {
    const input = document.getElementById(field);
    const errorEl = document.getElementById(`${field}Error`);
    const isValid = validateField(input, errorEl, validator);
    valid = valid && isValid;
    if (isValid) {
      payload[field] = input.value.trim();
    }
  });

  if (!valid) {
    formStatus.textContent = 'Harap perbaiki form sebelum mengirim.';
    formStatus.className = 'form-status error';
    return;
  }

  const submitButton = contactForm.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  submitButton.textContent = 'Mengirim...';

  try {
    const response = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Gagal mengirim pesan.');
    }

    formStatus.textContent = result.message;
    formStatus.className = 'form-status success';
    contactForm.reset();
    Object.values(document.querySelectorAll('.form-row input, .form-row textarea')).forEach((field) => {
      field.style.borderColor = '';
    });
    document.querySelectorAll('.error-message').forEach((el) => {
      el.textContent = '';
    });
  } catch (error) {
    formStatus.textContent = error.message;
    formStatus.className = 'form-status error';
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = 'Kirim Pesan';
  }
});

async function loadGitHubData() {
  try {
    const response = await fetch('/api/github?username=heauriee6367-spec');
    if (!response.ok) {
      throw new Error('Unable to load GitHub data.');
    }

    const data = await response.json();
    renderGitHubProfile(data.profile);
    renderGitHubRepos(data.repos || data.repositories);
  } catch (error) {
    githubProfile.innerHTML = '<p>GitHub data sedang tidak tersedia saat ini. Silakan cek kembali nanti.</p>';
    githubRepos.innerHTML = '<div class="repo-card"><h5>Fallback</h5><p>GitHub profile dan repository sedang tidak bisa dimuat. Namun situs tetap dapat diakses.</p></div>';
  }
}

function renderGitHubProfile(profile) {
  githubProfile.innerHTML = `
    <h4>${profile.name || profile.login}</h4>
    <p>${profile.bio || 'Mahasiswa informatika yang senang mengerjakan proyek web dan aplikasi.'}</p>
    <div class="stat-row">
      <span class="stat-pill">${profile.public_repos} repos</span>
      <span class="stat-pill">${profile.followers} followers</span>
      <span class="stat-pill">${profile.following} following</span>
    </div>
  `;
}

function renderGitHubRepos(repositories) {
  if (!repositories?.length) {
    githubRepos.innerHTML = '<div class="repo-card"><h5>Belum ada repo yang ditampilkan</h5><p>Pastikan akun GitHub Anda memiliki repositori publik.</p></div>';
    return;
  }

  githubRepos.innerHTML = repositories.map((repo) => `
    <article class="repo-card">
      <h5>${repo.name}</h5>
      <p>${repo.description || 'Tidak ada deskripsi.'}</p>
      <div class="repo-meta">
        ${repo.language ? `<span><i class="fas fa-code"></i>${repo.language}</span>` : ''}
        <span><i class="fas fa-star"></i>${repo.stargazers_count}</span>
        <span><i class="fas fa-code-branch"></i>${repo.forks_count}</span>
      </div>
      <a class="btn btn-secondary" href="${repo.html_url}" target="_blank" rel="noreferrer">Lihat repo</a>
    </article>
  `).join('');
}

loadGitHubData();

// --- Carousel initialization for project cards ---
function initCarousels() {
  document.querySelectorAll('[data-carousel]').forEach((carousel) => {
    if (carousel.dataset.inited === 'true') return;
    carousel.dataset.inited = 'true';

    const track = carousel.querySelector('.carousel-track');
    const slides = Array.from(carousel.querySelectorAll('.carousel-slide'));
    const prev = carousel.querySelector('.carousel-btn.prev');
    const next = carousel.querySelector('.carousel-btn.next');
    const indicatorsWrap = carousel.querySelector('.carousel-indicators');
    if (!track || slides.length === 0) return;

    let index = 0;

    // build indicators
    slides.forEach((s, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      if (i === 0) btn.classList.add('active');
      btn.addEventListener('click', () => goTo(i));
      indicatorsWrap.appendChild(btn);
    });

    function update() {
      track.style.transform = `translateX(-${index * 100}%)`;
      const dots = Array.from(indicatorsWrap.children);
      dots.forEach((d, i) => d.classList.toggle('active', i === index));
    }

    function goTo(i) {
      index = (i + slides.length) % slides.length;
      update();
    }

    function prevSlide() { goTo(index - 1); }
    function nextSlide() { goTo(index + 1); }

    prev?.addEventListener('click', prevSlide);
    next?.addEventListener('click', nextSlide);

    // keyboard support when focused
    carousel.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') prevSlide();
      if (e.key === 'ArrowRight') nextSlide();
    });

    // simple swipe support
    let startX = null;
    track.addEventListener('pointerdown', (e) => { startX = e.clientX; track.setPointerCapture(e.pointerId); });
    track.addEventListener('pointerup', (e) => {
      if (startX === null) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 40) {
        if (dx < 0) nextSlide(); else prevSlide();
      }
      startX = null;
    });

    // ensure initial update
    update();
  });
}

// run on DOM ready and when new content is inserted
document.addEventListener('DOMContentLoaded', initCarousels);
initCarousels();
