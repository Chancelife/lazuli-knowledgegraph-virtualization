export const categories = {
  frontend: { id: 'frontend',  name: 'Frontend',       color: '#22d3ee' },
  backend:  { id: 'backend',   name: 'Backend',        color: '#a855f7' },
  devops:   { id: 'devops',    name: 'DevOps',         color: '#fb923c' },
  aiml:     { id: 'aiml',      name: 'AI / ML',        color: '#f472b6' },
  depipe:   { id: 'depipe',    name: 'DE / Pipeline',  color: '#fbbf24' },
  database: { id: 'database',  name: 'Database',       color: '#10b981' },
}

// Tier 0: Foundation - Cross-category infrastructure / languages
// Tier 1: Core - Frameworks and platforms
// Tier 2: Tools - Libraries and middleware
// Tier 3: Sub-libs - Components and utilities

export const nodes = [
  // ═════════════════════════════════════════════════════════════════════════════
  // ║ TIER 0: FOUNDATION - Cross-category infrastructure and languages          ║
  // ═════════════════════════════════════════════════════════════════════════════

  // ── Foundation: Programming Languages ────────────────────────────────────────
  {
    id: 'javascript', label: 'JavaScript', categories: [], tier: 0, subtype: 'center', level: 'Expert', years: 5,
    description: 'The universal language of the web. Powers browser UIs, server-side applications via Node.js, and the modern full-stack ecosystem.',
  },
  {
    id: 'python', label: 'Python', categories: [], tier: 0, subtype: 'center', level: 'Advanced', years: 3,
    description: 'Versatile language spanning backend APIs, data science, machine learning, and data engineering pipelines.',
  },
  {
    id: 'java', label: 'Java', categories: [], tier: 0, subtype: 'center', level: 'Advanced', years: 3,
    description: 'Enterprise-grade language powering large-scale backend services, distributed systems, and big-data frameworks.',
  },

  // ── Foundation: Infrastructure ───────────────────────────────────────────────
  {
    id: 'docker', label: 'Docker', categories: [], tier: 0, subtype: 'satellite', level: 'Advanced', years: 3,
    description: 'Containerization platform for packaging applications with dependencies into portable, reproducible images.',
  },
  {
    id: 'aws', label: 'AWS', categories: [], tier: 0, subtype: 'satellite', level: 'Intermediate', years: 2,
    description: 'Comprehensive cloud platform providing compute, storage, databases, and managed services across all domains.',
  },
  {
    id: 'kubernetes', label: 'Kubernetes', categories: [], tier: 0, subtype: 'center', level: 'Beginner', years: 1,
    description: 'Container orchestration system for automating deployment, scaling, and management of containerized workloads.',
  },


  // ═════════════════════════════════════════════════════════════════════════════
  // ║ TIER 1: CORE - Frameworks and platforms                                   ║
  // ═════════════════════════════════════════════════════════════════════════════

  // ── Frontend ── Core Frameworks ──────────────────────────────────────────────
  {
    id: 'react', label: 'React', categories: ['frontend'], tier: 1, level: 'Expert', years: 4,
    description: 'Component-based UI library for building interactive web applications with a declarative programming model.',
  },
  {
    id: 'nextjs', label: 'Next.js', categories: ['frontend'], tier: 1, level: 'Advanced', years: 2,
    description: 'React meta-framework supporting SSR, SSG, ISR and built-in API routes for production-grade applications.',
  },
  {
    id: 'vuejs', label: 'Vue.js', categories: ['frontend'], tier: 1, level: 'Intermediate', years: 2,
    description: 'Progressive JavaScript framework with reactivity system and single-file components for building UIs.',
  },
  {
    id: 'typescript', label: 'TypeScript', categories: [], tier: 0, subtype: 'center', level: 'Advanced', years: 3,
    description: 'Typed superset of JavaScript adding static types, interfaces, and enhanced tooling for large codebases.',
  },

  // ── Backend ── Core Frameworks ───────────────────────────────────────────────
  {
    id: 'spring_boot', label: 'Spring Boot', categories: ['backend'], tier: 1, level: 'Advanced', years: 3,
    description: 'Opinionated Spring launcher auto-configuring production-ready embedded-server applications with minimal boilerplate.',
  },
  {
    id: 'spring_framework', label: 'Spring Framework', categories: ['backend'], tier: 1, level: 'Advanced', years: 3,
    description: 'Comprehensive Java application framework providing dependency injection, AOP, data access, and MVC for enterprise apps.',
  },
  {
    id: 'fastapi', label: 'FastAPI', categories: ['backend'], tier: 1, level: 'Intermediate', years: 2,
    description: 'Modern, high-performance Python web framework with automatic OpenAPI documentation and async support.',
  },
  // ── Database ── Core Systems ─────────────────────────────────────────────────
  {
    id: 'postgresql', label: 'PostgreSQL', categories: ['database'], tier: 1, level: 'Advanced', years: 3,
    description: 'Powerful open-source relational database with JSONB, full-text search, and pgvector extension for AI applications.',
  },
  {
    id: 'mysql', label: 'MySQL', categories: ['database'], tier: 1, level: 'Advanced', years: 3,
    description: 'Widely-adopted open-source relational database powering web applications, microservices, and enterprise systems.',
  },
  {
    id: 'mongodb', label: 'MongoDB', categories: ['database'], tier: 1, level: 'Intermediate', years: 2,
    description: 'Document-oriented NoSQL database with flexible schema design and horizontal scaling for modern applications.',
  },
  {
    id: 'redis', label: 'Redis', categories: ['database', 'backend'], tier: 1, level: 'Intermediate', years: 2,
    description: 'In-memory data structure store used as a database, cache, and message broker with sub-millisecond latency.',
  },

  // ── DevOps ── Core Platforms ─────────────────────────────────────────────────
  {
    id: 'github_actions', label: 'GitHub Actions', categories: ['devops'], tier: 1, level: 'Advanced', years: 3,
    description: 'CI/CD automation platform native to GitHub for building, testing, and deploying workflows triggered by repository events.',
  },
  {
    id: 'pulumi', label: 'Pulumi', categories: ['devops'], tier: 1, level: 'Beginner', years: 1,
    description: 'Infrastructure-as-Code platform using general-purpose languages (TypeScript, Python, Go) to provision and manage cloud resources.',
  },
  {
    id: 'terraform', label: 'Terraform', categories: ['devops'], tier: 1, level: 'Beginner', years: 1,
    description: 'Infrastructure-as-Code tool for provisioning and managing cloud resources with declarative HCL configuration.',
  },

  // ── AI/ML ── Core Frameworks ─────────────────────────────────────────────────
  {
    id: 'pytorch', label: 'PyTorch', categories: ['aiml'], tier: 1, level: 'Beginner', years: 1,
    description: 'Deep learning framework for building and training neural network models with dynamic computation graphs.',
  },
  {
    id: 'langchain', label: 'LangChain', categories: ['aiml'], tier: 1, level: 'Intermediate', years: 1,
    description: 'Framework for composing LLM chains, agents, memory, and retrieval pipelines into production applications.',
  },
  {
    id: 'llms', label: 'LLMs / Claude', categories: ['aiml', 'backend'], tier: 1, level: 'Intermediate', years: 1,
    description: 'Building AI-powered features by integrating large language models via APIs (Claude, OpenAI, etc.).',
  },
  {
    id: 'vectordb', label: 'Vector DBs', categories: ['aiml', 'database'], tier: 1, level: 'Intermediate', years: 1,
    description: 'Semantic search databases (Pinecone, pgvector, Weaviate) for storing and querying dense embeddings.',
  },

  // ── DE / Pipeline ── Core Platforms ──────────────────────────────────────────
  {
    id: 'spark', label: 'Apache Spark', categories: ['depipe'], tier: 1, level: 'Intermediate', years: 2,
    description: 'Unified analytics engine for large-scale data processing with support for batch and streaming workloads.',
  },
  {
    id: 'kafka', label: 'Apache Kafka', categories: ['depipe', 'backend'], tier: 1, level: 'Intermediate', years: 2,
    description: 'Distributed event streaming platform for building real-time data pipelines and streaming applications.',
  },
  {
    id: 'airflow', label: 'Apache Airflow', categories: ['depipe'], tier: 1, level: 'Advanced', years: 3,
    description: 'Platform to programmatically author, schedule, and monitor complex data workflows and ETL pipelines.',
  },

  // ═════════════════════════════════════════════════════════════════════════════
  // ║ TIER 2: TOOLS - Libraries and middleware                                  ║
  // ═════════════════════════════════════════════════════════════════════════════

  // ── Frontend ── Tools ────────────────────────────────────────────────────────
  {
    id: 'css', label: 'CSS / Tailwind', categories: ['frontend'], tier: 2, level: 'Advanced', years: 3,
    description: 'Utility-first CSS framework for rapidly building custom, responsive designs without leaving HTML.',
  },
  {
    id: 'threejs', label: 'Three.js', categories: ['frontend'], tier: 2, level: 'Intermediate', years: 1,
    description: 'WebGL-based 3D library for creating immersive graphics and interactive experiences in the browser.',
  },
  {
    id: 'react_router', label: 'React Router', categories: ['frontend'], tier: 2, level: 'Advanced', years: 3,
    description: 'Declarative routing library for React enabling client-side navigation, nested routes, and lazy loading.',
  },
  {
    id: 'graphql', label: 'GraphQL', categories: ['backend', 'frontend'], tier: 2, level: 'Intermediate', years: 2,
    description: 'Query language and runtime for APIs enabling precise data fetching and strongly-typed schemas.',
  },

  // ── Backend ── Tools ─────────────────────────────────────────────────────────
  {
    id: 'spring_cloud', label: 'Spring Cloud', categories: ['backend'], tier: 2, level: 'Intermediate', years: 2,
    description: 'Suite of tools for building resilient distributed microservices: service discovery, config server, circuit breakers.',
  },
  {
    id: 'spring_security', label: 'Spring Security', categories: ['backend'], tier: 2, level: 'Intermediate', years: 2,
    description: 'Comprehensive security framework for Java applications: authentication, authorization, OAuth2, JWT, and CSRF protection.',
  },

  // ── AI/ML ── Tools ───────────────────────────────────────────────────────────
  {
    id: 'huggingface', label: 'Hugging Face', categories: ['aiml'], tier: 2, level: 'Intermediate', years: 1,
    description: 'Platform and libraries for working with transformer models, datasets, and ML model sharing.',
  },

  // ── DE / Pipeline ── Tools ───────────────────────────────────────────────────
  {
    id: 'dbt', label: 'dbt', categories: ['depipe'], tier: 2, level: 'Intermediate', years: 2,
    description: 'Data transformation tool enabling analytics engineers to transform data in warehouses by writing SQL.',
  },
  {
    id: 'snowflake', label: 'Snowflake', categories: ['depipe', 'backend'], tier: 2, level: 'Intermediate', years: 2,
    description: 'Cloud-native data warehouse platform with separation of compute and storage for elastic scaling.',
  },

  // ═════════════════════════════════════════════════════════════════════════════
  // ║ TIER 3: SUB-LIBS - Components and utilities                               ║
  // ═════════════════════════════════════════════════════════════════════════════

  // ── Frontend ── Sub-libraries ────────────────────────────────────────────────
  {
    id: 'zustand', label: 'Zustand', categories: ['frontend'], tier: 3, level: 'Advanced', years: 2,
    description: 'Small, fast state management solution for React using hooks-based API.',
  },
  {
    id: 'framer_motion', label: 'Framer Motion', categories: ['frontend'], tier: 3, level: 'Intermediate', years: 1,
    description: 'Production-ready motion library for React enabling declarative animations and gestures.',
  },
]

