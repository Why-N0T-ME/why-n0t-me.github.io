(() => {
  const randomPostLink = document.querySelector('[data-random-post]');
  if (randomPostLink) {
    try {
      const postUrls = JSON.parse(randomPostLink.dataset.postUrls || '[]');
      if (postUrls.length > 0) {
        randomPostLink.href = postUrls[Math.floor(Math.random() * postUrls.length)];
      }
    } catch (error) {
      // Keep the fallback to the newest post if the generated list is unavailable.
    }
  }

  const searchInput = document.querySelector('#mission-search');
  const missionCards = Array.from(document.querySelectorAll('.ow-mission'));
  if (!searchInput || missionCards.length === 0) return;

  const params = new URLSearchParams(window.location.search);
  const selectedCategory = params.get('category');
  const categoryLabel = document.querySelector('.ow-page-heading h1');
  const status = document.querySelector('#mission-search-status');
  const emptyMessage = document.querySelector('#mission-no-results');

  if (selectedCategory && categoryLabel) {
    categoryLabel.textContent = selectedCategory;
    searchInput.value = '';
    searchInput.placeholder = `${selectedCategory} 글 검색`;
  }

  function filterMissions() {
    const query = searchInput.value.trim().toLocaleLowerCase();
    let visibleCount = 0;
    missionCards.forEach((card) => {
      const matchesQuery = !query || card.dataset.search.includes(query);
      const categories = (card.dataset.category || '').split('|');
      const matchesCategory = !selectedCategory || categories.includes(selectedCategory);
      const visible = matchesQuery && matchesCategory;
      card.hidden = !visible;
      if (visible) visibleCount += 1;
    });
    if (status) {
      status.textContent = selectedCategory
        ? `${visibleCount}개의 ${selectedCategory} 기록`
        : `${visibleCount}개의 기록`;
    }
    if (emptyMessage) emptyMessage.hidden = visibleCount !== 0;
  }

  searchInput.addEventListener('input', filterMissions);
  filterMissions();
})();
