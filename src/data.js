export const categories = {
  frontend: { id: 'frontend', name: 'Frontend',       color: '#22d3ee' },
  backend:  { id: 'backend',  name: 'Backend',        color: '#a855f7' },
  devops:   { id: 'devops',   name: 'DevOps / Cloud', color: '#fb923c' },
  aiml:     { id: 'aiml',     name: 'AI / ML',        color: '#f472b6' },
  depipe:   { id: 'depipe',   name: 'DE / Pipeline',  color: '#fbbf24' },
}

export const nodes = [
  // ── Frontend ── Tier 1: language ecosystem ────────────────────────────────
  {
    id: 'javascript', label: 'JavaScript', category: 'frontend', tier: 1, level: 'Expert', years: 5,
    description: 'The primary language of the web. Drives browser UIs and server-side apps via Node.js, forming the backbone of the modern full-stack ecosystem.',
  },

  // ── Frontend ── Tier 2: frameworks / tools ────────────────────────────────
  {
    id: 'typescript', label: 'TypeScript', category: 'frontend', tier: 2, level: 'Advanced', years: 3,
    description: 'Typed superset of JavaScript that adds static types, interfaces, and better tooling for large codebases.',
  },
  {
    id: 'react', label: 'React', category: 'frontend', tier: 2, level: 'Expert', years: 4,
    description: 'Component-based UI library for building interactive web applications with a declarative programming model.',
  },
  {
    id: 'nextjs', label: 'Next.js', category: 'frontend', tier: 2, level: 'Advanced', years: 2,
    description: 'React meta-framework supporting SSR, SSG, ISR and built-in API routes for production-grade apps.',
  },
  {
    id: 'css', label: 'CSS / Tailwind', category: 'frontend', tier: 2, level: 'Advanced', years: 3,
    description: 'Utility-first CSS framework for rapidly building custom, responsive designs without leaving your HTML.',
  },
  {
    id: 'threejs', label: 'Three.js', category: 'frontend', tier: 2, level: 'Intermediate', years: 1,
    description: 'WebGL-based 3D library for creating immersive graphics and interactive experiences in the browser.',
  },
  {
    id: 'vuejs', label: 'Vue.js', category: 'frontend', tier: 2, level: 'Intermediate', years: 2,
    description: 'Progressive JavaScript framework with reactivity system and single-file components for building UIs.',
  },

  // ── Frontend ── Tier 3: sub-libraries ─────────────────────────────────────
  {
    id: 'react_router', label: 'React Router', category: 'frontend', tier: 3, level: 'Advanced', years: 3,
    description: 'Declarative routing library for React enabling client-side navigation, nested routes, and lazy loading.',
  },

  // ── Backend ── Tier 1: language platforms ─────────────────────────────────
  {
    id: 'nodejs', label: 'Node.js', category: 'backend', tier: 1, level: 'Expert', years: 4,
    description: 'Asynchronous JavaScript runtime built on V8 for building scalable network applications and REST APIs.',
  },
  {
    id: 'python', label: 'Python', category: 'backend', tier: 1, level: 'Advanced', years: 3,
    secondaryCategories: ['aiml', 'depipe'],
    description: 'Versatile language used across backend APIs, scripting, data processing, and machine learning pipelines.',
  },
  {
    id: 'java', label: 'Java', category: 'backend', tier: 1, level: 'Advanced', years: 3,
    secondaryCategories: ['depipe'],
    description: 'Enterprise-grade, strongly-typed language powering large-scale backend services, distributed systems, and big-data frameworks.',
  },

  // ── Backend ── Tier 2: frameworks / middleware ────────────────────────────
  {
    id: 'postgresql', label: 'PostgreSQL', category: 'backend', tier: 2, level: 'Advanced', years: 3,
    description: 'Powerful open-source relational database with JSONB, full-text search, and pgvector support.',
  },
  {
    id: 'graphql', label: 'GraphQL', category: 'backend', tier: 2, level: 'Intermediate', years: 2,
    description: 'Query language and runtime for APIs that enables precise data fetching and a strongly-typed schema.',
  },
  {
    id: 'redis', label: 'Redis', category: 'backend', tier: 2, level: 'Intermediate', years: 2,
    description: 'In-memory data store used for caching, session management, pub/sub, and rate limiting.',
  },
  {
    id: 'fastapi', label: 'FastAPI', category: 'backend', tier: 2, level: 'Intermediate', years: 2,
    description: 'Modern, high-performance Python web framework with automatic OpenAPI docs and async support.',
  },
  {
    id: 'spring_framework', label: 'Spring Framework', category: 'backend', tier: 2, level: 'Advanced', years: 3,
    description: 'Comprehensive Java application framework providing DI, AOP, data access, and MVC for enterprise apps.',
  },
  {
    id: 'spring_boot', label: 'Spring Boot', category: 'backend', tier: 2, level: 'Advanced', years: 3,
    description: 'Opinionated Spring launcher that auto-configures a production-ready embedded-server app with minimal boilerplate.',
  },
  {
    id: 'spring_cloud', label: 'Spring Cloud', category: 'backend', tier: 2, level: 'Intermediate', years: 2,
    description: 'Suite of tools for building resilient distributed microservices: service discovery, config server, circuit breakers.',
  },

  // ── Backend ── Tier 3: sub-libraries ──────────────────────────────────────
  {
    id: 'spring_security', label: 'Spring Security', category: 'backend', tier: 3, level: 'Intermediate', years: 2,
    description: 'Comprehensive security framework for Java apps: authentication, authorisation, OAuth2, JWT, and CSRF protection.',
  },

  // ── DevOps / Cloud ── Tier 1: platforms ──────────────────────────────────
  {
    id: 'docker', label: 'Docker', category: 'devops', tier: 1, level: 'Advanced', years: 3,
    description: 'Containerisation platform for packaging applications with their dependencies into portable images.',
  },
  {
    id: 'aws', label: 'AWS', category: 'devops', tier: 1, level: 'Intermediate', years: 2,
    description: 'Cloud platform providing compute (EC2/Lambda), storage (S3), databases (RDS), and managed services.',
  },

  // ── DevOps / Cloud ── Tier 2: tools ───────────────────────────────────────
  {
    id: 'cicd', label: 'CI / CD', category: 'devops', tier: 2, level: 'Advanced', years: 3,
    description: 'Automated testing and deployment pipelines using GitHub Actions, keeping releases fast and reliable.',
  },
  {
    id: 'kubernetes', label: 'Kubernetes', category: 'devops', tier: 2, level: 'Beginner', years: 1,
    description: 'Container orchestration system for automating deployment, scaling, and management of workloads.',
  },
  {
    id: 'terraform', label: 'Terraform', category: 'devops', tier: 2, level: 'Beginner', years: 1,
    description: 'Infrastructure-as-Code tool for provisioning and managing cloud resources with declarative HCL config.',
  },

  // ── DevOps / Cloud ── Tier 3: managed services ────────────────────────────
  {
    id: 'eks', label: 'Amazon EKS', category: 'devops', tier: 3, level: 'Beginner', years: 1,
    description: 'AWS managed Kubernetes service that removes control-plane overhead for production container workloads.',
  },

  // ── AI / ML ── Tier 2: frameworks ────────────────────────────────────────
  {
    id: 'llms', label: 'LLMs / Claude', category: 'aiml', tier: 2, level: 'Intermediate', years: 1,
    description: 'Building AI-powered features by integrating large language models via APIs (Claude, OpenAI, etc.).',
  },
  {
    id: 'pytorch', label: 'PyTorch', category: 'aiml', tier: 2, level: 'Beginner', years: 1,
    secondaryCategories: ['backend'],
    description: 'Deep learning framework for building and training neural network models with dynamic computation graphs.',
  },
  {
    id: 'langchain', label: 'LangChain', category: 'aiml', tier: 2, level: 'Intermediate', years: 1,
    secondaryCategories: ['backend'],
    description: 'Framework for composing LLM chains, agents, memory, and retrieval pipelines into production apps.',
  },
  {
    id: 'vectordb', label: 'Vector DBs', category: 'aiml', tier: 2, level: 'Intermediate', years: 1,
    description: 'Semantic search databases (Pinecone, pgvector, Weaviate) for storing and querying dense embeddings.',
  },

  // ── AI / ML ── Tier 3: libraries ──────────────────────────────────────────
  {
    id: 'pandas', label: 'Pandas', category: 'aiml', tier: 3, level: 'Advanced', years: 3,
    secondaryCategories: ['backend', 'depipe'],
    description: 'Python data manipulation library providing fast, expressive DataFrame operations for analysis and ETL.',
  },

  // ── DE / Pipeline ── Tier 2: frameworks / tools ───────────────────────────
  {
    id: 'spark', label: 'Apache Spark', category: 'depipe', tier: 2, level: 'Intermediate', years: 2,
    secondaryCategories: ['backend'],
    description: 'Unified analytics engine for large-scale data processing with support for batch and streaming workloads.',
  },
  {
    id: 'kafka', label: 'Apache Kafka', category: 'depipe', tier: 2, level: 'Intermediate', years: 2,
    secondaryCategories: ['backend'],
    description: 'Distributed event streaming platform for building real-time data pipelines and streaming applications.',
  },
  {
    id: 'airflow', label: 'Apache Airflow', category: 'depipe', tier: 2, level: 'Advanced', years: 3,
    secondaryCategories: ['devops'],
    description: 'Platform to programmatically author, schedule, and monitor complex data workflows and ETL pipelines.',
  },
  {
    id: 'dbt', label: 'dbt', category: 'depipe', tier: 2, level: 'Intermediate', years: 2,
    description: 'Data transformation tool that enables analytics engineers to transform data in their warehouses using SQL.',
  },
]