// Semantic edges (strong relationships)
export const edges = [
  // ── JavaScript Ecosystem ─────────────────────────────────────────────────────
  { source: 'javascript', target: 'react' },
  { source: 'javascript', target: 'nextjs' },
  { source: 'javascript', target: 'vuejs' },
  { source: 'javascript', target: 'typescript' },

  // ── React Ecosystem ──────────────────────────────────────────────────────────
  { source: 'react',      target: 'nextjs' },
  { source: 'react',      target: 'react_router' },
  { source: 'react',      target: 'zustand' },
  { source: 'react',      target: 'threejs' },
  { source: 'typescript', target: 'react' },

  // ── Python Ecosystem ─────────────────────────────────────────────────────────
  { source: 'python',     target: 'fastapi' },
  { source: 'python',     target: 'pytorch' },
  { source: 'python',     target: 'langchain' },
  { source: 'python',     target: 'airflow' },

  // ── Java / Spring Ecosystem ───────────────────────────────────────────────────
  { source: 'java',       target: 'spring_framework' },
  { source: 'java',       target: 'spring_boot' },
  { source: 'java',       target: 'spring_cloud' },
  { source: 'java',       target: 'spring_security' },
  { source: 'spring_framework', target: 'spring_boot' },
  { source: 'spring_boot', target: 'spring_cloud' },

  // ── Database & Storage ───────────────────────────────────────────────────────
  { source: 'postgresql', target: 'vectordb' },
  { source: 'redis',      target: 'postgresql' },
  { source: 'mysql',      target: 'spring_boot' },
  { source: 'mysql',      target: 'fastapi' },
  { source: 'mongodb',    target: 'fastapi' },
  { source: 'mongodb',    target: 'langchain' },

  // ── DevOps / Cloud ───────────────────────────────────────────────────────────
  { source: 'docker',     target: 'kubernetes' },
  { source: 'docker',     target: 'aws' },
  { source: 'docker',     target: 'github_actions' },
  { source: 'aws',        target: 'kubernetes' },
  { source: 'aws',        target: 'terraform' },
  { source: 'aws',        target: 'pulumi' },
  { source: 'kubernetes', target: 'terraform' },
  { source: 'kubernetes', target: 'pulumi' },

  // ── AI / ML ──────────────────────────────────────────────────────────────────
  { source: 'pytorch',    target: 'llms' },
  { source: 'pytorch',    target: 'huggingface' },
  { source: 'langchain',  target: 'llms' },
  { source: 'langchain',  target: 'vectordb' },
  { source: 'llms',       target: 'vectordb' },
  { source: 'python',     target: 'huggingface' },

  // ── Data Engineering ─────────────────────────────────────────────────────────
  { source: 'kafka',      target: 'spark' },
  { source: 'airflow',    target: 'spark' },
  { source: 'airflow',    target: 'dbt' },
  { source: 'spark',      target: 'postgresql' },
  { source: 'kafka',      target: 'redis' },
  { source: 'spark',      target: 'snowflake' },
  { source: 'dbt',        target: 'snowflake' },
  { source: 'dbt',        target: 'postgresql' },

  // ── Cross-category connections ───────────────────────────────────────────────
  { source: 'nextjs',     target: 'graphql' },
  { source: 'fastapi',    target: 'graphql' },
  { source: 'fastapi',    target: 'postgresql' },
  { source: 'redis',      target: 'kafka' },
  { source: 'aws',        target: 'kafka' },
  { source: 'aws',        target: 'airflow' },
  { source: 'aws',        target: 'snowflake' },
  { source: 'javascript', target: 'llms' },
]

