export const categories = {
  frontend: { id: 'frontend', name: 'Frontend', color: '#22d3ee' },
  backend:  { id: 'backend',  name: 'Backend',  color: '#a855f7' },
  devops:   { id: 'devops',   name: 'DevOps / Cloud', color: '#fb923c' },
  aiml:     { id: 'aiml',     name: 'AI / ML',  color: '#f472b6' },
}

export const nodes = [
  // ── Frontend ────────────────────────────────────────────────────────────────
  {
    id: 'react', label: 'React', category: 'frontend', level: 'Expert', years: 4,
    description: 'Component-based UI library for building interactive web applications with a declarative programming model.',
  },
  {
    id: 'typescript', label: 'TypeScript', category: 'frontend', level: 'Advanced', years: 3,
    description: 'Typed superset of JavaScript that adds static types, interfaces, and better tooling for large codebases.',
  },
  {
    id: 'nextjs', label: 'Next.js', category: 'frontend', level: 'Advanced', years: 2,
    description: 'React meta-framework supporting SSR, SSG, ISR and built-in API routes for production-grade apps.',
  },
  {
    id: 'css', label: 'CSS / Tailwind', category: 'frontend', level: 'Advanced', years: 3,
    description: 'Utility-first CSS framework for rapidly building custom, responsive designs without leaving your HTML.',
  },
  {
    id: 'threejs', label: 'Three.js', category: 'frontend', level: 'Intermediate', years: 1,
    description: 'WebGL-based 3D library for creating immersive graphics and interactive experiences in the browser.',
  },
  {
    id: 'vuejs', label: 'Vue.js', category: 'frontend', level: 'Intermediate', years: 2,
    description: 'Progressive JavaScript framework with reactivity system and single-file components for building UIs.',
  },

  // ── Backend ──────────────────────────────────────────────────────────────────
  {
    id: 'nodejs', label: 'Node.js', category: 'backend', level: 'Expert', years: 4,
    description: 'Asynchronous JavaScript runtime built on V8 for building scalable network applications and REST APIs.',
  },
  {
    id: 'python', label: 'Python', category: 'backend', level: 'Advanced', years: 3,
    description: 'Versatile language used across backend APIs, scripting, data processing, and machine learning pipelines.',
  },
  {
    id: 'postgresql', label: 'PostgreSQL', category: 'backend', level: 'Advanced', years: 3,
    description: 'Powerful open-source relational database with JSONB, full-text search, and pgvector support.',
  },
  {
    id: 'graphql', label: 'GraphQL', category: 'backend', level: 'Intermediate', years: 2,
    description: 'Query language and runtime for APIs that enables precise data fetching and a strongly-typed schema.',
  },
  {
    id: 'redis', label: 'Redis', category: 'backend', level: 'Intermediate', years: 2,
    description: 'In-memory data store used for caching, session management, pub/sub, and rate limiting.',
  },
  {
    id: 'fastapi', label: 'FastAPI', category: 'backend', level: 'Intermediate', years: 2,
    description: 'Modern, high-performance Python web framework with automatic OpenAPI docs and async support.',
  },

  // ── DevOps / Cloud ───────────────────────────────────────────────────────────
  {
    id: 'docker', label: 'Docker', category: 'devops', level: 'Advanced', years: 3,
    description: 'Containerisation platform for packaging applications with their dependencies into portable images.',
  },
  {
    id: 'aws', label: 'AWS', category: 'devops', level: 'Intermediate', years: 2,
    description: 'Cloud platform providing compute (EC2/Lambda), storage (S3), databases (RDS), and managed services.',
  },
  {
    id: 'cicd', label: 'CI / CD', category: 'devops', level: 'Advanced', years: 3,
    description: 'Automated testing and deployment pipelines using GitHub Actions, keeping releases fast and reliable.',
  },
  {
    id: 'kubernetes', label: 'Kubernetes', category: 'devops', level: 'Beginner', years: 1,
    description: 'Container orchestration system for automating deployment, scaling, and management of workloads.',
  },
  {
    id: 'terraform', label: 'Terraform', category: 'devops', level: 'Beginner', years: 1,
    description: 'Infrastructure-as-Code tool for provisioning and managing cloud resources with declarative HCL config.',
  },

  // ── AI / ML ──────────────────────────────────────────────────────────────────
  {
    id: 'llms', label: 'LLMs / Claude', category: 'aiml', level: 'Intermediate', years: 1,
    description: 'Building AI-powered features by integrating large language models via APIs (Claude, OpenAI, etc.).',
  },
  {
    id: 'pytorch', label: 'PyTorch', category: 'aiml', level: 'Beginner', years: 1,
    description: 'Deep learning framework for building and training neural network models with dynamic computation graphs.',
  },
  {
    id: 'langchain', label: 'LangChain', category: 'aiml', level: 'Intermediate', years: 1,
    description: 'Framework for composing LLM chains, agents, memory, and retrieval pipelines into production apps.',
  },
  {
    id: 'vectordb', label: 'Vector DBs', category: 'aiml', level: 'Intermediate', years: 1,
    description: 'Semantic search databases (Pinecone, pgvector, Weaviate) for storing and querying dense embeddings.',
  },
]

export const edges = [
  // Frontend internal
  { source: 'react',      target: 'typescript' },
  { source: 'react',      target: 'nextjs'     },
  { source: 'react',      target: 'css'        },
  { source: 'react',      target: 'threejs'    },
  { source: 'react',      target: 'graphql'    },
  { source: 'typescript', target: 'vuejs'      },

  // Frontend → Backend
  { source: 'nextjs',     target: 'nodejs'     },
  { source: 'nextjs',     target: 'aws'        },

  // Backend internal
  { source: 'nodejs',     target: 'postgresql' },
  { source: 'nodejs',     target: 'redis'      },
  { source: 'nodejs',     target: 'graphql'    },
  { source: 'python',     target: 'fastapi'    },
  { source: 'python',     target: 'postgresql' },
  { source: 'python',     target: 'pytorch'    },
  { source: 'python',     target: 'langchain'  },
  { source: 'fastapi',    target: 'postgresql' },

  // Backend → DevOps
  { source: 'nodejs',     target: 'docker'     },
  { source: 'python',     target: 'docker'     },

  // DevOps internal
  { source: 'docker',     target: 'kubernetes' },
  { source: 'docker',     target: 'aws'        },
  { source: 'docker',     target: 'cicd'       },
  { source: 'aws',        target: 'kubernetes' },
  { source: 'aws',        target: 'terraform'  },
  { source: 'kubernetes', target: 'terraform'  },

  // AI/ML internal
  { source: 'langchain',  target: 'llms'       },
  { source: 'langchain',  target: 'vectordb'   },
  { source: 'pytorch',    target: 'llms'       },
  { source: 'llms',       target: 'vectordb'   },

  // Cross-category
  { source: 'react',      target: 'llms'       },
  { source: 'postgresql', target: 'vectordb'   },
]

// Lookup map by id
export const nodesMap = Object.fromEntries(nodes.map(n => [n.id, n]))
