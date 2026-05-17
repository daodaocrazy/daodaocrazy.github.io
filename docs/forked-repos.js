
(function() {
  const GITHUB_USERNAME = 'daodaocrazy';
  const API_URL = `https://api.github.com/users/${GITHUB_USERNAME}/repos?per_page=100&sort=updated`;

  // 语言分类映射
  const LANGUAGE_CATEGORIES = {
    'JavaScript': '前端开发',
    'TypeScript': '前端开发',
    'HTML': '前端开发',
    'CSS': '前端开发',
    'Vue': '前端开发',
    'React': '前端开发',
    'Java': 'Java开发',
    'Scala': 'Java开发',
    'Python': 'Python开发',
    'Go': 'Go开发',
    'Rust': 'Rust开发',
    'C': '系统编程',
    'C++': '系统编程',
    'Shell': '脚本工具',
    'Dockerfile': '容器技术',
    'Makefile': '构建工具'
  };

  async function fetchForkedRepos() {
    try {
      const response = await fetch(API_URL);
      if (!response.ok) {
        throw new Error('Failed to fetch repositories');
      }
      const repos = await response.json();
      
      // 只保留fork的仓库
      return repos.filter(repo =&gt; repo.fork);
    } catch (error) {
      console.error('Error fetching forked repos:', error);
      return [];
    }
  }

  function categorizeRepos(repos) {
    const categories = {
      '前端开发': [],
      'Java开发': [],
      'Python开发': [],
      'Go开发': [],
      'Rust开发': [],
      '系统编程': [],
      '脚本工具': [],
      '容器技术': [],
      '构建工具': [],
      '其他': []
    };

    repos.forEach(repo =&gt; {
      const language = repo.language || '其他';
      const category = LANGUAGE_CATEGORIES[language] || '其他';
      
      if (!categories[category]) {
        categories[category] = [];
      }
      
      categories[category].push({
        name: repo.name,
        description: repo.description || '暂无描述',
        url: repo.html_url,
        language: repo.language || '未知',
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        updated: repo.updated_at
      });
    });

    // 过滤空分类
    Object.keys(categories).forEach(key =&gt; {
      if (categories[key].length === 0) {
        delete categories[key];
      }
    });

    return categories;
  }

  function renderRepos(categories) {
    const container = document.getElementById('forked-repos-container');
    if (!container) return;

    let html = '&lt;h2&gt;🍴 Fork的仓库&lt;/h2&gt;';

    for (const [category, repos] of Object.entries(categories)) {
      html += `
        &lt;div class="repo-category"&gt;
          &lt;h3&gt;📁 ${category}&lt;/h3&gt;
          &lt;div class="repo-list"&gt;
      `;

      repos.forEach(repo =&gt; {
        const updatedDate = new Date(repo.updated).toLocaleDateString('zh-CN');
        html += `
          &lt;div class="repo-item"&gt;
            &lt;a href="${repo.url}" target="_blank" class="repo-name"&gt;${repo.name}&lt;/a&gt;
            &lt;p class="repo-description"&gt;${repo.description}&lt;/p&gt;
            &lt;div class="repo-meta"&gt;
              &lt;span class="repo-language"&gt;${repo.language}&lt;/span&gt;
              &lt;span class="repo-stars"&gt;⭐ ${repo.stars}&lt;/span&gt;
              &lt;span class="repo-forks"&gt;🔀 ${repo.forks}&lt;/span&gt;
              &lt;span class="repo-updated"&gt;📅 ${updatedDate}&lt;/span&gt;
            &lt;/div&gt;
          &lt;/div&gt;
        `;
      });

      html += '&lt;/div&gt;&lt;/div&gt;';
    }

    container.innerHTML = html;
  }

  async function init() {
    const repos = await fetchForkedRepos();
    const categorized = categorizeRepos(repos);
    renderRepos(categorized);
  }

  // 等待DOM加载完成
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