// Hierarchy edges (parent-child relationships)
export const hierarchyEdges = [
  // Foundation -> Core frameworks
  { source: 'javascript', target: 'react', type: 'hierarchy' },
  { source: 'javascript', target: 'vuejs', type: 'hierarchy' },
  { source: 'python',     target: 'fastapi', type: 'hierarchy' },
  { source: 'python',     target: 'pytorch', type: 'hierarchy' },
  { source: 'java',       target: 'spring_boot', type: 'hierarchy' },
  { source: 'docker',     target: 'kubernetes', type: 'hierarchy' },
  { source: 'postgresql', target: 'dbt',        type: 'hierarchy' },

  // Core -> Tools
  { source: 'react',      target: 'react_router', type: 'hierarchy' },
  { source: 'react',      target: 'zustand', type: 'hierarchy' },
  { source: 'spring_boot', target: 'spring_security', type: 'hierarchy' },
  { source: 'pytorch',    target: 'huggingface', type: 'hierarchy' },
  { source: 'airflow',    target: 'dbt', type: 'hierarchy' },

  // Tools -> Sub-libs
  { source: 'react',      target: 'framer_motion', type: 'hierarchy' },
]

// Helper: lookup map by id
export const nodesMap = Object.fromEntries(nodes.map(n => [n.id, n]))

// Helper: check if node belongs to a category (supports multi-category)
export function nodeHasCategory(node, categoryId) {
  return node.categories?.includes(categoryId)
}

// Helper: get all tier 0 (foundation) nodes
export function getFoundationNodes() {
  return nodes.filter(n => n.tier === 0)
}

// Helper: get nodes by category (works with multi-category)
export function getNodesByCategory(categoryId) {
  return nodes.filter(n => nodeHasCategory(n, categoryId))
}
