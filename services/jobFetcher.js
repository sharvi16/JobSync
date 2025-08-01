const cron = require('node-cron');
const Job = require('../models/job.js');
const dotenv = require('dotenv');

dotenv.config();

// Use built-in fetch for Node.js 18+
const fetch = globalThis.fetch;

class JobFetcherService {
  constructor() {
    this.isRunning = false;
    this.lastRun = null;
    this.jobCategories = [
      'software developer',
      'web developer',
      'data scientist',
      'product manager',
      'ui/ux designer',
      'devops engineer',
      'mobile developer',
      'full stack developer',
      'frontend developer',
      'backend developer',
      'machine learning',
      'cloud engineer',
      'cybersecurity',
      'business analyst',
      'project manager',
    ];
  }

  // Initialize the cron job
  init(runImmediately = false) {
    console.log('🚀 Initializing Job Fetcher Service...');

    // Run every day at 2:00 AM
    cron.schedule(
      '0 2 * * *',
      async () => {
        console.log('⏰ Cron job triggered - Fetching fresh job listings...');
        await this.fetchAndStoreJobs();
      },
      {
        scheduled: true,
        timezone: 'America/New_York', // Adjust to your timezone
      }
    );

    // Only run immediately if explicitly requested
    if (runImmediately) {
      console.log('🔧 Running initial job fetch...');
      this.fetchAndStoreJobs();
    }

    console.log('✅ Job Fetcher Service initialized successfully');
    console.log('⏰ Next scheduled run: Daily at 2:00 AM');
  }

  // Main function to fetch and store jobs
  async fetchAndStoreJobs() {
    if (this.isRunning) {
      console.log('⚠️ Job fetching already in progress, skipping...');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      console.log('📊 Starting job fetch process...');

      // Clear old jobs (older than 7 days)
      await this.cleanupOldJobs();

      let totalJobsFetched = 0;
      let totalJobsSaved = 0;

      // Fetch jobs for each category
      for (const category of this.jobCategories) {
        try {
          console.log(`🔍 Fetching jobs for category: ${category}`);
          const jobs = await this.fetchJobsFromAPI(category);

          if (jobs && jobs.length > 0) {
            const savedCount = await this.saveJobsToDB(jobs, category);
            totalJobsFetched += jobs.length;
            totalJobsSaved += savedCount;
            console.log(
              `✅ Category ${category}: Fetched ${jobs.length}, Saved ${savedCount} new jobs`
            );
          } else {
            console.log(`⚠️ No jobs found for category: ${category}`);
          }

          // Add delay between API calls to avoid rate limiting
          await this.delay(2000);
        } catch (error) {
          console.error(`❌ Error fetching jobs for category ${category}:`, error.message);
        }
      }

      this.lastRun = new Date();
      const duration = (Date.now() - startTime) / 1000;

      console.log(
        `🎉 Job fetch completed! Total fetched: ${totalJobsFetched}, New jobs saved: ${totalJobsSaved}, Duration: ${duration}s`
      );
    } catch (error) {
      console.error('❌ Error in job fetching process:', error);
    } finally {
      this.isRunning = false;
    }
  }

