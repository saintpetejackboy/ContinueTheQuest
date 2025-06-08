// pages/js/home.js

window.homePage = {
  init() {
    this.setupNotificationModal();
  },

  setupNotificationModal() {
    const btn          = document.getElementById('notify-btn');
    const modal        = document.getElementById('notify-modal');
    const modalContent = document.getElementById('modal-content');
    const closeBtn     = document.getElementById('modal-close');
    const form         = document.getElementById('notify-form');

    if (!btn || !modal || !modalContent || !closeBtn || !form) {
      console.error('Notification modal elements missing');
      return;
    }

    // Open
    btn.addEventListener('click', () => {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
      setTimeout(() => {
        modalContent.classList.remove('scale-95', 'opacity-0');
        modalContent.classList.add('scale-100', 'opacity-100');
      }, 10);
    });

    // Close helper
    const closeModal = () => {
      modalContent.classList.add('scale-95', 'opacity-0');
      modalContent.classList.remove('scale-100', 'opacity-100');
      setTimeout(() => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
      }, 300);
    };

    closeBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', e => {
      if (e.target === modal) closeModal();
    });

    // Submission handler
    form.addEventListener('submit', async function(e) {
      e.preventDefault();
      console.log('🟢 notify-form submit intercepted');  // <<-- you should see this

      const email = this.querySelector('input[type="email"]').value.trim();
      if (!email) {
        alert('Please enter a valid email');
        return;
      }

      try {
        const res  = await fetch('/api/index.php?endpoint=submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type:    'notify',
            email:   email,
            consent: true
          })
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || res.statusText);
        }

// Success UI with large green check emoji
this.innerHTML = `
  <div class="text-center py-8 relative">
    <div class="text-[6rem] leading-none mb-4">✅</div>
    <h4 class="text-xl font-semibold mb-2">You're on the list!</h4>
    <p class="text-gray-400">We'll notify you when we launch.</p>
  </div>
`;


        setTimeout(closeModal, 2000);

      } catch (err) {
        console.error('❌ submit error', err);
        alert('Sorry—could not submit. Please try again.');
      }
    });
  }
};

// Kickoff
window.homePage.init();
