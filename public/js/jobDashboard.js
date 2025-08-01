// Job Dashboard Management System
class JobDashboard {
  constructor() {
    this.currentJobs = [];
    this.currentPage = 1;
    this.totalPages = 1;
    this.filters = {
      category: 'all',
      location: 'all',
      jobType: 'all',
      search: '',
    };
    this.isLoading = false;
    this.init();
  }

  async init() {
    try {
      await this.loadJobStats();
      await this.loadFilterOptions();
      await this.loadJobs();
      this.setupEventListeners();
      this.startAutoRefresh();
    } catch (error) {
      console.error('Error initializing job dashboard:', error);
      this.showError('Failed to initialize dashboard');
    }
  }

  // Load job statistics for dashboard summary
  async loadJobStats() {
    try {
      const response = await fetch('/api/jobs/status');
      const data = await response.json();

      if (data.success) {
        this.updateStatsDisplay(data.data);
      }
    } catch (error) {
      console.error('Error loading job stats:', error);
    }
  }

  // Update statistics display
  updateStatsDisplay(stats) {
    const statsContainer = document.getElementById('jobStats');
    if (statsContainer) {
      statsContainer.innerHTML = `
        <div class="stats-grid">
          <div class="stat-card">
            <h3>Total Jobs</h3>
            <span class="stat-number">${stats.totalJobs || 0}</span>
          </div>
          <div class="stat-card">
            <h3>Service Status</h3>
            <span class="stat-status ${stats.isRunning ? 'running' : 'stopped'}">
              ${stats.isRunning ? 'Running' : 'Stopped'}
            </span>
          </div>
          <div class="stat-card">
            <h3>Last Updated</h3>
            <span class="stat-time">${this.formatDate(stats.lastRun)}</span>
          </div>
          <div class="stat-card">
            <h3>Categories</h3>
            <span class="stat-number">${stats.categories || 0}</span>
          </div>
        </div>
      `;
    }
  }

  // Load filter options (categories, locations)
  async loadFilterOptions() {
    try {
      // Load categories
      const categoriesResponse = await fetch('/api/jobs/categories');
      const categoriesData = await categoriesResponse.json();

      // Load locations
      const locationsResponse = await fetch('/api/jobs/locations');
      const locationsData = await locationsResponse.json();

      if (categoriesData.success) {
        this.populateSelect('categoryFilter', categoriesData.data, 'All Categories');
      }

      if (locationsData.success) {
        this.populateSelect('locationFilter', locationsData.data, 'All Locations');
      }
    } catch (error) {
      console.error('Error loading filter options:', error);
    }
  }

  // Populate select dropdown
  populateSelect(selectId, options, defaultText) {
    const select = document.getElementById(selectId);
    if (select) {
      select.innerHTML = `<option value="all">${defaultText}</option>`;
      options.forEach((option) => {
        const optionElement = document.createElement('option');
        optionElement.value = option;
        optionElement.textContent = option;
        select.appendChild(optionElement);
      });
    }
  }

  // Load jobs with current filters
  async loadJobs(page = 1) {
    if (this.isLoading) return;

    this.isLoading = true;
    this.showLoading(true);

    try {
      const params = new URLSearchParams({
        page: page,
        limit: 20,
        ...this.filters,
      });

      // Remove 'all' values
      ['category', 'location', 'jobType'].forEach((key) => {
        if (this.filters[key] === 'all') {
          params.delete(key);
        }
      });

      // Remove empty search
      if (!this.filters.search.trim()) {
        params.delete('search');
      }

      const response = await fetch(`/api/jobs?${params}`);
      const data = await response.json();

      if (data.success) {
        this.currentJobs = data.data;
        this.currentPage = data.pagination.page;
        this.totalPages = data.pagination.pages;
        this.renderJobs();
        this.renderPagination();
      } else {
        this.showError(data.message || 'Failed to load jobs');
      }
    } catch (error) {
      console.error('Error loading jobs:', error);
      this.showError('Failed to load jobs');
    } finally {
      this.isLoading = false;
      this.showLoading(false);
    }
  }

  // Render jobs list
  renderJobs() {
    const jobsContainer = document.getElementById('jobsContainer');
    if (!jobsContainer) return;

    if (this.currentJobs.length === 0) {
      jobsContainer.innerHTML = `
        <div class="no-jobs">
          <h3>No jobs found</h3>
          <p>Try adjusting your filters or search terms</p>
        </div>
      `;
      return;
    }

    const jobsHTML = this.currentJobs.map((job) => this.createJobCard(job)).join('');
    jobsContainer.innerHTML = jobsHTML;
  }

  // Create individual job card
  createJobCard(job) {
    return `
      <div class="job-card" data-job-id="${job._id}">
        <div class="job-header">
          <h3 class="job-title">${this.escapeHtml(job.title)}</h3>
          <span class="job-type">${job.jobType}</span>
        </div>
        <div class="job-company">
          <span class="company-name">${this.escapeHtml(job.company)}</span>
          <span class="job-location">${this.escapeHtml(job.location)}</span>
        </div>
        <div class="job-description">
          ${this.truncateText(this.escapeHtml(job.description), 150)}
        </div>
        <div class="job-meta">
          <div class="job-skills">
            ${job.skills
              .slice(0, 3)
              .map((skill) => `<span class="skill-tag">${this.escapeHtml(skill)}</span>`)
              .join('')}
            ${job.skills.length > 3 ? `<span class="skill-more">+${job.skills.length - 3} more</span>` : ''}
          </div>
          <div class="job-info">
            <span class="job-source">${job.source}</span>
            <span class="job-date">${this.formatDate(job.postedDate)}</span>
          </div>
        </div>
        <div class="job-actions">
          <a href="${job.url}" target="_blank" rel="noopener noreferrer" class="apply-btn">
            Apply Now
          </a>
          <button class="save-btn" onclick="jobDashboard.saveJob('${job._id}')">
            Save
          </button>
        </div>
      </div>
    `;
  }