export const edges = [
  // ── Frontend internal ──────────────────────────────────────────────────────
  { source: 'react',      target: 'typescript' },
  { source: 'react',      target: 'nextjs'     },
  { source: 'react',      target: 'css'        },
  { source: 'react',      target: 'threejs'    },
  { source: 'react',      target: 'graphql'    },
  { source: 'react',      target: 'llms'       },
  { source: 'typescript', target: 'vuejs'      },

  // ── Frontend → Backend ────────────────────────────────────────────────────
  { source: 'nextjs',     target: 'nodejs'     },
  { source: 'nextjs',     target: 'aws'        },
  { source: 'javascript', target: 'nodejs'     },   // JS language → Node.js runtime

  // ── Backend internal ──────────────────────────────────────────────────────
  { source: 'nodejs',     target: 'postgresql' },
  { source: 'nodejs',     target: 'redis'      },
  { source: 'nodejs',     target: 'graphql'    },
  { source: 'python',     target: 'fastapi'    },
  { source: 'python',     target: 'postgresql' },
  { source: 'python',     target: 'pytorch'    },
  { source: 'python',     target: 'langchain'  },
  { source: 'fastapi',    target: 'postgresql' },
  // Spring ecosystem
  { source: 'spring_framework', target: 'spring_boot'     },
  { source: 'spring_framework', target: 'spring_security' },
  { source: 'spring_boot',      target: 'spring_cloud'    },
  { source: 'spring_boot',      target: 'postgresql'      },
  { source: 'spring_boot',      target: 'redis'           },
  { source: 'spring_cloud',     target: 'kubernetes'      },

  // ── Backend → DevOps ──────────────────────────────────────────────────────
  { source: 'nodejs',     target: 'docker'     },
  { source: 'python',     target: 'docker'     },

  // ── DevOps internal ───────────────────────────────────────────────────────
  { source: 'docker',     target: 'kubernetes' },
  { source: 'docker',     target: 'aws'        },
  { source: 'docker',     target: 'cicd'       },
  { source: 'aws',        target: 'kubernetes' },
  { source: 'aws',        target: 'terraform'  },
  { source: 'kubernetes', target: 'terraform'  },
  { source: 'eks',        target: 'aws'        },
  { source: 'eks',        target: 'kubernetes' },

  // ── AI/ML internal ────────────────────────────────────────────────────────
  { source: 'langchain',  target: 'llms'       },
  { source: 'langchain',  target: 'vectordb'   },
  { source: 'pytorch',    target: 'llms'       },
  { source: 'llms',       target: 'vectordb'   },
  { source: 'postgresql', target: 'vectordb'   },
  { source: 'pandas',     target: 'postgresql' },
  { source: 'pandas',     target: 'spark'      },

  // ── DE / Pipeline connections ─────────────────────────────────────────────
  { source: 'spark',   target: 'python'     },  // PySpark
  { source: 'spark',   target: 'pytorch'    },  // distributed ML
  { source: 'spark',   target: 'postgresql' },  // data source/sink
  { source: 'spark',   target: 'kafka'      },  // Structured Streaming
  { source: 'kafka',   target: 'nodejs'     },  // event-driven microservices
  { source: 'kafka',   target: 'redis'      },  // stream processing
  { source: 'kafka',   target: 'aws'        },  // managed Kafka (MSK)
  { source: 'airflow', target: 'python'     },  // Python SDK
  { source: 'airflow', target: 'docker'     },  // containerised tasks
  { source: 'airflow', target: 'aws'        },  // cloud deployment
  { source: 'airflow', target: 'spark'      },  // submit Spark jobs
  { source: 'airflow', target: 'dbt'        },  // orchestrate dbt runs
  { source: 'dbt',     target: 'postgresql' },  // data warehouse
  { source: 'dbt',     target: 'python'     },  // Python models

  // ── Hierarchy edges (parent → child, dashed in renderer) ─────────────────
  // Frontend hierarchy
  { source: 'javascript', target: 'typescript',   type: 'hierarchy' },
  { source: 'javascript', target: 'react',         type: 'hierarchy' },
  { source: 'javascript', target: 'vuejs',         type: 'hierarchy' },
  { source: 'javascript', target: 'nextjs',        type: 'hierarchy' },
  { source: 'javascript', target: 'css',           type: 'hierarchy' },
  { source: 'javascript', target: 'threejs',       type: 'hierarchy' },
  { source: 'react',      target: 'react_router',  type: 'hierarchy' },

  // Backend hierarchy – Node.js
  { source: 'nodejs',     target: 'graphql',       type: 'hierarchy' },
  { source: 'nodejs',     target: 'redis',         type: 'hierarchy' },
  { source: 'nodejs',     target: 'postgresql',    type: 'hierarchy' },

  // Backend hierarchy – Python
  { source: 'python',     target: 'fastapi',       type: 'hierarchy' },
  { source: 'python',     target: 'pytorch',       type: 'hierarchy' },
  { source: 'python',     target: 'langchain',     type: 'hierarchy' },
  { source: 'python',     target: 'pandas',        type: 'hierarchy' },
  { source: 'python',     target: 'airflow',       type: 'hierarchy' },
  { source: 'python',     target: 'dbt',           type: 'hierarchy' },
  { source: 'python',     target: 'spark',         type: 'hierarchy' },

  // Backend hierarchy – Java
  { source: 'java',             target: 'spring_framework', type: 'hierarchy' },
  { source: 'java',             target: 'spring_boot',      type: 'hierarchy' },
  { source: 'java',             target: 'spring_cloud',     type: 'hierarchy' },
  { source: 'java',             target: 'kafka',            type: 'hierarchy' },
  { source: 'java',             target: 'spark',            type: 'hierarchy' },
  { source: 'spring_framework', target: 'spring_security',  type: 'hierarchy' },

  // DevOps hierarchy
  { source: 'docker',     target: 'kubernetes',    type: 'hierarchy' },
  { source: 'docker',     target: 'cicd',          type: 'hierarchy' },
  { source: 'aws',        target: 'terraform',     type: 'hierarchy' },
  { source: 'aws',        target: 'eks',           type: 'hierarchy' },
  { source: 'kubernetes', target: 'eks',           type: 'hierarchy' },
]

// Lookup map by id
export const nodesMap = Object.fromEntries(nodes.map(n => [n.id, n]))