  // Fetch jobs from Google Custom Search API
  async fetchJobsFromAPI(searchTerm) {
    try {
      const apiKey = process.env.GOOGLE_CLOUD_SEARCH_API;
      const engineId = process.env.GOOGLE_SEARCH_ENGINE_API;

      if (!apiKey || !engineId) {
        console.log(`⚠️ Google API credentials not configured, using mock data for: ${searchTerm}`);
        return this.generateMockJobs(searchTerm);
      }

      console.log(`🔑 Making API call for: ${searchTerm}`);

      // Try multiple search strategies
      const searchStrategies = [
        `${searchTerm} jobs`,
        `${searchTerm} hiring`,
        `"${searchTerm}" job openings`,
        `${searchTerm} position`,
        `${searchTerm} career`,
      ];

      let allResults = [];

      for (let i = 0; i < searchStrategies.length && allResults.length < 10; i++) {
        const query = encodeURIComponent(searchStrategies[i]);
        const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${engineId}&q=${query}&num=10`;

        console.log(`🌐 API URL (Strategy ${i + 1}): ${url.replace(apiKey, 'HIDDEN_KEY')}`);

        const response = await fetch(url);

        if (!response.ok) {
          const errorText = await response.text();
          console.error(
            `❌ API Response Error (Strategy ${i + 1}): ${response.status} ${response.statusText}`
          );
          console.error(`❌ Error Details: ${errorText}`);
          continue;
        }

        const data = await response.json();
        console.log(`📊 API Response for ${searchTerm} (Strategy ${i + 1}):`, {
          totalResults: data.searchInformation?.totalResults || 0,
          itemsFound: data.items?.length || 0,
          hasError: !!data.error,
          searchQuery: searchStrategies[i],
        });

        if (data.error) {
          console.error(`❌ Google API Error (Strategy ${i + 1}):`, data.error);
          continue;
        }

        if (data.items && data.items.length > 0) {
          allResults.push(...data.items);
          console.log(
            `✅ Found ${data.items.length} results from API for: ${searchTerm} (Strategy ${i + 1})`
          );
          break; // Stop after first successful strategy
        }

        // Add delay between API calls to avoid rate limiting
        await this.delay(1000);
      }

      if (allResults.length === 0) {
        console.log(`🔄 No results from any API strategy for ${searchTerm}, generating mock data`);
        return this.generateMockJobs(searchTerm);
      }

      console.log(`✅ Total API results found for ${searchTerm}: ${allResults.length}`);
      // Parse and structure the job data
      return allResults.slice(0, 10).map((item) => this.parseJobItem(item, searchTerm));
    } catch (error) {
      console.error(`❌ Error fetching jobs for ${searchTerm}:`, error.message);
      console.log(`🔄 Falling back to mock data for: ${searchTerm}`);
      return this.generateMockJobs(searchTerm);
    }
  }

  // Generate mock jobs when API is not available
  generateMockJobs(category) {
    const companies = [
      'TechCorp',
      'InnovateLabs',
      'StartupX',
      'DigitalSolutions',
      'CodeCraft',
      'DevCompany',
    ];
    const locations = [
      'New York, NY',
      'San Francisco, CA',
      'Austin, TX',
      'Seattle, WA',
      'Remote',
      'Boston, MA',
    ];
    const jobTypes = ['full-time', 'part-time', 'contract', 'remote'];

    const skillsMap = {
      'software developer': ['JavaScript', 'Python', 'Java', 'React', 'Node.js', 'SQL'],
      'web developer': ['HTML', 'CSS', 'JavaScript', 'React', 'Vue.js', 'Angular'],
      'data scientist': ['Python', 'R', 'SQL', 'Machine Learning', 'TensorFlow', 'Pandas'],
      'product manager': ['Agile', 'Scrum', 'Analytics', 'Roadmapping', 'SQL', 'Jira'],
      'ui/ux designer': ['Figma', 'Adobe XD', 'Sketch', 'Prototyping', 'User Research'],
      'devops engineer': ['Docker', 'Kubernetes', 'AWS', 'Jenkins', 'Terraform', 'Linux'],
      'mobile developer': ['React Native', 'Flutter', 'Swift', 'Kotlin', 'iOS', 'Android'],
      'full stack developer': ['JavaScript', 'React', 'Node.js', 'MongoDB', 'Express', 'SQL'],
      'frontend developer': ['JavaScript', 'React', 'Vue.js', 'CSS', 'HTML', 'TypeScript'],
      'backend developer': ['Node.js', 'Python', 'Java', 'SQL', 'MongoDB', 'Express'],
      'machine learning': ['Python', 'TensorFlow', 'PyTorch', 'Scikit-learn', 'Pandas', 'NumPy'],
      'cloud engineer': ['AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'Terraform'],
      cybersecurity: ['Security', 'Penetration Testing', 'CISSP', 'Network Security'],
      'business analyst': ['SQL', 'Excel', 'Tableau', 'Business Intelligence', 'Analytics'],
      'project manager': ['Agile', 'Scrum', 'PMP', 'Jira', 'Project Planning', 'Leadership'],
    };

    const mockJobs = [];
    const numJobs = Math.floor(Math.random() * 8) + 3; // 3-10 jobs

    for (let i = 0; i < numJobs; i++) {
      const company = companies[Math.floor(Math.random() * companies.length)];
      const location = locations[Math.floor(Math.random() * locations.length)];
      const jobType = jobTypes[Math.floor(Math.random() * jobTypes.length)];
      const skills = skillsMap[category] || ['JavaScript', 'Python', 'SQL'];
      const selectedSkills = skills.slice(0, Math.floor(Math.random() * 4) + 2);

      mockJobs.push({
        title: `${this.capitalizeWords(category)} - ${company}`,
        company: company,
        location: location,
        description: `We are looking for a talented ${category} to join our team at ${company}. You will work on exciting projects and contribute to innovative solutions. The ideal candidate should have experience with ${selectedSkills.join(', ')} and be passionate about technology.`,
        url: `https://example.com/jobs/${company.toLowerCase()}-${category.replace(/\s+/g, '-')}-${i + 1}`,
        source: 'MockData',
        jobType: jobType,
        skills: selectedSkills,
        category: category,
        postedDate: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Random date within last 7 days
        fetchedAt: new Date(),
        isActive: true,
      });
    }