  // Render pagination
  renderPagination() {
    const paginationContainer = document.getElementById('pagination');
    if (!paginationContainer) return;

    if (this.totalPages <= 1) {
      paginationContainer.innerHTML = '';
      return;
    }

    let paginationHTML = '';

    // Previous button
    if (this.currentPage > 1) {
      paginationHTML += `<button class="page-btn" onclick="jobDashboard.loadJobs(${this.currentPage - 1})">Previous</button>`;
    }

    // Page numbers
    const startPage = Math.max(1, this.currentPage - 2);
    const endPage = Math.min(this.totalPages, this.currentPage + 2);

    if (startPage > 1) {
      paginationHTML += `<button class="page-btn" onclick="jobDashboard.loadJobs(1)">1</button>`;
      if (startPage > 2) {
        paginationHTML += `<span class="page-ellipsis">...</span>`;
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      paginationHTML += `<button class="page-btn ${i === this.currentPage ? 'active' : ''}" onclick="jobDashboard.loadJobs(${i})">${i}</button>`;
    }

    if (endPage < this.totalPages) {
      if (endPage < this.totalPages - 1) {
        paginationHTML += `<span class="page-ellipsis">...</span>`;
      }
      paginationHTML += `<button class="page-btn" onclick="jobDashboard.loadJobs(${this.totalPages})">${this.totalPages}</button>`;
    }

    // Next button
    if (this.currentPage < this.totalPages) {
      paginationHTML += `<button class="page-btn" onclick="jobDashboard.loadJobs(${this.currentPage + 1})">Next</button>`;
    }

    paginationContainer.innerHTML = paginationHTML;
  }

  // Setup event listeners
  setupEventListeners() {
    // Filter change handlers
    const categoryFilter = document.getElementById('categoryFilter');
    const locationFilter = document.getElementById('locationFilter');
    const jobTypeFilter = document.getElementById('jobTypeFilter');
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    const refreshBtn = document.getElementById('refreshBtn');
    const manualFetchBtn = document.getElementById('manualFetchBtn');

    if (categoryFilter) {
      categoryFilter.addEventListener('change', (e) => {
        this.filters.category = e.target.value;
        this.loadJobs(1);
      });
    }

    if (locationFilter) {
      locationFilter.addEventListener('change', (e) => {
        this.filters.location = e.target.value;
        this.loadJobs(1);
      });
    }

    if (jobTypeFilter) {
      jobTypeFilter.addEventListener('change', (e) => {
        this.filters.jobType = e.target.value;
        this.loadJobs(1);
      });
    }

    if (searchInput) {
      searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.handleSearch();
        }
      });
    }

    if (searchBtn) {
      searchBtn.addEventListener('click', () => this.handleSearch());
    }

    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.refreshData());
    }

    if (manualFetchBtn) {
      manualFetchBtn.addEventListener('click', () => this.triggerManualFetch());
    }
  }

  // Handle search
  handleSearch() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
      this.filters.search = searchInput.value.trim();
      this.loadJobs(1);
    }
  }

  // Refresh all data
  async refreshData() {
    await this.loadJobStats();
    await this.loadFilterOptions();
    await this.loadJobs(1);
    this.showSuccess('Data refreshed successfully');
  }

  // Trigger manual job fetch
  async triggerManualFetch() {
    try {
      const response = await fetch('/api/jobs/fetch', { method: 'POST' });
      const data = await response.json();

      if (data.success) {
        this.showSuccess('Job fetch process started. Results will be available shortly.');
        // Refresh data after a delay
        setTimeout(() => this.refreshData(), 5000);
      } else {
        this.showError(data.message || 'Failed to trigger job fetch');
      }
    } catch (error) {
      console.error('Error triggering manual fetch:', error);
      this.showError('Failed to trigger job fetch');
    }
  }

  // Save job (placeholder - implement as needed)
  saveJob(jobId) {
    // Implement job saving functionality
    console.log('Saving job:', jobId);
    this.showSuccess('Job saved (feature coming soon)');
  }

  // Start auto-refresh
  startAutoRefresh() {
    // Refresh stats every 5 minutes
    setInterval(
      () => {
        this.loadJobStats();
      },
      5 * 60 * 1000
    );
  }

  // Utility functions
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substr(0, maxLength) + '...';
  }

  formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  showLoading(show) {
    const loader = document.getElementById('jobsLoader');
    if (loader) {
      loader.style.display = show ? 'block' : 'none';
    }
  }

  showError(message) {
    this.showNotification(message, 'error');
  }

  showSuccess(message) {
    this.showNotification(message, 'success');
  }

  showNotification(message, type) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;

    // Add to page
    document.body.appendChild(notification);

    // Remove after 3 seconds
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.jobDashboard = new JobDashboard();
});