    return mockJobs;
  }

  // Helper function to capitalize words
  capitalizeWords(str) {
    return str.replace(/\b\w/g, (l) => l.toUpperCase());
  }

  // Parse individual job item from API response
  parseJobItem(item, category) {
    // Extract company name from snippet or title
    const company = this.extractCompany(item.snippet, item.title);

    // Extract location if available
    const location = this.extractLocation(item.snippet) || 'Remote';

    // Extract job type
    const jobType = this.extractJobType(item.snippet, item.title);

    // Extract skills/technologies
    const skills = this.extractSkills(item.snippet, item.title);

    return {
      title: this.cleanTitle(item.title),
      company: company,
      location: location,
      description: item.snippet || 'No description available',
      url: item.link,
      source: this.getSource(item.link),
      jobType: jobType,
      skills: skills,
      category: category,
      postedDate: new Date(),
      fetchedAt: new Date(),
      isActive: true,
    };
  }

  // Helper function to extract company name
  extractCompany(snippet, title) {
    // Common patterns for company names
    const companyPatterns = [
      /at ([A-Z][a-zA-Z\s&.]+)/,
      /by ([A-Z][a-zA-Z\s&.]+)/,
      /- ([A-Z][a-zA-Z\s&.]+)/,
      /\| ([A-Z][a-zA-Z\s&.]+)/,
    ];

    for (const pattern of companyPatterns) {
      const match = snippet.match(pattern) || title.match(pattern);
      if (match && match[1]) {
        return match[1].trim().replace(/\s+/g, ' ').substring(0, 100);
      }
    }

    return 'Company Not Specified';
  }

  // Helper function to extract location
  extractLocation(snippet) {
    const locationPatterns = [
      /in ([A-Z][a-zA-Z\s,]+(?:, [A-Z]{2})?)/,
      /- ([A-Z][a-zA-Z\s,]+(?:, [A-Z]{2})?)/,
      /(Remote|Hybrid|On-site)/i,
    ];

    for (const pattern of locationPatterns) {
      const match = snippet.match(pattern);
      if (match && match[1]) {
        return match[1].trim().substring(0, 100);
      }
    }

    return null;
  }

  // Helper function to extract job type
  extractJobType(snippet, title) {
    const text = (snippet + ' ' + title).toLowerCase();

    if (text.includes('full-time') || text.includes('full time')) return 'full-time';
    if (text.includes('part-time') || text.includes('part time')) return 'part-time';
    if (text.includes('contract') || text.includes('contractor')) return 'contract';
    if (text.includes('intern') || text.includes('internship')) return 'internship';
    if (text.includes('remote')) return 'remote';

    return 'not-specified';
  }

  // Helper function to extract skills
  extractSkills(snippet, title) {
    const text = (snippet + ' ' + title).toLowerCase();
    const skillKeywords = [
      'javascript',
      'python',
      'java',
      'react',
      'node.js',
      'angular',
      'vue',
      'html',
      'css',
      'sql',
      'mongodb',
      'postgresql',
      'aws',
      'docker',
      'kubernetes',
      'git',
      'agile',
      'scrum',
      'machine learning',
      'ai',
    ];

    return skillKeywords.filter((skill) => text.includes(skill));
  }

  // Helper function to clean job title
  cleanTitle(title) {
    return title
      .replace(/\s*-\s*.*$/, '') // Remove everything after first dash
      .replace(/\s*\|\s*.*$/, '') // Remove everything after first pipe
      .trim()
      .substring(0, 150);
  }

  // Helper function to get source from URL
  getSource(url) {
    if (url.includes('linkedin.com')) return 'LinkedIn';
    if (url.includes('indeed.com')) return 'Indeed';
    if (url.includes('glassdoor.com')) return 'Glassdoor';
    return 'Other';
  }

  // Save jobs to database
  async saveJobsToDB(jobs, category) {
    let savedCount = 0;

    for (const jobData of jobs) {
      try {
        // Check if job already exists (by URL)
        const existingJob = await Job.findOne({ url: jobData.url });

        if (!existingJob) {
          await Job.create(jobData);
          savedCount++;
        } else {
          // Update existing job data
          await Job.findOneAndUpdate(
            { url: jobData.url },
            {
              ...jobData,
              fetchedAt: new Date(),
              isActive: true,
            }
          );
        }
      } catch (error) {
        if (error.code !== 11000) {
          // Ignore duplicate key errors
          console.error('Error saving job:', error.message);
        }
      }
    }

    return savedCount;
  }

  // Clean up old jobs
  async cleanupOldJobs() {
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const result = await Job.deleteMany({
        fetchedAt: { $lt: sevenDaysAgo },
        isActive: true,
      });

      if (result.deletedCount > 0) {
        console.log(`🧹 Cleaned up ${result.deletedCount} old job listings`);
      }
    } catch (error) {
      console.error('Error cleaning up old jobs:', error);
    }
  }

  // Get jobs for frontend
  async getJobs(filters = {}) {
    try {
      const { category, location, jobType, search, page = 1, limit = 20 } = filters;

      const query = { isActive: true };

      // Apply filters
      if (category && category !== 'all') {
        query.category = { $regex: category, $options: 'i' };
      }

      if (location && location !== 'all') {
        query.location = { $regex: location, $options: 'i' };
      }

      if (jobType && jobType !== 'all') {
        query.jobType = jobType;
      }

      if (search) {
        query.$or = [
          { title: { $regex: search, $options: 'i' } },
          { company: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
        ];
      }

      const skip = (page - 1) * limit;

      const jobs = await Job.find(query)
        .sort({ postedDate: -1, fetchedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean();

      const total = await Job.countDocuments(query);

      return {
        jobs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error('Error fetching jobs:', error);
      return { jobs: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 } };
    }
  }

  // Get service status
  getStatus() {
    return {
      isRunning: this.isRunning,
      lastRun: this.lastRun,
      categories: this.jobCategories.length,
    };
  }

  // Manual trigger for testing
  async manualFetch() {
    console.log('🔧 Manual job fetch triggered');
    await this.fetchAndStoreJobs();
  }

  // Utility function for delays
  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

module.exports = new JobFetcherService();
